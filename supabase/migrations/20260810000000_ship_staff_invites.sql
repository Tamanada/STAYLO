-- ============================================================================
-- 20260810000000_ship_staff_invites
-- ============================================================================
-- Persist staff invites cross-device so a QR generated on the manager's device
-- can be redeemed on the staff's phone.
--
-- Problem being solved (see project memory `project_ship_postmark_setup` and
-- the 2026-08-10 QR-invite bug):
--   · ship.html stores employees in `localStorage.staylo_employees_${hotel}`
--   · Manager creates staff Ali → invite_token generated → QR printed
--   · Staff scans QR on their phone → device has empty localStorage for that
--     hotel → invite handler can't find Ali → falls through and silently
--     boots whichever stale session lived on the phone
--
-- Fix layers:
--   1. Every time the manager saves a staff row, mirror the invite record
--      into public.ship_staff_invites (client-side, via the anon key).
--   2. The scan handler on the staff phone hits an RPC that resolves the
--      token → returns the shape needed to boot ({name, role, department,
--      hotel_slug, accept_status, bound_device_hash}).
--   3. First successful scan calls another RPC that binds the device and
--      marks the invite accepted.
--
-- Security model:
--   · The invite_token IS the credential (32-hex UUID = ~128 bits of entropy).
--     Same pattern as Google Docs share links, Slack invites, etc.
--   · Anon-callable RPCs surface only what's needed to boot; the base table
--     stays behind RLS so anon can't enumerate.
--   · Owner-scoped INSERT/UPDATE via RLS so only the hotel's members can
--     create or modify invite rows.
-- ============================================================================


-- ────────── Table ──────────
CREATE TABLE IF NOT EXISTS public.ship_staff_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hotel identity (denormalised for anon lookups without JWT)
  hotel_id          uuid REFERENCES public.ship_hotels(id) ON DELETE CASCADE,
  hotel_slug        text NOT NULL,

  -- The credential
  invite_token      text NOT NULL UNIQUE,

  -- Staff identity (minimal — just enough to boot the ship.html session)
  first_name        text NOT NULL,
  last_name         text,
  role              text NOT NULL,
  department        text,

  -- Lifecycle
  accept_status     text NOT NULL DEFAULT 'pending'
                      CHECK (accept_status IN ('pending','accepted','declined')),
  bound_device_hash text,
  accepted_at       timestamptz,
  declined_at       timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ship_staff_invites_hotel_id_idx
  ON public.ship_staff_invites(hotel_id);
CREATE INDEX IF NOT EXISTS ship_staff_invites_hotel_slug_idx
  ON public.ship_staff_invites(hotel_slug);


-- ────────── RLS: base table stays behind auth ──────────
-- The anon-callable RPCs below are the ONLY way anon can touch this table.
-- Direct SELECT is restricted to authenticated hotel members so anon can't
-- enumerate all pending invites.
ALTER TABLE public.ship_staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY ship_staff_invites_select_member
  ON public.ship_staff_invites FOR SELECT
  USING (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_staff_invites_insert_member
  ON public.ship_staff_invites FOR INSERT
  WITH CHECK (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_staff_invites_update_member
  ON public.ship_staff_invites FOR UPDATE
  USING (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_staff_invites_delete_owner
  ON public.ship_staff_invites FOR DELETE
  USING (hotel_id IS NOT NULL AND public.is_ship_hotel_owner(hotel_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ship_staff_invites TO authenticated;


-- ────────── RPC 1: lookup an invite by token ──────────
-- Anon-callable. Returns just the fields the ship.html boot needs. Never
-- exposes other invite tokens or the full table — one row per matching
-- token or nothing.
CREATE OR REPLACE FUNCTION public.ship_lookup_invite(p_token text)
RETURNS TABLE(
  first_name        text,
  last_name         text,
  role              text,
  department        text,
  hotel_slug        text,
  accept_status     text,
  bound_device_hash text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT first_name, last_name, role, department, hotel_slug,
         accept_status, bound_device_hash
  FROM public.ship_staff_invites
  WHERE invite_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.ship_lookup_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_lookup_invite(text) TO anon, authenticated;


-- ────────── RPC 2: accept an invite + bind the device ──────────
-- Anon-callable. First scan sets accept_status=accepted and stores the
-- device hash for future re-scans (prevents leaked-QR reuse from a
-- different device — the existing local check keeps working, this just
-- persists the binding).
-- Idempotent: replaying the same (token, device) is a no-op.
-- Refuses if the token is already bound to a DIFFERENT device.
CREATE OR REPLACE FUNCTION public.ship_accept_invite(
  p_token       text,
  p_device_hash text
)
RETURNS TABLE(ok boolean, reason text, first_name text, role text, hotel_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ship_staff_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.ship_staff_invites
    WHERE invite_token = p_token
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'unknown_token'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_row.accept_status = 'declined' THEN
    RETURN QUERY SELECT false, 'declined'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Already accepted → must be same device
  IF v_row.accept_status = 'accepted'
     AND v_row.bound_device_hash IS NOT NULL
     AND v_row.bound_device_hash <> p_device_hash THEN
    RETURN QUERY SELECT false, 'device_mismatch'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- First accept OR same-device replay → persist
  UPDATE public.ship_staff_invites
    SET accept_status     = 'accepted',
        bound_device_hash = p_device_hash,
        accepted_at       = COALESCE(accepted_at, now()),
        updated_at        = now()
    WHERE id = v_row.id;

  RETURN QUERY SELECT true, 'ok'::text, v_row.first_name, v_row.role, v_row.hotel_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.ship_accept_invite(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_accept_invite(text,text) TO anon, authenticated;


-- ────────── RPC 3: manager-side upsert (auth-required) ──────────
-- Wraps the INSERT/UPDATE so ship.html doesn't have to construct a full
-- row with fk resolution. Ties invite → ship_hotels.slug automatically.
CREATE OR REPLACE FUNCTION public.ship_upsert_staff_invite(
  p_hotel_slug   text,
  p_invite_token text,
  p_first_name   text,
  p_last_name    text,
  p_role         text,
  p_department   text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_hotel_id uuid;
  v_id       uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;

  SELECT id INTO v_hotel_id FROM public.ship_hotels WHERE slug = p_hotel_slug LIMIT 1;
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'no hotel with slug %', p_hotel_slug USING errcode = 'P0002';
  END IF;

  -- Owner or manager only
  IF NOT public.is_ship_hotel_member(v_hotel_id) THEN
    RAISE EXCEPTION 'caller is not a member of this hotel' USING errcode = '42501';
  END IF;

  INSERT INTO public.ship_staff_invites
    (hotel_id, hotel_slug, invite_token, first_name, last_name, role, department)
  VALUES
    (v_hotel_id, p_hotel_slug, p_invite_token, p_first_name, p_last_name, p_role, p_department)
  ON CONFLICT (invite_token) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        role       = EXCLUDED.role,
        department = EXCLUDED.department,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ship_upsert_staff_invite(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_upsert_staff_invite(text,text,text,text,text,text) TO authenticated;


-- ────────── updated_at auto-touch ──────────
CREATE TRIGGER ship_staff_invites_touch_updated_at
  BEFORE UPDATE ON public.ship_staff_invites
  FOR EACH ROW EXECUTE FUNCTION public.ship_touch_updated_at();
