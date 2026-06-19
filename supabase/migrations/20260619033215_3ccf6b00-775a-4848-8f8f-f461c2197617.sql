
-- ============ sale_overrides ============
ALTER TABLE public.sale_overrides ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated can select sale_overrides" ON public.sale_overrides;
DROP POLICY IF EXISTS "Authenticated can insert sale_overrides" ON public.sale_overrides;
DROP POLICY IF EXISTS "Authenticated can update sale_overrides" ON public.sale_overrides;
DROP POLICY IF EXISTS "Authenticated can delete sale_overrides" ON public.sale_overrides;

CREATE POLICY "Users select own sale_overrides" ON public.sale_overrides
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sale_overrides" ON public.sale_overrides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sale_overrides" ON public.sale_overrides
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sale_overrides" ON public.sale_overrides
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ metrics_cache ============
ALTER TABLE public.metrics_cache ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated can select metrics_cache" ON public.metrics_cache;
DROP POLICY IF EXISTS "Authenticated can insert metrics_cache" ON public.metrics_cache;
DROP POLICY IF EXISTS "Authenticated can update metrics_cache" ON public.metrics_cache;
DROP POLICY IF EXISTS "Authenticated can delete metrics_cache" ON public.metrics_cache;

CREATE POLICY "Users select own metrics_cache" ON public.metrics_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own metrics_cache" ON public.metrics_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own metrics_cache" ON public.metrics_cache
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own metrics_cache" ON public.metrics_cache
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ storage: product-images ============
DROP POLICY IF EXISTS "Authenticated delete product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "product-images auth delete" ON storage.objects;
DROP POLICY IF EXISTS "product-images auth insert" ON storage.objects;
DROP POLICY IF EXISTS "product-images auth update" ON storage.objects;

CREATE POLICY "Users upload own product-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own product-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own product-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
