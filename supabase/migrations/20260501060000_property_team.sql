-- ============================================================================
-- Property team — multi-user access per hotel
-- ============================================================================
-- Until now, only the user who created a property could manage it. Real
-- hotels need multiple staff:
--   - Owner: the original creator, full control (incl. payouts + delete)
--   - Manager: edits property + rooms + sees bookings, no payouts
--   - Staff: views bookings, manages calendar, no edit rights
--
-- 2 things in this migration:
--   1. Add contact_name + contact_role columns on properties (for the
--      named human contact, separate from the contact_email which may
--      be a generic info@ alias).
--   2. New table property_members with RLS + auto-backfill of existing
--      property owners.
--   3. Update RLS on properties so team members can SELECT (read) the
--      property, not just the original creator.
-- ============================================================================

-- 1. Contact person name + role
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_role text;

COMMENT ON COLUMN public.properties.contact_name IS
  'Named contact person at the property (e.g. "Sarah Chen"). Separate from generic contact_email.';
COMMENT ON COLUMN public.properties.contact_role IS
  'Their role at the property (e.g. "General Manager", "Front Desk Manager").';

-- 2. property_members
CREATE TABLE IF NOT EXISTS public.property_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'staff',
  status        text NOT NULL DEFAULT 'active',
  invited_email text,
  invited_by    uuid REFERENCES public.users(id),
  invited_at    timestamptz DEFAULT now(),
  accepted_at   timestamptz,

  CONSTRAINT property_members_role_valid
    CHECK (role IN ('owner', 'manager', 'staff')),
  CONSTRAINT property_members_status_valid
    CHECK (status IN ('invited', 'active', 'removed')),
  -- One row per (property, user) — can't be added twice
  CONSTRAINT property_members_unique_user
    UNIQUE (property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_members_property ON public.property_members(property_id);
CREATE INDEX IF NOT EXISTS idx_property_members_user     ON public.property_members(user_id);
CREATE INDEX IF NOT EXISTS idx_property_members_email    ON public.property_members(invited_email);

COMMENT ON TABLE public.property_members IS
  'Per-property team members. Roles: owner (creator, full control), manager (edits + bookings), staff (calendar + bookings only).';

-- Backfill: each existing property's creator becomes the 'owner'.
-- ON CONFLICT in case the migration is re-run (idempotent).
INSERT INTO public.property_members (property_id, user_id, role, status, accepted_at)
SELECT id, user_id, 'owner', 'active', COALESCE(created_at, now())
FROM public.properties
WHERE user_id IS NOT NULL
ON CONFLICT (property_id, user_id) DO NOTHING;

-- 3. RLS
ALTER TABLE public.property_members ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a member of this property?
CREATE OR REPLACE FUNCTION public.is_property_member(prop_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = prop_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_owner(prop_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = prop_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  );
$$;

-- Members can read the team list for properties they belong to
DROP POLICY IF EXISTS "Members read team"   ON public.property_members;
CREATE POLICY "Members read team"
  ON public.property_members FOR SELECT
  USING (
    public.is_property_member(property_id)
    OR public.is_admin()
  );

-- Owners can add new members (invite or direct add)
DROP POLICY IF EXISTS "Owner adds team"   ON public.property_members;
CREATE POLICY "Owner adds team"
  ON public.property_members FOR INSERT
  WITH CHECK (
    public.is_property_owner(property_id)
    OR public.is_admin()
  );

-- Owners can change a member's role or status
DROP POLICY IF EXISTS "Owner updates team"   ON public.property_members;
CREATE POLICY "Owner updates team"
  ON public.property_members FOR UPDATE
  USING (public.is_property_owner(property_id) OR public.is_admin())
  WITH CHECK (public.is_property_owner(property_id) OR public.is_admin());

-- Owners can remove members. A member can also remove THEMSELVES (leave team).
DROP POLICY IF EXISTS "Owner or self removes team"   ON public.property_members;
CREATE POLICY "Owner or self removes team"
  ON public.property_members FOR DELETE
  USING (
    public.is_property_owner(property_id)
    OR auth.uid() = user_id
    OR public.is_admin()
  );

-- 4. Extend properties RLS so team members can SELECT
-- The existing "Users can read own properties" only matched the creator.
DROP POLICY IF EXISTS "Members read property"   ON public.properties;
CREATE POLICY "Members read property"
  ON public.properties FOR SELECT
  USING (public.is_property_member(id));

-- Managers can update the property too. Original "Users can update own properties"
-- still covers the owner via user_id = auth.uid().
DROP POLICY IF EXISTS "Managers update property"   ON public.properties;
CREATE POLICY "Managers update property"
  ON public.properties FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.property_members pm
            WHERE pm.property_id = properties.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'manager')
              AND pm.status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.property_members pm
            WHERE pm.property_id = properties.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'manager')
              AND pm.status = 'active')
  );
