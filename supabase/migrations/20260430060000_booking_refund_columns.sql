-- ============================================================================
-- Booking refund tracking
-- ============================================================================
-- Adds two columns used by the new refund-booking edge function and the
-- /admin/transactions UI. Idempotent.
-- ============================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at      timestamptz;

COMMENT ON COLUMN public.bookings.stripe_refund_id IS 're_xxx — Stripe refund object id, set by refund-booking function';
COMMENT ON COLUMN public.bookings.refunded_at IS 'When the refund was processed (server time)';
