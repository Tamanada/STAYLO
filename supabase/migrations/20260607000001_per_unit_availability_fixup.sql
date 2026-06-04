-- ============================================================================
-- 20260607000001_per_unit_availability_fixup
-- ============================================================================
-- Companion to 20260607000000_per_unit_availability. After the unique
-- constraint on room_availability shifted from (room_id, date) to
-- (room_id, date, room_unit_index), the existing
-- recompute_room_availability() function broke — its ON CONFLICT clause
-- still names the old key.
--
-- The trigger fires on bookings INSERT/UPDATE/DELETE, which means it ALSO
-- fired during the previous migration's backfill (UPDATE bookings SET
-- room_unit_index = ...), causing 42P10. So the previous migration
-- partially applied: the columns + new constraint are in place, but the
-- bookings backfill stopped mid-way.
--
-- This fixup:
--   1. Rewrites recompute_room_availability to ON CONFLICT on the new key
--      (room_id, date, room_unit_index) and target the index=0 row
--      (= the type-default availability that the live count belongs to).
--   2. Re-runs the bookings backfill, idempotently (rows that already
--      have room_unit_index set are skipped via IS NULL guard).
--   3. Re-runs the recompute backfill so every active booking range has
--      its type-default row in sync.
-- ============================================================================

-- 1. Rewrite the function with the new ON CONFLICT key.
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

  SELECT quantity INTO total_qty FROM public.rooms WHERE id = p_room_id;
  IF total_qty IS NULL THEN
    RETURN;
  END IF;

  d := p_check_in;
  WHILE d < p_check_out LOOP
    SELECT count(*) INTO active_cnt
      FROM public.bookings
     WHERE room_id   = p_room_id
       AND status    IN ('pending', 'confirmed', 'checked_in')
       AND check_in  <= d
       AND check_out >  d;

    -- The type-default row (room_unit_index = 0) carries the live
    -- available_count for the whole room type. Per-unit override rows
    -- (room_unit_index > 0) are inserted explicitly by the hotelier via
    -- the Disponibilités UI; they're not touched by this trigger.
    INSERT INTO public.room_availability
        (room_id, date, room_unit_index, available_count, is_blocked)
    VALUES
        (p_room_id, d, 0, GREATEST(0, total_qty - active_cnt), false)
    ON CONFLICT (room_id, date, room_unit_index) DO UPDATE
       SET available_count = CASE
             WHEN public.room_availability.is_blocked THEN 0
             ELSE GREATEST(0, total_qty - active_cnt)
           END;

    d := d + 1;
  END LOOP;
END;
$$;


-- 2. Resume the bookings backfill that the previous migration started.
-- IS NULL guard makes this safe to re-run.
DO $$
DECLARE
  v_room    RECORD;
  v_booking RECORD;
  v_idx     INT;
  v_quantity INT;
BEGIN
  FOR v_room IN
    SELECT r.id, r.quantity, r.type
      FROM public.rooms r
     WHERE COALESCE(r.quantity, 1) > 1
       AND LOWER(COALESCE(r.type, '')) NOT IN ('dormitory', 'capsule')
  LOOP
    v_quantity := COALESCE(v_room.quantity, 1);
    FOR v_booking IN
      SELECT id, check_in, check_out
        FROM public.bookings
       WHERE room_id = v_room.id
         AND room_unit_index IS NULL
         AND COALESCE(status, '') != 'cancelled'
       ORDER BY check_in ASC, created_at ASC
    LOOP
      v_idx := NULL;
      FOR i IN 1..v_quantity LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.bookings b2
           WHERE b2.room_id = v_room.id
             AND b2.room_unit_index = i
             AND b2.check_in  < v_booking.check_out
             AND b2.check_out > v_booking.check_in
             AND b2.id != v_booking.id
        ) THEN
          v_idx := i;
          EXIT;
        END IF;
      END LOOP;
      IF v_idx IS NULL THEN
        v_idx := 1;
      END IF;
      UPDATE public.bookings SET room_unit_index = v_idx WHERE id = v_booking.id;
    END LOOP;
  END LOOP;
END $$;


-- 3. Recompute backfill — refresh the type-default availability rows for
-- every currently-active booking range. Mirrors the backfill at the bottom
-- of 20260503020000_sync_availability_on_booking.sql but using the now-
-- fixed function.
DO $$
DECLARE
  b RECORD;
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
