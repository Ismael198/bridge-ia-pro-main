-- Migration: meli_get_access_token
-- Fase 4 (habilitador): RPC server-only para obter o access_token DECRIPTADO do
-- Mercado Livre de um vendedor, sem expor o segredo ao frontend.
--
-- ┌─────────────────────────── MODELO DE SEGURANÇA ───────────────────────────┐
-- │ RISCO: a função devolve um segredo em texto claro (access_token). Se ficar │
-- │ acessível a `anon`/`authenticated`, qualquer usuário logado poderia ler o  │
-- │ token de OUTRA conta via PostgREST (/rest/v1/rpc/meli_get_access_token).   │
-- │                                                                            │
-- │ CONTROLES:                                                                 │
-- │  1. SECURITY DEFINER + `set search_path = ''`: roda como o owner (postgres)│
-- │     e usa apenas nomes totalmente qualificados — imune a search_path       │
-- │     hijacking. Mesmo padrão das RPCs meli_* já existentes.                 │
-- │  2. EXECUTE REVOGADO de PUBLIC/anon/authenticated e concedido APENAS a     │
-- │     service_role. Só o backend (service key) consegue chamar.              │
-- │  3. Não emite o token em log/RAISE. O chamador (server) NUNCA deve colocar │
-- │     o retorno em resposta HTTP, log ou payload client-side.                │
-- │  4. Leitura do texto claro só via Supabase Vault (vault.decrypted_secrets),│
-- │     idêntico a meli_accounts_needing_refresh.                              │
-- └────────────────────────────────────────────────────────────────────────────┘

create or replace function public.meli_get_access_token(p_seller_id uuid)
returns table (
  account_id          uuid,
  external_account_id text,
  access_token        text,
  token_expires_at    timestamptz,
  status              text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Devolve a conta Mercado Livre mais recente do vendedor com o token já decriptado.
  -- (multi-conta por vendedor é tratado numa fase futura; aqui mantemos a semântica
  --  legada de "uma conexão por usuário/provider".)
  return query
    select a.id,
           a.external_account_id,
           ds.decrypted_secret,
           a.token_expires_at,
           a.status
    from public.marketplace_accounts a
    join vault.decrypted_secrets ds
      on ds.id = a.access_token_encrypted::uuid
    where a.seller_id = p_seller_id
      and a.marketplace = 'mercado_livre'
    order by a.created_at desc
    limit 1;
end;
$function$;

-- ── Lockdown de permissões ──────────────────────────────────────────────────
-- Remove o EXECUTE default (PUBLIC) e qualquer acesso de anon/authenticated,
-- deixando apenas o backend (service_role). Owner (postgres) mantém acesso.
revoke all on function public.meli_get_access_token(uuid) from public;
revoke all on function public.meli_get_access_token(uuid) from anon;
revoke all on function public.meli_get_access_token(uuid) from authenticated;
grant execute on function public.meli_get_access_token(uuid) to service_role;

comment on function public.meli_get_access_token(uuid) is
  'SERVER-ONLY (service_role). Retorna o access_token Mercado Livre DECRIPTADO do vendedor. '
  'NUNCA expor o retorno a client/anon/authenticated, logs ou respostas públicas.';
