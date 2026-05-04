-- ============================================================================
-- Bookings ↔ Packages — guest can attach one package per booking
-- ============================================================================
-- We snapshot the package's pricing fields on the booking row so historical
-- bookings stay accurate even if the hotelier later edits or deletes the
-- package. The FK uses ON DELETE SET NULL to preserve the booking.
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_id              UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_name_snapshot   TEXT,
  ADD COLUMN IF NOT EXISTS package_price_snapshot  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS package_pricing_type    TEXT,
  ADD COLUMN IF NOT EXISTS package_pricing_mode    TEXT,
  ADD COLUMN IF NOT EXISTS package_total           NUMERIC(10,2);  -- final amount charged for the package

CREATE INDEX IF NOT EXISTS bookings_package_idx ON public.bookings(package_id) WHERE package_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.package_id IS
  'Optional package the guest selected. NULL = plain room booking.';
COMMENT ON COLUMN public.bookings.package_total IS
  'Final monetary amount charged for the package (after pricing_type × nights/persons math). Stored separately from room total so reports can split them.';
