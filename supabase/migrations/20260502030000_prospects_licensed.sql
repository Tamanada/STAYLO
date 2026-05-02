-- ============================================================================
-- prospects — track Thai government hotel licensing
-- ============================================================================
-- Thailand's Hotel Act B.E. 2547 (2004) requires every accommodation
-- with > 4 rooms to hold a hotel license issued by the provincial governor.
-- Smaller properties register as "homestay" or "non-hotel accommodation"
-- under different rules. Many guest_houses on OSM are operating without
-- ANY license — for STAYLO outreach we want to prioritise the legitimate
-- ones (better partners, lower legal risk).
--
-- There's no public REST API for the Thai hotel registry, but the data IS
-- public-record and discoverable via:
--   - tourismthailand.org (TAT directory) — searchable by name/province
--   - Booking.com / Agoda listings (they require license # before publishing)
--   - The hotel's own website footer / legal page
--   - Wikidata Q-codes for licensed establishments
--
-- We let the AI enrichment function discover this in the same web_search
-- pass that finds contact info — no extra cost, no extra API call.
--
-- Tri-state semantics:
--   licensed = true   → confirmed licensed (we have the # OR a credible source)
--   licensed = false  → confirmed unlicensed (no record found in TAT directory)
--   licensed = NULL   → never checked — default state
-- ============================================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS licensed           boolean,
  ADD COLUMN IF NOT EXISTS license_number     text,
  ADD COLUMN IF NOT EXISTS license_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS prospects_licensed_idx
  ON public.prospects (licensed)
  WHERE licensed IS NOT NULL;

COMMENT ON COLUMN public.prospects.licensed           IS 'TRUE = confirmed Thai hotel license · FALSE = confirmed none · NULL = unchecked.';
COMMENT ON COLUMN public.prospects.license_number     IS 'The license number itself when known (e.g. "เลขที่ใบอนุญาต ๑๒๓๔/๒๕๖๖").';
COMMENT ON COLUMN public.prospects.license_checked_at IS 'When the license status was last verified.';
