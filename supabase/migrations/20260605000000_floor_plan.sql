-- ============================================================================
-- 20260605000000_floor_plan
-- ============================================================================
-- Visual floor plan editor — V1 scope:
--   · ONE plan image per property (upload to storage)
--   · Each room can be placed on the plan with an (x, y) coordinate
--     expressed as % from the top-left of the image (0–100). Percentages
--     not pixels so the markers move proportionally if the image is
--     re-uploaded at a different resolution.
--   · Rooms without coordinates appear in an "Unplaced" tray in the
--     editor; the hotelier drags them onto the image.
--
-- Why not per-floor planning (multi-image)? Stays simple in V1. Multi-
-- floor buildings can either upload a composite plan or upload the
-- main floor and use the existing room.floor + room.unit_number for
-- detail. Per-floor will land in V2 if hoteliers ask.
--
-- Storage — reuses the existing `property-photos` bucket conventions
-- (or whichever public bucket the photos tab already uses). The plan
-- lives next to the photos so the hotelier doesn't see a new place
-- to manage media.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

COMMENT ON COLUMN public.properties.floor_plan_url IS
  'Public URL of the property floor plan image. NULL = no plan uploaded yet. Edited via /dashboard/property/:id/manage → Plan tab.';

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS floor_plan_x NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS floor_plan_y NUMERIC(5,2);

COMMENT ON COLUMN public.rooms.floor_plan_x IS
  'X position of the room marker on properties.floor_plan_url, expressed as % from the left edge (0–100). NULL = unplaced.';
COMMENT ON COLUMN public.rooms.floor_plan_y IS
  'Y position of the room marker on properties.floor_plan_url, expressed as % from the top edge (0–100). NULL = unplaced.';

-- Range guard — coordinates outside 0–100 indicate a UI bug, refuse
-- the write rather than corrupt the layout.
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_floor_plan_x_range
    CHECK (floor_plan_x IS NULL OR (floor_plan_x BETWEEN 0 AND 100));
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_floor_plan_y_range
    CHECK (floor_plan_y IS NULL OR (floor_plan_y BETWEEN 0 AND 100));
