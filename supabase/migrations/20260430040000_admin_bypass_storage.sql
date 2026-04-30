-- ============================================================================
-- Admin bypass on property media storage policies
-- ============================================================================
-- Original policies (20260430020000 + 20260430030000) only allowed the
-- property OWNER to upload/update/delete their photos and videos.
--
-- Real-world need: admins must be able to manage media on any property
-- (support cases, fixing a hotelier's broken upload, validating a listing
-- before approval). The web admin already lets admins SEE every property
-- via "Admins can read all properties" — they should also be able to
-- WRITE to the matching Storage paths.
--
-- This migration recreates the 6 owner-only policies with an
-- `OR public.is_admin()` short-circuit at the top.
-- ============================================================================

-- ─── PHOTOS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can upload property photos" ON storage.objects;
CREATE POLICY "Owner can upload property photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owner can update own property photos" ON storage.objects;
CREATE POLICY "Owner can update own property photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owner can delete own property photos" ON storage.objects;
CREATE POLICY "Owner can delete own property photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );

-- ─── VIDEOS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can upload property videos" ON storage.objects;
CREATE POLICY "Owner can upload property videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owner can update own property videos" ON storage.objects;
CREATE POLICY "Owner can update own property videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owner can delete own property videos" ON storage.objects;
CREATE POLICY "Owner can delete own property videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'properties'
        AND EXISTS (
          SELECT 1 FROM public.properties
          WHERE id = ((storage.foldername(name))[2])::uuid
            AND user_id = auth.uid()
        )
      )
    )
  );
