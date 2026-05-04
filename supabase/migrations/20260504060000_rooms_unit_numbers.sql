-- ============================================================================
-- rooms.unit_numbers — bulk pool of physical unit numbers for this type
-- ============================================================================
-- A room "type" in STAYLO often represents many physical units (a Dorm
-- type with quantity=24, a Junior Suite type with quantity=34). At setup
-- the hotelier wants to enter all unit numbers in one go, not create 34
-- room rows. The receptionist later picks from this pool when assigning
-- bookings.room_number.
--
-- Storage shape: TEXT[] — flexible (alphanumeric, dotted, prefixed etc.).
-- Examples: {'t.03','t.04','t.12','t.32'}, {'101','102','201','202'},
--           {'Jungle-A','Jungle-B','Forest-A',...}
--
-- Length should match rooms.quantity, but we don't enforce it at the DB
-- level — the UI surfaces a warning when out of sync, but the hotelier
-- is allowed to add numbers progressively as units come online.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS unit_numbers TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.rooms.unit_numbers IS
  'Pool of physical unit identifiers for this room type (e.g. {t.03,t.04,t.12}). Receptionists pick from this list when assigning bookings.room_number. Empty = no pool defined yet (free-text fallback).';
