-- Guest-initiated cancellation trail on public.bookings. The existing
-- `refunded_at` + `stripe_refund_id` capture WHEN the Stripe refund
-- lands; these three columns capture WHY / HOW MUCH from the guest's
-- perspective, and are set the moment the guest hits Cancel (Stripe
-- refund may still be processing).
--
--   · cancelled_at         — timestamp guest clicked Cancel (independent
--                            of refunded_at, which is stamped by the
--                            Stripe webhook when the refund confirms).
--   · cancellation_reason  — free-text guest note (optional). Kept small
--                            (≤ 500 chars) so a hotelier can eyeball it
--                            without truncation.
--   · refund_amount_cents  — the DECIDED refund amount (in the booking's
--                            currency's smallest unit, matching
--                            payout_amount_cents / processing_fee_cents
--                            convention). Computed by the cancel-booking
--                            Edge Function from the property's
--                            cancellation_policy + hours-until-check-in
--                            + Stripe processing fees.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS refund_amount_cents  integer;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancellation_reason_len_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_reason_len_check
  CHECK (cancellation_reason IS NULL OR length(cancellation_reason) <= 500);

COMMENT ON COLUMN public.bookings.cancelled_at IS
  'When the GUEST triggered cancellation via the cancel-booking flow. Distinct from refunded_at which is set only when Stripe confirms the refund landed.';
COMMENT ON COLUMN public.bookings.cancellation_reason IS
  'Optional free-text reason the guest gave. Shown to the hotelier in the SHIP alert. Max 500 chars.';
COMMENT ON COLUMN public.bookings.refund_amount_cents IS
  'Amount the guest is entitled to per policy at the moment of cancellation, in the booking currency''s smallest unit. 0 = non-refundable / past deadline.';

NOTIFY pgrst, 'reload schema';
