ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ml_item_id text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ml_item_ids text[];
CREATE INDEX IF NOT EXISTS ads_ml_item_id_idx ON public.ads (ml_item_id);