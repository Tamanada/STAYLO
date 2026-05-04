-- ============================================================================
-- room_packages.date_blocks — date ranges when a package is bookable
-- ============================================================================
-- Many packages are tied to specific real-world events (Full Moon parties,
-- Songkran, Loy Krathong, NYE…). Outside of those date windows the bundle
-- doesn't make sense. The hotelier wants to say: "this Full Moon Party
-- package is offered around the moon dates of Jul 10, Aug 9, Sep 7…".
--
-- Storage shape (jsonb):
--   [
--     { "start": "2026-07-10", "end": "2026-07-12" },
--     { "start": "2026-08-09", "end": "2026-08-11" },
--     ...
--   ]
--
-- Semantics:
--   - Empty array (default) = package available year-round (no date filter)
--   - One or more ranges    = package only offered when the booking range
--                              fully overlaps with one of the windows
--                              (handled in the OTA filter, not the DB)
-- ============================================================================

ALTER TABLE public.room_packages
  ADD COLUMN IF NOT EXISTS date_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.room_packages.date_blocks IS
  'Optional list of {start, end} date ranges (YYYY-MM-DD) when this package is bookable for this room. Empty array = always available.';
