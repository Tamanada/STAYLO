-- ============================================================================
-- Auto-add property creator as owner in property_members
-- ============================================================================
-- Bug discovered 2026-05-03: David added a new property via /submit, but it
-- never appeared on /dashboard/properties. Root cause: the previous migration
-- (20260501060000_property_team.sql) only BACKFILLED existing properties into
-- property_members. There was no trigger to handle FUTURE inserts.
--
-- Result: every property created after May 1st is owned in `properties.user_id`
-- but has no row in `property_members` — so the dashboard query
-- (which now filters via property_members) returns nothing.
--
-- This migration:
--   1. Adds the missing trigger so EVERY new property gets an owner row
--   2. Re-backfills any properties added since the last backfill
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_property_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if no creator on the row (shouldn't happen, but defensive)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert the owner membership. ON CONFLICT in case the row already exists
  -- (e.g. a manual insert + this trigger could otherwise raise a unique
  -- constraint violation).
  INSERT INTO public.property_members (property_id, user_id, role, status, accepted_at)
  VALUES (NEW.id, NEW.user_id, 'owner', 'active', now())
  ON CONFLICT (property_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_property_owner_member ON public.properties;
CREATE TRIGGER trg_add_property_owner_member
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.add_property_owner_member();

COMMENT ON FUNCTION public.add_property_owner_member IS
  'Auto-creates the owner row in property_members whenever a new property is INSERTed. Without this, /dashboard/properties (which queries via property_members) shows the new property as missing.';

-- ─── Backfill the gap ───
-- Catch every property created since the May 1st backfill that has no
-- owner membership. Idempotent.
INSERT INTO public.property_members (property_id, user_id, role, status, accepted_at)
SELECT p.id, p.user_id, 'owner', 'active', COALESCE(p.created_at, now())
FROM public.properties p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = p.id
      AND pm.user_id     = p.user_id
  )
ON CONFLICT (property_id, user_id) DO NOTHING;
