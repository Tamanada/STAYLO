-- ============================================================================
-- Long-stay rates — monthly + weekly tiers per room
-- ============================================================================
-- Thai market reality: digital nomads, retirees, snowbirds and slow-tourism
-- guests routinely book 1-6 month stays. Charging them the full daily rate
-- × 90 nights drives them to AirBnb monthly listings instead. Hoteliers
-- need to offer a discounted long-stay rate AND have STAYLO honour it
-- automatically when the booking dates qualify.
--
-- Two tiers, both optional:
--   1. Monthly rate (flat, set by the hotelier)  — kicks in at monthly_min_nights
--   2. Weekly discount (% off daily)             — kicks in at weekly_min_nights
--
-- Pricing logic (implemented in src/lib/roomPricing.js):
--   nights >= monthly_min_nights AND monthly_rate > 0
--     → effective per-night = monthly_rate / 30, applied to every night
--   else if nights >= weekly_min_nights AND weekly_discount_pct > 0
--     → effective per-night = daily_rate × (1 - weekly_discount_pct/100)
--   else
--     → daily rate per night (existing behaviour)
--
-- Why per-night equivalent (not "1 month + N extra days"):
--   30-night stay at $20/night equiv = $600 (= the monthly rate)
--   29-night stay at $20/night equiv = $580 (cheaper than the flat $600,
--                                            so the threshold doesn't
--                                            create a perverse incentive
--                                            to add a 30th night just to
--                                            pay less)
--   60-night stay at $20/night equiv = $1200 (= 2× monthly rate, naturally)
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS monthly_rate         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monthly_min_nights   INT     NOT NULL DEFAULT 28
    CHECK (monthly_min_nights BETWEEN 14 AND 90),
  ADD COLUMN IF NOT EXISTS weekly_discount_pct  INT     NOT NULL DEFAULT 0
    CHECK (weekly_discount_pct BETWEEN 0 AND 80),
  ADD COLUMN IF NOT EXISTS weekly_min_nights    INT     NOT NULL DEFAULT 7
    CHECK (weekly_min_nights BETWEEN 3 AND 28);

COMMENT ON COLUMN public.rooms.monthly_rate IS
  'Flat monthly price in USD for stays ≥ monthly_min_nights. NULL = no monthly tier offered. Per-night equivalent = monthly_rate / 30.';
COMMENT ON COLUMN public.rooms.monthly_min_nights IS
  'Threshold (nights) above which monthly_rate kicks in. 28 by default (some markets count 30, kept editable).';
COMMENT ON COLUMN public.rooms.weekly_discount_pct IS
  '0-80% discount on daily rate when nights ≥ weekly_min_nights. Use this if you offer a smaller long-stay incentive without a flat monthly rate. 0 = no weekly tier.';
COMMENT ON COLUMN public.rooms.weekly_min_nights IS
  'Threshold (nights) for the weekly discount tier. 7 by default.';
