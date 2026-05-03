-- ============================================================================
-- check_in_token — public token-based guest self-check-in
-- ============================================================================
-- Each booking gets a stable random UUID at creation time. The QR code on the
-- receptionist's screen encodes:
--   https://staylo.app/checkin/<token>
--
-- Anyone holding the token can register themselves as a guest on that
-- booking. The token IS the access control — same model as Calendly,
-- Doodle, Google Forms shareable links. Token is regenerable if leaked.
--
-- Insert path: SECURITY DEFINER function so an anon visitor can write into
-- the RLS-protected booking_guests table without bypassing the validation
-- (cap on guest count, check-out date check, etc.).
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS bookings_check_in_token_idx
  ON public.bookings (check_in_token);

COMMENT ON COLUMN public.bookings.check_in_token IS
  'Random UUID encoded in the QR code shown at check-in. Anyone holding it can self-register as a guest. Rotate if leaked.';

-- Backfill any pre-existing bookings (the DEFAULT only fires on new rows).
UPDATE public.bookings SET check_in_token = gen_random_uuid()
 WHERE check_in_token IS NULL;

-- ============================================================================
-- register_booking_guest_via_token — public-facing insert function
-- ============================================================================
-- Validates the token, the booking dates, and the guest cap, then inserts
-- one row into booking_guests. Returns the new guest id.
-- Raises a clear error on each failure mode so the public form can surface
-- it to the user.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_booking_guest_via_token(
  p_token                  uuid,
  p_first_name             text,
  p_last_name              text DEFAULT NULL,
  p_sex                    text DEFAULT NULL,
  p_date_of_birth          date DEFAULT NULL,
  p_nationality            text DEFAULT NULL,
  p_passport_number        text DEFAULT NULL,
  p_travel_doc_type        text DEFAULT 'passport',
  p_thailand_arrival_date  date DEFAULT NULL,
  p_thailand_port_of_entry text DEFAULT NULL,
  p_visa_type              text DEFAULT NULL,
  p_visa_number            text DEFAULT NULL,
  p_is_child               boolean DEFAULT false,
  p_user_id                uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id  uuid;
  v_check_out   date;
  v_capacity    int;
  v_registered  int;
  v_new_id      uuid;
BEGIN
  -- Required input
  IF p_token IS NULL OR p_first_name IS NULL OR length(trim(p_first_name)) = 0 THEN
    RAISE EXCEPTION 'first_name and token are required'
      USING ERRCODE = '22023', HINT = 'Provide your first name to check in.';
  END IF;

  -- Find the booking + capacity
  SELECT id,
         check_out,
         (COALESCE(adults, 1) + COALESCE(children, 0) + COALESCE(extra_beds_count, 0))
    INTO v_booking_id, v_check_out, v_capacity
    FROM public.bookings
   WHERE check_in_token = p_token;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Invalid check-in link'
      USING ERRCODE = 'P0002', HINT = 'Ask the front desk for the QR code.';
  END IF;

  IF v_check_out < CURRENT_DATE THEN
    RAISE EXCEPTION 'This check-in link expired on %', v_check_out
      USING ERRCODE = 'P0001', HINT = 'The booking has already checked out.';
  END IF;

  -- Cap check
  SELECT count(*) INTO v_registered
    FROM public.booking_guests
   WHERE booking_id = v_booking_id;

  IF v_registered >= v_capacity THEN
    RAISE EXCEPTION 'All % guests already checked in for this booking', v_capacity
      USING ERRCODE = 'P0001', HINT = 'Ask the front desk to add another bed if you need to check in.';
  END IF;

  -- Insert. is_lead = true only for the very first registration (when no
  -- one else has registered yet AND the booking has no lead currently).
  INSERT INTO public.booking_guests (
    booking_id, first_name, last_name, sex, nationality, date_of_birth,
    passport_number, travel_doc_type, thailand_arrival_date,
    thailand_port_of_entry, visa_type, visa_number,
    is_lead, is_child, created_by
  ) VALUES (
    v_booking_id,
    trim(p_first_name),
    NULLIF(trim(COALESCE(p_last_name, '')), ''),
    NULLIF(p_sex, ''),
    NULLIF(upper(trim(COALESCE(p_nationality, ''))), ''),
    p_date_of_birth,
    NULLIF(trim(COALESCE(p_passport_number, '')), ''),
    COALESCE(NULLIF(p_travel_doc_type, ''), 'passport'),
    p_thailand_arrival_date,
    NULLIF(upper(trim(COALESCE(p_thailand_port_of_entry, ''))), ''),
    NULLIF(p_visa_type, ''),
    NULLIF(trim(COALESCE(p_visa_number, '')), ''),
    -- Auto-promote first-ever registrant to lead if no lead exists yet
    NOT EXISTS (
      SELECT 1 FROM public.booking_guests
       WHERE booking_id = v_booking_id AND is_lead = true
    ),
    p_is_child,
    p_user_id
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Public functions need explicit grant — anon role calls this from the
-- browser when the visitor isn't logged in. The function itself enforces
-- all the validation, so this is safe.
GRANT EXECUTE ON FUNCTION public.register_booking_guest_via_token(
  uuid, text, text, text, date, text, text, text, date, text, text, text, boolean, uuid
) TO anon, authenticated;

COMMENT ON FUNCTION public.register_booking_guest_via_token IS
  'Public token-based guest self-registration. Validates token + capacity + check-out date. Used by the /checkin/<token> page.';

-- ============================================================================
-- get_booking_for_checkin — public read, returns SAFE booking info only
-- ============================================================================
-- The public check-in page needs to show "Welcome to {hotel} — booking for
-- {lead} from {check_in} to {check_out}". It must NOT expose private data
-- like the price, payment method, internal notes, etc.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_booking_for_checkin(p_token uuid)
RETURNS TABLE (
  booking_id      uuid,
  property_name   text,
  property_city   text,
  room_name       text,
  check_in        date,
  check_out       date,
  capacity        int,
  registered      int,
  lead_name       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    p.name,
    p.city,
    r.name,
    b.check_in,
    b.check_out,
    (COALESCE(b.adults, 1) + COALESCE(b.children, 0) + COALESCE(b.extra_beds_count, 0))::int,
    (SELECT count(*)::int FROM public.booking_guests bg WHERE bg.booking_id = b.id),
    b.guest_name
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.rooms      r ON r.id = b.room_id
  WHERE b.check_in_token = p_token
    AND b.check_out >= CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_for_checkin(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_booking_for_checkin IS
  'Public read for the /checkin/<token> page. Returns ONLY the fields safe to show on a public URL.';
