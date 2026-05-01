-- ============================================================================
-- Auto-grant admin role to anyone who signs up with a @staylo.app email
-- ============================================================================
-- Until now, granting admin required a manual UPDATE on public.users for
-- each new STAYLO team member. This trigger automates it: any user whose
-- email ends in @staylo.app is auto-promoted to role='admin' at INSERT
-- (signup) and UPDATE (if they later change their email to a staylo one).
--
-- Behavior:
--   - INSERT with @staylo.app email → role = 'admin' (overrides default 'user')
--   - UPDATE email to @staylo.app   → role = 'admin'
--   - Non-staylo emails             → role left untouched (preserves manual
--                                      admin grants like david.dancingelephant@)
--
-- Demotion when an admin LOSES their @staylo.app email is intentionally
-- NOT automatic — security ops manually downgrades an offboarded employee.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_admin_for_staylo_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) LIKE '%@staylo.app' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_admin_for_staylo_email ON public.users;
CREATE TRIGGER trg_auto_admin_for_staylo_email
  BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_admin_for_staylo_email();

-- Backfill: promote any existing @staylo.app users that aren't admin yet
UPDATE public.users
   SET role = 'admin'
 WHERE lower(email) LIKE '%@staylo.app'
   AND role IS DISTINCT FROM 'admin';

COMMENT ON FUNCTION public.auto_admin_for_staylo_email IS
  'Auto-promotes @staylo.app emails to admin role. Manual demotion required for offboarding.';
