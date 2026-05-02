-- ============================================================================
-- prospects — editable contact fields for manual outreach research
-- ============================================================================
-- The OSM import gives us patchy contact data — most rows have nothing more
-- than a name and lat/lng. As the operator researches each prospect (Google
-- Maps reviews, hotel website, LinkedIn, Facebook page, walk-in visit) they
-- need to record what they find: an email, a manager's name, a phone with
-- WhatsApp, the position of the person they spoke to, etc.
--
-- The base columns (email, phone, website, facebook) already exist and are
-- editable; this migration only adds the two missing ones — the human side:
--   contact_name      — "Khun Som", "Marie Dupont", etc.
--   contact_position  — "Owner", "GM", "Front desk manager", "Marketing"
--
-- We also bump the import_source/import vs manual update reasoning by adding
-- a `manually_enriched_at` timestamp so we know which rows have been worked
-- on by a human vs. raw OSM dumps. Useful for the admin to filter "show me
-- the 240 prospects I've already researched but not yet contacted."
-- ============================================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS contact_name        text,
  ADD COLUMN IF NOT EXISTS contact_position    text,
  ADD COLUMN IF NOT EXISTS manually_enriched_at timestamptz;

COMMENT ON COLUMN public.prospects.contact_name        IS 'Name of the person to contact at this property (manager, owner, front desk).';
COMMENT ON COLUMN public.prospects.contact_position    IS 'Their role/title — Owner, GM, Manager, Marketing, etc.';
COMMENT ON COLUMN public.prospects.manually_enriched_at IS 'Set the first time an admin edits any contact field. NULL = never touched.';

CREATE INDEX IF NOT EXISTS prospects_enriched_idx
  ON public.prospects (manually_enriched_at)
  WHERE manually_enriched_at IS NOT NULL;
