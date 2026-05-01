-- ============================================================================
-- Pending team invitations — auto-claim on signup
-- ============================================================================
-- The Team tab now lets the owner invite an email even if no STAYLO account
-- exists yet. The invitation row sits in property_members with user_id=NULL
-- and status='invited'. When the invitee signs up, this trigger matches
-- their email to any pending invitations and auto-links them as 'active'
-- members of those properties.
--
-- Combined with the @staylo.app auto-admin trigger, an invited STAYLO
-- employee can sign up once and immediately have:
--   - admin role on the platform
--   - active membership on every property they were pre-invited to
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.property_members
       SET user_id     = NEW.id,
           status      = 'active',
           accepted_at = now()
     WHERE lower(invited_email) = lower(NEW.email)
       AND status = 'invited'
       AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_claim_pending_invitations ON public.users;
CREATE TRIGGER trg_claim_pending_invitations
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_pending_invitations();

COMMENT ON FUNCTION public.claim_pending_invitations IS
  'When a new user signs up, auto-link any pending property invitations matching their email.';

-- Allow user_id to be NULL on property_members (for pending invites).
-- The original DDL already allows this, but we add a partial unique index
-- to prevent duplicate pending invites for the same (property, email).
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_members_unique_pending_email
  ON public.property_members (property_id, lower(invited_email))
  WHERE user_id IS NULL AND status = 'invited';
