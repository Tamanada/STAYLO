-- ============================================================================
-- 20260601000000_property_payment_and_integrations
-- ============================================================================
-- Folds the old Banking-tab content into the property's Settings tab.
-- Adds four payout destinations and an open-ended JSONB bag for OTA-side
-- API integrations (Booking.com, Airbnb, Agoda, Expedia, etc).
--
-- Why JSONB for `ota_integrations` and not separate columns?
--   Each OTA has a different auth model (basic auth, OAuth2, signed
--   webhooks) and we don't want to ALTER TABLE every time we onboard a
--   new connector. Schema lives in the app (and an admin UI for keys).
--
-- Why TEXT for crypto/bank fields?
--   They're identifiers + free-form details, not amounts. App validates
--   shape (BTC: bc1/3/1 prefix · Solana: base58 length · IBAN, etc).
-- ============================================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS payment_btc_address      text,
  ADD COLUMN IF NOT EXISTS payment_solana_address   text,
  ADD COLUMN IF NOT EXISTS payment_bank_details     text,
  ADD COLUMN IF NOT EXISTS payment_stripe_link      text,
  ADD COLUMN IF NOT EXISTS ota_integrations         jsonb DEFAULT '{}'::jsonb NOT NULL;

COMMENT ON COLUMN properties.payment_btc_address    IS 'Bitcoin address (P2PKH, P2SH, or Bech32) where the hotelier wants to receive their share of STAYLO bookings.';
COMMENT ON COLUMN properties.payment_solana_address IS 'Solana wallet address (base58) — for $STAY payouts and Solana-native payments.';
COMMENT ON COLUMN properties.payment_bank_details   IS 'Free-form bank details (IBAN, SWIFT, account holder, country). Stored verbatim — for human payouts via wire transfer.';
COMMENT ON COLUMN properties.payment_stripe_link    IS 'Stripe Connect / Express dashboard link or account id used for card payouts.';
COMMENT ON COLUMN properties.ota_integrations       IS 'Per-OTA credentials + state for inbound reservation sync. Shape: { booking_com:{api_key,enabled}, airbnb:{...}, agoda:{...}, expedia:{...} }. New keys added as connectors ship — no schema migration needed.';

-- RLS — these are property-scoped writeable fields for owners + active
-- team members. The existing properties UPDATE policy already covers
-- this (members can write), so nothing to add. Read is gated by the
-- same policy (no public exposure of api keys or bank details).
