-- ============================================================================
-- 20260810000002_ship_hotel_state_blob
-- ============================================================================
-- Cross-device state sync for SHIP: one jsonb blob per hotel, written by
-- authenticated members via RLS-gated table access, readable by anonymous
-- staff via an invite-token RPC.
--
-- Rationale: SHIP originally stored every per-hotel data set
-- (staylo_employees_<slug>, staylo_schedules_<slug>, staylo_tasks_<slug>,
-- staylo_cashbook_<slug>, staylo_expenses_<slug>, …) exclusively in the
-- browser's localStorage. Result: a manager who set up the hotel on their
-- desktop saw an empty roster and empty planning on their phone. The
-- staff QR flow was even worse — the invited employee's phone had NO
-- shared context beyond the boot-time invite record.
--
-- Approach chosen (David 2026-08-10): a single blob per hotel, last-write-
-- wins, debounced 5s pushes from the client. Not per-record CRUD — that
-- would require ~15 tables with their own upsert semantics and offline
-- reconciliation. The blob approach ships today, works for solo owner +
-- small team, and can be migrated to per-record later without breaking
-- callers (the client just needs to change what it pulls/pushes).
--
-- Trade-offs accepted:
--   · Blob size: a fully-populated hotel is a few hundred KB (employees +
--     schedules + tasks + finance). Postgres jsonb happily takes it.
--   · Concurrent writes: two devices editing at once → the later push
--     clobbers the earlier one. Fine for one-owner shops.
--   · Push size on every write burst: acceptable at V1 scale (~50-500
--     hotels). At 5k+ hotels we refactor to per-record.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ship_hotel_state (
  hotel_id     uuid PRIMARY KEY REFERENCES public.ship_hotels(id) ON DELETE CASCADE,
  hotel_slug   text NOT NULL,
  state_blob   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ship_hotel_state_slug_idx ON public.ship_hotel_state(hotel_slug);

ALTER TABLE public.ship_hotel_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY ship_hotel_state_member_select
  ON public.ship_hotel_state FOR SELECT
  USING (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_hotel_state_member_insert
  ON public.ship_hotel_state FOR INSERT
  WITH CHECK (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_hotel_state_member_update
  ON public.ship_hotel_state FOR UPDATE
  USING (hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id));

GRANT SELECT, INSERT, UPDATE ON public.ship_hotel_state TO authenticated;


-- ────────── Companion RPC: anon-callable read via invite token ──────────
-- Staff scanning a QR need to see the manager's setup even though they
-- have no Supabase auth session. Their proof of access is the
-- invite_token itself (physical QR = credential, same pattern as Google
-- Docs share links). Returns the whole blob or NULL if the token doesn't
-- match a known invite.
CREATE OR REPLACE FUNCTION public.ship_get_hotel_state_by_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_blob jsonb;
BEGIN
  SELECT hotel_id INTO v_hotel_id
    FROM public.ship_staff_invites
    WHERE invite_token = p_token
    LIMIT 1;
  IF v_hotel_id IS NULL THEN RETURN NULL; END IF;
  SELECT state_blob INTO v_blob
    FROM public.ship_hotel_state
    WHERE hotel_id = v_hotel_id
    LIMIT 1;
  RETURN COALESCE(v_blob, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.ship_get_hotel_state_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_get_hotel_state_by_invite(text) TO anon, authenticated;

CREATE TRIGGER ship_hotel_state_touch_updated_at
  BEFORE UPDATE ON public.ship_hotel_state
  FOR EACH ROW EXECUTE FUNCTION public.ship_touch_updated_at();
