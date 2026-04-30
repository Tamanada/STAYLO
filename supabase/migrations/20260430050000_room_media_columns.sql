-- ============================================================================
-- Room-level photos + videos
-- ============================================================================
-- Until now, photos and videos were attached only at the property level.
-- Hoteliers asked to attach media to specific room types (showcase the
-- "Deluxe Sea View" vs the "Standard Garden Room" with their own visuals).
--
-- Storage path convention: same buckets as property-level media, with a
-- nested room subdirectory:
--   property-photos/properties/<property_id>/rooms/<room_id>/<file>
--   property-videos/properties/<property_id>/rooms/<room_id>/<file>
--
-- The simplified storage RLS policies (live since 20260430040000) only
-- check `(storage.foldername(name))[1] = 'properties'` for the path —
-- nested room paths satisfy this same prefix, so no policy change needed.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.rooms.photo_urls IS
  'Public URLs of room photos uploaded to bucket property-photos under properties/<property_id>/rooms/<room_id>/. First entry = cover.';
COMMENT ON COLUMN public.rooms.video_urls IS
  'Public URLs of room videos uploaded to bucket property-videos under properties/<property_id>/rooms/<room_id>/. First entry = hero.';
