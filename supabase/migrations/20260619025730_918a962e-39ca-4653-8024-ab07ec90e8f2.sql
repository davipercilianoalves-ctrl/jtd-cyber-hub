
-- Add video_path column to ads (video_youtube_url already exists for external link)
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS video_path TEXT;

-- Create ad_images table for direct ad uploads
CREATE TABLE IF NOT EXISTS public.ad_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_images TO authenticated;
GRANT ALL ON public.ad_images TO service_role;

ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ad images" ON public.ad_images;
CREATE POLICY "Users manage own ad images"
  ON public.ad_images FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ad_images_ad_id ON public.ad_images(ad_id);

-- Storage policies for ad-images and ad-videos buckets (buckets created via dashboard)
DROP POLICY IF EXISTS "Users read own ad images" ON storage.objects;
CREATE POLICY "Users read own ad images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own ad images" ON storage.objects;
CREATE POLICY "Users upload own ad images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own ad images" ON storage.objects;
CREATE POLICY "Users delete own ad images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users read own ad videos" ON storage.objects;
CREATE POLICY "Users read own ad videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own ad videos" ON storage.objects;
CREATE POLICY "Users upload own ad videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own ad videos" ON storage.objects;
CREATE POLICY "Users delete own ad videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
