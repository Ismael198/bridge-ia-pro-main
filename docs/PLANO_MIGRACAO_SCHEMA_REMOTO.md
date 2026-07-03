# Plano de Migração — Código → Schema Remoto Supabase `jxnbgqjivrumvrypdkhd`

> **Status:** planejamento aprovado, implementação da camada de dados **não iniciada**.
> **Projeto Supabase alvo:** `jxnbgqjivrumvrypdkhd` (Ismael198's Project, us-east-2, Postgres 17).
> **Princípio:** trocar apenas a **camada de dados** por baixo das telas. Server functions mantêm
> a mesma assinatura e o mesmo shape de JSON devolvido ao cliente → **telas, hooks e componentes
> não mudam**. UI, rotas, sidebar, auth visual e componentes globais permanecem intocados.

## Contexto

O `.env` já aponta para `jxnbgqjivrumvrypdkhd`, mas o schema remoto ("fase1a") **diverge**
do que o código do repositório espera. Hoje o app não roda contra esse banco: quase toda query
referencia tabelas/colunas que não existem no remoto. O remoto é a **fonte da verdade** (design
mais novo, com tokens criptografados via Vault, PKCE e sistema de créditos/planos/IA).

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Direção geral | Adaptar o **código** ao schema remoto (não recriar o schema antigo). |
| Access token ML decriptado | ✅ Criar RPC `meli_get_access_token` (server-only). **Já implementado** (ver abaixo). |
| `audit_logs` | **Criar** via migration versionada (auditoria é barata e útil). |
| `listings_cache` | **Degradar**: `/api/listings*` passa a ler live da ML sem cache (o código já trata cache como best-effort). |
| `orders_cache` | Fora de escopo (sem uso real hoje — telas usam mock). |

## Trabalho já concluído

### PR-0 — Segurança (branch `fix/security-pr0`, PR #1)
1. ✅ **`revoke_rls_auto_enable_execute`** — migration versionada aplicada; `anon`/`authenticated`
   não executam mais `rls_auto_enable()`. Advisors 0028/0029 resolvidos.
2. ⚠️ **Leaked Password Protection** — passo manual no Auth (Dashboard ou Management API
   `PATCH /v1/projects/jxnbgqjivrumvrypdkhd/config/auth {"password_hibp_enabled": true}`).

### Fase 4 (habilitador) — RPC de access token
✅ **`meli_get_access_token(p_seller_id uuid)`** — migration `supabase/migrations/20260703160000_meli_get_access_token.sql`,
aplicada e validada. `SECURITY DEFINER`, `search_path=''`, EXECUTE só para `service_role`
(`anon`/`authenticated` = false). Decripta via `vault.decrypted_secrets`. **Server-only.**

## 1. Telas impactadas

| Tela / rota | Fonte de dados hoje | Impacto |
|---|---|---|
| `_authenticated.marketplaces.tsx` | Real — `marketplaces.functions.ts` | 🔴 Alto |
| `_authenticated.listings.tsx` → `ListingsTable` → `useListings` → `/api/listings` | Real — ML API + `listings_cache` | 🟠 Médio |
| `/api/public/oauth/mercadolivre/callback` | Real — `oauth_states` + `marketplace_connections` + `audit_logs` | 🔴 Alto |
| `dashboard` / `orders` / `logs` / `agents` | Mock (`mock-data`) | 🟢 Nenhum agora |
| `chat` / `photos` | Placeholder/UI | 🟢 Nenhum |

Só **marketplaces**, **listings** e o **callback OAuth** tocam o banco de verdade.

## 2. Queries atuais que quebram

| Arquivo | Query | Motivo |
|---|---|---|
| `marketplaces.functions.ts` (24,61,81,130) · `mercadolivre.server.ts` (105,126) · `callback.ts` (57,77,79) | `.from("marketplace_connections")` | Tabela inexistente → `marketplace_accounts` (colunas diferentes) |
| `marketplaces.functions.ts` (40) · `callback.ts` (33,44,82) | `.from("oauth_states")` com `user_id, provider, redirect_to` | Remoto usa `seller_id, code_verifier`; exige PKCE; sem `provider`/`redirect_to` |
| `marketplaces.functions.ts` (67,134) · `mercadolivre.server.ts` (138) · `callback.ts` (84) | `.from("audit_logs")` | Tabela inexistente → **criar via migration** |
| `marketplaces.functions.ts` (107) · `listings.get.ts` (64) · `listings.post/put/delete` | `.from("listings_cache")` | Tabela inexistente → **degradar** (live sem cache) |
| `mercadolivre.server.ts` (104-136) | lê `access_token`/`refresh_token` em texto puro | Remoto usa `*_encrypted` (Vault) + RPCs |

**Valor crítico:** código usa `provider = "mercadolivre"`; remoto tem `CHECK marketplace IN ('mercado_livre','shopee')`.
O adapter traduz `"mercadolivre" ↔ "mercado_livre"`.

## 3. Equivalências no schema remoto

### Tabelas

| Antigo (código) | Novo (remoto) | Mapeamento |
|---|---|---|
| `marketplace_connections` | `marketplace_accounts` | `user_id→seller_id`, `provider→marketplace` (`mercado_livre`), `account_id→external_account_id`, `access_token→access_token_encrypted` (Vault), `refresh_token→refresh_token_encrypted` (Vault), `expires_at→token_expires_at`, `status` (`connected`→`active`). **Sem equivalente:** `account_label`, `scope`, `last_sync_at`, `metadata`, `updated_at`. |
| `oauth_states` | `oauth_states` (shape novo) | `user_id→seller_id`; **novo obrigatório:** `code_verifier` (PKCE); **removidos:** `provider`, `redirect_to`. |
| `audit_logs` | (criar) | Migration versionada nova. |
| `listings_cache` | (degradar) | Sem tabela; leitura live da ML. |

### RPCs (ciclo de token ML)

| RPC | Uso | Assinatura |
|---|---|---|
| `meli_store_account` | Callback OAuth (grava conta + criptografa) | `(p_seller_id, p_external_account_id, p_access, p_refresh, p_expires_at) → uuid` |
| `meli_get_access_token` ✅ | `getValidAccessToken`/`mlFetch` (token decriptado) | `(p_seller_id) → (account_id, external_account_id, access_token, token_expires_at, status)` |
| `meli_accounts_needing_refresh` | Worker de refresh | `(p_threshold_seconds) → (account_id, external_account_id, refresh_token)` |
| `meli_apply_refresh` | Aplica tokens renovados | `(p_account_id, p_access, p_refresh, p_expires_at) → void` |
| `meli_mark_reauth` | Marca reautenticação | `(p_account_id) → void` |

Todas `SECURITY DEFINER`, EXECUTE só para `service_role`.

## 4. Ordem segura de migração (PRs pequenos e reversíveis)

- **PR-0 · Segurança** ✅ (revoke rls_auto_enable) + leaked password (manual). — *feito/pendente*
- **PR-1 · Fundação (sem comportamento):** regenerar `src/integrations/supabase/types.ts` do remoto +
  criar `src/lib/marketplace.repo.ts` (adapter old-shape ↔ new-schema), ainda não referenciado.
  Inclui `audit_logs` (migration) e helper `logAudit()` best-effort. Build verde, telas idênticas.
- **PR-2 · Conexão/OAuth:** `startMercadoLivreOAuth` + `callback.ts` → `oauth_states` (com `code_verifier`/PKCE)
  e `meli_store_account`. UX visual do callback inalterada.
- **PR-3 · Leitura de conexões:** `listConnections` + `disconnectMarketplace` → `marketplace_accounts`,
  devolvendo o **mesmo shape** que `_authenticated.marketplaces.tsx` consome (campos ausentes → `null`/derivados).
- **PR-4 · Tokens/API ML:** `getValidAccessToken`/`mlFetch` → `meli_get_access_token` (✅ RPC pronta);
  `refreshTokenCall` → `meli_apply_refresh`.
- **PR-5 · Sync/listings:** `syncMercadoLivre` e `/api/listings*` → live sem `listings_cache`; `logAudit()` via `audit_logs`.
- **PR-6 · Limpeza:** remover referências mortas ao schema antigo.

Cada PR: `npm run build` verde e diff **fora** de `routes/` de tela, sidebar, componentes globais e auth visual
(exceto o `callback.ts`, que é lógica server, não UI de app).

## 5. Riscos

1. Valor `mercadolivre` vs `mercado_livre` — se algum componente compara a string, quebra silenciosamente. Centralizar tradução no adapter + teste.
2. PKCE obrigatório (`oauth_states.code_verifier NOT NULL`) — o fluxo atual não gera verifier; pré-requisito do PR-2.
3. Criptografia via Vault — confirmar que as RPCs `meli_*` têm a key configurada.
4. `status` diferente (`active` vs `connected`) — filtros/badges na tela de marketplaces.
5. `audit_logs` ausente até PR-1; `listings_cache` some — qualquer chamada não tratada vira 500. Mitigar com `logAudit()` best-effort e leitura live.
6. Limite 50ms CPU no edge — ok, criptografia fica no Postgres (RPC), não no Worker.
7. `supabaseAdmin` (service_role) bypassa RLS — manter estritamente server-side.
8. Multi-conta por vendedor: `meli_get_access_token` hoje devolve a conta mais recente (semântica legada). Revisar quando a UI suportar múltiplas contas.

## 6. Rollback

- Cada PR isolado e revertível via `git revert`; nenhum altera UI.
- Migrations novas (`audit_logs`, RPCs) acompanhadas de `DROP` correspondente; tabelas remotas com **0 linhas** hoje → risco de perda de dado nulo.
- Fallback de conexão: projeto antigo `fhfaylcurgvkkjzvwbcv` (comentado no `.env`) — emergencial, não é destino final.
- `main` sempre buildável; PRs sob review antes de merge.

## 7. Critérios de aceite

- [ ] `get_advisors(security)` limpo (após leaked password).
- [ ] `npm run build` e `tsc` sem erros; nenhum `any` novo.
- [ ] `git diff` não toca telas `.tsx`, sidebar, componentes globais, login/signup.
- [ ] Diff visual das telas = zero (screenshots antes/depois).
- [ ] Marketplaces: conectar ML cria linha em `marketplace_accounts` com tokens criptografados; desconectar remove; sync roda.
- [ ] Listings: tela carrega itens da ML (live).
- [ ] `grep` limpo de `marketplace_connections`/`listings_cache` no código.
- [ ] Tradução `mercadolivre→mercado_livre` coberta por teste.
