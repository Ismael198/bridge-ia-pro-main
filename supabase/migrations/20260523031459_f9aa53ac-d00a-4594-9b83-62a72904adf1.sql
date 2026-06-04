
-- Profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Marketplace connections (OAuth tokens stored server-side, RLS strict)
CREATE TYPE public.marketplace_provider AS ENUM ('mercadolivre', 'shopee');
CREATE TYPE public.connection_status AS ENUM ('connected', 'disconnected', 'error', 'expired');

CREATE TABLE public.marketplace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.marketplace_provider NOT NULL,
  account_id TEXT,
  account_label TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  status public.connection_status NOT NULL DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, account_id)
);

ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;

-- Users can READ their connections metadata, but tokens should be filtered in serverFn
CREATE POLICY "mc_select_own" ON public.marketplace_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mc_delete_own" ON public.marketplace_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE only via service role (server functions)

CREATE TRIGGER mc_set_updated_at
  BEFORE UPDATE ON public.marketplace_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Agent API keys
CREATE TYPE public.agent_key_status AS ENUM ('active', 'revoked');

CREATE TABLE public.agent_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status public.agent_key_status NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ak_select_own" ON public.agent_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ak_insert_own" ON public.agent_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ak_update_own" ON public.agent_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ak_delete_own" ON public.agent_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Cached listings synced from marketplaces
CREATE TABLE public.listings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.marketplace_connections(id) ON DELETE CASCADE,
  provider public.marketplace_provider NOT NULL,
  external_id TEXT NOT NULL,
  sku TEXT,
  title TEXT NOT NULL,
  price NUMERIC(12,2),
  stock INTEGER,
  status TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id, user_id)
);

ALTER TABLE public.listings_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_select_own" ON public.listings_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Cached orders
CREATE TABLE public.orders_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.marketplace_connections(id) ON DELETE CASCADE,
  provider public.marketplace_provider NOT NULL,
  external_id TEXT NOT NULL,
  customer_name TEXT,
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  status TEXT,
  ordered_at TIMESTAMPTZ,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id, user_id)
);

ALTER TABLE public.orders_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oc_select_own" ON public.orders_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_select_own" ON public.audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- OAuth state for CSRF protection during marketplace authorization
CREATE TABLE public.oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.marketplace_provider NOT NULL,
  code_verifier TEXT,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- No client policies; only service role writes/reads
