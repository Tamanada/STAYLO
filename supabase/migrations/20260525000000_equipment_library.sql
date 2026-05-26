-- ============================================================================
-- equipment_library — shared catalog of kitchen utensils + their images
-- ============================================================================
-- Recipe forms (messenger.html → "+ New recipe" → "Equipment / matériel")
-- let a cook type the name of a utensil (wok, mandoline, thermomix…) and
-- pick a thumbnail so OTHER kitchen staff can recognize it at a glance.
--
-- We don't want every kitchen to re-search the same 150 common items on
-- Pixabay every time. This table is the SHARED catalog:
--   - public SELECT (any logged-in user can search/browse)
--   - service_role INSERT (the seed script + the pixabay-search edge
--     function write here when a user picks a new image)
--   - no public writes (prevents catalog poisoning)
--
-- Lookup pattern from the client:
--   SELECT slug, name_<lang>, image_url
--   FROM equipment_library
--   WHERE name_<lang> ILIKE '%wok%' OR slug ILIKE '%wok%'
--   ORDER BY (name_<lang> ILIKE 'wok%') DESC, name_<lang> ASC
--   LIMIT 6;
--
-- If we get < 3 local hits, the client falls back to the pixabay-search
-- edge function, which queries Pixabay live AND populates a new row here
-- (so the next cook gets an instant hit).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_library (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,            -- 'wok', 'mandoline', 'thermomix'
  name_en      text NOT NULL,
  name_fr      text,
  name_th      text,
  category     text,                             -- 'cookware', 'knives', 'small_appliances', 'tools', 'measure', 'bakery', 'pantry'
  image_url    text NOT NULL,                    -- hosted URL (Pixabay direct or Supabase Storage mirror)
  thumb_url    text,                             -- optional smaller variant for grid
  source       text NOT NULL DEFAULT 'manual',   -- 'pixabay' | 'wikimedia' | 'manual'
  source_id    text,                             -- external ID for re-fetch / attribution
  attribution  text,                             -- "Photo by X on Pixabay" if license requires
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Trigram-style ILIKE on names is the hot path — index the lower-cased
-- versions for fast prefix match. (pg_trgm would be ideal but we keep
-- the migration extension-free for compatibility with hobby-tier Supabase.)
CREATE INDEX IF NOT EXISTS equipment_library_name_en_lower_idx
  ON public.equipment_library (lower(name_en) text_pattern_ops);
CREATE INDEX IF NOT EXISTS equipment_library_name_fr_lower_idx
  ON public.equipment_library (lower(name_fr) text_pattern_ops);
CREATE INDEX IF NOT EXISTS equipment_library_name_th_idx
  ON public.equipment_library (name_th text_pattern_ops);
CREATE INDEX IF NOT EXISTS equipment_library_category_idx
  ON public.equipment_library (category);

-- updated_at trigger — same pattern used elsewhere in this codebase
CREATE OR REPLACE FUNCTION public.equipment_library_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS equipment_library_touch_updated_at ON public.equipment_library;
CREATE TRIGGER equipment_library_touch_updated_at
  BEFORE UPDATE ON public.equipment_library
  FOR EACH ROW
  EXECUTE FUNCTION public.equipment_library_touch_updated_at();

-- RLS
ALTER TABLE public.equipment_library ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (it's a shared catalog). We allow anon too
-- so the messenger.html demo mode + the marketing pages can browse it
-- without needing a session.
DROP POLICY IF EXISTS equipment_library_public_select ON public.equipment_library;
CREATE POLICY equipment_library_public_select
  ON public.equipment_library
  FOR SELECT
  USING (true);

-- Only service_role can write (the edge function uses the service key,
-- the seed script does too). No user-level INSERT/UPDATE/DELETE — prevents
-- a malicious cook from injecting NSFW thumbnails into the shared catalog.
-- Service-role bypasses RLS, so we don't need an explicit policy.

GRANT SELECT ON public.equipment_library TO anon, authenticated;
