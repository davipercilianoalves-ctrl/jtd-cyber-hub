
CREATE TABLE IF NOT EXISTS public.order_cost_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  packaging_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  transport_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, order_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_cost_overrides TO authenticated;
GRANT ALL ON public.order_cost_overrides TO service_role;

ALTER TABLE public.order_cost_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own order cost overrides"
  ON public.order_cost_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_order_cost_overrides_updated_at
  BEFORE UPDATE ON public.order_cost_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
