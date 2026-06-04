
-- Fix set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict SECURITY DEFINER function execution (trigger uses owner privileges directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- oauth_states is service-role only; add restrictive policy to silence linter
CREATE POLICY "oauth_states_no_client_access" ON public.oauth_states
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
