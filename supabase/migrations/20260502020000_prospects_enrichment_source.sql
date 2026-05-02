-- ============================================================================
-- prospects — track HOW each row was enriched (manual vs AI)
-- ============================================================================
-- The new enrich-prospect edge function uses Anthropic's Claude with web_search
-- to auto-fill contact info. We want to distinguish AI-enriched rows from
-- manually-enriched ones so we can:
--   - Audit AI quality (spot-check rows where confidence was low)
--   - Re-run AI on low-confidence rows when prompts improve
--   - Filter "show me only manually-verified contacts" for high-stakes outreach
--
-- Values:
--   'osm'    — came from the OSM Overpass import (raw, untouched by humans)
--   'manual' — a human edited at least one contact field
--   'ai'     — the enrich-prospect function filled at least one field
--   NULL     — never enriched (only base OSM fields, or empty)
-- ============================================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS enrichment_source text
    CHECK (enrichment_source IN ('osm', 'manual', 'ai'));

CREATE INDEX IF NOT EXISTS prospects_enrichment_source_idx
  ON public.prospects (enrichment_source)
  WHERE enrichment_source IS NOT NULL;

COMMENT ON COLUMN public.prospects.enrichment_source IS
  'How the contact info was enriched: osm (import), manual (admin typed), ai (Claude web search). NULL = never enriched.';
