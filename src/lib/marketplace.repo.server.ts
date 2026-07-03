// Anti-corruption layer entre o código (shape legado) e o schema remoto "fase1a".
//
// PROPÓSITO: isolar num único módulo todo o mapeamento entre o modelo antigo
// (marketplace_connections, provider="mercadolivre", tokens em texto) e o novo
// (marketplace_accounts, marketplace="mercado_livre", tokens no Vault via RPCs).
// As server functions das telas passam a chamar ESTE módulo em vez de montar SQL,
// mantendo o mesmo shape de retorno → as telas não mudam.
//
// SERVER-ONLY: usa supabaseAdmin (service_role, bypassa RLS). Nunca importar no client.
// Ainda NÃO referenciado por nenhuma tela nesta fase (PR-1 = fundação).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types.remote";

// Re-tipagem para o schema remoto (o supabaseAdmin default aponta para ./types legado).
const db = supabaseAdmin as unknown as SupabaseClient<Database>;

type MarketplaceAccount = Database["public"]["Tables"]["marketplace_accounts"]["Row"];

// ── Tradução de identificadores de provider ────────────────────────────────
// Código/telas usam "mercadolivre"; o remoto usa "mercado_livre" (CHECK constraint).
export type MlProvider = "mercadolivre" | "shopee";
export type RemoteMarketplace = "mercado_livre" | "shopee";

const PROVIDER_TO_MARKETPLACE: Record<MlProvider, RemoteMarketplace> = {
  mercadolivre: "mercado_livre",
  shopee: "shopee",
};
const MARKETPLACE_TO_PROVIDER: Record<RemoteMarketplace, MlProvider> = {
  mercado_livre: "mercadolivre",
  shopee: "shopee",
};

export function providerToMarketplace(p: MlProvider): RemoteMarketplace {
  return PROVIDER_TO_MARKETPLACE[p];
}
export function marketplaceToProvider(m: string): MlProvider {
  return MARKETPLACE_TO_PROVIDER[m as RemoteMarketplace] ?? "mercadolivre";
}

// ── Shape legado consumido pela tela de marketplaces ───────────────────────
// Campos sem equivalente no schema novo são derivados (account_label) ou null.
export interface LegacyConnection {
  id: string;
  provider: MlProvider;
  account_id: string;
  account_label: string | null;
  status: string;
  scope: string | null;
  expires_at: string | null;
  last_sync_at: string | null;
  metadata: Json | null;
  created_at: string | null;
}

function toLegacyConnection(row: MarketplaceAccount): LegacyConnection {
  return {
    id: row.id,
    provider: marketplaceToProvider(row.marketplace),
    account_id: row.external_account_id,
    account_label: `ML ${row.external_account_id}`,
    status: row.status,
    scope: null, // sem coluna no schema novo
    expires_at: row.token_expires_at,
    last_sync_at: null, // sem coluna no schema novo
    metadata: null,
    created_at: row.created_at,
  };
}

// ── Conexões ────────────────────────────────────────────────────────────────
export async function listConnections(sellerId: string): Promise<LegacyConnection[]> {
  const { data, error } = await db
    .from("marketplace_accounts")
    .select("*")
    .eq("seller_id", sellerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLegacyConnection);
}

export async function disconnect(sellerId: string, provider: MlProvider): Promise<void> {
  const { error } = await db
    .from("marketplace_accounts")
    .delete()
    .eq("seller_id", sellerId)
    .eq("marketplace", providerToMarketplace(provider));
  if (error) throw new Error(error.message);
}

// ── Ciclo de tokens (via RPCs; tokens só trafegam no server) ────────────────
export interface StoreAccountArgs {
  sellerId: string;
  externalAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** Grava/atualiza conta + tokens criptografados no Vault. Retorna o id da conta. */
export async function storeAccount(args: StoreAccountArgs): Promise<string> {
  const { data, error } = await db.rpc("meli_store_account", {
    p_seller_id: args.sellerId,
    p_external_account_id: args.externalAccountId,
    p_access: args.accessToken,
    p_refresh: args.refreshToken,
    p_expires_at: args.expiresAt,
  });
  if (error) throw new Error(error.message);
  return data;
}

export interface AccessTokenInfo {
  accountId: string;
  externalAccountId: string;
  accessToken: string;
  tokenExpiresAt: string;
  status: string;
}

/** Retorna o access_token DECRIPTADO da conta ML do vendedor (ou null se não houver). */
export async function getAccessToken(sellerId: string): Promise<AccessTokenInfo | null> {
  const { data, error } = await db.rpc("meli_get_access_token", { p_seller_id: sellerId });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    accountId: row.account_id,
    externalAccountId: row.external_account_id,
    accessToken: row.access_token,
    tokenExpiresAt: row.token_expires_at,
    status: row.status,
  };
}

/** Retorna o refresh_token DECRIPTADO de uma conta específica (ou null). Server-only. */
export async function getRefreshToken(accountId: string): Promise<string | null> {
  const { data, error } = await db.rpc("meli_get_refresh_token", { p_account_id: accountId });
  if (error) throw new Error(error.message);
  return data ?? null;
}

export interface ApplyRefreshArgs {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function applyRefresh(args: ApplyRefreshArgs): Promise<void> {
  const { error } = await db.rpc("meli_apply_refresh", {
    p_account_id: args.accountId,
    p_access: args.accessToken,
    p_refresh: args.refreshToken,
    p_expires_at: args.expiresAt,
  });
  if (error) throw new Error(error.message);
}

export async function markReauth(accountId: string): Promise<void> {
  const { error } = await db.rpc("meli_mark_reauth", { p_account_id: accountId });
  if (error) throw new Error(error.message);
}

// ── OAuth states (PKCE) ──────────────────────────────────────────────────────
export interface OAuthStateArgs {
  state: string;
  codeVerifier: string;
  sellerId: string;
}

export async function createOAuthState(args: OAuthStateArgs): Promise<void> {
  const { error } = await db.from("oauth_states").insert({
    state: args.state,
    code_verifier: args.codeVerifier,
    seller_id: args.sellerId,
  });
  if (error) throw new Error(error.message);
}

export interface OAuthStateRow {
  state: string;
  sellerId: string;
  codeVerifier: string;
  expiresAt: string;
}

export async function getOAuthState(state: string): Promise<OAuthStateRow | null> {
  const { data, error } = await db
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    state: data.state,
    sellerId: data.seller_id,
    codeVerifier: data.code_verifier,
    expiresAt: data.expires_at,
  };
}

export async function deleteOAuthState(state: string): Promise<void> {
  const { error } = await db.from("oauth_states").delete().eq("state", state);
  if (error) throw new Error(error.message);
}
