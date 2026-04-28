-- ============================================
-- Migration: Add payment_method + processing_fee_cents to bookings
-- Date: 2026-04-28
-- Chantier #1.5 — "Guest pays the fees" model
-- ============================================
-- Business decision: STAYLO no longer absorbs the 3% Stripe fee.
-- Instead, guests see a transparent line item ("Processing fee") at
-- checkout, added on top of the room price. This keeps STAYLO's net
-- margin at 10% regardless of payment method.
--
-- Pricing breakdown (example $100 room):
--   - Room price (set by hotelier)             : $100.00
--   - Hotelier net (90% of room)               : $ 90.00  ← payout
--   - STAYLO commission (10% of room)          : $ 10.00  ← platform
--   - Processing fee (charged to guest)        : varies   ← covers Stripe/etc
--                                                          0% Lightning
--                                                          3% Card
--                                                          1% On-chain BTC
--   - Total guest pays                         : $100-103 depending on method
-- ============================================

ALTER TABLE public.bookings
  -- Method used to pay this booking
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card'
    CHECK (payment_method IN ('card', 'lightning', 'btc_onchain', 'manual')),
  -- Processing fee charged to the guest, in smallest currency unit
  -- (cents/satang/sats). Comes IN ADDITION to the room price.
  ADD COLUMN IF NOT EXISTS processing_fee_cents INTEGER DEFAULT 0
    CHECK (processing_fee_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON public.bookings(payment_method);

COMMENT ON COLUMN public.bookings.payment_method IS
  'Payment rail used: card (Stripe Checkout), lightning (OpenNode/BOLT11), btc_onchain (OpenNode), manual (offline / ambassador-handled)';
COMMENT ON COLUMN public.bookings.processing_fee_cents IS
  'Fee paid by the GUEST on top of the room price to cover payment processing. STAYLO does NOT absorb processor fees.';

-- Backfill existing rows: assume past bookings were all 'card' with no
-- separate processing fee tracked (it was absorbed by STAYLO at the time).
UPDATE public.bookings
   SET payment_method       = 'card',
       processing_fee_cents = 0
 WHERE payment_method IS NULL;
