-- ============================================================================
-- get_booking_for_checkin — loosen the date filter
-- ============================================================================
-- The original guard was `WHERE check_out >= CURRENT_DATE`, meaning any
-- booking whose departure had passed could never load the check-in form.
-- Real ops blow this up daily:
--   - Walk-in arrives at 22:00, gets registered the next morning
--   - Group booking — late arrivals fill the registry days later
--   - TM30 catch-up: hotelier re-collects passport scans for foreigners
--     who slipped through at check-in
--
-- Token IS the access control. We keep a 30-day rear window as a soft
-- garbage-collection so very old links can't be replayed indefinitely,
-- but otherwise the form opens for any booking whose token matches.
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
    -- Soft GC: refuse anything older than 30 days past check-out
    AND b.check_out >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- ─── Apply the same relaxation to register_booking_guest_via_token ───
-- The insert RPC also had a strict 'check_out > now()' check that blocks
-- late guest registrations. Same logic: token is access control; allow
-- registrations until 30 days after departure for late catch-up.
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
  IF p_token IS NULL OR p_first_name IS NULL OR length(trim(p_first_name)) = 0 THEN
    RAISE EXCEPTION 'first_name and token are required'
      USING ERRCODE = '22023', HINT = 'Provide your first name to check in.';
  END IF;

  SELECT id,
         check_out,
         (COALESCE(adults, 1) + COALESCE(children, 0) + COALESCE(extra_beds_count, 0))
    INTO v_booking_id, v_check_out, v_capacity
    FROM public.bookings
   WHERE check_in_token = p_token;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Invalid check-in link'
      USING ERRCODE = 'P0002', HINT = 'Ask the front desk for a new link.';
  END IF;

  IF v_check_out < CURRENT_DATE - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'This booking is too old to register guests for'
      USING ERRCODE = 'P0002', HINT = 'Contact the front desk.';
  END IF;

  SELECT count(*) INTO v_registered
    FROM public.booking_guests
   WHERE booking_id = v_booking_id;

  IF v_registered >= v_capacity THEN
    RAISE EXCEPTION 'All % guest slots are already filled for this booking', v_capacity
      USING ERRCODE = 'P0002', HINT = 'Contact the front desk to add capacity.';
  END IF;

  INSERT INTO public.booking_guests (
    booking_id, first_name, last_name, sex,
    nationality, date_of_birth,
    passport_number, travel_doc_type,
    thailand_arrival_date, thailand_port_of_entry,
    visa_type, visa_number,
    is_lead, is_child, created_by
  ) VALUES (
    v_booking_id,
    trim(p_first_name),
    NULLIF(trim(coalesce(p_last_name, '')), ''),
    p_sex,
    p_nationality,
    p_date_of_birth,
    p_passport_number,
    coalesce(p_travel_doc_type, 'passport'),
    p_thailand_arrival_date,
    p_thailand_port_of_entry,
    p_visa_type,
    p_visa_number,
    -- First registration on this booking auto-flags as lead
    (v_registered = 0),
    coalesce(p_is_child, false),
    p_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_for_checkin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_booking_guest_via_token(
  uuid, text, text, text, date, text, text, text, date, text, text, text, boolean, uuid
) TO anon, authenticated;
