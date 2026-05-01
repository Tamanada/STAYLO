-- ============================================================================
-- properties.min_age — minimum guest age for the property
-- ============================================================================
-- Some properties enforce an age limit:
--   - Adults-only resorts (18+)
--   - Party hostels in destinations where the legal drinking age is 21+
--   - Wellness retreats restricted to adults
--   - Some boutique B&Bs that simply don't accept kids
--
-- Stored as a small integer:
--   NULL  → all ages welcome (default)
--   16    → "Teens and adults"
--   18    → "Adults only"
--   21    → "21 and over" (party crowd)
--   25    → rare — luxury / Vegas-style
--
-- Enforcement happens at the OTA level (refuse booking if children > 0 and
-- min_age >= 18). The DB constraint just sanity-checks the value.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS min_age smallint;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_min_age_range
  CHECK (min_age IS NULL OR (min_age >= 0 AND min_age <= 99));

COMMENT ON COLUMN public.properties.min_age IS
  'Minimum guest age. NULL = all ages. 18 = adults only. Used to refuse bookings with children when the policy excludes them.';
