import { createFileRoute } from "@tanstack/react-router";
import { exchangeCodeForToken, getRedirectUri } from "@/lib/mercadolivre.server";
import {
  getOAuthState,
  deleteOAuthState,
  storeAccount,
} from "@/lib/marketplace.repo.server";
import { logAudit } from "@/lib/audit.server";

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

        // Recupera o state (+ code_verifier PKCE) do schema remoto via adapter
        const st = await getOAuthState(state);

        if (!st) {
          console.error("[ML][callback] state inválido");
          return html("<h2>State inválido ou expirado</h2>", 400);
        }
        if (new Date(st.expiresAt).getTime() < Date.now()) {
          await deleteOAuthState(state);
          return html("<h2>State expirado</h2>", 400);
        }

        const origin = `${url.protocol}//${url.host}`;
        const redirectUri = getRedirectUri(origin);
        const redirectTo = "/marketplaces";

        try {
          const tok = await exchangeCodeForToken({
            code,
            redirectUri,
            codeVerifier: st.codeVerifier,
          });
          const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

          // Grava/atualiza a conta com tokens criptografados no Vault (upsert via RPC).
          await storeAccount({
            sellerId: st.sellerId,
            externalAccountId: String(tok.user_id),
            accessToken: tok.access_token,
            refreshToken: tok.refresh_token,
            expiresAt,
          });

          await deleteOAuthState(state);

          await logAudit({
            sellerId: st.sellerId,
            actor: "user",
            action: "mercadolivre.connect",
            target: String(tok.user_id),
            detail: { scope: tok.scope },
          });

          console.log("[ML][callback] conectado user", st.sellerId, "ml_user", tok.user_id);
          return html(
            `<h2>✓ Conta conectada</h2><p>Mercado Livre vinculado com sucesso.</p>
            <p><a href="${redirectTo}">Voltar à aplicação</a></p>
            <script>setTimeout(function(){location.href=${JSON.stringify(redirectTo)}},1500)</script>`,
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
