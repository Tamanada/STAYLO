-- ============================================================================
-- Property videos — DB column + Storage bucket + RLS
-- ============================================================================
-- Mirrors the property-photos pattern from 20260430020000:
--   - new column properties.video_urls text[]
--   - new bucket `property-videos` (public read, MP4/MOV/WebM, 50 MB cap)
--   - same owner-based RLS policies on storage.objects
--
-- Hoteliers can upload up to 2 videos per property — typical use is 1
-- cover hero video (60 s teaser) and optionally 1 room tour. Videos are
-- played natively in <video> tags via the public URL.
-- ============================================================================

-- 1. Add the column. Default empty array so existing rows are not nullable.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.properties.video_urls IS
  'Public URLs of videos uploaded to bucket property-videos. First entry is the cover/hero video shown on PropertyDetail.';

-- 2. Create the bucket (idempotent — same shape as property-photos).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-videos',
  'property-videos',
  true,
  52428800,                                                            -- 50 MB max per file
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']::text[]          -- MP4 / MOV / WebM
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS policies on storage.objects for the new bucket.
--    Path convention: properties/<property_id>/<filename>
DROP POLICY IF EXISTS "Anyone can read property videos"      ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload property videos"     ON storage.objects;
DROP POLICY IF EXISTS "Owner can update own property videos" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own property videos" ON storage.objects;

-- Public read — OTA visitors (anon) need to play videos
CREATE POLICY "Anyone can read property videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-videos');

CREATE POLICY "Owner can upload property videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = ((storage.foldername(name))[2])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update own property videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = ((storage.foldername(name))[2])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete own property videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = ((storage.foldername(name))[2])::uuid
        AND user_id = auth.uid()
    )
  );
