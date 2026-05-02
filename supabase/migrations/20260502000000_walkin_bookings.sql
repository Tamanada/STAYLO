-- ============================================================================
-- bookings — support walk-in check-ins from the Front Desk
-- ============================================================================
-- Until now, every booking required a guest_id pointing to an auth.users row,
-- because every booking went through the public booking flow (guest signs up
-- on staylo.app, books online, pays via Stripe).
--
-- For real-world hotel operations the front desk regularly checks in walk-ins
-- — guests who show up unannounced, with cash or a local payment method. The
-- hotelier needs to record the booking immediately to mark the room occupied,
-- track availability, and run reports — but the guest may never create an
-- account.
--
-- This migration:
--   1. Makes bookings.guest_id NULLABLE (walk-ins have no account)
--   2. Adds bookings.booking_source ('online' | 'walk_in' | 'phone' | 'email')
--   3. Adds RLS policy: property owners/managers can INSERT walk-in bookings
--      for their own property (no guest_id required, but guest_name must be set)
--   4. Adds CHECK: a booking must EITHER have a guest_id OR be a walk-in with
--      a guest_name set — never both empty.
-- ============================================================================

-- 1. Allow null guest_id for walk-ins
ALTER TABLE public.bookings
  ALTER COLUMN guest_id DROP NOT NULL;

-- 2. Track where the booking came from
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'online'
    CHECK (booking_source IN ('online', 'walk_in', 'phone', 'email'));

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(booking_source);

-- 3. Integrity: must have an identity — either an account OR a recorded name
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_guest_identity;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_guest_identity
    CHECK (
      guest_id IS NOT NULL
      OR (booking_source <> 'online' AND guest_name IS NOT NULL AND length(trim(guest_name)) > 0)
    );

-- 4. RLS: property owners + managers can create walk-in bookings for their property
DROP POLICY IF EXISTS "Property staff can create walk-in bookings" ON public.bookings;
CREATE POLICY "Property staff can create walk-in bookings" ON public.bookings
  FOR INSERT
  WITH CHECK (
    booking_source <> 'online'
    AND public.is_property_member(property_id)
  );

-- 5. RLS: property staff can update bookings for their property (already exists
--    for owners; this extends to all property_members so managers can check
--    guests in/out, mark no-shows, etc.)
DROP POLICY IF EXISTS "Property staff can update bookings" ON public.bookings;
CREATE POLICY "Property staff can update bookings" ON public.bookings
  FOR UPDATE
  USING (public.is_property_member(property_id))
  WITH CHECK (public.is_property_member(property_id));

-- 6. RLS: property staff can SELECT all bookings for their property (the
--    existing 'Owners can view property bookings' policy only covers owners)
DROP POLICY IF EXISTS "Property staff can view bookings" ON public.bookings;
CREATE POLICY "Property staff can view bookings" ON public.bookings
  FOR SELECT
  USING (public.is_property_member(property_id));

COMMENT ON COLUMN public.bookings.guest_id       IS 'NULL for walk-in bookings (guest paid in person, no account).';
COMMENT ON COLUMN public.bookings.booking_source IS 'How the booking was created: online (guest self-served), walk_in (front desk), phone, email.';
COMMENT ON CONSTRAINT bookings_guest_identity ON public.bookings IS
  'Every booking must identify the guest somehow: either an account (guest_id) or a name (walk_in/phone/email).';
