CREATE UNIQUE INDEX IF NOT EXISTS listings_cache_provider_external_id_key
  ON public.listings_cache (provider, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_cache_provider_external_id_key
  ON public.orders_cache (provider, external_id);