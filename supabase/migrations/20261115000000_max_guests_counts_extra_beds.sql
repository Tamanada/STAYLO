-- enforce_booking_max_guests counted guests against max_guests x rooms_count
-- only, so a child on an extra bed (a feature that exists for exactly that
-- case) was refused at INSERT with SQLSTATE 23514. Finding S3 of
-- guardian/reports/2026-10-27-p0-fixes-local-tests.md.
--
-- Capacity = max_guests x rooms_count + extra beds actually booked, where the
-- extra beds are themselves capped by the room (extra_bed_available,
-- extra_bed_max_qty x rooms_count). The trigger also fires when the number of
-- rooms or extra beds changes, not only guests and room.

CREATE OR REPLACE FUNCTION public.enforce_booking_max_guests()
RETURNS trigger AS $$
DECLARE
  room_max       integer;
  bed_available  boolean;
  bed_max_qty    integer;
  rooms_n        integer;
  beds_allowed   integer;
  effective_max  integer;
BEGIN
  IF NEW.guests IS NULL OR NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_guests, COALESCE(extra_bed_available, false), COALESCE(extra_bed_max_qty, 0)
    INTO room_max, bed_available, bed_max_qty
    FROM public.rooms WHERE id = NEW.room_id;

  IF room_max IS NULL OR room_max <= 0 THEN
    RETURN NEW;
  END IF;

  rooms_n := GREATEST(1, COALESCE(NEW.rooms_count, 1));
  beds_allowed := CASE WHEN bed_available THEN LEAST(COALESCE(NEW.extra_beds_count, 0), bed_max_qty * rooms_n) ELSE 0 END;
  effective_max := room_max * rooms_n + beds_allowed;

  IF NEW.guests > effective_max THEN
    RAISE EXCEPTION 'This booking has % guests but the % room(s) sleep % total (% extra bed(s) counted).',
      NEW.guests, rooms_n, effective_max, beds_allowed
      USING ERRCODE = 'check_violation',
            HINT    = 'Reduce the guest count, add an extra bed if the room offers one, increase rooms, or pick a larger room.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_max_guests ON public.bookings;
CREATE TRIGGER trg_booking_max_guests
  BEFORE INSERT OR UPDATE OF guests, room_id, rooms_count, extra_beds_count ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_max_guests();

COMMENT ON FUNCTION public.enforce_booking_max_guests IS
  'Blocks bookings.guests above max_guests x rooms_count + booked extra beds (capped by the room). Defense in depth, the UI also validates.';
