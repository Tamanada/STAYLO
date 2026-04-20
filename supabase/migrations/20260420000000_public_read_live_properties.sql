-- ============================================
-- Migration: Allow public read of live/validated properties
-- Date: 2026-04-20
-- Purpose: Before this migration, the only SELECT policy on
--          public.properties was "Users can read own properties"
--          (auth.uid() = user_id). That meant a traveler browsing
--          the booking engine could NEVER see any hotel other than
--          their own — fatally restrictive for a marketplace.
--
--          This migration adds a policy that lets anyone (incl.
--          anonymous visitors) read properties whose status is
--          'live' or 'validated'. Owners still see all their own
--          properties regardless of status (existing policy).
-- ============================================

CREATE POLICY "Anyone can read live properties"
  ON public.properties
  FOR SELECT
  USING (status IN ('live', 'validated'));

-- No need to drop the existing owner policy; Postgres OR's multiple
-- permissive SELECT policies together, so owners keep full read
-- access to pending/reviewing/validated/live items of their own.
