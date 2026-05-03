-- ============================================================================
-- Extra beds — allow adults too (was kids-only)
-- ============================================================================
-- David's request: hoteliers should be able to offer roll-away beds to
-- adults too, not just children ≤ extra_bed_max_age. Common scenario:
-- a friend joins the trip last-minute, doesn't want to pay for a 2nd
-- room, fine with a roll-away.
--
-- New column extra_bed_adults_allowed:
--   false (default) → kids only ≤ extra_bed_max_age (current behaviour)
--   true            → anyone, regardless of age
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS extra_bed_adults_allowed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rooms.extra_bed_adults_allowed IS
  'Default false = extra bed reserved for children ≤ extra_bed_max_age. Set true if the hotelier allows adults to use the roll-away too (e.g. last-minute friend on the trip).';
