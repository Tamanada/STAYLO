-- ============================================================================
-- prospects.address — street-level address of the establishment
-- ============================================================================
-- prospects already had district + province + lat/lng (geo-located via OSM),
-- but no street-level address line. Outreach (handing the lead to a sales
-- rep, scheduling a visit, sending a courier with a welcome kit) needs the
-- actual street/door number — district alone is not enough on Koh Phangan
-- where one moo (sub-village) holds 30+ properties.
--
-- Free-text TEXT — accepts Thai or romanised Latin, multi-line allowed.
-- Auto-saved on blur from the prospect modal alongside the other contact
-- fields.
-- ============================================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.prospects.address IS
  'Street-level address of the establishment, free-text. Captured during outreach research, auto-saved on blur from the admin modal.';
