-- ============================================================================
-- Check-out QR + stay survey → drives escrow release
-- ============================================================================
-- Mirror of the check-in token model, but with payment consequences:
--   1. Reception shows the check-out QR at end of stay
--   2. Guest scans → fills survey (5 ratings + optional free text)
--   3. If they tick the "I need to speak with STAYLO" red flag:
--      → bookings.dispute_status = 'open'
--      → escrow stays HELD until admin resolves
--   4. If no red flag:
--      → bookings.escrow_release_at = now() + 1 hour
--      → existing release-escrow cron picks it up next tick
--   5. If guest never fills the survey:
--      → existing T+24h auto-release continues to fire (no change)
--
-- Net effect: happy guest = hotelier paid within an hour. Unhappy guest =
-- payment held + STAYLO mediates. Silent guest = paid next day. The
-- hotelier is never punished for a guest who simply forgets.
-- ============================================================================

-- ─── Token + survey-state columns on bookings ───
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_out_token              uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checkout_survey_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_status               text
    CHECK (dispute_status IN ('open', 'resolved'));

CREATE INDEX IF NOT EXISTS bookings_check_out_token_idx ON public.bookings (check_out_token);
CREATE INDEX IF NOT EXISTS bookings_dispute_idx ON public.bookings (dispute_status) WHERE dispute_status IS NOT NULL;

UPDATE public.bookings SET check_out_token = gen_random_uuid() WHERE check_out_token IS NULL;

COMMENT ON COLUMN public.bookings.check_out_token IS
  'Random UUID encoded in the check-out QR. Anyone holding it can submit a stay review for this booking.';
COMMENT ON COLUMN public.bookings.checkout_survey_submitted_at IS
  'When (any) guest submitted the check-out survey. Triggers a 1-hour escrow release window.';
COMMENT ON COLUMN public.bookings.dispute_status IS
  'open = guest flagged a serious issue, escrow held until admin resolves. resolved = admin closed the case.';

-- ─── stay_reviews: one row per guest review ───
CREATE TABLE IF NOT EXISTS public.stay_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- 1-5 star ratings (NULL = guest skipped that aspect)
  cleanliness     int CHECK (cleanliness     BETWEEN 1 AND 5),
  location        int CHECK (location        BETWEEN 1 AND 5),
  vibe            int CHECK (vibe            BETWEEN 1 AND 5),
  value           int CHECK (value           BETWEEN 1 AND 5),
  service         int CHECK (service         BETWEEN 1 AND 5),
  would_recommend boolean,

  -- Free-form review (shown publicly on the hotel's listing if approved)
  review_text     text,
  reviewer_name   text,           -- snapshot of the guest's name for display
  is_anonymous    boolean NOT NULL DEFAULT false,

  -- Red flag: guest wants to talk to STAYLO before payment release
  needs_staylo_help boolean NOT NULL DEFAULT false,
  help_reason       text,

  -- Audit
  guest_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,   -- if logged in via app
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stay_reviews_booking_idx ON public.stay_reviews (booking_id);
CREATE INDEX IF NOT EXISTS stay_reviews_help_idx ON public.stay_reviews (needs_staylo_help) WHERE needs_staylo_help = true;

ALTER TABLE public.stay_reviews ENABLE ROW LEVEL SECURITY;

-- Property staff + admins can read reviews on their bookings
DROP POLICY IF EXISTS "Property staff can view stay reviews" ON public.stay_reviews;
CREATE POLICY "Property staff can view stay reviews" ON public.stay_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = stay_reviews.booking_id
        AND (public.is_property_member(b.property_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins manage all stay reviews" ON public.stay_reviews;
CREATE POLICY "Admins manage all stay reviews" ON public.stay_reviews
  FOR ALL USING (public.is_admin());

COMMENT ON TABLE public.stay_reviews IS
  'Post-stay survey responses. One booking can have multiple reviews (one per guest in the room).';

-- ============================================================================
-- get_booking_for_checkout — public read, returns SAFE booking info
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_booking_for_checkout(p_token uuid)
RETURNS TABLE (
  booking_id      uuid,
  property_name   text,
  property_city   text,
  room_name       text,
  check_in        date,
  check_out       date,
  lead_name       text,
  already_submitted boolean,
  dispute_open    boolean
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
    b.guest_name,
    (b.checkout_survey_submitted_at IS NOT NULL),
    (b.dispute_status = 'open')
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.rooms      r ON r.id = b.room_id
  WHERE b.check_out_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_for_checkout(uuid) TO anon, authenticated;

-- ============================================================================
-- submit_stay_review_via_token — anon-callable survey submission
-- ============================================================================
-- Validates token, inserts a review, and (crucially) updates the booking's
-- escrow timeline:
--   - red flag set → dispute_status='open', escrow_release_at = NULL  (held forever)
--   - no red flag  → checkout_survey_submitted_at = now(),
--                    escrow_release_at = greatest(check_out + 1h, now() + 1h)
-- ============================================================================
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
  v_review_id  uuid;
  v_release_at timestamptz;
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'token is required' USING ERRCODE = '22023';
  END IF;

  SELECT id, check_out
    INTO v_booking_id, v_check_out
    FROM public.bookings
   WHERE check_out_token = p_token;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Invalid check-out link' USING ERRCODE = 'P0002';
  END IF;

  -- Insert the review
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

  -- Update the booking based on whether the red flag was raised
  IF COALESCE(p_needs_staylo_help, false) THEN
    -- Red flag: hold escrow until admin resolves
    UPDATE public.bookings
       SET dispute_status               = 'open',
           checkout_survey_submitted_at = COALESCE(checkout_survey_submitted_at, now()),
           escrow_release_at            = NULL  -- prevents the cron from auto-releasing
     WHERE id = v_booking_id;
  ELSE
    -- Happy guest: shorten the release window to 1 hour from now,
    -- but never release before check_out + 1h (don't pay before the stay actually ends).
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

GRANT EXECUTE ON FUNCTION public.submit_stay_review_via_token(
  uuid, int, int, int, int, int, boolean, text, text, boolean, boolean, text, uuid
) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_stay_review_via_token IS
  'Anon-callable: submit a stay survey. No red flag → escrow released within 1h. Red flag → escrow held indefinitely until admin resolves the dispute.';

-- ============================================================================
-- Update bookings_due_for_escrow_release to skip disputed bookings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bookings_due_for_escrow_release()
RETURNS TABLE (
  booking_id                UUID,
  property_id               UUID,
  hotelier_user_id          UUID,
  stripe_account_id         TEXT,
  stripe_payment_intent_id  TEXT,
  payout_amount_cents       INTEGER,
  platform_fee_cents        INTEGER,
  currency                  TEXT,
  escrow_release_at         TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id                        AS booking_id,
    b.property_id,
    p.user_id                   AS hotelier_user_id,
    sa.stripe_account_id,
    b.stripe_payment_intent_id,
    b.payout_amount_cents,
    b.platform_fee_cents,
    b.currency,
    b.escrow_release_at
  FROM public.bookings b
  JOIN public.properties     p  ON p.id = b.property_id
  JOIN public.stripe_accounts sa ON sa.user_id = p.user_id
  WHERE b.escrow_status     = 'held'
    AND b.escrow_release_at IS NOT NULL          -- NULL when guest disputed
    AND b.escrow_release_at <= now()
    AND b.dispute_status   IS DISTINCT FROM 'open'
    AND sa.payouts_enabled  = TRUE
    AND b.stripe_payment_intent_id IS NOT NULL
  ORDER BY b.escrow_release_at ASC
  LIMIT 100;
$$;
