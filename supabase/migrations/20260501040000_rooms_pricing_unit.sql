-- ============================================================================
-- rooms.pricing_unit — distinguish per-room pricing from per-bed (dorm-style)
-- ============================================================================
-- Problem: dormitories charge $33/BED/night, not $33 for the whole 24-bed
-- room. Without this distinction, a guest booking 1 bed in a dorm pays
-- like they booked the entire room.
--
-- Values:
--   'room' (default) — total = base_price × nights × rooms_count.
--                       Each booking unit = a full room, may host max_guests.
--   'bed'             — total = base_price × nights × beds_count.
--                       Each booking unit = a single bed (1 person typical).
--                       quantity column = total beds in the room.
--                       max_guests should be set to 1 (or 2 for double bunks).
--
-- The booking flow re-uses `rooms_count` as "bed count" when pricing_unit='bed',
-- so no schema change is needed in bookings — only the labels change in the UI.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS pricing_unit text NOT NULL DEFAULT 'room';

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_pricing_unit_valid
  CHECK (pricing_unit IN ('room', 'bed'));

COMMENT ON COLUMN public.rooms.pricing_unit IS
  '''room'' (default): base_price is per room. ''bed'': base_price is per bed (dormitory-style).';

-- Auto-set existing dormitory rows to per-bed pricing — they were almost
-- certainly mispriced as if guests were paying for the whole dorm.
UPDATE public.rooms
   SET pricing_unit = 'bed'
 WHERE type = 'dormitory'
   AND pricing_unit = 'room';
