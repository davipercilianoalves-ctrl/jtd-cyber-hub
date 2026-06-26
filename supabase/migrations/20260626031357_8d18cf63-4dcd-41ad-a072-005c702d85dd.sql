ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ml_item_id TEXT;
CREATE INDEX IF NOT EXISTS idx_products_ml_item_id ON public.products(ml_item_id);
CREATE INDEX IF NOT EXISTS idx_ads_ml_item_id ON public.ads(ml_item_id);