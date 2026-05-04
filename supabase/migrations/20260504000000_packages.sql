-- ============================================================================
-- Packages — hotelier-manufactured products that wrap a stay
-- ============================================================================
-- A "package" is a curated bundle the hotelier sells on top of (or replacing)
-- a plain room booking. Examples:
--   - "Honeymoon Bliss"   → champagne on arrival + couple massage + late checkout
--   - "Yoga & Detox 7d"   → 7 nights + 14 yoga sessions + cleanse menu
--   - "Diving Discovery"  → room + PADI Open Water + 4 fun dives
--
-- Why this is its own object (not just an amenity):
--   - Has a price separate from the room
--   - Has inclusions (a list of benefits) the guest needs to see
--   - Has eligibility rules (min nights, min guests)
--   - Can be attached to multiple rooms (a "Honeymoon" package usually applies
--     to both the Deluxe and the Suite, never to the Dorm)
--   - Lives independently in the dashboard so the hotelier crafts it once
--     and re-uses it across rooms
--
-- Data model:
--   packages           — property-scoped catalog
--   room_packages      — many-to-many junction (which packages attach to which rooms)
--
-- Booking integration (later phase):
--   bookings.package_id will reference packages.id, and the booking total
--   becomes (package.price [+ room.base_price if pricing_type='addon']) ×
--   nights or persons depending on package.pricing_type.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.packages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'romance', 'wellness', 'adventure', 'family',
      'dining',  'business', 'celebration', 'retreat', 'other'
    )),
  -- Inclusions: array of human-readable benefits ("Champagne on arrival",
  -- "60-min couples massage", "Late check-out at 4pm", ...). Stored as JSONB
  -- so we can later upgrade entries to {label, qty, icon} without migration.
  inclusions      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Pricing
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  pricing_type    TEXT        NOT NULL DEFAULT 'per_stay'
    CHECK (pricing_type IN ('per_stay', 'per_night', 'per_person')),
  -- 'addon'  = package price stacks on top of room rate (e.g. +$80 spa)
  -- 'replace' = package price replaces room rate (flat all-in, e.g. retreats)
  pricing_mode    TEXT        NOT NULL DEFAULT 'addon'
    CHECK (pricing_mode IN ('addon', 'replace')),
  -- Eligibility
  min_nights      INT         NOT NULL DEFAULT 1 CHECK (min_nights BETWEEN 1 AND 90),
  min_guests      INT         NOT NULL DEFAULT 1 CHECK (min_guests BETWEEN 1 AND 20),
  -- Visuals
  photo_url       TEXT,
  icon            TEXT,                    -- emoji or lucide key for compact display
  -- Lifecycle
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  display_order   INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS packages_property_idx ON public.packages(property_id) WHERE is_active = true;

COMMENT ON TABLE public.packages IS
  'Hotelier-crafted product bundles (honeymoon, retreat, diving, etc.) that attach to one or more rooms.';
COMMENT ON COLUMN public.packages.pricing_mode IS
  '"addon" stacks on the room rate; "replace" is a flat all-inclusive overriding the room price.';

-- ─── Junction: which rooms each package is offered with ───
CREATE TABLE IF NOT EXISTS public.room_packages (
  room_id     UUID NOT NULL REFERENCES public.rooms(id)    ON DELETE CASCADE,
  package_id  UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, package_id)
);

CREATE INDEX IF NOT EXISTS room_packages_package_idx ON public.room_packages(package_id);

COMMENT ON TABLE public.room_packages IS
  'Many-to-many between rooms and packages. A Honeymoon package may apply to Deluxe + Suite but never to the Dorm.';

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_packages  ENABLE ROW LEVEL SECURITY;

-- Public can read active packages of live/validated properties (for the OTA)
DROP POLICY IF EXISTS "Anyone can read active packages of live properties" ON public.packages;
CREATE POLICY "Anyone can read active packages of live properties"
  ON public.packages
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = packages.property_id
        AND p.status IN ('live', 'validated')
    )
  );

-- Property owners (and team members) can do everything
DROP POLICY IF EXISTS "Property members manage packages" ON public.packages;
CREATE POLICY "Property members manage packages"
  ON public.packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = packages.property_id
        AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = packages.property_id
        AND pm.user_id = auth.uid()
    )
  );

-- Junction inherits the same access pattern
DROP POLICY IF EXISTS "Anyone reads room_packages" ON public.room_packages;
CREATE POLICY "Anyone reads room_packages"
  ON public.room_packages
  FOR SELECT
  USING (true);  -- harmless: it's just an ID pair

DROP POLICY IF EXISTS "Property members manage room_packages" ON public.room_packages;
CREATE POLICY "Property members manage room_packages"
  ON public.room_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.property_members pm ON pm.property_id = r.property_id
      WHERE r.id = room_packages.room_id
        AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.property_members pm ON pm.property_id = r.property_id
      WHERE r.id = room_packages.room_id
        AND pm.user_id = auth.uid()
    )
  );

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS packages_touch_updated_at ON public.packages;
CREATE TRIGGER packages_touch_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_packages_updated_at();
