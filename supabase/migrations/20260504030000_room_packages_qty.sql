-- ============================================================================
-- room_packages.qty — how many units of a package come bundled with a room
-- ============================================================================
-- Each package is priced per unit (1 person by default). The qty on the
-- room↔package link tells STAYLO how many units to charge when a guest
-- books that room.
--
-- Examples:
--   - Couples Spa pkg ($120/unit) attached to a Deluxe Double (2 pax) → qty 2
--     Booking total: $120 × 2 = $240
--   - Full Moon Pass ($30/unit) attached to a Dorm Bed (1 pax) → qty 1
--     Booking total: $30 × 1 = $30
--   - Wedding Suite Bundle ($800/unit, all-inclusive) → qty 1 (one bundle
--     covers the whole couple, regardless of who is in the room)
--
-- Auto-suggestion (UI side): default qty = room.max_guests, hotelier
-- can override manually. e.g., a 4-pax room with no extra-bed option
-- naturally maps to 4 units of a per-person package.
-- ============================================================================

ALTER TABLE public.room_packages
  ADD COLUMN IF NOT EXISTS qty INT NOT NULL DEFAULT 1
    CHECK (qty BETWEEN 1 AND 50);

COMMENT ON COLUMN public.room_packages.qty IS
  'How many units of the package come bundled with this room. Defaults to 1; UI auto-suggests room.max_guests at link time.';
