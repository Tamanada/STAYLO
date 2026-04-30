-- ============================================================================
-- Storage bucket for property photos
-- ============================================================================
-- The application has been uploading to bucket `property-photos` since the
-- launch of the listing flow, but the bucket was created manually in some
-- environments and not at all in others — leading to silent upload failures
-- (Submit.jsx swallowed the storage error, so hoteliers thought their photos
-- saved when they didn't).
--
-- This migration is idempotent: creates the bucket if missing, ensures it's
-- public-read (we serve photos directly to anonymous OTA visitors), and sets
-- the right RLS policies so only owners can upload/delete their own photos.
-- ============================================================================

-- 1. Create the bucket if it doesn't exist. `public = true` means files are
--    served via getPublicUrl without a signed token — required for the OTA
--    cards which load photos for anonymous visitors.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  5242880,                                                -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]  -- restrict types
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS policies on storage.objects for this bucket.
--
--    Path convention used by Submit.jsx: properties/<property_id>/<filename>
--    The first path segment after the bucket id IS the literal "properties",
--    and the second is the property UUID. We enforce that the uploader owns
--    the property by joining storage.objects.path → properties.id → user_id.

-- Cleanup any prior versions of these policies (idempotent re-runs).
DROP POLICY IF EXISTS "Anyone can read property photos"      ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload property photos"     ON storage.objects;
DROP POLICY IF EXISTS "Owner can update own property photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own property photos" ON storage.objects;

-- Public read — anyone (incl. anonymous OTA visitors) can see the images.
CREATE POLICY "Anyone can read property photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

-- Owners may INSERT photos under their property's path.
-- (storage.foldername(name) returns the path segments as an array of text.)
CREATE POLICY "Owner can upload property photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND (
      -- The 2nd path segment is the property UUID — make sure the caller owns it.
      EXISTS (
        SELECT 1 FROM public.properties
        WHERE id = ((storage.foldername(name))[2])::uuid
          AND user_id = auth.uid()
      )
    )
  );

-- Owners may UPDATE metadata (rare, but needed for some Supabase Storage flows).
CREATE POLICY "Owner can update own property photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = ((storage.foldername(name))[2])::uuid
        AND user_id = auth.uid()
    )
  );

-- Owners may DELETE their own photos. Admins covered separately by their
-- service-role bypass and dashboard access.
CREATE POLICY "Owner can delete own property photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'properties'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = ((storage.foldername(name))[2])::uuid
        AND user_id = auth.uid()
    )
  );
