-- ============================================================================
-- Auto-sync room_availability.available_count when bookings change
-- ============================================================================
-- Bug discovered 2026-05-03: walk-in check-ins (and any other booking flows)
-- insert into public.bookings but NEVER touch public.room_availability. The
-- calendar shows available_count which only reflected manual hotelier edits.
-- → Booking a room via Front Desk left it showing "3/3 available" forever.
--
-- Fix: trigger that recomputes available_count for every (room, date) row
-- in the booking's range, on INSERT / UPDATE / DELETE.
--
-- Design choice — recompute, don't increment:
--   We could try to ±1 the column on each booking event, but that breaks the
--   moment any event is missed (e.g. trigger temporarily disabled, or a row
--   re-inserted via raw SQL). Recomputing from scratch by counting current
--   active bookings is idempotent and self-healing.
--
-- Manual blocks preserved:
--   If the hotelier manually set is_blocked = true on a date (e.g. for a
--   private function or maintenance), available_count stays 0 — bookings
--   shouldn't be possible anyway because of the check_room_availability()
--   guard, but the trigger respects the manual block as a belt-and-braces.
--
-- Statuses considered "active" (occupy a slot):
--   pending       — guest reserved but hasn't paid / arrived yet
--   confirmed     — payment cleared, guest expected
--   checked_in    — guest physically in the room (incl. walk-ins)
--
-- Statuses that DON'T occupy:
--   cancelled · refunded · completed · no_show · checked_out
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recompute_room_availability(
  p_room_id   uuid,
  p_check_in  date,
  p_check_out date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d           date;
  total_qty   int;
  active_cnt  int;
BEGIN
  IF p_room_id IS NULL OR p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN;
  END IF;

  -- The room's published quantity is our ceiling. If the room was deleted,
  -- there's nothing to recompute.
  SELECT quantity INTO total_qty FROM public.rooms WHERE id = p_room_id;
  IF total_qty IS NULL THEN
    RETURN;
  END IF;

  -- Iterate every date in [check_in, check_out) — same half-open interval
  -- the booking semantics use (check_out day is when the room frees up).
  d := p_check_in;
  WHILE d < p_check_out LOOP
    -- Count overlapping active bookings on this date
    SELECT count(*) INTO active_cnt
      FROM public.bookings
     WHERE room_id   = p_room_id
       AND status    IN ('pending', 'confirmed', 'checked_in')
       AND check_in  <= d
       AND check_out >  d;

    INSERT INTO public.room_availability (room_id, date, available_count, is_blocked)
    VALUES (p_room_id, d, GREATEST(0, total_qty - active_cnt), false)
    ON CONFLICT (room_id, date) DO UPDATE
       SET available_count = CASE
             WHEN public.room_availability.is_blocked THEN 0
             ELSE GREATEST(0, total_qty - active_cnt)
           END;

    d := d + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.recompute_room_availability IS
  'Recomputes room_availability.available_count for the given date range by counting overlapping active bookings. Idempotent. Respects manual is_blocked.';

-- ============================================================================
-- Trigger function — calls recompute on the booking's range whenever the
-- table changes. Handles INSERT (NEW range), DELETE (OLD range), and UPDATE
-- (both ranges if room_id / dates / status changed, since either could
-- affect availability).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_sync_availability_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_room_availability(OLD.room_id, OLD.check_in, OLD.check_out);
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE → always sync the NEW range
  PERFORM public.recompute_room_availability(NEW.room_id, NEW.check_in, NEW.check_out);

  -- UPDATE with a moved range or changed status → also resync the OLD range
  -- (a room that was held but is now free needs its slot back)
  IF TG_OP = 'UPDATE' AND (
       OLD.room_id   IS DISTINCT FROM NEW.room_id   OR
       OLD.check_in  IS DISTINCT FROM NEW.check_in  OR
       OLD.check_out IS DISTINCT FROM NEW.check_out OR
       OLD.status    IS DISTINCT FROM NEW.status
     ) THEN
    PERFORM public.recompute_room_availability(OLD.room_id, OLD.check_in, OLD.check_out);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_availability ON public.bookings;
CREATE TRIGGER bookings_sync_availability
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_availability_on_booking();

-- ============================================================================
-- Backfill: walk every existing future booking and recompute its range.
-- Past bookings are skipped (their dates are no longer relevant for stock).
-- This catches the bug-affected walk-in row David just inserted.
-- ============================================================================
DO $$
DECLARE
  b record;
BEGIN
  FOR b IN
    SELECT room_id, check_in, check_out
      FROM public.bookings
     WHERE status   IN ('pending', 'confirmed', 'checked_in')
       AND check_out >= CURRENT_DATE
  LOOP
    PERFORM public.recompute_room_availability(b.room_id, b.check_in, b.check_out);
  END LOOP;
END $$;
