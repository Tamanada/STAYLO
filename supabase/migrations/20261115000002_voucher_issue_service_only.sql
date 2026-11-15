-- issue_vouchers_for_booking() is SECURITY DEFINER and, by Supabase defaults,
-- executable by anon and authenticated through supabase.rpc(): anybody holding
-- a booking id could issue its vouchers early. The trigger still works (it
-- runs as the function owner), the admin re-issue goes through the service
-- role. Same closure as migration 20261027000000 for the payment RPCs.

REVOKE ALL ON FUNCTION public.issue_vouchers_for_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_vouchers_for_booking(uuid) TO service_role;
