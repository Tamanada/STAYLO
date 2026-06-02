-- ============================================================================
-- 20260604020000_rooms_display_order
-- ============================================================================
-- Adds a hotelier-controlled ordering to rooms so they appear in the
-- same sequence on the public OTA listing AND the receptionist
-- dashboard (Chambres timeline, Disponibilités timeline, etc.).
--
-- Why a per-property column and not a global sort? Each hotelier orders
-- their own rooms based on their pitch logic (best room first, family
-- rooms together, dorms last). Global ordering doesn't apply.
--
-- Default 0 + backfill — existing rows get a stable order seeded from
-- their name so nothing visibly changes until the hotelier explicitly
-- reorders. The backfill uses ROW_NUMBER() partitioned by property so
-- the numbering restarts at 1 inside each property.
--
-- Tie-breaker convention used by every query that orders rooms:
--   ORDER BY display_order ASC, name ASC
-- A second tier on `name` keeps things deterministic when two rooms
-- end up at the same display_order (e.g. after a delete + insert).
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.rooms.display_order IS
  'Hotelier-controlled per-property sort key. Applies to: OTA listing (PropertyDetail), reception views (Rooms timeline, Disponibilités). Lower = earlier. Ties broken by name.';

-- Backfill — only touches rows still at the default 0. If a property's
-- rooms have all been reordered (someone applied this migration twice
-- by mistake, then reordered, then ran it again) we don't clobber.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY name, created_at) AS rn
  FROM public.rooms
  WHERE display_order = 0
)
UPDATE public.rooms r
   SET display_order = o.rn
  FROM ordered o
 WHERE r.id = o.id;

-- Composite index — most queries do
--   WHERE property_id = X ORDER BY display_order, name
-- The (property_id, display_order) index covers that path.
CREATE INDEX IF NOT EXISTS rooms_property_display_order_idx
  ON public.rooms (property_id, display_order, name);
