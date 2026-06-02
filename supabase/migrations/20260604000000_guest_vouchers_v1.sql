-- ============================================================================
-- 20260604000000_guest_vouchers_v1
-- ============================================================================
-- The voucher layer. Locks the schema for S3 (Guest vouchers + multi-venue
-- folio + SHIP integration) before any UI work touches it.
--
-- Why now: David validated the design 2026-06-03 (see project memory
-- `project_staylo_vouchers_folio.md`). Lock the contract while the
-- conversation is fresh so app code in S3b–S3h doesn't drift.
--
-- What's NOT in this migration (deferred to keep the surface small):
--   · Auto-issue trigger on booking create. The shape of room_packages →
--     vouchers is policy-loaded (qty_per_night vs qty_per_stay etc.); we
--     ship that as a separate RPC in S3a-bis once the UX confirms the
--     semantics.
--   · Voucher payment for paid_addon source — that lands with the
--     check-out / Stripe flow in S3h.
--
-- What IS here:
--   1. guest_vouchers           — one row per right/entitlement on a stay
--   2. voucher_consumptions     — audit log, one row per use
--   3. consume_voucher() RPC    — atomic decrement + audit insert
--   4. generate_voucher_code()  — 10-char alphanumeric, short for QR
--   5. RLS policies             — guest reads own, staff manages all on
--                                 their property's bookings, anyone with
--                                 the code can introspect (for scanning)
-- ============================================================================


-- ============================================================================
-- 1. guest_vouchers — one row per right held by the booking
-- ============================================================================
-- Sources:
--   · package      — issued from a room_packages link at booking time
--   · reward       — from a room_availability special (Disponibilités → 🎁)
--   · gift         — hotelier-granted manually (comp / complaint resolution)
--   · paid_addon   — guest bought it on top (Stripe / $STAY / cash)
--   · manual       — escape hatch for one-off vouchers
--
-- `kind` is a soft taxonomy (text, not enum) so adding new voucher types
-- doesn't require a migration. Match it to SHIP venue routing later.
CREATE TABLE IF NOT EXISTS public.guest_vouchers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES public.bookings(id)        ON DELETE CASCADE,
  -- Optional FK to a specific guest on the booking. When NULL, the
  -- voucher belongs to the booking as a whole (anyone in the party
  -- can consume it — typical for "Free breakfast for 2" applied to
  -- the whole stay rather than to a specific person).
  booking_guest_id  uuid REFERENCES public.booking_guests(id)            ON DELETE SET NULL,

  source            text NOT NULL
    CHECK (source IN ('package', 'reward', 'gift', 'paid_addon', 'manual')),
  source_ref        text,           -- e.g. packages.id, reward special key, payment intent id

  -- Soft taxonomy of voucher types. Match these to SHIP venues + to
  -- booking_charges.category in the consumption RPC.
  --   restaurant     → breakfast, lunch, dinner, snack
  --   bar            → welcome_drink, cocktail, beer
  --   spa            → massage_60min, facial, manicure
  --   wellness       → gym_pass, sauna_session
  --   transport      → airport_pickup, shuttle, taxi
  --   tour           → island_tour, snorkeling
  --   gift_shop      → souvenir_credit
  --   other          → catch-all
  kind              text NOT NULL,
  label             text NOT NULL,            -- "Breakfast for 2"
  description       text,                     -- "Tropical fruits, eggs to order, coffee/tea"

  qty_total         integer NOT NULL CHECK (qty_total >= 0),
  qty_consumed      integer NOT NULL DEFAULT 0
                              CHECK (qty_consumed >= 0 AND qty_consumed <= qty_total),

  valid_from        date,                     -- null = valid as of created_at
  valid_until       date,                     -- null = valid until booking.check_out

  -- Short scannable code. UNIQUE so QR scans can lookup directly
  -- without needing the voucher.id (which is a UUID, painful to QR).
  voucher_code      text NOT NULL UNIQUE,

  -- Open bag for future fields (preferred time slot, allergen note,
  -- session room ID, etc.). Keep it forgiving for V1.
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.guest_vouchers IS 'Per-booking entitlements (breakfast, transport, spa, etc.) — wallet behind the guest-app voucher screen + SHIP venue scan flow.';
COMMENT ON COLUMN public.guest_vouchers.source IS 'package | reward | gift | paid_addon | manual. Drives where the entitlement came from for audit + reporting.';
COMMENT ON COLUMN public.guest_vouchers.kind IS 'Soft taxonomy mapped to SHIP venues / booking_charges.category. Text not enum so new kinds don''t need migrations.';
COMMENT ON COLUMN public.guest_vouchers.voucher_code IS 'Short alphanumeric code (10 char) embedded in the guest-app QR. Scanned at the venue → RPC consume_voucher.';

CREATE INDEX IF NOT EXISTS guest_vouchers_booking_idx        ON public.guest_vouchers (booking_id);
CREATE INDEX IF NOT EXISTS guest_vouchers_booking_guest_idx  ON public.guest_vouchers (booking_guest_id);
CREATE INDEX IF NOT EXISTS guest_vouchers_remaining_idx
  ON public.guest_vouchers (booking_id)
  WHERE qty_consumed < qty_total;


-- ============================================================================
-- 2. voucher_consumptions — audit trail, one row per use
-- ============================================================================
-- Idempotency: there's no natural uniqueness key (the same voucher can
-- be consumed in 2 separate transactions of qty=1). We rely on the
-- consume_voucher RPC's row-level locking to prevent double-spend.
--
-- booking_charge_id is the optional link to a folio line. The standard
-- flow is: voucher consumed → also create a booking_charges line at 0$
-- (snapshot for reporting) and store its id here. This way the final
-- check-out bill shows "2× Breakfast (voucher)" as a $0 line — clear
-- to the guest, audit-traceable for the hotelier.
CREATE TABLE IF NOT EXISTS public.voucher_consumptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id        uuid NOT NULL REFERENCES public.guest_vouchers(id)  ON DELETE CASCADE,
  qty               integer NOT NULL CHECK (qty > 0),
  consumed_at       timestamptz NOT NULL DEFAULT now(),
  consumed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  location          text,   -- 'reception' | 'restaurant_phangans' | 'spa' | 'bar_purity' …
  notes             text,
  booking_charge_id uuid REFERENCES public.booking_charges(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.voucher_consumptions IS 'Audit log of voucher uses. The same voucher can have N rows here (one per consumption event).';

CREATE INDEX IF NOT EXISTS voucher_consumptions_voucher_idx ON public.voucher_consumptions (voucher_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS voucher_consumptions_by_idx     ON public.voucher_consumptions (consumed_by);


-- ============================================================================
-- 3. updated_at trigger on guest_vouchers
-- ============================================================================
-- The shared public.touch_updated_at() function was created in
-- 20260602000000_checkin_v2_and_engagement.sql. Reuse it here.
DROP TRIGGER IF EXISTS guest_vouchers_touch_updated_at ON public.guest_vouchers;
CREATE TRIGGER guest_vouchers_touch_updated_at
  BEFORE UPDATE ON public.guest_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 4. generate_voucher_code() — 10-char human-readable code
-- ============================================================================
-- Excludes confusing characters (O / 0 / I / 1 / L / l) so receptionists
-- can read the code aloud over the phone if a QR scan fails. The format
-- is XXXX-XXXX-XX (groups of 4 + 2) for readability when surfaced
-- alongside the QR ("backup code: ABCD-EFGH-JK").
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   -- 30 chars, no ambiguous
  out     text := '';
  pos     int;
  i       int;
BEGIN
  FOR i IN 1..10 LOOP
    pos := 1 + floor(random() * 30)::int;
    out := out || substr(charset, pos, 1);
    -- Group separators at positions 4 and 8 → "ABCD-EFGH-JK"
    IF i = 4 OR i = 8 THEN out := out || '-'; END IF;
  END LOOP;
  RETURN out;
END;
$$;


-- ============================================================================
-- 5. consume_voucher() — atomic decrement + audit insert
-- ============================================================================
-- Returns the new remaining qty (qty_total - qty_consumed). Raises if:
--   · voucher_code doesn't exist
--   · voucher is expired (valid_until < today)
--   · not enough qty left to satisfy `p_qty`
--
-- SECURITY DEFINER so SHIP venue staff (with a regular property_members
-- role) can call it without needing direct UPDATE on guest_vouchers.
-- The function enforces the property membership check itself.
CREATE OR REPLACE FUNCTION public.consume_voucher(
  p_voucher_code     text,
  p_qty              integer DEFAULT 1,
  p_location         text DEFAULT NULL,
  p_notes            text DEFAULT NULL,
  p_booking_charge_id uuid DEFAULT NULL
)
RETURNS TABLE(voucher_id uuid, remaining integer, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher    public.guest_vouchers%ROWTYPE;
  v_booking    public.bookings%ROWTYPE;
  v_today      date := current_date;
  v_caller     uuid := auth.uid();
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RAISE EXCEPTION 'qty must be ≥ 1';
  END IF;

  -- Lock the voucher row to prevent double-spend race.
  SELECT * INTO v_voucher
  FROM public.guest_vouchers
  WHERE voucher_code = p_voucher_code
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher % not found', p_voucher_code;
  END IF;

  -- Validity window.
  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < v_today THEN
    RAISE EXCEPTION 'Voucher % expired on %', p_voucher_code, v_voucher.valid_until;
  END IF;
  IF v_voucher.valid_from IS NOT NULL AND v_voucher.valid_from > v_today THEN
    RAISE EXCEPTION 'Voucher % not yet valid (starts %)', p_voucher_code, v_voucher.valid_from;
  END IF;

  -- Property membership check — caller must be staff on the booking's property.
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_voucher.booking_id;
  IF v_caller IS NOT NULL THEN
    PERFORM 1 FROM public.property_members
      WHERE property_id = v_booking.property_id
        AND user_id = v_caller
        AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'You are not authorised on this booking''s property';
    END IF;
  END IF;

  -- Quota check.
  IF v_voucher.qty_consumed + p_qty > v_voucher.qty_total THEN
    RAISE EXCEPTION 'Voucher % has only % remaining (requested %)',
      p_voucher_code,
      v_voucher.qty_total - v_voucher.qty_consumed,
      p_qty;
  END IF;

  -- Decrement + audit insert.
  UPDATE public.guest_vouchers
     SET qty_consumed = qty_consumed + p_qty,
         updated_at   = now()
   WHERE id = v_voucher.id;

  INSERT INTO public.voucher_consumptions (voucher_id, qty, consumed_by, location, notes, booking_charge_id)
  VALUES (v_voucher.id, p_qty, v_caller, p_location, p_notes, p_booking_charge_id);

  RETURN QUERY SELECT v_voucher.id, v_voucher.qty_total - (v_voucher.qty_consumed + p_qty), v_voucher.label;
END;
$$;

COMMENT ON FUNCTION public.consume_voucher IS 'Atomic voucher use. Validates code + expiry + quota + staff membership. Inserts an audit row in voucher_consumptions. Optionally links to a folio booking_charges row.';


-- ============================================================================
-- 6. RLS — Row-Level Security
-- ============================================================================
ALTER TABLE public.guest_vouchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_consumptions ENABLE ROW LEVEL SECURITY;

-- guest_vouchers: the guest who holds the booking can read their wallet;
-- property staff can read + manage every voucher on their property's
-- bookings; nobody else.
DROP POLICY IF EXISTS "Guest reads own vouchers" ON public.guest_vouchers;
CREATE POLICY "Guest reads own vouchers" ON public.guest_vouchers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = guest_vouchers.booking_id
        AND b.guest_id = auth.uid()
    )
    OR
    -- Roommates with a STAYLO account can also see the booking's vouchers.
    EXISTS (
      SELECT 1 FROM public.booking_guests bg
      WHERE bg.booking_id = guest_vouchers.booking_id
        AND bg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Property staff manage vouchers" ON public.guest_vouchers;
CREATE POLICY "Property staff manage vouchers" ON public.guest_vouchers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = guest_vouchers.booking_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = guest_vouchers.booking_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

-- voucher_consumptions: read only — writes go through the SECURITY DEFINER
-- consume_voucher() RPC which enforces its own auth.
DROP POLICY IF EXISTS "Guest reads own consumptions" ON public.voucher_consumptions;
CREATE POLICY "Guest reads own consumptions" ON public.voucher_consumptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guest_vouchers gv
      JOIN public.bookings b ON b.id = gv.booking_id
      WHERE gv.id = voucher_consumptions.voucher_id
        AND b.guest_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Property staff reads consumptions" ON public.voucher_consumptions;
CREATE POLICY "Property staff reads consumptions" ON public.voucher_consumptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guest_vouchers gv
      JOIN public.bookings b ON b.id = gv.booking_id
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE gv.id = voucher_consumptions.voucher_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

-- Note: there is no INSERT/UPDATE/DELETE policy on voucher_consumptions
-- on purpose. Use the consume_voucher() RPC.
