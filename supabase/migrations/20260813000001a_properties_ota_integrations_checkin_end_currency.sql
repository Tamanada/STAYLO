-- Three additive columns on properties (all IF NOT EXISTS — safe to
-- re-run and lands cleanly whether earlier migrations already added
-- their variants or not).
--
-- 1) ota_integrations jsonb
--    The Settings form has been trying to write to this column since the
--    OTA Channel Manager UI landed. It was never migrated → every Save
--    threw "Could not find the 'ota_integrations' column of 'properties'
--    in the schema cache" and dropped the entire settings save. Shape:
--      { booking_com: {api_key:...}, airbnb: {api_key:...}, ... }
--    JSONB with a default of '{}' so existing rows are readable at once.
--
-- 2) check_in_end_time text
--    End of the check-in WINDOW (nominal; late arrivals still possible
--    via reception). Format HH:MM (24h) to match check_in_time /
--    check_out_time. The older `checkin_end_hour smallint` from
--    20260602000000 stays untouched — that one drives passport-scan UX
--    on the guest-app side, this one drives display in the hotelier
--    dashboard + printed policies. Different concerns, kept separate.
--
-- 3) currency text
--    ISO 4217 code. Already added by 20260422000000_stripe_connect_escrow
--    on most environments — IF NOT EXISTS makes this migration idempotent
--    without conflicting with that earlier one.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ota_integrations   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS check_in_end_time  text DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS currency           text NOT NULL DEFAULT 'USD';

-- Guardrails only on columns we might have just created — safe to
-- re-add via IF NOT EXISTS + DROP CONSTRAINT/ADD dance.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_currency_iso4217_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_currency_iso4217_check
  CHECK (length(currency) = 3 AND currency = upper(currency));

CREATE INDEX IF NOT EXISTS idx_properties_currency ON public.properties(currency);

COMMENT ON COLUMN public.properties.ota_integrations IS
  'Per-channel OTA credentials keyed by channel slug ({booking_com:{api_key},airbnb:{api_key},…}). Encrypted at rest via Supabase Vault when the wizard lands; today it is a plain JSONB blob written directly from the Settings form.';
COMMENT ON COLUMN public.properties.check_in_end_time IS
  'HH:MM (24h). End of the nominal check-in window shown on the guest confirmation and the hotelier settings page. Not a hard cutoff — reception can still admit late arrivals.';
COMMENT ON COLUMN public.properties.currency IS
  'ISO 4217 currency code (USD, EUR, THB, GBP, JPY, AUD, SGD, MYR, IDR, INR, CNY, …). Guests are quoted and pay in this currency.';

-- Nudge PostgREST to reload its schema cache immediately so the client
-- can read/write ota_integrations without a 30-60s delay after the
-- ALTER TABLE.
NOTIFY pgrst, 'reload schema';
