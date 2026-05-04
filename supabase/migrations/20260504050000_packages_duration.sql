-- ============================================================================
-- packages.duration_days — fixed length of the bundle in days
-- ============================================================================
-- A 'Full Moon Party' package may be a 10-day program. A 'Yoga Retreat 7'
-- is 7 days. Once the hotelier sets this once on the package, every
-- room↔package date window only needs a START date — the end derives
-- from start + duration_days, eliminating user error and keeping the
-- per-room UI minimal (single date picker per window instead of two).
--
-- Default 1 = single-day event (Full Moon night, gala dinner, …).
-- ============================================================================

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 1
    CHECK (duration_days BETWEEN 1 AND 365);

COMMENT ON COLUMN public.packages.duration_days IS
  'Length of the package in days. The end date of any room↔package availability window is derived as start + duration_days - 1.';
