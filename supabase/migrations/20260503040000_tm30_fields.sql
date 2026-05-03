-- ============================================================================
-- TM30 compliance — collect every field the Thai Immigration Bureau requires
-- ============================================================================
-- See docs/TM30_COMPLIANCE.md for the full spec + 3-phase automation roadmap.
--
-- This migration extends booking_guests + properties with the columns needed
-- to generate a complete TM30-compatible CSV. We don't submit anything yet
-- (Phase 1 = manual portal upload), but we make sure every required datum
-- is captured at check-in so the export endpoint has all it needs later.
-- ============================================================================

-- ─── booking_guests: per-person immigration details ───
ALTER TABLE public.booking_guests
  ADD COLUMN IF NOT EXISTS sex                       text
    CHECK (sex IN ('M', 'F', 'X')),                       -- X = unspecified / non-binary
  ADD COLUMN IF NOT EXISTS travel_doc_type            text DEFAULT 'passport'
    CHECK (travel_doc_type IN ('passport', 'national_id', 'border_pass', 'other')),
  ADD COLUMN IF NOT EXISTS thailand_arrival_date      date,
  ADD COLUMN IF NOT EXISTS thailand_port_of_entry     text,    -- BKK, DMK, HKT, CNX, KBV...
  ADD COLUMN IF NOT EXISTS visa_type                  text,    -- TR, NON-B, ED, RETIRE...
  ADD COLUMN IF NOT EXISTS visa_number                text;

COMMENT ON COLUMN public.booking_guests.sex IS
  'M / F / X (X = unspecified or non-binary). Required by Thai Immigration TM30.';
COMMENT ON COLUMN public.booking_guests.travel_doc_type IS
  'Travel document type. Defaults to passport. ASEAN guests may use national_id.';
COMMENT ON COLUMN public.booking_guests.thailand_arrival_date IS
  'Date the guest entered Thailand (passport entry stamp). Required by TM30.';
COMMENT ON COLUMN public.booking_guests.thailand_port_of_entry IS
  'Airport / land border code (BKK, DMK, HKT, CNX, KBV, NongKhai...). Recommended for TM30.';
COMMENT ON COLUMN public.booking_guests.visa_type IS
  'Visa class (TR/NON-B/ED/Retirement/TR-VOA/exempt). Recommended for TM30.';
COMMENT ON COLUMN public.booking_guests.visa_number IS
  'Visa number from sticker. Recommended for TM30.';

-- ─── properties: hotelier-side establishment ID ───
-- The TM30 license number is the establishment registration number
-- assigned by the local Immigration office. Distinct from the TAT
-- license_number (tourism authority) — keep both.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tm30_license_number text,
  ADD COLUMN IF NOT EXISTS tm30_portal_username text,    -- stored for Phase-2 browser auto
  ADD COLUMN IF NOT EXISTS tm30_portal_password text,    -- TODO: encrypt before Phase 2
  ADD COLUMN IF NOT EXISTS tm30_last_submitted_at timestamptz;

COMMENT ON COLUMN public.properties.tm30_license_number IS
  'Thai Immigration Bureau establishment ID for TM30 reporting. Distinct from TAT license.';
COMMENT ON COLUMN public.properties.tm30_portal_username IS
  'TM30 portal login (Phase 2: browser-automation auto-upload).';
COMMENT ON COLUMN public.properties.tm30_portal_password IS
  'TM30 portal password — MUST be encrypted before Phase 2. Stored plaintext temporarily; revisit before any auto-submission ships.';
COMMENT ON COLUMN public.properties.tm30_last_submitted_at IS
  'Last successful TM30 batch upload timestamp. Surface as a status indicator on the dashboard.';

-- Useful index for the daily export query
CREATE INDEX IF NOT EXISTS booking_guests_thailand_arrival_idx
  ON public.booking_guests (thailand_arrival_date)
  WHERE thailand_arrival_date IS NOT NULL;
