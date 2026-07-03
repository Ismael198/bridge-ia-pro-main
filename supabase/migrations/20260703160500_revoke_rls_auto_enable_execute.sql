-- Migration: revoke_rls_auto_enable_execute
-- PR-0 (segurança). Remove o EXECUTE público da função de event trigger
-- public.rls_auto_enable(), corrigindo os advisors:
--   0028_anon_security_definer_function_executable
--   0029_authenticated_security_definer_function_executable
--
-- CONTEXTO: rls_auto_enable() é uma função de EVENT TRIGGER (dispara em CREATE TABLE
-- para habilitar RLS automaticamente). Ela NÃO precisa ser chamável por RPC. Com o
-- grant default de EXECUTE a PUBLIC, ficava exposta em /rest/v1/rpc/rls_auto_enable
-- para anon/authenticated.
--
-- CONTROLE: revogar EXECUTE de PUBLIC/anon/authenticated. A função permanece
-- SECURITY DEFINER (necessário para `alter table ... enable row level security`) e
-- o disparo pelo event trigger é feito pelo sistema, sem depender desse grant —
-- portanto a automação de RLS continua funcionando.

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;
