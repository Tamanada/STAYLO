-- Refund rules support (guardian finding #3, report 2026-10-05):
--   1. properties.cancellation_policy accepts the five policies the product
--      offers. The UI already lists super_strict_30 (PropertyManage.jsx) but
--      the CHECK rejected it, so saving that choice failed.
--   2. One refund per booking: claim_booking_refund() is the atomic mutex
--      taken by cancel-booking and refund-booking before any Stripe call.
--   3. stripe_transfer_reversal_id records clawback tier 1 (transfer
--      reversal) when a refund happens after the escrow was released.

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.properties'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%cancellation_policy%'
  LOOP
    EXECUTE format('ALTER TABLE public.properties DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_cancellation_policy_check
  CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict', 'super_strict_30', 'non_refundable'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_claimed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_transfer_reversal_id TEXT;

COMMENT ON COLUMN public.bookings.refund_claimed_at IS
  'Set by claim_booking_refund() when a cancel/refund run takes ownership of the one allowed refund. Cleared when the attempt fails before Stripe.';
COMMENT ON COLUMN public.bookings.stripe_transfer_reversal_id IS
  'trr_xxx: Stripe transfer reversal created when a refund happens after escrow release (clawback tier 1).';

CREATE OR REPLACE FUNCTION public.claim_booking_refund(
  p_booking_id  UUID,
  p_stale_after INTERVAL DEFAULT INTERVAL '15 minutes'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed INT;
BEGIN
  UPDATE public.bookings
     SET refund_claimed_at = now()
   WHERE id = p_booking_id
     AND stripe_refund_id IS NULL
     AND refunded_at IS NULL
     AND (refund_claimed_at IS NULL
          OR refund_claimed_at < now() - p_stale_after);
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_booking_refund(uuid, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_refund(uuid, interval) TO service_role;

CREATE OR REPLACE FUNCTION public.release_booking_refund_claim(p_booking_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bookings
     SET refund_claimed_at = NULL
   WHERE id = p_booking_id
     AND stripe_refund_id IS NULL
     AND refunded_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.release_booking_refund_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_refund_claim(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
