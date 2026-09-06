-- ============================================================================
-- Anon-callable stay-wallet + stay-folio RPCs
-- ============================================================================
-- Chunk 2 of the guest-webapp sprint. The PublicMyStay page (/stay/<token>)
-- needs to render the guest's voucher wallet + running folio without
-- requiring the guest to be logged in. RLS on guest_vouchers and
-- booking_charges is guest-scoped (`auth.uid() = bookings.guest_id`), which
-- blocks anon completely. So we ship two SECURITY DEFINER reads keyed on
-- the same check_in_token we already use for get_stay_view.
--
-- Both functions return empty when the token is unknown, the booking is
-- cancelled, or the booking has been checked out for more than a day.
-- Never return prices/refs that aren't in the guest-facing surface.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- get_stay_vouchers — wallet of entitlements for /stay/<token>
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stay_vouchers(p_token uuid)
RETURNS TABLE (
  id            uuid,
  source        text,
  kind          text,
  label         text,
  description   text,
  qty_total     integer,
  qty_consumed  integer,
  qty_remaining integer,
  valid_from    date,
  valid_until   date,
  voucher_code  text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    v.id,
    v.source,
    v.kind,
    v.label,
    v.description,
    v.qty_total,
    v.qty_consumed,
    (v.qty_total - v.qty_consumed)::integer AS qty_remaining,
    v.valid_from,
    v.valid_until,
    v.voucher_code
  FROM public.guest_vouchers v
  JOIN public.bookings b ON b.id = v.booking_id
  WHERE b.check_in_token = p_token
    AND b.check_out >= (CURRENT_DATE - interval '1 day')
    AND b.status IS DISTINCT FROM 'cancelled'
  ORDER BY (v.qty_total - v.qty_consumed) DESC, v.valid_until NULLS LAST, v.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_stay_vouchers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stay_vouchers(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_stay_vouchers(uuid) IS
  'Anon-callable: wallet of guest_vouchers for the booking behind /stay/<check_in_token>. Ordered remaining-first so the useful ones surface at the top.';


-- ─────────────────────────────────────────────────────────────────────────
-- get_stay_folio — running folio + totals for /stay/<token>
-- ─────────────────────────────────────────────────────────────────────────
-- Two outputs in one RPC via a JSON return: the charge list AND totals
-- (total, paid, unpaid). The client can render both without a second call.
--
-- Charges include the currency so the client picks the right symbol per
-- row (in principle every row shares booking.currency, but we return it
-- per-row for defensiveness — a hotelier could conceivably post a charge
-- in a different currency).
CREATE OR REPLACE FUNCTION public.get_stay_folio(p_token uuid)
RETURNS TABLE (
  currency      text,
  total         numeric,
  paid          numeric,
  unpaid        numeric,
  charges       jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH booking_row AS (
    SELECT b.id, b.currency
    FROM public.bookings b
    WHERE b.check_in_token = p_token
      AND b.check_out >= (CURRENT_DATE - interval '1 day')
      AND b.status IS DISTINCT FROM 'cancelled'
    LIMIT 1
  ),
  rows AS (
    SELECT c.*
    FROM public.booking_charges c
    JOIN booking_row br ON br.id = c.booking_id
  )
  SELECT
    (SELECT currency FROM booking_row) AS currency,
    COALESCE(SUM(amount), 0)::numeric AS total,
    COALESCE(SUM(amount) FILTER (WHERE paid), 0)::numeric AS paid,
    COALESCE(SUM(amount) FILTER (WHERE NOT paid), 0)::numeric AS unpaid,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',          rows.id,
          'category',    rows.category,
          'description', rows.description,
          'unit_price',  rows.unit_price,
          'qty',         rows.qty,
          'amount',      rows.amount,
          'currency',    rows.currency,
          'charged_at',  rows.charged_at,
          'paid',        rows.paid
        )
        ORDER BY rows.charged_at DESC
      ) FILTER (WHERE rows.id IS NOT NULL),
      '[]'::jsonb
    ) AS charges
  FROM rows;
$$;

REVOKE ALL ON FUNCTION public.get_stay_folio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stay_folio(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_stay_folio(uuid) IS
  'Anon-callable: running folio for the booking behind /stay/<check_in_token>. Returns totals + all charges as a single row with a jsonb array.';

NOTIFY pgrst, 'reload schema';
