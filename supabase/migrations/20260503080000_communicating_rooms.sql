-- ============================================================================
-- Communicating rooms — adjoining rooms with an internal connecting door
-- ============================================================================
-- Family hotels and resorts often have pairs of rooms with a shared internal
-- door so parents can put kids in the second room while keeping access. The
-- guest needs to know this exists when they book multiple rooms; the
-- receptionist needs to know it was requested when they assign physical units.
--
-- V1 model (this commit):
--   - Per room TYPE: boolean "we have at least one pair of communicating
--     units in this category". No tracking of which physical units are
--     paired — the receptionist allocates by hand from local knowledge.
--   - Per booking: boolean "guest requested communicating rooms". Surface
--     this prominently on the front desk so it's not missed.
--
-- V2 (later): track individual room units + their pairs in a separate
-- `room_units` table, expose live "X pairs available for these dates"
-- on the booking form.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS communicating_rooms_available boolean NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS communicating_rooms_requested boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rooms.communicating_rooms_available IS
  'TRUE = at least one pair of physical units of this room type are connected by an internal door (family-friendly).';
COMMENT ON COLUMN public.bookings.communicating_rooms_requested IS
  'Guest ticked the request box at booking. Front desk should try to assign communicating units.';

-- Useful for the front desk filter "show me bookings that asked for connected rooms"
CREATE INDEX IF NOT EXISTS bookings_communicating_idx
  ON public.bookings (communicating_rooms_requested)
  WHERE communicating_rooms_requested = true;
