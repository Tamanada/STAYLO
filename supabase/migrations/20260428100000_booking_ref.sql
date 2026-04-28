-- ============================================
-- Migration: Add human-friendly booking_ref to bookings
-- Date: 2026-04-28
-- ============================================
-- Adds a short, communicable reference for each booking — usable on
-- the phone, in emails, on Stripe receipts. Format: STY-XXXXXX where
-- X is one of 30 unambiguous alphanumeric chars (no 0/O, 1/I/L).
--
-- Example refs: STY-A7K9MX, STY-Q4PS3R, STY-KMR82H.
-- ~30^6 = 729 million combinations → safe for 100+ years of bookings.
--
-- The ref is NOT the primary key (UUID stays for routing/joins).
-- It's an additional UNIQUE column for HUMAN communication.
-- ============================================

-- 1. Generator function — returns a fresh STY-XXXXXX string
CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  -- 30 chars, no ambiguous ones (no 0/O, no 1/I/L)
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result   TEXT := 'STY-';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.generate_booking_ref() IS
  'Generates a STY-XXXXXX booking reference using 30 unambiguous alphanumeric chars.';

-- 2. Add the column
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_ref TEXT;

-- 3. Backfill existing rows (each gets a fresh ref)
DO $$
DECLARE
  rec RECORD;
  new_ref TEXT;
  attempts INT;
BEGIN
  FOR rec IN SELECT id FROM public.bookings WHERE booking_ref IS NULL LOOP
    attempts := 0;
    LOOP
      new_ref := public.generate_booking_ref();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_ref = new_ref);
      attempts := attempts + 1;
      EXIT WHEN attempts > 50;
    END LOOP;
    UPDATE public.bookings SET booking_ref = new_ref WHERE id = rec.id;
  END LOOP;
END $$;

-- 4. Now make it NOT NULL + UNIQUE + indexed
ALTER TABLE public.bookings
  ALTER COLUMN booking_ref SET NOT NULL,
  ADD CONSTRAINT bookings_booking_ref_unique UNIQUE (booking_ref);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref ON public.bookings(booking_ref);

COMMENT ON COLUMN public.bookings.booking_ref IS
  'Human-friendly reference (STY-XXXXXX). Use this in emails, on the phone, on Stripe receipts. UUID stays the primary key.';

-- 5. Trigger: auto-generate booking_ref on INSERT if not provided
CREATE OR REPLACE FUNCTION public.set_booking_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_ref  TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.booking_ref IS NULL OR NEW.booking_ref = '' THEN
    LOOP
      new_ref := public.generate_booking_ref();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_ref = new_ref);
      attempts := attempts + 1;
      IF attempts > 50 THEN
        RAISE EXCEPTION 'Could not generate unique booking_ref after 50 attempts';
      END IF;
    END LOOP;
    NEW.booking_ref := new_ref;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_set_ref ON public.bookings;
CREATE TRIGGER trg_bookings_set_ref
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_ref();
