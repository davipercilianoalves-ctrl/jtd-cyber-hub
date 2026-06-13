
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images auth insert" ON storage.objects;
CREATE POLICY "product-images auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images auth update" ON storage.objects;
CREATE POLICY "product-images auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images auth delete" ON storage.objects;
CREATE POLICY "product-images auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');
