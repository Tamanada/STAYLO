-- ============================================================================
-- 20260605010000_floor_plan_v2
-- ============================================================================
-- V2 of the visual floor plan editor.
--
-- V1 (20260605000000) gave us:
--   · properties.floor_plan_url           — one plan image per property
--   · rooms.floor_plan_x / floor_plan_y   — single-position marker
--
-- David clarified the AI vision 2026-06-05: the AI is supposed to detect
-- room SHAPES from a raw CAD plan (most plans don't have labels written
-- on them — that's normal), and produce a simplified clean STAYLO-styled
-- background where each detected room is rendered as an empty outline
-- rectangle. The hotelier then drag-drops their room names onto the
-- outlines (snap-to-outline magnetism in the UI).
--
-- Two storage shifts:
--   1. We need to remember WHERE the AI detected rectangles so the UI can
--      snap markers to them on subsequent drops. Single field on
--      `properties` since plans are per-property.
--   2. We need N markers per room when room.quantity > 1 (Dancing Elephant
--      has HQ double bed × 9, HQ single bed × 24, Hibrakim × 3 etc.).
--      The V1 scalar floor_plan_x/y can't represent that. We add an array
--      column on `rooms`.
--
-- Backward compat plan:
--   · floor_plan_x / floor_plan_y kept on rooms — treated as the first
--     entry of floor_plan_positions when positions is empty. Read-only
--     fallback; new writes target floor_plan_positions[] only.
--   · A future cleanup migration can drop the scalar columns once every
--     deployment has migrated its data. Not done here to keep this
--     migration small and reversible.
-- ============================================================================

-- AI-detected outlines on the property's clean plan. Each entry:
--   { x_percent: number, y_percent: number, width_percent: number, height_percent: number }
-- All coordinates are % of total image dimensions (0-100), same convention
-- as the V1 floor_plan_x/y so a renderer can mix V1 and V2 data without
-- special-casing.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floor_plan_outlines JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.floor_plan_outlines IS
  'AI-detected room rectangles on properties.floor_plan_url. Array of {x_percent, y_percent, width_percent, height_percent}. Used for snap-to-outline magnetism when the hotelier drops a room marker. NULL/empty array = no AI run yet, plain image background.';


-- One placement per physical unit of a room. Each entry:
--   { x: number, y: number, index: number }
-- index = 1..room.quantity (1-indexed for human-readable marker labels
-- like "Hibrakim 1", "Hibrakim 2"). Stored explicitly (rather than relying
-- on array position) so removing one in the middle keeps the others
-- stable: removing position[1] from [{i:1},{i:2},{i:3}] yields [{i:1},{i:3}]
-- not [{i:1},{i:2}].
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS floor_plan_positions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.rooms.floor_plan_positions IS
  'Array of {x, y, index} for each placed physical unit of this room (length ≤ rooms.quantity). x, y are % from top-left of properties.floor_plan_url (0-100). index = 1-indexed unit number used in marker labels ("Hibrakim 1", "Hibrakim 2", …). Empty array = no unit placed yet. floor_plan_x/y are kept as a single-position backward-compat fallback.';

-- Defensive check — every entry should be a JSON array.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_floor_plan_outlines_is_array
    CHECK (jsonb_typeof(floor_plan_outlines) = 'array');
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_floor_plan_positions_is_array
    CHECK (jsonb_typeof(floor_plan_positions) = 'array');

-- One-shot backfill — promote any existing floor_plan_x/y singletons into
-- floor_plan_positions so the V2 reader has a uniform shape to work with.
-- Index = 1 since they were the only marker placed.
UPDATE public.rooms
   SET floor_plan_positions =
         jsonb_build_array(
           jsonb_build_object(
             'x',     floor_plan_x,
             'y',     floor_plan_y,
             'index', 1
           )
         )
 WHERE floor_plan_x IS NOT NULL
   AND floor_plan_y IS NOT NULL
   AND (floor_plan_positions IS NULL OR jsonb_array_length(floor_plan_positions) = 0);
