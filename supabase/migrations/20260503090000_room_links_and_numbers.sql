-- ============================================================================
-- Room linking (which type pairs with which) + per-booking physical room number
-- ============================================================================
-- Two small additions:
--
-- 1. rooms.communicating_with_room_id — when a room type advertises
--    communicating rooms, point to the OTHER room TYPE its units pair with.
--    E.g. Jungle Suite ←→ Forest Suite. Receptionist still allocates the
--    physical units by hand at check-in (same V1 model as before).
--
-- 2. bookings.room_number — the physical room/unit assigned to this booking
--    ("101", "Jungle-A", "Cabana 3"). NULL until receptionist assigns it,
--    then editable inline from the front-desk booking row.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS communicating_with_room_id uuid
    REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS rooms_communicating_with_idx
  ON public.rooms (communicating_with_room_id)
  WHERE communicating_with_room_id IS NOT NULL;

COMMENT ON COLUMN public.rooms.communicating_with_room_id IS
  'When this room type has connecting pairs, points to the OTHER type that pairs with it (e.g. Jungle ←→ Forest). NULL = pairs are within the same type or not specified.';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_number text;

CREATE INDEX IF NOT EXISTS bookings_room_number_idx
  ON public.bookings (property_id, room_number)
  WHERE room_number IS NOT NULL;

COMMENT ON COLUMN public.bookings.room_number IS
  'Physical room/unit assigned to this booking (101, Jungle-A, Cabana 3). NULL until receptionist allocates it. Editable inline from the front desk.';
