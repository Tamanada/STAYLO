-- ============================================================================
-- room_availability.specials — multiple stackable rewards per day
-- ============================================================================
-- Until now, every (room, date) row had a SINGLE perk + promo_label, so
-- adding a new reward (e.g. "Birthday Special") to a day that already had
-- one ("Half Moon — free shuttle") silently overwrote the previous one.
-- Hoteliers reasonably expect to stack offers — a Half Moon Friday IS
-- also a birthday Friday for some guests.
--
-- New shape: a JSONB array, each element = one reward object:
--   { "label": "Half Moon", "perk": "Free shuttle to party", "min_stay": 2 }
--   { "label": "Birthday Special", "perk": "Free cake & champagne" }
--
-- Discount % stays SINGLE (promo_pct) — stacking discounts on a single day
-- is rare AND undesirable from a margin perspective. If a hotelier wants
-- "20% off + free breakfast", they put the discount in promo_pct and the
-- breakfast in specials.
--
-- Backfill: existing rows with a perk get migrated to a one-element array.
-- The legacy perk + promo_label columns are KEPT for now (UI gracefully
-- falls back when specials is empty) — we'll drop them in a future
-- migration once nothing reads them.
-- ============================================================================

ALTER TABLE public.room_availability
  ADD COLUMN IF NOT EXISTS specials jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing single perks into the new array
UPDATE public.room_availability
   SET specials = jsonb_build_array(
         jsonb_strip_nulls(jsonb_build_object(
           'label',    promo_label,
           'perk',     perk,
           'min_stay', min_stay
         ))
       )
 WHERE perk IS NOT NULL
   AND specials = '[]'::jsonb;

-- GIN index for future querying (e.g. "find all days with a 'Half Moon' special")
CREATE INDEX IF NOT EXISTS room_availability_specials_idx
  ON public.room_availability USING GIN (specials);

COMMENT ON COLUMN public.room_availability.specials IS
  'Stackable per-day rewards. Each element: { label, perk, min_stay }. Replaces the legacy perk + promo_label single-reward model.';
