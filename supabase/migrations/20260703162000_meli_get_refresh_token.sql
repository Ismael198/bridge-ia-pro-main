-- Migration: meli_get_refresh_token
-- PR-4 (Tokens). RPC server-only que retorna o refresh_token DECRIPTADO de UMA
-- conta específica, para o fluxo de renovação de token do Mercado Livre.
--
-- Por que uma RPC dedicada em vez de meli_accounts_needing_refresh?
-- Aquela devolve os refresh_tokens de TODAS as contas próximas do vencimento (de
-- todos os vendedores). Para renovar o token de uma conta, precisamos de apenas
-- um segredo — expor os demais seria exposição desnecessária. Esta RPC devolve o
-- refresh_token de uma única conta, minimizando a superfície.
--
-- CONTROLES (idênticos a meli_get_access_token):
--   SECURITY DEFINER + search_path=''; EXECUTE só para service_role
--   (anon/authenticated sem acesso); leitura via Vault; nunca logar o retorno.

create or replace function public.meli_get_refresh_token(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token text;
begin
  select ds.decrypted_secret
    into v_token
    from public.marketplace_accounts a
    join vault.decrypted_secrets ds
      on ds.id = a.refresh_token_encrypted::uuid
    where a.id = p_account_id;
  return v_token;
end;
$function$;

revoke all on function public.meli_get_refresh_token(uuid) from public;
revoke all on function public.meli_get_refresh_token(uuid) from anon;
revoke all on function public.meli_get_refresh_token(uuid) from authenticated;
grant execute on function public.meli_get_refresh_token(uuid) to service_role;

comment on function public.meli_get_refresh_token(uuid) is
  'SERVER-ONLY (service_role). Retorna o refresh_token Mercado Livre DECRIPTADO de uma conta. NUNCA expor a client/anon/authenticated, logs ou respostas públicas.';
