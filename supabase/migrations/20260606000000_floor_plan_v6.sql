-- ============================================================================
-- 20260606000000_floor_plan_v6
-- ============================================================================
-- V6-hybride of the floor plan editor (David's design 2026-06-05).
--
-- The data model collapses around ONE concept: ZONES. A zone is a closed
-- polygonal area on the property's floor plan (vertices in % coordinates).
-- Zones are discovered by AI (Claude Vision detecting enclosed shapes),
-- then curated by the hotelier:
--   · soft-delete zones that aren't guest rooms (corridors, stairs, lobby)
--   · drag a room name from the tray onto a zone to assign it
--   · multi-unit rooms (HQ double bed × 9) assign N zones (unit_index 1..9)
--   · dorm rooms assign ONE zone (the dorm itself); the bed grid lives in
--     the existing DormSubPlanModal (V3, unchanged)
--
-- Why one JSON column instead of a join table?
--   1. Zones are intrinsically per-property — never shared, never queried
--      across properties. One row, one floor plan.
--   2. Read pattern is "load the property + all its rooms + all its zones"
--      in a single shot. JSONB on properties keeps it to one round-trip.
--   3. RLS is identical to properties — anyone allowed to read the
--      property is allowed to see its zones. No extra policies needed.
--
-- Trade-off: we can't index individual zones. That's fine — there are
-- typically 20-60 zones per property, lookup is by array iteration in
-- the app. No use case wants "find all properties with zone N at (x, y)".
--
-- Earlier columns (`properties.floor_plan_outlines`, `rooms.floor_plan_x/y`,
-- `rooms.floor_plan_positions`) remain in the schema. floor_plan_positions
-- is repurposed for backward compat with V5 properties — clients should
-- prefer floor_plan_zones once it's populated.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floor_plan_zones JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.floor_plan_zones IS
'Array of zone objects:
  { id: string, vertices: [[x,y]...], deleted?: bool,
    assigned_room_id?: uuid, unit_index?: int }
x, y are % of the floor_plan_url image dimensions (0-100). vertices
length ≥ 3 for a valid polygon. deleted=true is a soft delete (hidden
in the UI, retained for restore). assigned_room_id links the zone to
a rooms row; unit_index disambiguates among multiple units of the same
room (1..room.quantity).';

-- Defensive — the column must always be a JSON array.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_floor_plan_zones_is_array
    CHECK (jsonb_typeof(floor_plan_zones) = 'array');

-- No backfill — V5 hotels already placed markers via floor_plan_positions
-- and floor_plan_x/y. Those keep working as a fallback render until the
-- hotelier triggers the V6 zone editor for that property.
