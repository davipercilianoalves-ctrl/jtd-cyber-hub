
-- ============================================================
-- 1) ALTER TABLE kits — adiciona todas as colunas que faltavam
-- ============================================================
ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS production_type text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS cost_price numeric,
  ADD COLUMN IF NOT EXISTS price_lists jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS gtin_tax text,
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS volumes integer,
  ADD COLUMN IF NOT EXISTS items_per_box integer,
  ADD COLUMN IF NOT EXISTS expiration_date date,
  ADD COLUMN IF NOT EXISTS width numeric,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS depth numeric,
  ADD COLUMN IF NOT EXISTS net_weight_g numeric,
  ADD COLUMN IF NOT EXISTS gross_weight_g numeric,
  ADD COLUMN IF NOT EXISTS weight_g integer,
  ADD COLUMN IF NOT EXISTS measurement_unit text,
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS common_questions text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 2) kit_competitors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kit_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text,
  description text,
  price numeric,
  url text,
  keywords_found text[] DEFAULT '{}',
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_competitors TO authenticated;
GRANT ALL ON public.kit_competitors TO service_role;

ALTER TABLE public.kit_competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kit_competitors_owner_all" ON public.kit_competitors;
CREATE POLICY "kit_competitors_owner_all"
  ON public.kit_competitors
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS kit_competitors_kit_id_idx ON public.kit_competitors(kit_id);

-- ============================================================
-- 3) kit_images
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kit_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_images TO authenticated;
GRANT ALL ON public.kit_images TO service_role;

ALTER TABLE public.kit_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kit_images_owner_all" ON public.kit_images;
CREATE POLICY "kit_images_owner_all"
  ON public.kit_images
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS kit_images_kit_id_idx ON public.kit_images(kit_id);

-- ============================================================
-- 4) Storage policies para kit-images e kit-videos
--    (pasta raíz = userId/...)
-- ============================================================
DROP POLICY IF EXISTS "kit_images_select_own" ON storage.objects;
CREATE POLICY "kit_images_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kit-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_images_insert_own" ON storage.objects;
CREATE POLICY "kit_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kit-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_images_update_own" ON storage.objects;
CREATE POLICY "kit_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kit-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'kit-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_images_delete_own" ON storage.objects;
CREATE POLICY "kit_images_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kit-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_videos_select_own" ON storage.objects;
CREATE POLICY "kit_videos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kit-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_videos_insert_own" ON storage.objects;
CREATE POLICY "kit_videos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kit-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_videos_update_own" ON storage.objects;
CREATE POLICY "kit_videos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kit-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'kit-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kit_videos_delete_own" ON storage.objects;
CREATE POLICY "kit_videos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kit-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
