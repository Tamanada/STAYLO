-- ============================================
-- Migration: Stripe Connect + Escrow infrastructure
-- Date: 2026-04-22
-- Chantier #1.1 — Pipeline paiement complet
-- ============================================
-- This migration introduces:
--   1. stripe_accounts table — one row per hotelier with their Stripe Connect Express account
--   2. Multi-currency support on properties
--   3. Escrow tracking columns on bookings
--   4. Helper RPC `bookings_due_for_escrow_release()` for the auto-release cron
--
-- After this migration is applied, no money flow exists yet — only the rails.
-- The actual payment logic lives in Edge Functions (commit 1.2) and the
-- frontend onboarding lives in /dashboard/banking (commit 1.3).
-- ============================================

-- ────────────────────────────────────────────
-- 1. STRIPE ACCOUNTS — one per hotelier
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id        TEXT NOT NULL UNIQUE,
  account_type             TEXT NOT NULL DEFAULT 'express'
                             CHECK (account_type IN ('express', 'standard', 'custom')),
  country                  TEXT,                   -- ISO 3166-1 alpha-2 (e.g. 'TH', 'FR')
  default_currency         TEXT,                   -- ISO 4217 lowercase (e.g. 'thb', 'eur')
  charges_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  details_submitted        BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at  TIMESTAMPTZ,
  last_synced_at           TIMESTAMPTZ DEFAULT now(),
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_stripe_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user        ON public.stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id   ON public.stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_enabled     ON public.stripe_accounts(charges_enabled, payouts_enabled);

ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- A hotelier can read their own account
DROP POLICY IF EXISTS "Users read own stripe account" ON public.stripe_accounts;
CREATE POLICY "Users read own stripe account" ON public.stripe_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts/updates only via service-role (Edge Functions). No direct client write.
DROP POLICY IF EXISTS "Admins read all stripe accounts" ON public.stripe_accounts;
CREATE POLICY "Admins read all stripe accounts" ON public.stripe_accounts
  FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.stripe_accounts IS
  'Stripe Connect Express accounts for hoteliers. Synced from Stripe via webhooks.';

-- ────────────────────────────────────────────
-- 2. MULTI-CURRENCY ON PROPERTIES
-- ────────────────────────────────────────────
-- Each property declares its listing currency. Default = USD for safety.
-- ISO 4217 codes: USD, EUR, THB, GBP, JPY, AUD, SGD, MYR, IDR, INR, CNY, ...
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'
    CHECK (length(currency) = 3 AND currency = upper(currency));

CREATE INDEX IF NOT EXISTS idx_properties_currency ON public.properties(currency);

COMMENT ON COLUMN public.properties.currency IS
  'ISO 4217 currency code (USD, EUR, THB, ...) — guests pay in this currency.';

-- ────────────────────────────────────────────
-- 3. ESCROW TRACKING ON BOOKINGS
-- ────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,         -- pi_xxx
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,       -- cs_xxx (legacy)
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,               -- tr_xxx (set on release)
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,                 -- re_xxx (set on refund)
  ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT 'none'
    CHECK (escrow_status IN ('none', 'held', 'released', 'refunded', 'disputed', 'failed')),
  ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ,       -- when guest's payment landed in platform balance
  ADD COLUMN IF NOT EXISTS escrow_release_at TIMESTAMPTZ,         -- target release time (T+24h default for chantier #1)
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ,        -- when actually released
  ADD COLUMN IF NOT EXISTS payout_amount_cents INTEGER,           -- 90% to hotelier, in cents/satang/...
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER,            -- 10% STAYLO commission
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'            -- currency of this booking
    CHECK (length(currency) = 3 AND currency = upper(currency)),
  ADD COLUMN IF NOT EXISTS release_reason TEXT;                   -- 'auto_24h', 'questionnaire', 'admin_manual', ...

CREATE INDEX IF NOT EXISTS idx_bookings_escrow_status      ON public.bookings(escrow_status);
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_release_at  ON public.bookings(escrow_release_at)
  WHERE escrow_status = 'held';
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent     ON public.bookings(stripe_payment_intent_id);

COMMENT ON COLUMN public.bookings.escrow_status IS
  'Lifecycle: none → held (paid) → released (transferred to hotelier) | refunded | disputed | failed';
COMMENT ON COLUMN public.bookings.escrow_release_at IS
  'Default = payment_received_at + 24h (chantier #1). Will be overridden by post-checkout questionnaire trigger (chantier #2).';

-- ────────────────────────────────────────────
-- 4. HELPER RPC — bookings ready for auto-release
-- ────────────────────────────────────────────
-- Used by the cron job (Vercel Cron / GitHub Action) that calls release-escrow.
-- SECURITY DEFINER so the cron caller (service-role) sees all bookings.
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
    AND b.escrow_release_at <= now()
    AND sa.payouts_enabled  = TRUE
    AND b.stripe_payment_intent_id IS NOT NULL
  ORDER BY b.escrow_release_at ASC
  LIMIT 100;  -- safety: process at most 100 per cron tick
$$;

COMMENT ON FUNCTION public.bookings_due_for_escrow_release() IS
  'Returns bookings whose escrow window has elapsed and that are ready to be released to the hotelier. Called by the release-escrow cron.';

-- Grant execute to authenticated (the cron uses service-role anyway, but allow for testing)
GRANT EXECUTE ON FUNCTION public.bookings_due_for_escrow_release() TO authenticated;

-- ────────────────────────────────────────────
-- 5. HELPER RPC — count properties for live counter
-- ────────────────────────────────────────────
-- Fixes the audit finding: get_total_shares() referenced in Vision.jsx but never defined.
-- We expose a generic stats function to avoid hardcoded mocks.
CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS TABLE (
  hotels_total       BIGINT,
  hotels_live        BIGINT,
  bookings_total     BIGINT,
  shares_sold        BIGINT,
  countries_count    BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.properties)                                   AS hotels_total,
    (SELECT count(*) FROM public.properties WHERE status = 'live')             AS hotels_live,
    (SELECT count(*) FROM public.bookings WHERE status IN ('confirmed','completed')) AS bookings_total,
    (SELECT coalesce(sum(quantity), 0) FROM public.shares WHERE payment_confirmed = TRUE) AS shares_sold,
    (SELECT count(DISTINCT country) FROM public.properties WHERE status = 'live')  AS countries_count;
$$;

GRANT EXECUTE ON FUNCTION public.platform_stats() TO anon, authenticated;

COMMENT ON FUNCTION public.platform_stats() IS
  'Public read-only stats for the homepage counters (Vision page, Splash counter). Replaces the missing get_total_shares() referenced in Vision.jsx.';

-- ────────────────────────────────────────────
-- 6. UPDATE TRIGGER — auto-touch updated_at on stripe_accounts
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stripe_accounts_updated_at ON public.stripe_accounts;
CREATE TRIGGER trg_stripe_accounts_updated_at
  BEFORE UPDATE ON public.stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
