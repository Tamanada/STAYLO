-- ============================================================================
-- bookings.rooms_count — number of identical rooms reserved in this booking
-- ============================================================================
-- Use case: a family of 6 wants to book 3 "Standard Double" rooms. Without
-- this column they'd need to make 3 separate bookings (and pay 3 times in
-- Stripe). With it, one booking represents the whole reservation:
--   1 STY-XXXXXX ref · 3 rooms × $45 × 3 nights = $405 + fees, one payment.
--
-- Defaults to 1 so all existing rows stay correct.
-- The capacity guard trigger from 20260430000000 still applies per-row, but
-- we now compare guests vs (rooms_count * rooms.max_guests).
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rooms_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_rooms_count_positive
  CHECK (rooms_count >= 1);

COMMENT ON COLUMN public.bookings.rooms_count IS
  'Number of identical rooms reserved in this booking. 1 by default. Total price already accounts for it (total_price = base_price * nights * rooms_count).';

-- Update the max-guests trigger to allow rooms_count multiplier
CREATE OR REPLACE FUNCTION enforce_booking_max_guests()
RETURNS trigger AS $$
DECLARE
  room_max integer;
  effective_max integer;
BEGIN
  IF NEW.guests IS NULL OR NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_guests INTO room_max FROM rooms WHERE id = NEW.room_id;

  IF room_max IS NULL OR room_max <= 0 THEN
    RETURN NEW;
  END IF;

  -- Multiply by rooms_count: 3 doubles can take up to 6 guests
  effective_max := room_max * COALESCE(NEW.rooms_count, 1);

  IF NEW.guests > effective_max THEN
    RAISE EXCEPTION 'This booking has % guests but the % room(s) only sleep % total.',
      NEW.guests, COALESCE(NEW.rooms_count, 1), effective_max
      USING ERRCODE = 'check_violation',
            HINT    = 'Reduce the guest count, increase rooms, or pick a larger room.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
