-- Hardening of the guest token flows, found by tests/integration/token-flows.test.mjs
-- (guardian/TESTS.md, high-risk scenario 7), all three confirmed in production
-- read-only on 2026-11-15:
--   1. /checkin capacity counted extra beds ON TOP of the children who sleep in
--      them (adults + children + extra_beds_count), so one more person than the
--      booking could register against the stay (TM30 data). Capacity is now the
--      number of people on the booking: GREATEST(guests, adults + children).
--   2. consume_voucher() only checked property membership when a caller was
--      signed in: an anonymous call with a voucher code burned the voucher. The
--      function now requires a signed-in property member (or admin) and anon
--      loses EXECUTE.
--   3. submit_stay_review_via_token() accepted unlimited reviews from one
--      token. Capped at the number of people on the booking (one review per
--      guest, as the table comment states).

-- 1a. Public read for /checkin
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
    GREATEST(COALESCE(b.guests, 0), COALESCE(b.adults, 1) + COALESCE(b.children, 0))::int,
    (SELECT count(*)::int FROM public.booking_guests bg WHERE bg.booking_id = b.id),
    b.guest_name
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.rooms      r ON r.id = b.room_id
  WHERE b.check_in_token = p_token
    AND b.check_out >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- 1b. Self-registration via token
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
         GREATEST(COALESCE(guests, 0), COALESCE(adults, 1) + COALESCE(children, 0))
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
    RAISE EXCEPTION 'All % guests already checked in for this booking', v_capacity
      USING ERRCODE = 'P0001', HINT = 'Ask the front desk if one more person must be added to the booking.';
  END IF;

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

-- 2. Voucher consumption: property team or admin only, never anonymous
CREATE OR REPLACE FUNCTION public.consume_voucher(
  p_voucher_code     text,
  p_qty              integer DEFAULT 1,
  p_location         text DEFAULT NULL,
  p_notes            text DEFAULT NULL,
  p_booking_charge_id uuid DEFAULT NULL
)
RETURNS TABLE(voucher_id uuid, remaining integer, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher    public.guest_vouchers%ROWTYPE;
  v_booking    public.bookings%ROWTYPE;
  v_today      date := current_date;
  v_caller     uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Sign in as property staff to use a voucher'
      USING ERRCODE = '42501';
  END IF;
  IF p_qty IS NULL OR p_qty < 1 THEN
    RAISE EXCEPTION 'qty must be 1 or more';
  END IF;

  SELECT * INTO v_voucher
  FROM public.guest_vouchers
  WHERE voucher_code = p_voucher_code
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher % not found', p_voucher_code;
  END IF;

  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < v_today THEN
    RAISE EXCEPTION 'Voucher % expired on %', p_voucher_code, v_voucher.valid_until;
  END IF;
  IF v_voucher.valid_from IS NOT NULL AND v_voucher.valid_from > v_today THEN
    RAISE EXCEPTION 'Voucher % not yet valid (starts %)', p_voucher_code, v_voucher.valid_from;
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = v_voucher.booking_id;
  IF NOT public.is_admin() THEN
    PERFORM 1 FROM public.property_members
      WHERE property_id = v_booking.property_id
        AND user_id = v_caller
        AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'You are not authorised on this booking''s property'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_voucher.qty_consumed + p_qty > v_voucher.qty_total THEN
    RAISE EXCEPTION 'Voucher % has only % remaining (requested %)',
      p_voucher_code,
      v_voucher.qty_total - v_voucher.qty_consumed,
      p_qty;
  END IF;

  UPDATE public.guest_vouchers
     SET qty_consumed = qty_consumed + p_qty,
         updated_at   = now()
   WHERE id = v_voucher.id;

  INSERT INTO public.voucher_consumptions (voucher_id, qty, consumed_by, location, notes, booking_charge_id)
  VALUES (v_voucher.id, p_qty, v_caller, p_location, p_notes, p_booking_charge_id);

  RETURN QUERY SELECT v_voucher.id, v_voucher.qty_total - (v_voucher.qty_consumed + p_qty), v_voucher.label;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_voucher(text, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_voucher(text, integer, text, text, uuid) TO authenticated, service_role;

-- 3. One review per guest on the booking
CREATE OR REPLACE FUNCTION public.submit_stay_review_via_token(
  p_token             uuid,
  p_cleanliness       int  DEFAULT NULL,
  p_location          int  DEFAULT NULL,
  p_vibe              int  DEFAULT NULL,
  p_value             int  DEFAULT NULL,
  p_service           int  DEFAULT NULL,
  p_would_recommend   boolean DEFAULT NULL,
  p_review_text       text DEFAULT NULL,
  p_reviewer_name     text DEFAULT NULL,
  p_is_anonymous      boolean DEFAULT false,
  p_needs_staylo_help boolean DEFAULT false,
  p_help_reason       text DEFAULT NULL,
  p_guest_id          uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_check_out  date;
  v_capacity   int;
  v_existing   int;
  v_review_id  uuid;
  v_release_at timestamptz;
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'token is required' USING ERRCODE = '22023';
  END IF;

  SELECT id, check_out, GREATEST(COALESCE(guests, 0), COALESCE(adults, 1) + COALESCE(children, 0), 1)
    INTO v_booking_id, v_check_out, v_capacity
    FROM public.bookings
   WHERE check_out_token = p_token;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Invalid check-out link' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO v_existing FROM public.stay_reviews WHERE booking_id = v_booking_id;
  IF v_existing >= v_capacity THEN
    RAISE EXCEPTION 'Every guest of this booking has already sent a review'
      USING ERRCODE = 'P0001', HINT = 'Thank you, your feedback is already recorded.';
  END IF;

  INSERT INTO public.stay_reviews (
    booking_id, cleanliness, location, vibe, value, service,
    would_recommend, review_text, reviewer_name, is_anonymous,
    needs_staylo_help, help_reason, guest_id
  ) VALUES (
    v_booking_id, p_cleanliness, p_location, p_vibe, p_value, p_service,
    p_would_recommend,
    NULLIF(trim(COALESCE(p_review_text, '')), ''),
    NULLIF(trim(COALESCE(p_reviewer_name, '')), ''),
    COALESCE(p_is_anonymous, false),
    COALESCE(p_needs_staylo_help, false),
    NULLIF(trim(COALESCE(p_help_reason, '')), ''),
    p_guest_id
  ) RETURNING id INTO v_review_id;

  IF COALESCE(p_needs_staylo_help, false) THEN
    UPDATE public.bookings
       SET dispute_status               = 'open',
           checkout_survey_submitted_at = COALESCE(checkout_survey_submitted_at, now()),
           escrow_release_at            = NULL
     WHERE id = v_booking_id;
  ELSE
    v_release_at := GREATEST(
      now() + interval '1 hour',
      (v_check_out::timestamptz + interval '1 hour')
    );
    UPDATE public.bookings
       SET checkout_survey_submitted_at = COALESCE(checkout_survey_submitted_at, now()),
           escrow_release_at            = LEAST(escrow_release_at, v_release_at)
     WHERE id = v_booking_id;
  END IF;

  RETURN v_review_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
