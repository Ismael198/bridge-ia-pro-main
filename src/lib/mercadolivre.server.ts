// Server-only helpers for Mercado Livre OAuth2 + API access.
// Tokens are read/written via supabaseAdmin (bypasses RLS) and never exposed to client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ML_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_API = "https://api.mercadolibre.com";

/**
 * Get Mercado Livre OAuth configuration (app ID and client secret)
 * Returns a config object with appId and clientSecret
 * These must be set as environment variables for OAuth to work
 */
export function getMlConfig() {
  const appId = process.env.ML_APP_ID || "";
  const clientSecret = process.env.ML_CLIENT_SECRET || "";
  
  // Return config even if empty - let consumers decide how to handle it
  return { appId, clientSecret };
}

/**
 * Validate that ML config is properly configured
 * Throws error if credentials are missing
 */
export function validateMlConfig() {
  const { appId, clientSecret } = getMlConfig();
  if (!appId || !clientSecret) {
    throw new Error(
      "Mercado Livre OAuth não configurado. " +
      "Configure as variáveis de ambiente ML_APP_ID e ML_CLIENT_SECRET em wrangler.jsonc ou .env"
    );
  }
  return { appId, clientSecret };
}

export function getRedirectUri(origin: string) {
  return `${origin}/api/public/oauth/mercadolivre/callback`;
}

// ── PKCE (S256) ──────────────────────────────────────────────────────────────
// Edge-compatible: usa apenas Web Crypto (crypto.getRandomValues / subtle.digest)
// e btoa — sem APIs Node. Exigido pelo oauth_states remoto (code_verifier NOT NULL).
function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64UrlEncode(verifierBytes); // 43 chars base64url
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64UrlEncode(new Uint8Array(digest));
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizationUrl(opts: {
  appId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const u = new URL(ML_AUTH_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", opts.appId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", opts.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
};

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const { appId, clientSecret } = validateMlConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: appId,
    client_secret: clientSecret,
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[ML][exchangeCode] erro", res.status, json);
    throw new Error(`ML token exchange falhou: ${res.status} ${JSON.stringify(json)}`);
  }
  return json as TokenResponse;
}

export async function refreshTokenCall(refreshToken: string): Promise<TokenResponse> {
  const { appId, clientSecret } = validateMlConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: appId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[ML][refresh] erro", res.status, json);
    throw new Error(`ML refresh falhou: ${res.status} ${JSON.stringify(json)}`);
  }
  return json as TokenResponse;
}

// Returns a valid access_token, refreshing if it expires in <120s.
export async function getValidAccessToken(userId: string): Promise<{ accessToken: string; mlUserId: string }> {
  const { data: conn, error } = await supabaseAdmin
    .from("marketplace_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "mercadolivre")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!conn) throw new Error("Nenhuma conexão Mercado Livre encontrada");
  if (!conn.refresh_token) throw new Error("Conexão sem refresh_token");

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const needsRefresh = !conn.access_token || expiresAt - Date.now() < 120_000;

  if (!needsRefresh) {
    return { accessToken: conn.access_token!, mlUserId: conn.account_id ?? "" };
  }

  console.log("[ML][refresh] renovando token para user", userId);
  const tok = await refreshTokenCall(conn.refresh_token);
  const newExpires = new Date(Date.now() + tok.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("marketplace_connections")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: newExpires,
      scope: tok.scope,
      account_id: String(tok.user_id),
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    actor: "system",
    action: "ml.token.refresh",
    target: String(tok.user_id),
    detail: { scope: tok.scope, expires_in: tok.expires_in },
  });

  return { accessToken: tok.access_token, mlUserId: String(tok.user_id) };
}

export async function mlFetch(userId: string, path: string, init: RequestInit = {}) {
  const { accessToken } = await getValidAccessToken(userId);
  const res = await fetch(`${ML_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[ML][api]", path, res.status, json);
    throw new Error(`ML API ${path} ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}
