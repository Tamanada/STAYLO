-- ============================================================================
-- 20260607000000_per_unit_availability
-- ============================================================================
-- Adds per-physical-unit granularity to room_availability + bookings.
--
-- Up to now the system tracked everything at the room-TYPE level: one row in
-- room_availability per (room_id, date), one booking per (room_id, dates).
-- For Dancing Elephant's 4 BABAs (super-king ×4), blocking June 5 blocks
-- ALL 4 BABAs that day. David hit this 2026-06-05: he wanted to put BABA 2
-- under maintenance (blocked) while keeping BABA 1, 3, 4 available.
--
-- Schema change:
--   · room_availability gains room_unit_index INT (default 0). 0 = the
--     "type-default" row that applies to every unit of that room. 1..quantity
--     = per-unit overrides that take precedence when present.
--   · The unique constraint shifts from (room_id, date) to (room_id, date,
--     room_unit_index) so multiple rows can coexist for the same date — the
--     type default at index 0 + per-unit overrides at index 1..N.
--   · bookings gains room_unit_index INT (nullable). Tells the reception which
--     specific physical unit a booking occupies. Backfilled deterministically
--     by first-fit ascending check_in date.
--
-- Read pattern (client side):
--   For zone (room_id, date, unit_index):
--     SELECT * FROM room_availability
--      WHERE room_id = $1 AND date = $2 AND room_unit_index IN (unit_index, 0)
--      ORDER BY room_unit_index DESC LIMIT 1
--   → If a unit-specific row exists, it wins. Otherwise the index=0 default
--   is returned. Apps still see ONE effective row per (unit, date).
--
-- Dorms (room.type IN ('dormitory', 'capsule')) keep using index=0 only —
-- per-bed detail lives in the existing DormSubPlanModal, not in this table.
-- ============================================================================

-- ============================================
-- 1. room_availability — add room_unit_index + reshape unique constraint
-- ============================================
ALTER TABLE public.room_availability
  ADD COLUMN IF NOT EXISTS room_unit_index INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.room_availability.room_unit_index IS
'0 = type-default (applies to every physical unit of this room). 1..rooms.quantity = per-unit override (e.g. BABA 2 specifically). The client merges: a unit-specific row wins over the type-default for the same (room_id, date).';

-- Drop the old (room_id, date) UNIQUE — it would block per-unit overrides
-- from being inserted. The new key includes room_unit_index so the same
-- date can carry both a type default and N per-unit overrides.
ALTER TABLE public.room_availability
  DROP CONSTRAINT IF EXISTS room_availability_room_id_date_key;

-- Some Postgres versions auto-name the constraint differently. Defensive
-- DROP-IF-EXISTS on alternate names:
ALTER TABLE public.room_availability
  DROP CONSTRAINT IF EXISTS room_availability_room_id_date_room_unit_index_key;

ALTER TABLE public.room_availability
  ADD CONSTRAINT room_availability_room_id_date_unit_key
    UNIQUE (room_id, date, room_unit_index);

-- Index supporting the merge query (room_id + date scan with unit fallback).
DROP INDEX IF EXISTS idx_room_availability_room_date;
CREATE INDEX IF NOT EXISTS idx_room_availability_room_date_unit
  ON public.room_availability(room_id, date, room_unit_index);


-- ============================================
-- 2. bookings — add room_unit_index + backfill
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_unit_index INT;

COMMENT ON COLUMN public.bookings.room_unit_index IS
'1..rooms.quantity — which specific physical unit of the room type this booking occupies. NULL on legacy bookings (pre-2026-06-07) that were assigned algorithmically. Used by reception views (FloorPlanV7View, TimelineView) to colour the correct unit and avoid double-bookings.';

CREATE INDEX IF NOT EXISTS idx_bookings_room_unit
  ON public.bookings(room_id, room_unit_index)
  WHERE room_unit_index IS NOT NULL;

-- Backfill — assign existing bookings to unit indexes deterministically.
-- Strategy: for each (room_id), walk active bookings sorted by check_in
-- ascending and assign the lowest free unit_index that doesn't conflict
-- with previously-assigned bookings (overlapping dates on the same unit).
--
-- Skips dorms because the room is treated as one space; the per-bed
-- assignment lives in booking_guests / staylo_points, not here.
DO $$
DECLARE
  v_room    RECORD;
  v_booking RECORD;
  v_idx     INT;
  v_quantity INT;
  v_assigned INT[];
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
      -- Find the lowest unit_index that has no overlapping booking yet.
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
        -- Over-capacity (more concurrent bookings than units exist) —
        -- fall back to unit 1 so the booking still has an index. The
        -- reception UI will flag the overlap visually.
        v_idx := 1;
      END IF;
      UPDATE public.bookings SET room_unit_index = v_idx WHERE id = v_booking.id;
    END LOOP;
  END LOOP;
END $$;


-- ============================================
-- 3. check_room_availability() — respect per-unit blocks
-- ============================================
-- The existing function (from 20260411000000_booking_engine) checks for
-- `is_blocked = true` on (room_id, date) rows. With per-unit overrides we
-- need richer semantics: a room is bookable on a date if there's at least
-- ONE unit that isn't blocked. Type-default block (index 0) applies to all
-- units; per-unit blocks subtract from the available count.
--
-- We replace it. The signature stays compatible: returns boolean (any
-- bookable unit available) for the date range. Callers (OTA Checkout,
-- PMSFrontDesk) don't need to change.
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_room          public.rooms%ROWTYPE;
  v_quantity      INT;
  v_date          DATE;
  v_blocked_units INT[];     -- which unit indexes are blocked on this date
  v_type_blocked  BOOLEAN;
  v_unit_avail    INT;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  v_quantity := GREATEST(1, COALESCE(v_room.quantity, 1));

  v_date := p_check_in;
  WHILE v_date < p_check_out LOOP
    -- Type-default block? If index=0 is blocked, NO unit can be booked
    -- that day (it's a property-wide closure).
    SELECT COALESCE(is_blocked, FALSE) INTO v_type_blocked
      FROM public.room_availability
     WHERE room_id = p_room_id
       AND date = v_date
       AND room_unit_index = 0;
    IF v_type_blocked THEN
      RETURN FALSE;
    END IF;

    -- Per-unit blocks for this date.
    SELECT COALESCE(array_agg(room_unit_index), ARRAY[]::INT[]) INTO v_blocked_units
      FROM public.room_availability
     WHERE room_id = p_room_id
       AND date = v_date
       AND room_unit_index > 0
       AND is_blocked = TRUE;

    -- Available units = quantity - blocked - currently-booked on this date.
    SELECT v_quantity - array_length(v_blocked_units, 1) - COUNT(b.*)::INT
      INTO v_unit_avail
      FROM public.bookings b
     WHERE b.room_id = p_room_id
       AND b.check_in <= v_date
       AND b.check_out > v_date
       AND COALESCE(b.status, '') NOT IN ('cancelled');
    -- array_length returns NULL for an empty array; coalesce to 0.
    v_unit_avail := v_quantity
                    - COALESCE(array_length(v_blocked_units, 1), 0)
                    - (SELECT COUNT(*)::INT FROM public.bookings b2
                        WHERE b2.room_id = p_room_id
                          AND b2.check_in <= v_date
                          AND b2.check_out > v_date
                          AND COALESCE(b2.status, '') NOT IN ('cancelled'));

    IF v_unit_avail <= 0 THEN
      RETURN FALSE;
    END IF;

    v_date := v_date + 1;
  END LOOP;

  RETURN TRUE;
END $$;

COMMENT ON FUNCTION public.check_room_availability(UUID, DATE, DATE) IS
'Returns TRUE if at least one physical unit of the room is bookable on every date in [check_in, check_out). Considers type-default blocks (index 0), per-unit blocks (index 1..quantity), and existing non-cancelled bookings.';
