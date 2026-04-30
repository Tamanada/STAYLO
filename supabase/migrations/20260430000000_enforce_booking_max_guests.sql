-- ============================================================================
-- Enforce booking.guests <= rooms.max_guests at the DB level
-- ============================================================================
-- Why a trigger and not a CHECK constraint?
--   CHECK constraints can't reference another table. We need to look up the
--   linked room row, so we use a BEFORE INSERT/UPDATE trigger instead.
--
-- Defense in depth: PropertyDetail clamps + Checkout validates, but URL
-- tampering / curl POSTs / future API integrations could still try to
-- over-book a room. This trigger is the last line of defense.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_booking_max_guests()
RETURNS trigger AS $$
DECLARE
  room_max integer;
BEGIN
  -- Only validate if we have both a guest count and a linked room.
  -- (Some legacy bookings may have NULL room_id — let those pass.)
  IF NEW.guests IS NULL OR NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_guests INTO room_max FROM rooms WHERE id = NEW.room_id;

  -- Room not found, or max_guests not configured → don't block (admin tool may still need it)
  IF room_max IS NULL OR room_max <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.guests > room_max THEN
    RAISE EXCEPTION 'Room % allows up to % guests, but booking requested %.',
      NEW.room_id, room_max, NEW.guests
      USING ERRCODE = 'check_violation',
            HINT    = 'Reduce the guest count or pick a larger room.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_max_guests ON bookings;
CREATE TRIGGER trg_booking_max_guests
  BEFORE INSERT OR UPDATE OF guests, room_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_booking_max_guests();

COMMENT ON FUNCTION enforce_booking_max_guests IS
  'Blocks bookings.guests > rooms.max_guests. Defense in depth — UI also validates.';
