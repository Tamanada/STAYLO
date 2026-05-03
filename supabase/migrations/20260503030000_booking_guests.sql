-- ============================================================================
-- booking_guests — register every individual person on a booking
-- ============================================================================
-- The bookings table stores ONE guest_name + email + phone — the lead booker.
-- For real hotel ops we need to track every person checking in:
--   - Thailand TM30 immigration law requires hotels to register every
--     foreign guest with name + nationality + passport # within 24h
--   - Even for domestic guests, knowing who's actually in the room matters
--     for fire safety, insurance claims, lost-and-found, repeat-guest CRM
--
-- Design:
--   - One row per individual on the booking. Lead booker is is_lead = true.
--   - Children allowed (no passport required, just name + nationality + DOB
--     so the front desk knows there's a minor in the room).
--   - Cascades on booking delete — if you wipe the booking (e.g. via the
--     Undo toast), guest records vanish too.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_guests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Identity
  first_name      text NOT NULL,
  last_name       text,
  nationality     text,                    -- ISO 3166-1 alpha-2 (e.g. 'FR', 'TH', 'GB')
  passport_number text,
  date_of_birth   date,                    -- optional, useful for under-18 flagging

  -- Role on the booking
  is_lead         boolean NOT NULL DEFAULT false,    -- the booker / contact person
  is_child        boolean NOT NULL DEFAULT false,    -- under-13 typically

  -- Free-form notes (allergies, special requests, ID type if not passport)
  notes           text,

  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- A booking can only have one lead at a time
CREATE UNIQUE INDEX IF NOT EXISTS booking_guests_one_lead_idx
  ON public.booking_guests (booking_id)
  WHERE is_lead = true;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS booking_guests_booking_idx ON public.booking_guests (booking_id);
CREATE INDEX IF NOT EXISTS booking_guests_passport_idx
  ON public.booking_guests (passport_number)
  WHERE passport_number IS NOT NULL;

-- ============================================================================
-- RLS — same audience as bookings: property staff + admins
-- ============================================================================
ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;

-- SELECT: property staff (any role) can view their bookings' guests
DROP POLICY IF EXISTS "Property staff can view booking guests" ON public.booking_guests;
CREATE POLICY "Property staff can view booking guests" ON public.booking_guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_guests.booking_id
        AND public.is_property_member(b.property_id)
    )
  );

-- INSERT: property staff can register guests on their bookings
DROP POLICY IF EXISTS "Property staff can register booking guests" ON public.booking_guests;
CREATE POLICY "Property staff can register booking guests" ON public.booking_guests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_guests.booking_id
        AND public.is_property_member(b.property_id)
    )
  );

-- UPDATE: property staff can correct guest info post-check-in
DROP POLICY IF EXISTS "Property staff can update booking guests" ON public.booking_guests;
CREATE POLICY "Property staff can update booking guests" ON public.booking_guests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_guests.booking_id
        AND public.is_property_member(b.property_id)
    )
  );

-- DELETE: property staff can remove an erroneously-added guest
DROP POLICY IF EXISTS "Property staff can delete booking guests" ON public.booking_guests;
CREATE POLICY "Property staff can delete booking guests" ON public.booking_guests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_guests.booking_id
        AND public.is_property_member(b.property_id)
    )
  );

-- Admins always
DROP POLICY IF EXISTS "Admins manage all booking guests" ON public.booking_guests;
CREATE POLICY "Admins manage all booking guests" ON public.booking_guests
  FOR ALL USING (public.is_admin());

COMMENT ON TABLE public.booking_guests IS 'Individual person registry per booking — for TM30 compliance and hotel ops.';
COMMENT ON COLUMN public.booking_guests.is_lead IS 'TRUE for the booker / primary contact. Only one lead per booking (partial unique index).';
COMMENT ON COLUMN public.booking_guests.nationality IS 'ISO 3166-1 alpha-2 country code, uppercase (FR, TH, GB).';
