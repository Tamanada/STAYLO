-- ============================================
-- STAYLO Security Migration — March 2026
-- Fixes: C1, C3, C4, C5, C6 from audit
-- ============================================

-- C1: Add role column to users table for admin access control
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Set David as admin
UPDATE public.users SET role = 'admin'
WHERE email IN ('david.dancingelephant@gmail.com', 'admin@staylo.app', 'david@staylo.app');

-- Create admin check function (SECURITY DEFINER = runs with elevated privileges)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================
-- C3: Fix Users table — restrict SELECT
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can look up referral codes" ON public.users;

-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- Create a SECURITY DEFINER function for referral code lookups
-- This allows anyone to check if a referral code exists without exposing the full users table
CREATE OR REPLACE FUNCTION public.lookup_referral_code(code text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object('id', id, 'referral_code', referral_code)
  FROM public.users
  WHERE referral_code = code
  LIMIT 1;
$$;

-- ============================================
-- C4: Fix Shares table — restrict SELECT
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admin can read all shares" ON public.shares;

-- Users can only read their own shares
CREATE POLICY "Users can read own shares" ON public.shares
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all shares
CREATE POLICY "Admins can read all shares" ON public.shares
  FOR SELECT USING (public.is_admin());

-- ============================================
-- C5: Fix Survey Answers INSERT — validate user_id
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert survey answers" ON public.survey_answers;

-- Users can only insert their own survey answers
CREATE POLICY "Users can insert own survey answers" ON public.survey_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- C6: Fix Referrals INSERT — validate user_id
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

-- Users can only create referrals where they are the referred user
CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Admins can read all referrals
DROP POLICY IF EXISTS "Admin can read referrals" ON public.referrals;
CREATE POLICY "Admins can read all referrals" ON public.referrals
  FOR SELECT USING (public.is_admin());

-- Users can read their own referrals (as referrer or referred)
CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ============================================
-- Fix Survey Answers SELECT for admins
-- ============================================
DROP POLICY IF EXISTS "Admin can read all surveys" ON public.survey_answers;
CREATE POLICY "Admins can read all surveys" ON public.survey_answers
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can read own surveys" ON public.survey_answers
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Fix Properties SELECT for admins
-- ============================================
DROP POLICY IF EXISTS "Admin can read all properties" ON public.properties;
CREATE POLICY "Admins can read all properties" ON public.properties
  FOR SELECT USING (public.is_admin());
