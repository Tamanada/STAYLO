-- ============================================================================
-- 20260604010000_voucher_auto_issue
-- ============================================================================
-- S3a-bis. Auto-creates guest_vouchers from the room_packages link when a
-- booking becomes "real" (confirmed / checked_in / completed). Without
-- this, the voucher wallet stays empty even though hoteliers have wired
-- packages to their rooms.
--
-- Idempotency rules (important — triggers can re-fire on status updates):
--   · A voucher is "from this package" iff
--     (booking_id, source='package', source_ref=package_id) matches.
--   · If such a row exists, the function skips it. Safe to call N times.
--
-- qty_total formula by package.pricing_type:
--   per_stay   → room_packages.qty               (1 spa bundle, 1 wedding pack)
--   per_night  → room_packages.qty × nights      (2 breakfasts × 3 nights = 6)
--   per_person → room_packages.qty               (qty already encodes pax)
--
-- valid_from / valid_until = booking check_in / check_out so the voucher
-- doesn't display in the wallet outside the stay window.
--
-- See `project_staylo_vouchers_folio.md` for the full picture.
-- ============================================================================


-- ============================================================================
-- issue_vouchers_for_booking(booking_id) — pure function, callable manually
-- ============================================================================
-- Returns: number of NEW vouchers created (0 if all already existed).
CREATE OR REPLACE FUNCTION public.issue_vouchers_for_booking(
  p_booking_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking      public.bookings%ROWTYPE;
  v_nights       integer;
  v_pkg_row      record;
  v_issued       integer := 0;
  v_qty_total    integer;
  v_kind         text;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Compute stay length in nights (≥ 1). Day-use / hourly bookings
  -- still get at least 1 unit of any per-night voucher.
  v_nights := GREATEST(
    1,
    (v_booking.check_out::date - v_booking.check_in::date)
  );

  -- Walk each package linked to the booked room. We deliberately
  -- ignore the date_blocks column (room_packages can blackout specific
  -- date ranges) for V1 — adding that filter requires the package's
  -- per-date schema to land, and the rare blackout case is handled
  -- manually for now.
  FOR v_pkg_row IN
    SELECT
      p.id            AS pkg_id,
      p.name          AS pkg_name,
      p.description   AS pkg_desc,
      p.category      AS pkg_category,
      p.pricing_type  AS pkg_pricing_type,
      p.icon          AS pkg_icon,
      rp.qty          AS link_qty
    FROM public.packages p
    JOIN public.room_packages rp ON rp.package_id = p.id
    WHERE rp.room_id = v_booking.room_id
      AND p.is_active = true
  LOOP
    -- Skip if a voucher from this package on this booking already exists.
    IF EXISTS (
      SELECT 1 FROM public.guest_vouchers gv
      WHERE gv.booking_id = p_booking_id
        AND gv.source     = 'package'
        AND gv.source_ref = v_pkg_row.pkg_id::text
    ) THEN
      CONTINUE;
    END IF;

    -- qty_total formula
    v_qty_total := CASE COALESCE(v_pkg_row.pkg_pricing_type, 'per_stay')
      WHEN 'per_night' THEN COALESCE(v_pkg_row.link_qty, 1) * v_nights
      ELSE                  COALESCE(v_pkg_row.link_qty, 1)
    END;
    IF v_qty_total < 1 THEN v_qty_total := 1; END IF;

    -- Map package category → voucher kind. The voucher kind is text
    -- (no enum) so we just use the category verbatim. Future fine-grain
    -- can override at insert time by reading inclusions[].
    v_kind := COALESCE(NULLIF(v_pkg_row.pkg_category, ''), 'other');

    INSERT INTO public.guest_vouchers (
      booking_id, source, source_ref,
      kind, label, description,
      qty_total, qty_consumed,
      valid_from, valid_until,
      voucher_code, metadata
    ) VALUES (
      p_booking_id,
      'package',
      v_pkg_row.pkg_id::text,
      v_kind,
      v_pkg_row.pkg_name,
      v_pkg_row.pkg_desc,
      v_qty_total,
      0,
      v_booking.check_in::date,
      v_booking.check_out::date,
      public.generate_voucher_code(),
      jsonb_build_object(
        'pkg_category',     v_pkg_row.pkg_category,
        'pkg_pricing_type', v_pkg_row.pkg_pricing_type,
        'icon',             v_pkg_row.pkg_icon
      )
    );

    v_issued := v_issued + 1;
  END LOOP;

  RETURN v_issued;
END;
$$;

COMMENT ON FUNCTION public.issue_vouchers_for_booking(uuid) IS
'Creates guest_vouchers rows from every active package linked to the booking room. Idempotent — re-running returns 0 once vouchers exist. Called by trigger AND callable manually for one-off re-issuance.';


-- ============================================================================
-- Trigger — fires on bookings INSERT/UPDATE when status enters "real"
-- ============================================================================
-- We don't issue vouchers for "pending" bookings (could still be cancelled).
-- We do issue on status transition to confirmed / checked_in / completed.
-- We catch INSERT too (some flows insert directly as checked_in for walk-ins).
CREATE OR REPLACE FUNCTION public.trigger_issue_vouchers_on_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_eligible_now    boolean := NEW.status IN ('confirmed', 'checked_in', 'completed');
  v_eligible_before boolean := false;
BEGIN
  IF v_eligible_now IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    v_eligible_before := OLD.status IN ('confirmed', 'checked_in', 'completed');
  END IF;
  -- Only fire on the transition into eligibility. issue_vouchers_for_booking
  -- is idempotent anyway but skipping the call when it's a no-op saves a
  -- query per status bump.
  IF NOT v_eligible_before THEN
    PERFORM public.issue_vouchers_for_booking(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_auto_issue_vouchers ON public.bookings;
CREATE TRIGGER bookings_auto_issue_vouchers
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_issue_vouchers_on_booking();

COMMENT ON FUNCTION public.trigger_issue_vouchers_on_booking() IS
'Auto-fires issue_vouchers_for_booking when a booking becomes confirmed/checked_in/completed. Trigger on bookings AFTER INSERT OR UPDATE OF status.';


-- ============================================================================
-- One-shot backfill — issue vouchers for existing real bookings
-- ============================================================================
-- Runs once at migration apply. Useful so Dancing Elephant + already-live
-- properties start their vouchers populated for in-house guests.
-- Subsequent inserts/updates are handled by the trigger.
DO $$
DECLARE
  v_count integer := 0;
  v_total integer := 0;
  v_booking_id uuid;
BEGIN
  FOR v_booking_id IN
    SELECT id FROM public.bookings
    WHERE status IN ('confirmed', 'checked_in', 'completed')
  LOOP
    v_count := public.issue_vouchers_for_booking(v_booking_id);
    v_total := v_total + v_count;
  END LOOP;
  RAISE NOTICE 'Voucher backfill: % vouchers issued across existing bookings', v_total;
END
$$;
