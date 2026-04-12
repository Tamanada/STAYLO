-- ============================================
-- Fix bookings FK constraints — add ON DELETE CASCADE
-- Without this, deleting a property or room fails
-- when bookings reference them.
-- ============================================

-- bookings.property_id → properties(id)
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_property_id_fkey,
  ADD CONSTRAINT bookings_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- bookings.room_id → rooms(id)
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_room_id_fkey,
  ADD CONSTRAINT bookings_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
