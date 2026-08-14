-- Admin RLS bypass for the tables the /manage page WRITES to and where
-- an admin policy was missing.
--
-- Existing state audited before this migration:
--   properties         → admin SELECT ✓  · admin DELETE ✓  · admin UPDATE ✗
--   rooms              → admin ALL ✓  (already fully open to admins)
--   room_availability  → admin ALL ✓
--   room_packages      → no admin policy at all
--
-- Result: an admin opened /dashboard/property/{id}/manage as staff,
-- saw the Settings form fine (SELECT worked via "Admins can read"),
-- but Save silently no-op'd because UPDATE fell through to the
-- owner-only policy ("Users can update own properties" — auth.uid()
-- = user_id). Same silent break on package edits.
--
-- This migration adds the two missing pieces. INSERT on properties
-- stays owner-only (support isn't creating new hotels from the admin
-- panel — that's a separate onboarding flow with legal implications).

-- ── properties.UPDATE for admins ────────────────────────────────────
CREATE POLICY "Admins can update all properties" ON public.properties
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── room_packages.ALL for admins ────────────────────────────────────
-- Junction table (rooms ↔ packages). Add a broad admin policy so
-- support can adjust linked packages / date-blocks / quantities in
-- the client's Rooms edit form.
CREATE POLICY "Admins can manage all room_packages" ON public.room_packages
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
