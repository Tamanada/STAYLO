-- ============================================================================
-- 20260813000000_room_pricing_season_fullmoon
-- ============================================================================
-- Two nullable columns on room_availability so a hotel can attach a season
-- code ('S1'..'S4', 'HIGH', 'LOW', arbitrary short label) and a full-moon
-- flag to each (room, date) row. Both feed the annual-calendar import from
-- Google Sheets — the hotelier's own tarification grid already carries this
-- context, no reason to drop it on import.
--
-- season_code: free-form short text (max 16), NULL when the row has no
--   season classification. Kept as text (not enum) so hoteliers with 3
--   seasons or 5 seasons don't need a schema change.
-- is_full_moon: boolean, DEFAULT false. TRUE for the ~13 days a year Koh
--   Phangan hotels flag as full-moon nights (surge pricing + party crowd).
-- ============================================================================
ALTER TABLE public.room_availability
  ADD COLUMN IF NOT EXISTS season_code text,
  ADD COLUMN IF NOT EXISTS is_full_moon boolean NOT NULL DEFAULT false;

-- Cheap length guard — keeps season codes short so a rogue import can't
-- shove 4 KB of prose into every row.
ALTER TABLE public.room_availability
  DROP CONSTRAINT IF EXISTS room_availability_season_code_len;
ALTER TABLE public.room_availability
  ADD CONSTRAINT room_availability_season_code_len
  CHECK (season_code IS NULL OR length(season_code) <= 16);

-- Partial index on full-moon rows — a hotel dashboard querying "which
-- future full-moon nights are still bookable" hits a tiny index, not
-- a 100k-row availability scan.
CREATE INDEX IF NOT EXISTS room_availability_full_moon_idx
  ON public.room_availability (room_id, date)
  WHERE is_full_moon = true;

COMMENT ON COLUMN public.room_availability.season_code IS
  'Optional short season label (S1-S4, HIGH, LOW, …). Free-form so hotels can define their own tarification bands. Max 16 chars.';
COMMENT ON COLUMN public.room_availability.is_full_moon IS
  'True for full-moon nights (typically ~13/year on Koh Phangan). Drives surge pricing UX and party-crowd staffing hints.';
