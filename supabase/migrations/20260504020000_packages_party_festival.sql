-- ============================================================================
-- Add 'party', 'festival' and 'sport' to the packages.category enum
-- ============================================================================
-- Koh Phangan reality:
--   - 'party'    : Full Moon, Half Moon, Black Moon, Shiva Moon — huge chunk
--                  of bookings. Hoteliers want to package the experience
--                  (transfer + tickets + post-party brunch) as a bundle.
--   - 'festival' : Songkran, Loy Krathong, NYE, music festivals…
--   - 'sport'    : Muay Thai camps, surf weeks, kitesurf, Thai boxing
--                  retreats, marathon prep, golf packages. Distinct from
--                  'adventure' (which leans toward tours/excursions).
-- ============================================================================

ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_category_check;

ALTER TABLE public.packages
  ADD CONSTRAINT packages_category_check CHECK (category IN (
    'romance', 'wellness', 'adventure', 'family',
    'dining',  'business', 'celebration', 'retreat',
    'party',   'festival',  'sport',
    'other'
  ));
