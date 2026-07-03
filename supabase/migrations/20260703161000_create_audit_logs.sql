-- Migration: create_audit_logs
-- PR-1 (Fundação). Recria a tabela de auditoria no schema remoto "fase1a".
-- O código legado gravava em public.audit_logs (que não existe no remoto). Optamos por
-- CRIAR a tabela (auditoria é barata e útil) em vez de degradar o logging.
--
-- Convenção do schema novo: chave do dono = seller_id → auth.users (igual marketplace_accounts).
-- Escrita só server-side (service_role bypassa RLS); dono lê os próprios registros.

create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references auth.users (id) on delete cascade,
  actor      text not null default 'user',
  action     text not null,
  target     text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Dono autenticado lê seus próprios logs. Sem policy de INSERT/UPDATE/DELETE:
-- anon/authenticated não escrevem; apenas o backend (service_role) grava.
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated
  using (auth.uid() = seller_id);

create index if not exists audit_logs_seller_created_idx
  on public.audit_logs (seller_id, created_at desc);
