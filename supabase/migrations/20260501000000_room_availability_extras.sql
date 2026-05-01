-- ============================================================================
-- room_availability — extra columns for advanced bulk operations
-- ============================================================================
-- A: min_stay      → minimum number of nights required if booking includes this date
-- B: promo_label   → free-text label shown to guests ("🔥 Hot deal", "⚡ Last minute")
--    promo_pct     → percentage discount applied on top of base_price/price_override
-- G: internal_note → hotelier-only annotation (never shown to guests)
--
-- All optional. Existing rows stay untouched.
-- ============================================================================

ALTER TABLE public.room_availability
  ADD COLUMN IF NOT EXISTS min_stay      integer,
  ADD COLUMN IF NOT EXISTS promo_label   text,
  ADD COLUMN IF NOT EXISTS promo_pct     numeric(5, 2),
  ADD COLUMN IF NOT EXISTS internal_note text;

COMMENT ON COLUMN public.room_availability.min_stay IS
  'Minimum number of nights required if the booking spans this date. NULL = no constraint.';
COMMENT ON COLUMN public.room_availability.promo_label IS
  'Free-text label visible to guests on /ota (e.g. "🔥 Hot deal", "Last minute"). NULL = no promo.';
COMMENT ON COLUMN public.room_availability.promo_pct IS
  'Percentage discount applied to the room price for this date (0–100). NULL = no discount.';
COMMENT ON COLUMN public.room_availability.internal_note IS
  'Hotelier-only annotation (e.g. "Wedding Smith — pre-booked"). Never shown to guests.';

-- Sanity check
ALTER TABLE public.room_availability
  ADD CONSTRAINT room_avail_promo_pct_range
  CHECK (promo_pct IS NULL OR (promo_pct >= 0 AND promo_pct <= 100));

ALTER TABLE public.room_availability
  ADD CONSTRAINT room_avail_min_stay_positive
  CHECK (min_stay IS NULL OR min_stay >= 1);
