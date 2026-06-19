ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Backfill positions per product, ordered by created_at
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY product_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.product_images
)
UPDATE public.product_images p SET position = r.rn FROM ranked r WHERE p.id = r.id;

CREATE INDEX IF NOT EXISTS idx_product_images_product_position ON public.product_images(product_id, position);