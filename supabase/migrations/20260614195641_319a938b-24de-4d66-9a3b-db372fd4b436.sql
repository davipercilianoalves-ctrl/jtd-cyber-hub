CREATE TABLE public.metrics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  cache_key text NOT NULL UNIQUE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metrics_cache TO authenticated;
GRANT ALL ON public.metrics_cache TO service_role;

ALTER TABLE public.metrics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select metrics_cache" ON public.metrics_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert metrics_cache" ON public.metrics_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update metrics_cache" ON public.metrics_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete metrics_cache" ON public.metrics_cache FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_metrics_cache_expires_at ON public.metrics_cache(expires_at);