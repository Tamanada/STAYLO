-- Four payout-destination columns the Settings form has been writing to
-- since the "Payment Connection" section folded into /manage. Every
-- Save was silently dropping them (or throwing a schema-cache error on
-- the first one to blow up alphabetically — payment_bank_details today,
-- payment_btc_address tomorrow). Add all four in one shot so we're not
-- back for another migration next click.
--
-- Nullable text everywhere — the hotelier picks ONE destination that
-- matches how they want to receive their share of bookings. Empty
-- fields stay empty; only the chosen channel is populated.
--
-- Note: sensitive-ish values (bank details, wallet addresses). They're
-- readable by the property owner via RLS, never exposed to guests, and
-- ideally will move to Supabase Vault when the encryption wizard lands.
-- For now: plain text, gated by RLS.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS payment_btc_address    text,
  ADD COLUMN IF NOT EXISTS payment_solana_address text,
  ADD COLUMN IF NOT EXISTS payment_bank_details   text,
  ADD COLUMN IF NOT EXISTS payment_stripe_link    text;

COMMENT ON COLUMN public.properties.payment_btc_address    IS 'BTC on-chain / Lightning address for hotelier payouts. Optional — one of the four payment_* channels the hotelier picks.';
COMMENT ON COLUMN public.properties.payment_solana_address IS 'Solana wallet address for USDC / SOL payouts. Optional.';
COMMENT ON COLUMN public.properties.payment_bank_details   IS 'Free-text bank details (account name, IBAN/SWIFT, bank name, routing…). Optional. Move to Vault when the encryption wizard lands.';
COMMENT ON COLUMN public.properties.payment_stripe_link    IS 'Stripe Connect / Express link OR an acct_… ID for card payouts. Optional.';

NOTIFY pgrst, 'reload schema';
