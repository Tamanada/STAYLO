-- ============================================
-- Migration: Bitcoin / Lightning invoices tracking
-- Date: 2026-04-28
-- Chantier #9 — Crypto payments (Lightning + on-chain BTC)
-- ============================================
-- Adds the schema for tracking Bitcoin payments via a provider-agnostic
-- interface. Initially backed by MockProvider (for Alpha demo, no KYC).
-- Will swap to BTCPay Server (self-hosted, no KYC) or OpenNode (KYC) once
-- STAYLO is incorporated, with zero migration on this schema.
--
-- Flow:
--   1. Guest selects Lightning at /ota/.../checkout
--   2. Frontend → crypto-checkout edge fn → creates btc_invoice row
--      + asks provider to generate invoice (BOLT11 string + QR)
--   3. Modal shows QR code + countdown
--   4. Provider webhook → crypto-webhook → btc_invoices.status = 'paid'
--      → bookings.escrow_status = 'held'  (same lifecycle as Stripe)
--   5. Same release-escrow flow applies (T+24h auto, or questionnaire)
-- ============================================

CREATE TABLE IF NOT EXISTS public.btc_invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Provider info
  provider                 TEXT NOT NULL DEFAULT 'mock'
                             CHECK (provider IN ('mock', 'btcpay', 'opennode', 'strike')),
  provider_invoice_id      TEXT,                              -- Provider's internal ID
  provider_charge_id       TEXT,                              -- For OpenNode-style charge IDs

  -- Lightning specifics
  bolt11                   TEXT,                              -- BOLT11 invoice string (lnbc...)
  payment_hash             TEXT,                              -- Lightning payment hash
  on_chain_address         TEXT,                              -- For on-chain BTC

  -- Amounts (always in satoshis for precision; convert from fiat at invoice creation)
  amount_sats              BIGINT NOT NULL CHECK (amount_sats > 0),
  fiat_currency            TEXT NOT NULL DEFAULT 'USD',
  fiat_amount_cents        INTEGER NOT NULL CHECK (fiat_amount_cents >= 0),
  exchange_rate_used       DECIMAL(20, 8),                    -- BTC/fiat at the moment of invoice

  -- Lifecycle
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'underpaid', 'failed')),
  expires_at               TIMESTAMPTZ NOT NULL,              -- Lightning invoices expire fast (default 1h)
  paid_at                  TIMESTAMPTZ,                       -- Set on payment confirmation
  refunded_at              TIMESTAMPTZ,
  metadata                 JSONB DEFAULT '{}',                -- Provider-specific fields

  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

-- One unpaid invoice per booking max (avoid spam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_btc_invoices_one_pending_per_booking
  ON public.btc_invoices(booking_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_btc_invoices_booking      ON public.btc_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_status       ON public.btc_invoices(status);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_provider_id  ON public.btc_invoices(provider, provider_invoice_id);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_payment_hash ON public.btc_invoices(payment_hash);

ALTER TABLE public.btc_invoices ENABLE ROW LEVEL SECURITY;

-- Guest can read their own invoices (via booking ownership)
DROP POLICY IF EXISTS "Guest reads own btc_invoices" ON public.btc_invoices;
CREATE POLICY "Guest reads own btc_invoices" ON public.btc_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = btc_invoices.booking_id
        AND b.guest_id = auth.uid()
    )
  );

-- Hotelier can read invoices for bookings on their properties
DROP POLICY IF EXISTS "Hotelier reads property btc_invoices" ON public.btc_invoices;
CREATE POLICY "Hotelier reads property btc_invoices" ON public.btc_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.properties p ON p.id = b.property_id
      WHERE b.id = btc_invoices.booking_id
        AND p.user_id = auth.uid()
    )
  );

-- Admins read all
DROP POLICY IF EXISTS "Admins read all btc_invoices" ON public.btc_invoices;
CREATE POLICY "Admins read all btc_invoices" ON public.btc_invoices
  FOR SELECT USING (public.is_admin());

-- INSERT/UPDATE only via service-role (edge functions). No direct client write.

-- Auto-touch updated_at
DROP TRIGGER IF EXISTS trg_btc_invoices_updated_at ON public.btc_invoices;
CREATE TRIGGER trg_btc_invoices_updated_at
  BEFORE UPDATE ON public.btc_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.btc_invoices IS
  'Bitcoin/Lightning invoices for bookings. Provider-agnostic — backed by MockProvider in Alpha, BTCPay/OpenNode/Strike later.';

COMMENT ON COLUMN public.btc_invoices.provider IS
  'mock = local simulation (Alpha demo, no KYC); btcpay = self-hosted BTCPay Server (production target); opennode = OpenNode hosted; strike = Strike API';

COMMENT ON COLUMN public.btc_invoices.amount_sats IS
  'Amount in satoshis. 1 BTC = 100,000,000 sats. We store sats (not fiat) because Lightning is denominated in sats and BTC fluctuates against fiat.';

-- ============================================
-- Helper: convert btc_invoice payment to booking confirmation
-- Called by crypto-webhook when an invoice transitions to 'paid'.
-- Idempotent — safe to call multiple times (webhook retries).
-- ============================================
CREATE OR REPLACE FUNCTION public.confirm_btc_invoice_payment(
  p_invoice_id        UUID,
  p_paid_at           TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice  public.btc_invoices%ROWTYPE;
  v_booking  public.bookings%ROWTYPE;
  v_release_at TIMESTAMPTZ;
BEGIN
  -- Lock the invoice row
  SELECT * INTO v_invoice FROM public.btc_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invoice_not_found');
  END IF;

  -- Idempotency: if already paid, return success without doing anything
  IF v_invoice.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'booking_id', v_invoice.booking_id);
  END IF;

  -- Mark invoice paid
  UPDATE public.btc_invoices
     SET status = 'paid', paid_at = p_paid_at, updated_at = now()
   WHERE id = p_invoice_id;

  -- Now mark booking confirmed + escrow held (same lifecycle as Stripe webhook)
  v_release_at := p_paid_at + INTERVAL '24 hours';

  UPDATE public.bookings
     SET status               = 'confirmed',
         escrow_status        = 'held',
         payment_received_at  = p_paid_at,
         escrow_release_at    = v_release_at,
         payment_method       = COALESCE(payment_method,
                                         CASE
                                           WHEN v_invoice.bolt11 IS NOT NULL THEN 'lightning'
                                           ELSE 'btc_onchain'
                                         END)
   WHERE id = v_invoice.booking_id
     AND escrow_status IN ('none', 'failed');  -- don't overwrite already-held/refunded

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', v_invoice.booking_id,
    'release_at', v_release_at
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_btc_invoice_payment IS
  'Idempotently marks a BTC invoice as paid and transitions the linked booking to confirmed + escrow held. Called by crypto-webhook on invoice.paid events.';

GRANT EXECUTE ON FUNCTION public.confirm_btc_invoice_payment TO service_role;
