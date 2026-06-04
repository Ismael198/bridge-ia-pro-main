import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { exchangeCodeForToken, getRedirectUri } from "@/lib/mercadolivre.server";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Mercado Livre</title>
    <style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}
    .card{max-width:480px;padding:32px;border-radius:12px;background:#171717;border:1px solid #262626;text-align:center}
    a{color:#fbbf24;text-decoration:none;font-weight:600}</style></head>
    <body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/oauth/mercadolivre/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        if (errorParam) {
          console.error("[ML][callback] erro do provedor", errorParam, url.searchParams.get("error_description"));
          return html(`<h2>Autorização negada</h2><p>${errorParam}</p><p><a href="/marketplaces">Voltar</a></p>`, 400);
        }
        if (!code || !state) return html("<h2>Parâmetros faltando</h2>", 400);

        // Recupera + consome o state
        const { data: st, error: stErr } = await supabaseAdmin
          .from("oauth_states")
          .select("*")
          .eq("state", state)
          .eq("provider", "mercadolivre")
          .maybeSingle();

        if (stErr || !st) {
          console.error("[ML][callback] state inválido", stErr);
          return html("<h2>State inválido ou expirado</h2>", 400);
        }
        if (new Date(st.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("oauth_states").delete().eq("state", state);
          return html("<h2>State expirado</h2>", 400);
        }

        const origin = `${url.protocol}//${url.host}`;
        const redirectUri = getRedirectUri(origin);

        try {
          const tok = await exchangeCodeForToken({ code, redirectUri });
          const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

          // Upsert manual (não temos UNIQUE em user_id+provider)
          const { data: existing } = await supabaseAdmin
            .from("marketplace_connections")
            .select("id")
            .eq("user_id", st.user_id)
            .eq("provider", "mercadolivre")
            .maybeSingle();

          const payload = {
            user_id: st.user_id,
            provider: "mercadolivre" as const,
            account_id: String(tok.user_id),
            account_label: `ML ${tok.user_id}`,
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: expiresAt,
            scope: tok.scope,
            status: "connected" as const,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            await supabaseAdmin.from("marketplace_connections").update(payload).eq("id", existing.id);
          } else {
            await supabaseAdmin.from("marketplace_connections").insert(payload);
          }

          await supabaseAdmin.from("oauth_states").delete().eq("state", state);

          await supabaseAdmin.from("audit_logs").insert({
            user_id: st.user_id,
            actor: "user",
            action: "mercadolivre.connect",
            target: String(tok.user_id),
            detail: { scope: tok.scope },
          });

          console.log("[ML][callback] conectado user", st.user_id, "ml_user", tok.user_id);
          return html(
            `<h2>✓ Conta conectada</h2><p>Mercado Livre vinculado com sucesso.</p>
            <p><a href="${st.redirect_to ?? "/marketplaces"}">Voltar à aplicação</a></p>
            <script>setTimeout(function(){location.href=${JSON.stringify(st.redirect_to ?? "/marketplaces")}},1500)</script>`,
          );
        } catch (err) {
          console.error("[ML][callback] falha", err);
          return html(
            `<h2>Falha ao conectar</h2><p>${(err as Error).message}</p><p><a href="/marketplaces">Voltar</a></p>`,
            500,
          );
        }
      },
    },
  },
});
