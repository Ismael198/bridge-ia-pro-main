
## Visão geral

Três entregas grandes, executadas em fases para você validar à medida que avança:

1. **Tema claro/escuro** com toggle persistente
2. **Autenticação obrigatória** (email/senha) com tabela `profiles` e proteção de todas as rotas internas
3. **Integração real** com Mercado Livre e Shopee via OAuth per-user, substituindo todos os dados mockados

---

## Fase 1 — Tema claro/escuro

- Adicionar tokens light no `src/styles.css` (atualmente só temos dark). Manter o dark como padrão.
- Criar `ThemeProvider` com `localStorage` (`gpc-theme`: `dark` | `light` | `system`).
- Adicionar `ThemeToggle` no `Topbar` e no header da landing.
- Revisar componentes que usam cores fixas (gradientes, sombras) e garantir contraste em ambos os temas.

## Fase 2 — Autenticação (Lovable Cloud)

- Ativar **Lovable Cloud** (cria Supabase, auth, banco, secrets).
- Habilitar provider **Email/Password** (sem confirmação de email para acelerar testes).
- Criar migration:
  - tabela `profiles` (id FK `auth.users`, full_name, company, avatar_url, plan, created_at)
  - trigger `on_auth_user_created` que insere profile no signup
  - RLS: usuário só lê/atualiza seu próprio profile
- Criar rota pathless `_authenticated.tsx` com `beforeLoad` que redireciona para `/login` se não houver sessão.
- Mover todas as rotas internas (`dashboard`, `marketplaces`, `agents`, `listings`, `orders`, `chat`, `photos`, `logs`) para dentro de `_authenticated/`.
- Refatorar `/login`: substituir mock por `supabase.auth.signInWithPassword` e criar fluxo de cadastro `/signup`.
- Adicionar listener `onAuthStateChange` no `__root.tsx` para invalidar cache.
- Logout funcional no `Topbar`.

## Fase 3 — Estrutura de dados real

Substituir `src/lib/mock-data.ts` por tabelas reais com RLS (`user_id = auth.uid()`):

- `marketplace_connections` — conexões OAuth do usuário (provider, account_id, access_token criptografado, refresh_token, expires_at, scope)
- `agent_keys` — chaves de agente geradas (hash, permissões, status, last_used_at)
- `listings_cache` — espelho dos anúncios sincronizados
- `orders_cache` — espelho dos pedidos sincronizados
- `audit_logs` — trilha de auditoria

## Fase 4 — Integração Mercado Livre

OAuth per-user (você precisa criar app no [DevCenter ML](https://developers.mercadolivre.com.br)).

Secrets necessários (vou pedir via tool segura):
- `ML_APP_ID`
- `ML_CLIENT_SECRET`
- URL de callback: `https://<seu-domínio>/api/public/oauth/mercadolivre/callback`

Endpoints/server functions:
- `GET /api/public/oauth/mercadolivre/start` → gera state, redireciona para autorização ML
- `GET /api/public/oauth/mercadolivre/callback` → troca code por tokens, salva em `marketplace_connections`
- `syncMercadoLivreListings` (serverFn) → chama `/users/{id}/items/search` e popula cache
- `syncMercadoLivreOrders` (serverFn) → chama `/orders/search`
- `createMercadoLivreListing` (serverFn) → POST `/items` com refresh de token automático
- Helper `getMlAccessToken(userId)` com refresh automático quando expirado

## Fase 5 — Integração Shopee

OAuth per-user (você precisa criar app na [Shopee Open Platform](https://open.shopee.com)).

Secrets:
- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`
- URL de callback: `https://<seu-domínio>/api/public/oauth/shopee/callback`

Mesma estrutura de endpoints (start, callback, sync listings, sync orders, create listing) usando a Shopee Open API v2 com assinatura HMAC-SHA256 obrigatória em cada chamada.

## Fase 6 — Conectar UI às APIs reais

- `marketplaces.tsx`: botão "Conectar" abre fluxo OAuth real; "Sincronizar" chama serverFn
- `listings.tsx`: lê de `listings_cache` via `useSuspenseQuery`; "Criar anúncio" abre formulário e publica em ambos os marketplaces
- `orders.tsx`: lê de `orders_cache`; webhook opcional para atualizações em tempo real
- `agents.tsx`: gera/revoga chaves reais armazenadas no banco
- `dashboard.tsx`: gráficos e KPIs calculados das tabelas reais
- Estados de loading, empty state ("Conecte um marketplace para começar") e erros

---

## Detalhes técnicos

- Tokens OAuth ficam **apenas no servidor** (RLS estrito + service role para refresh). Frontend nunca vê access_token.
- Server functions usam `requireSupabaseAuth` para todas as operações user-scoped.
- Callbacks OAuth ficam em `src/routes/api/public/oauth/*` (sem auth middleware, mas validam `state`).
- Refresh de token automático com mutex simples para evitar race condition.
- Rate limiting básico in-memory nas serverFns que chamam APIs externas.

## O que vou precisar de você ao longo do caminho

1. Confirmar criação dos apps no DevCenter ML e Shopee Open Platform — eu te passo a URL de callback exata depois que a Fase 2 estiver pronta.
2. Inserir `ML_APP_ID`, `ML_CLIENT_SECRET`, `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY` quando eu pedir via formulário seguro.

## Ordem de execução proposta

Vou executar **Fase 1 + Fase 2 + Fase 3** nesta primeira rodada (tema + auth + esquema do banco, UI ainda usando dados vazios). Em seguida você valida o login, eu te peço as credenciais ML e implemento Fase 4. Depois Shopee (Fase 5). Por fim, ligo a UI nas APIs reais (Fase 6).

Posso começar?
