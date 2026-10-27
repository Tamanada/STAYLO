-- Escrow release claim: closes finding #4 of
-- guardian/reports/2026-10-05-security-inspection.md (two concurrent runs of
-- release-escrow could each create a Stripe transfer for the same booking,
-- because the transfer was created before any row was marked).
--
-- release-escrow now calls claim_escrow_release(booking_id) BEFORE talking to
-- Stripe. The claim is one atomic UPDATE: the second caller matches zero rows
-- and skips the booking. A claim older than p_stale_after with the booking
-- still 'held' (process died between claim and transfer) can be taken again;
-- the Stripe call itself carries an Idempotency-Key derived from the booking
-- id, so even that retry cannot pay twice.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS escrow_release_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.escrow_release_claimed_at IS
  'Set by claim_escrow_release() when a release-escrow run takes ownership of the transfer for this booking. NULL = not claimed. Cleared when a release attempt fails before the transfer.';

CREATE OR REPLACE FUNCTION public.claim_escrow_release(
  p_booking_id   UUID,
  p_stale_after  INTERVAL DEFAULT INTERVAL '15 minutes'
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
     SET escrow_release_claimed_at = now()
   WHERE id = p_booking_id
     AND escrow_status = 'held'
     AND stripe_transfer_id IS NULL
     AND (escrow_release_claimed_at IS NULL
          OR escrow_release_claimed_at < now() - p_stale_after);
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

COMMENT ON FUNCTION public.claim_escrow_release IS
  'Atomic mutex for release-escrow: true when this caller now owns the transfer for the booking, false when another run holds it or the booking is no longer held.';

REVOKE ALL ON FUNCTION public.claim_escrow_release(uuid, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_release(uuid, interval) TO service_role;

-- A claim is released when the attempt fails before any transfer exists.
CREATE OR REPLACE FUNCTION public.release_escrow_claim(p_booking_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bookings
     SET escrow_release_claimed_at = NULL
   WHERE id = p_booking_id
     AND stripe_transfer_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.release_escrow_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_escrow_claim(uuid) TO service_role;
