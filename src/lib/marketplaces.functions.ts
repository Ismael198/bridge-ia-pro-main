import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAuthorizationUrl,
  validateMlConfig,
  getRedirectUri,
  generatePkce,
  mlFetch,
} from "./mercadolivre.server";
import {
  createOAuthState,
  listConnections as repoListConnections,
  disconnect as repoDisconnect,
  getAccessToken,
} from "./marketplace.repo.server";
import { logAudit } from "./audit.server";

function getOrigin(): string {
  const proto = getRequestHeader("x-forwarded-proto") ?? "https";
  const host = getRequestHost();
  return `${proto}://${host}`;
}

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const connections = await repoListConnections(userId);
    return { connections };
  });

export const startMercadoLivreOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { appId } = validateMlConfig();
    const origin = getOrigin();
    const redirectUri = getRedirectUri(origin);
    const state = crypto.randomUUID();
    const { codeVerifier, codeChallenge } = await generatePkce();

    // Persiste o state + code_verifier (PKCE) no schema remoto via adapter.
    await createOAuthState({ state, codeVerifier, sellerId: userId });

    const url = buildAuthorizationUrl({ appId, redirectUri, state, codeChallenge });
    console.log("[ML][oauth.start] user", userId, "redirect_uri", redirectUri);
    return { url };
  });

export const disconnectMarketplace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ provider: z.enum(["mercadolivre", "shopee"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await repoDisconnect(userId, data.provider);
    await logAudit({
      sellerId: userId,
      actor: "user",
      action: `${data.provider}.disconnect`,
    });
    return { ok: true };
  });

export const syncMercadoLivre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const info = await getAccessToken(userId);
    if (!info) throw new Error("Conexão Mercado Livre não encontrada");

    // Leitura live da ML (sem listings_cache — decisão de "degradar" na migração).
    // A tela de anúncios já lê ao vivo via /api/listings; aqui só validamos a
    // conexão e contamos os anúncios do vendedor para dar feedback no botão.
    const search = (await mlFetch(
      userId,
      `/users/${info.externalAccountId}/items/search?limit=50`,
    )) as { results?: string[] };
    const count = (search.results ?? []).length;

    await logAudit({
      sellerId: userId,
      actor: "user",
      action: "mercadolivre.sync",
      detail: { listings: count },
    });

    return { ok: true, listings: count };
  });
