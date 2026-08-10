-- ============================================================================
-- 20260810000003_ship_put_hotel_state_by_invite
-- ============================================================================
-- Anon-callable UPSERT for ship_hotel_state, using the invite_token as the
-- credential. Companion to ship_get_hotel_state_by_invite.
--
-- Problem: anon staff phones (scanned a QR, no Supabase auth session) could
-- READ state but couldn't WRITE it — the direct upsert on ship_hotel_state
-- is RLS-gated to authenticated hotel members. Their local edits (expenses,
-- cashbook, task completions, timesheet clock events…) never reached
-- Supabase, so authenticated devices booting from the same hotel saw stale
-- data. David hit this: expenses added on his mobile (invite-scanned as
-- David GM) didn't appear when he opened Chrome on desktop.
--
-- Security posture:
--   · Token IS the credential — same threat model as GET path
--   · accept_status='accepted' guard: unaccepted / declined invites can't
--     push, even if the token leaks before first scan
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ship_put_hotel_state_by_invite(
  p_token text,
  p_blob  jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id   uuid;
  v_hotel_slug text;
  v_status     text;
BEGIN
  SELECT hotel_id, hotel_slug, accept_status
    INTO v_hotel_id, v_hotel_slug, v_status
    FROM public.ship_staff_invites
    WHERE invite_token = p_token
    LIMIT 1;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'unknown invite token' USING errcode = '42501';
  END IF;
  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'invite not accepted' USING errcode = '42501';
  END IF;

  INSERT INTO public.ship_hotel_state (hotel_id, hotel_slug, state_blob, updated_at)
  VALUES (v_hotel_id, v_hotel_slug, COALESCE(p_blob, '{}'::jsonb), now())
  ON CONFLICT (hotel_id) DO UPDATE
    SET state_blob = EXCLUDED.state_blob,
        updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ship_put_hotel_state_by_invite(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_put_hotel_state_by_invite(text, jsonb) TO anon, authenticated;
