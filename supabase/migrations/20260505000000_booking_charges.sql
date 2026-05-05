-- ============================================================================
-- booking_charges — ancillary expenses posted to a guest's folio
-- ============================================================================
-- Standard PMS feature: every drink at the bar, every spa session,
-- every laundry bag goes onto the booking's folio. At check-out the guest
-- sees a complete bill (room rate + packages + charges) and pays once.
--
-- Categories (emoji + label live in the UI lib, not the DB so they can
-- evolve without migrations). The CHECK list below is permissive on
-- purpose — we'd rather catch typos than block a hotelier from adding
-- a new revenue centre.
--
-- Pricing:
--   amount = unit_price × qty (computed in the UI, persisted as the final
--            amount so reports don't have to re-multiply)
--
-- Workflow:
--   - charged_at  : when the consumption happened (defaults to now)
--   - paid        : false by default, flipped on check-out or when the
--                   guest pays the line individually (some hotels do that)
--   - added_by    : staff member who keyed it in (for audit / commission)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_charges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  category     TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'bar',        'restaurant', 'spa',
      'minibar',    'laundry',    'tour',
      'transport',  'phone',      'wifi',
      'gift_shop',  'late_checkout',
      'damage',     'cleaning',
      'package',                            -- package addon snapshot
      'other'
    )),
  description  TEXT,                        -- "2× Singha beer", "60-min Thai massage"
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty          INT           NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 1000),
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,   -- unit_price × qty, snapshotted
  currency     TEXT          NOT NULL DEFAULT 'USD',
  charged_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  paid         BOOLEAN       NOT NULL DEFAULT false,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_charges_booking_idx
  ON public.booking_charges (booking_id, charged_at DESC);
CREATE INDEX IF NOT EXISTS booking_charges_unpaid_idx
  ON public.booking_charges (booking_id) WHERE paid = false;

COMMENT ON TABLE public.booking_charges IS
  'Ancillary expenses (bar, restaurant, spa, etc.) posted to a guest folio. Settled at check-out alongside the room rate.';

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.booking_charges ENABLE ROW LEVEL SECURITY;

-- Property staff can read + write charges on their own properties' bookings
DROP POLICY IF EXISTS "Property staff manage booking charges" ON public.booking_charges;
CREATE POLICY "Property staff manage booking charges"
  ON public.booking_charges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = booking_charges.booking_id
        AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = booking_charges.booking_id
        AND pm.user_id = auth.uid()
    )
  );

-- The owning guest can read their own folio (handy for a future "my folio" page)
DROP POLICY IF EXISTS "Guest can read own booking charges" ON public.booking_charges;
CREATE POLICY "Guest can read own booking charges"
  ON public.booking_charges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_charges.booking_id
        AND b.guest_id = auth.uid()
    )
  );
