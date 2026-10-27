-- Close the public RPC exposure found by the 2026-10-27 technical review and by
-- guardian/reports/2026-10-05-security-inspection.md (findings #2 and #5).
--
-- Why REVOKE ... FROM PUBLIC is not enough on Supabase: default privileges give
-- anon and authenticated an explicit EXECUTE grant on every new function in
-- the public schema, so both roles are revoked by name.
--
-- Callers verified in the repo before writing this file:
--   confirm_btc_invoice_payment       -> supabase/functions/crypto-webhook (service client)
--   bookings_due_for_escrow_release   -> supabase/functions/release-escrow (service client)
--   ambassador_commission_stats       -> src/components/dashboard/AmbassadorCommissionsWidget.jsx
--                                        (signed-in ambassador, own user id)
--   recompute_room_availability       -> hotelier dashboard (signed-in) and DB triggers

-- 1. Payment confirmation: only the webhook function (service role) may call it.
REVOKE ALL ON FUNCTION public.confirm_btc_invoice_payment(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_btc_invoice_payment(uuid, timestamptz)
  TO service_role;

-- 2. Escrow release list (Stripe ids and payout amounts): service role only.
REVOKE ALL ON FUNCTION public.bookings_due_for_escrow_release()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bookings_due_for_escrow_release()
  TO service_role;

-- 3. Ambassador stats: signed-in users only, and only their own numbers
--    (admins keep read access to any ambassador, as the function comment says).
CREATE OR REPLACE FUNCTION public.ambassador_commission_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  pending_count        INTEGER,
  pending_cents        BIGINT,
  ready_count          INTEGER,
  ready_cents          BIGINT,
  paid_count           INTEGER,
  paid_cents           BIGINT,
  paid_sats            BIGINT,
  total_lifetime_cents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER         AS pending_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'pending'), 0)::BIGINT AS pending_cents,
    COUNT(*) FILTER (WHERE status = 'ready')::INTEGER           AS ready_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'ready'), 0)::BIGINT   AS ready_cents,
    COUNT(*) FILTER (WHERE status = 'paid')::INTEGER            AS paid_count,
    COALESCE(SUM(commission_cents) FILTER (WHERE status = 'paid'), 0)::BIGINT    AS paid_cents,
    COALESCE(SUM(amount_sats) FILTER (WHERE status = 'paid'), 0)::BIGINT         AS paid_sats,
    COALESCE(SUM(commission_cents) FILTER (WHERE status IN ('ready','paid')), 0)::BIGINT AS total_lifetime_cents
  FROM public.ambassador_commissions
  WHERE ambassador_user_id = p_user_id
    AND (p_user_id = auth.uid() OR public.is_admin());
$$;
REVOKE ALL ON FUNCTION public.ambassador_commission_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ambassador_commission_stats(uuid) TO authenticated, service_role;

-- 4. Availability recompute: no anonymous access (hotelier dashboard stays signed in;
--    triggers run as the function owner and are not affected).
REVOKE ALL ON FUNCTION public.recompute_room_availability(uuid, date, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_room_availability(uuid, date, date)
  TO authenticated, service_role;
