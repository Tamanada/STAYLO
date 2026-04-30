-- ============================================================================
-- Chantier #5 Sécurité — RLS hardening
-- ============================================================================
-- Audit findings addressed:
--   1. Missing DELETE policies on user-facing tables (orphaned rows can't be cleaned)
--   2. UPDATE policies without WITH CHECK clauses (allows owner-swap exploits)
--   3. Defensive DROPs on legacy policies that may still leak from supabase_schema.sql
--      (idempotent — safe even if already dropped by 20260301000000)
-- ============================================================================

-- ─── 1. Defensive DROPs on policies known to leak (pre-2026-03-01) ────────
-- These were created by supabase_schema.sql with USING (true). The 2026-03
-- migration already drops them, but we re-drop in case any environment was
-- bootstrapped from an older state.
DROP POLICY IF EXISTS "Anyone can look up referral codes" ON public.users;
DROP POLICY IF EXISTS "Admin can read all shares"        ON public.shares;
DROP POLICY IF EXISTS "Users can insert survey answers"  ON public.survey_answers;
DROP POLICY IF EXISTS "System can insert referrals"      ON public.referrals;

-- ─── 2. Add missing DELETE policies ─────────────────────────────────────
-- Users: a user may delete their OWN account row (cascades via FK to wipe
-- their data in properties, bookings, etc.). Admins can delete anyone.
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Properties: owner may delete their own property. Admins may delete any.
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE USING (public.is_admin());

-- Survey answers: only admins may delete (audit trail preserved for users).
DROP POLICY IF EXISTS "Admins can delete surveys" ON public.survey_answers;
CREATE POLICY "Admins can delete surveys" ON public.survey_answers
  FOR DELETE USING (public.is_admin());

-- Referrals: only admins may delete (preserve referral integrity for payouts).
DROP POLICY IF EXISTS "Admins can delete referrals" ON public.referrals;
CREATE POLICY "Admins can delete referrals" ON public.referrals
  FOR DELETE USING (public.is_admin());

-- ─── 3. Harden UPDATE policies — prevent owner-swap exploit ─────────────
-- Without a WITH CHECK clause, an UPDATE policy lets the user change ANY
-- column including user_id, which could let them transfer their property
-- to another user (or claim someone else's). Re-create with both clauses.

-- Properties
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users (only own profile, can't change id obviously but defensive)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Shares (defensive — buyer can't transfer to someone else)
DROP POLICY IF EXISTS "Users can update own shares" ON public.shares;
CREATE POLICY "Users can update own shares" ON public.shares
  FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 4. Tighten bookings UPDATE — guest can't reassign to another guest ─
-- Already has policies; we just add WITH CHECK to lock guest_id.
DO $$
BEGIN
  -- Only re-create if the original "Guests can update bookings" exists.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
      AND policyname = 'Guests can update own bookings'
  ) THEN
    DROP POLICY "Guests can update own bookings" ON public.bookings;
    CREATE POLICY "Guests can update own bookings" ON public.bookings
      FOR UPDATE
      USING      (auth.uid() = guest_id)
      WITH CHECK (auth.uid() = guest_id);
  END IF;
END $$;

COMMENT ON SCHEMA public IS
  'STAYLO public schema — RLS hardened 2026-04-30 (chantier #5).';
