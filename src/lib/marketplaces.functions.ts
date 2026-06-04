import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildAuthorizationUrl,
  validateMlConfig,
  getRedirectUri,
  mlFetch,
} from "./mercadolivre.server";

function getOrigin(): string {
  const proto = getRequestHeader("x-forwarded-proto") ?? "https";
  const host = getRequestHost();
  return `${proto}://${host}`;
}

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("marketplace_connections")
      .select("id, provider, account_id, account_label, status, scope, expires_at, last_sync_at, metadata, created_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { connections: data ?? [] };
  });

export const startMercadoLivreOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { appId } = getMlConfig();
    const origin = getOrigin();
    const redirectUri = getRedirectUri(origin);
    const state = crypto.randomUUID();

    const { error } = await supabaseAdmin.from("oauth_states").insert({
      state,
      user_id: userId,
      provider: "mercadolivre",
      redirect_to: "/marketplaces",
    });
    if (error) throw new Error(`oauth_states: ${error.message}`);

    const url = buildAuthorizationUrl({ appId, redirectUri, state });
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
    const { error } = await supabaseAdmin
      .from("marketplace_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      actor: "user",
      action: `${data.provider}.disconnect`,
      detail: {},
    });
    return { ok: true };
  });

export const syncMercadoLivre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: conn } = await supabaseAdmin
      .from("marketplace_connections")
      .select("id, account_id")
      .eq("user_id", userId)
      .eq("provider", "mercadolivre")
      .maybeSingle();

    if (!conn?.account_id) throw new Error("Conexão Mercado Livre não encontrada");

    // 1) Buscar IDs dos anúncios do vendedor
    const search = (await mlFetch(
      userId,
      `/users/${conn.account_id}/items/search?limit=50`,
    )) as { results?: string[] };
    const ids = (search.results ?? []).slice(0, 20);

    let count = 0;
    if (ids.length > 0) {
      // 2) Buscar detalhes em lote
      const items = (await mlFetch(
        userId,
        `/items?ids=${ids.join(",")}`,
      )) as Array<{ code: number; body: any }>;

      for (const it of items) {
        if (it.code !== 200 || !it.body) continue;
        const b = it.body;
        await supabaseAdmin.from("listings_cache").upsert(
          {
            user_id: userId,
            connection_id: conn.id,
            provider: "mercadolivre",
            external_id: b.id,
            title: b.title ?? "(sem título)",
            sku: b.seller_custom_field ?? null,
            price: b.price ?? null,
            stock: b.available_quantity ?? null,
            status: b.status ?? null,
            permalink: b.permalink ?? null,
            thumbnail_url: b.thumbnail ?? null,
            raw: b,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "provider,external_id" },
        );
        count++;
      }
    }

    await supabaseAdmin
      .from("marketplace_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", conn.id);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      actor: "user",
      action: "mercadolivre.sync",
      detail: { listings: count },
    });

    return { ok: true, listings: count };
  });
