-- ============================================================================
-- bookings — split guests into adults + children
-- ============================================================================
-- Until now, `bookings.guests` was a single total. Hoteliers and admins had
-- no way to know if a booking is "2 adults" or "2 adults + 3 kids" — same
-- room capacity but very different operational reality (extra beds, baby
-- crib, kids menu, etc.).
--
-- Split into 2 columns + keep the legacy `guests` column as the canonical
-- TOTAL so every existing trigger and report keeps working unchanged.
--
-- Backfill: existing `guests` becomes `adults` by default (children=0).
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adults   integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0;

-- Backfill — only for rows where adults is still at the default (1) but
-- guests > 1. Treat all of them as adults.
UPDATE public.bookings
   SET adults = guests
 WHERE guests > 0
   AND adults = 1
   AND children = 0;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_adults_positive   CHECK (adults   >= 1),
  ADD CONSTRAINT bookings_children_positive CHECK (children >= 0);

COMMENT ON COLUMN public.bookings.adults   IS 'Number of adults (13+) in the booking. Always >= 1.';
COMMENT ON COLUMN public.bookings.children IS 'Number of children (0–12) in the booking. May be 0.';
COMMENT ON COLUMN public.bookings.guests   IS 'Total people in the booking = adults + children. Kept for back-compat with triggers/reports.';
