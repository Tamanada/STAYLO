-- ============================================
-- Migration: Allow public read of rooms + availability for live properties
-- Date: 2026-04-26
-- Purpose: Mirror of 20260420000000_public_read_live_properties.sql but
--          for the rooms and room_availability tables. Without this,
--          guests browsing /ota/:propertyId see "No rooms available"
--          even though the hotelier created rooms in /dashboard/property/:id.
--
--          Existing policies on these tables only granted SELECT to
--          authenticated users (anon visitors blocked) AND only the
--          owner (RLS scoped to auth.uid()) — fatally restrictive for
--          a marketplace whose whole point is that anyone can browse
--          and book.
-- ============================================

-- ────────────────────────────────────────────
-- ROOMS — anyone can read active rooms of live/validated properties
-- ────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read active rooms of live properties" ON public.rooms;
CREATE POLICY "Anyone can read active rooms of live properties"
  ON public.rooms
  FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.status IN ('live', 'validated')
    )
  );

-- ────────────────────────────────────────────
-- ROOM_AVAILABILITY — anyone can read availability of active rooms in live properties
-- ────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read availability of public rooms" ON public.room_availability;
CREATE POLICY "Anyone can read availability of public rooms"
  ON public.room_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_availability.room_id
        AND r.is_active = TRUE
        AND p.status IN ('live', 'validated')
    )
  );

-- Existing policies remain in place (they are OR-ed by Postgres):
--   - "Owners can manage own rooms" / "Owners can manage own room availability"
--     → owners still see their own rooms regardless of status
--   - "Authenticated users can view active rooms" / "Authenticated users can view availability"
--     → keep working for logged-in users
--   - "Admins can manage all rooms" / "Admins can manage all availability"
--     → admin override
