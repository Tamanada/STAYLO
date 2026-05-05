-- ============================================================================
-- Hourly room rental — day-use, transit, short-stay
-- ============================================================================
-- Three real-world demand sources for hourly rooms in Thailand:
--   1. Day-use for travellers with a long layover or late flight
--   2. "Pool day" + room access for non-staying guests
--   3. Couples / locals booking a few hours (most Thai mid-tier hotels
--      already offer this — STAYLO needs to support it natively)
--
-- Two new tiers, both optional:
--   1. hourly_rate         — flat $/hour (most common)
--   2. day_use_rate        — flat price for a half-day (4-6h) block
--
-- Pricing logic (frontend, similar to weekly/monthly):
--   if hours <= day_use_max_hours AND day_use_rate > 0
--     → flat day_use_rate
--   else
--     → hourly_rate × hours
--
-- A booking can opt into 'hourly' billing — the existing nightly price
-- columns are ignored when bookings.booking_type = 'hourly'.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS hourly_rate          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hourly_min_hours     INT
    CHECK (hourly_min_hours BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS hourly_max_hours     INT
    CHECK (hourly_max_hours BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS day_use_rate         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS day_use_max_hours    INT DEFAULT 6
    CHECK (day_use_max_hours BETWEEN 2 AND 12);

COMMENT ON COLUMN public.rooms.hourly_rate IS
  'Flat $/hour for short stays. NULL = no hourly tier offered.';
COMMENT ON COLUMN public.rooms.hourly_min_hours IS
  'Minimum bookable hours (e.g. 2). NULL = no minimum.';
COMMENT ON COLUMN public.rooms.hourly_max_hours IS
  'Maximum bookable hours before falling back to nightly rate (e.g. 8). NULL = no cap.';
COMMENT ON COLUMN public.rooms.day_use_rate IS
  'Optional flat half-day price covering up to day_use_max_hours. Cheaper than hourly_rate × max for guests who want a long block.';
COMMENT ON COLUMN public.rooms.day_use_max_hours IS
  'Hours covered by day_use_rate (default 6 — typical 10am→4pm pattern).';

-- ─── Bookings: support hourly check-in/out timestamps ───
-- Existing bookings keep using check_in / check_out (date-only, midnight-anchored).
-- Hourly bookings additionally fill check_in_at / check_out_at (timestamps with TZ).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type   TEXT NOT NULL DEFAULT 'overnight'
    CHECK (booking_type IN ('overnight', 'hourly', 'day_use')),
  ADD COLUMN IF NOT EXISTS check_in_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hours_billed   NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS bookings_type_idx ON public.bookings(booking_type)
  WHERE booking_type <> 'overnight';

COMMENT ON COLUMN public.bookings.booking_type IS
  'overnight (default, uses check_in/check_out dates) | hourly | day_use';
COMMENT ON COLUMN public.bookings.check_in_at IS
  'Exact arrival timestamp. Required for hourly/day_use, optional for overnight (where it complements check_in date).';
COMMENT ON COLUMN public.bookings.hours_billed IS
  'Total hours charged on this booking (only set when booking_type ≠ overnight).';
