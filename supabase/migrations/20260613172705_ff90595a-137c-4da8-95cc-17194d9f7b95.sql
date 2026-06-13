CREATE TABLE public.sale_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ml_order_id text NOT NULL,
  ml_item_id text NOT NULL,
  custom_cost_price numeric(10,2),
  notes text,
  UNIQUE (ml_order_id, ml_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_overrides TO authenticated;
GRANT ALL ON public.sale_overrides TO service_role;

ALTER TABLE public.sale_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select sale_overrides" ON public.sale_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sale_overrides" ON public.sale_overrides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sale_overrides" ON public.sale_overrides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete sale_overrides" ON public.sale_overrides FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sale_overrides_updated_at BEFORE UPDATE ON public.sale_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();