-- ============================================
-- Migration: Ambassador BTC Commissions
-- Date: 2026-04-28
-- Chantier #10 — 2% BTC commission for ambassadors who referred hoteliers
-- ============================================
-- Business rule: when an ambassador refers a hotelier (captured via
-- users.referred_by at signup), the ambassador earns 2% of the ROOM
-- AMOUNT on every booking made at that hotelier's properties — for life.
--
-- Pricing math (example, $100 room):
--   Room amount:                $100.00
--   STAYLO commission (10%):     $10.00
--   Hotelier net (90%):          $90.00  ← unchanged
--   Ambassador commission (2%):  $ 2.00  ← STAYLO funds this from its $10
--   STAYLO net (8%):             $ 8.00  ← still healthy
--
-- The commission is created in 'pending' state when the booking is made,
-- transitions to 'ready' when the escrow is released (= booking truly
-- earned), and becomes 'paid' when the Lightning payout succeeds.
--
-- States: pending → ready → paid | failed | refunded
-- ============================================

-- ────────────────────────────────────────────
-- 1. Ambassador payout preferences (extends users)
-- ────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ln_address          TEXT,                  -- e.g. 'david@getalby.com'
  ADD COLUMN IF NOT EXISTS btc_address         TEXT,                  -- on-chain fallback
  ADD COLUMN IF NOT EXISTS auto_payout         BOOLEAN DEFAULT FALSE, -- pay automatically when status='ready'
  ADD COLUMN IF NOT EXISTS min_payout_sats     INTEGER DEFAULT 1000   -- don't pay until accumulated >= this
    CHECK (min_payout_sats >= 0);

COMMENT ON COLUMN public.users.ln_address  IS 'Lightning Address (LNURL pay) where ambassador commissions are sent. e.g. alice@walletofsatoshi.com';
COMMENT ON COLUMN public.users.btc_address IS 'On-chain BTC address as fallback. Only used if ln_address is null and amount > min for chain.';
COMMENT ON COLUMN public.users.auto_payout IS 'If TRUE, commissions are paid automatically when ready (cron). If FALSE, ambassador must click Withdraw.';

-- ────────────────────────────────────────────
-- 2. ambassador_commissions table
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ambassador_commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who earned it
  ambassador_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- What earned it
  booking_id          UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  hotelier_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- How much
  rate                DECIMAL(5, 4) NOT NULL DEFAULT 0.02,            -- 2% by default
  room_amount_cents   INTEGER NOT NULL CHECK (room_amount_cents > 0),
  commission_cents    INTEGER NOT NULL CHECK (commission_cents >= 0), -- 2% × room
  currency            TEXT NOT NULL DEFAULT 'USD',
  amount_sats         BIGINT,                                         -- Set at payout time using live BTC rate

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'ready', 'paid', 'failed', 'refunded', 'cancelled')),
  ready_at            TIMESTAMPTZ,                                    -- when escrow_released_at fires
  paid_at             TIMESTAMPTZ,                                    -- when Lightning payout completes
  failure_reason      TEXT,

  -- Lightning details (set at payout)
  payout_provider     TEXT CHECK (payout_provider IN ('mock', 'btcpay', 'opennode', 'strike')),
  payout_invoice      TEXT,                                           -- BOLT11 we paid
  payout_payment_hash TEXT,                                           -- preimage hash
  payout_address_used TEXT,                                           -- The ln_address or btc_address sent to

  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_commission_per_booking UNIQUE (booking_id, ambassador_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ambcomm_ambassador  ON public.ambassador_commissions(ambassador_user_id);
CREATE INDEX IF NOT EXISTS idx_ambcomm_status      ON public.ambassador_commissions(status);
CREATE INDEX IF NOT EXISTS idx_ambcomm_booking     ON public.ambassador_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ambcomm_ready_unpaid
  ON public.ambassador_commissions(ambassador_user_id, ready_at)
  WHERE status = 'ready';

ALTER TABLE public.ambassador_commissions ENABLE ROW LEVEL SECURITY;

-- Ambassador reads their own commissions
DROP POLICY IF EXISTS "Ambassador reads own commissions" ON public.ambassador_commissions;
CREATE POLICY "Ambassador reads own commissions" ON public.ambassador_commissions
  FOR SELECT USING (auth.uid() = ambassador_user_id);

-- Admins read all
DROP POLICY IF EXISTS "Admins read all commissions" ON public.ambassador_commissions;
CREATE POLICY "Admins read all commissions" ON public.ambassador_commissions
  FOR SELECT USING (public.is_admin());

-- INSERT/UPDATE only via triggers + edge functions (service role)

DROP TRIGGER IF EXISTS trg_ambcomm_updated_at ON public.ambassador_commissions;
CREATE TRIGGER trg_ambcomm_updated_at
  BEFORE UPDATE ON public.ambassador_commissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.ambassador_commissions IS
  'Ambassador commissions earned per booking. 2% of room amount. Paid in BTC via Lightning when status transitions to "paid".';

-- ────────────────────────────────────────────
-- 3. Trigger: create a 'pending' commission when a booking is INSERTed
-- ────────────────────────────────────────────
-- The commission is created right when the booking is born, in 'pending'
-- state. It can't pay yet because the booking might be cancelled. We
-- promote it to 'ready' only when escrow is released (booking truly earned).
CREATE OR REPLACE FUNCTION public.create_ambassador_commission_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotelier_id    UUID;
  v_ambassador_id  UUID;
  v_room_cents     INTEGER;
  v_rate           DECIMAL(5,4) := 0.02;  -- 2% — could move to a settings table later
  v_commission     INTEGER;
BEGIN
  -- Find hotelier (= property owner)
  SELECT user_id INTO v_hotelier_id FROM public.properties WHERE id = NEW.property_id;
  IF v_hotelier_id IS NULL THEN RETURN NEW; END IF;

  -- Find ambassador (= the user who referred the hotelier, if any)
  SELECT referred_by INTO v_ambassador_id FROM public.users WHERE id = v_hotelier_id;
  IF v_ambassador_id IS NULL THEN RETURN NEW; END IF;  -- no ambassador → no commission

  -- The room amount in cents = total_price minus processing_fee, minus
  -- (no — total_price IS the guest total = room + processing_fee in our schema).
  -- Use payout_amount_cents + platform_fee_cents (both = room amount).
  v_room_cents := COALESCE(NEW.payout_amount_cents, 0) + COALESCE(NEW.platform_fee_cents, 0);
  IF v_room_cents <= 0 THEN
    -- Fallback: use total_price minus processing_fee
    v_room_cents := GREATEST(0, ROUND(COALESCE(NEW.total_price, 0) * 100)::INTEGER - COALESCE(NEW.processing_fee_cents, 0));
  END IF;

  v_commission := ROUND(v_room_cents * v_rate)::INTEGER;
  IF v_commission <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.ambassador_commissions (
    ambassador_user_id, booking_id, hotelier_user_id, property_id,
    rate, room_amount_cents, commission_cents, currency, status
  ) VALUES (
    v_ambassador_id, NEW.id, v_hotelier_id, NEW.property_id,
    v_rate, v_room_cents, v_commission, COALESCE(NEW.currency, 'USD'), 'pending'
  )
  ON CONFLICT (booking_id, ambassador_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_amb_commission ON public.bookings;
CREATE TRIGGER trg_create_amb_commission
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_ambassador_commission_on_booking();

-- ────────────────────────────────────────────
-- 4. Trigger: promote commission to 'ready' when booking escrow is released
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_ambassador_commission_on_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on the released transition
  IF (OLD.escrow_status IS DISTINCT FROM 'released')
     AND (NEW.escrow_status = 'released') THEN

    UPDATE public.ambassador_commissions
       SET status = 'ready', ready_at = COALESCE(NEW.escrow_released_at, now())
     WHERE booking_id = NEW.id
       AND status = 'pending';

  -- If a booking is refunded after release, refund the commission too
  ELSIF (NEW.escrow_status = 'refunded') AND (OLD.escrow_status IS DISTINCT FROM 'refunded') THEN

    UPDATE public.ambassador_commissions
       SET status = 'refunded', failure_reason = 'booking_refunded'
     WHERE booking_id = NEW.id
       AND status IN ('pending', 'ready');

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_amb_commission ON public.bookings;
CREATE TRIGGER trg_promote_amb_commission
  AFTER UPDATE OF escrow_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.promote_ambassador_commission_on_release();

-- ────────────────────────────────────────────
-- 5. Helper RPC: stats for an ambassador dashboard
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ambassador_commission_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  pending_count        INTEGER,
  pending_cents        BIGINT,
  ready_count          INTEGER,
  ready_cents          BIGINT,
  paid_count           INTEGER,
  paid_cents           BIGINT,
  paid_sats            BIGINT,
  total_lifetime_cents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER         AS pending_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'pending'), 0)::BIGINT AS pending_cents,
    COUNT(*) FILTER (WHERE status = 'ready')::INTEGER           AS ready_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'ready'), 0)::BIGINT   AS ready_cents,
    COUNT(*) FILTER (WHERE status = 'paid')::INTEGER            AS paid_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'paid'), 0)::BIGINT    AS paid_cents,
    COALESCE(SUM(amount_sats) FILTER (WHERE status = 'paid'), 0)::BIGINT         AS paid_sats,
    COALESCE(SUM(commission_cents) FILTER (WHERE status IN ('ready','paid')), 0)::BIGINT AS total_lifetime_cents
  FROM public.ambassador_commissions
  WHERE ambassador_user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.ambassador_commission_stats(UUID) TO authenticated;

COMMENT ON FUNCTION public.ambassador_commission_stats IS
  'Returns commission counters for the calling ambassador (or any user if admin). Used by /dashboard/ambassador widget.';
