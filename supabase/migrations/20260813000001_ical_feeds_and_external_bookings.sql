-- ============================================================================
-- 20260813000001_ical_feeds_and_external_bookings
-- ============================================================================
-- One-way iCal read integration for third-party PMS / OTAs (Little Hotelier,
-- Airbnb, Booking.com — anything that exposes an ICS URL). Hotelier pastes
-- the URL, an Edge Function polls it every ~15 min, and any booking events
-- land in `external_bookings` so STAYLO's calendar shows a blocked room.
--
-- Why a SEPARATE table (not writing to `bookings`):
--   · `bookings.guest_id` is NOT NULL and references auth.users — an
--     externally-imported guest doesn't exist in Supabase Auth.
--   · `bookings.total_price` / `commission` / `stripe_payment_id` are all
--     mandatory or Stripe-shaped fields that make no sense for an
--     external booking whose money never touched STAYLO.
--   · Keeping the two streams separate makes the Rooms timeline UI honest:
--     "on-STAYLO revenue" queries `bookings`, occupancy queries UNION of
--     both. Zero risk of double-counting or accidental payout attempts on
--     an external booking.
-- ============================================================================

-- ────────── ical_feeds — one row per (room, source) URL ──────────
-- Feeds are room-scoped rather than property-scoped because Little Hotelier
-- (and Airbnb) hand out ONE ICS URL per calendar/room. Property-wide iCals
-- exist too (some tools export a single "all rooms" feed) — the room_id
-- column is nullable so property-wide feeds are supported: NULL means "any
-- event in this feed blocks whatever the SUMMARY line names".
CREATE TABLE IF NOT EXISTS public.ical_feeds (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id          UUID     REFERENCES public.rooms(id)       ON DELETE CASCADE,
  source           TEXT NOT NULL,                -- 'little_hotelier' | 'airbnb' | 'booking' | 'other'
  label            TEXT,                         -- optional friendly name ("LH – Suite 3")
  ical_url         TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  last_synced_at   TIMESTAMPTZ,
  last_sync_status TEXT,                         -- 'ok' | 'http_400' | 'parse_error' | ...
  last_sync_error  TEXT,
  last_event_count INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ical_feeds_source_check CHECK (source IN ('little_hotelier','airbnb','booking','vrbo','other')),
  CONSTRAINT ical_feeds_url_len_check CHECK (length(ical_url) BETWEEN 10 AND 2048),
  CONSTRAINT ical_feeds_unique_per_room UNIQUE (room_id, ical_url)
);

CREATE INDEX IF NOT EXISTS ical_feeds_property_idx ON public.ical_feeds (property_id);
CREATE INDEX IF NOT EXISTS ical_feeds_room_idx     ON public.ical_feeds (room_id);
CREATE INDEX IF NOT EXISTS ical_feeds_active_idx   ON public.ical_feeds (is_active) WHERE is_active = true;

ALTER TABLE public.ical_feeds ENABLE ROW LEVEL SECURITY;

-- Only the property owner can manage their feeds. The Edge Function
-- runs as service_role and bypasses RLS entirely, so the scheduler works.
CREATE POLICY "Owners manage own ical feeds" ON public.ical_feeds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = ical_feeds.property_id AND p.user_id = auth.uid()
    )
  );


-- ────────── external_bookings — one row per imported reservation ──────────
-- The primary de-dup key is (feed_id, external_uid) — most iCal feeds
-- include a stable UID per event (VEVENT.UID from RFC 5545), so we can
-- upsert on repeated pulls without re-inserting. When UID is missing we
-- fall back to a synthesized hash of (checkin, checkout, summary).
CREATE TABLE IF NOT EXISTS public.external_bookings (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id        UUID NOT NULL REFERENCES public.ical_feeds(id) ON DELETE CASCADE,
  property_id    UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id        UUID     REFERENCES public.rooms(id)           ON DELETE CASCADE,
  source         TEXT NOT NULL,                  -- copied from feed for fast filter
  external_uid   TEXT NOT NULL,                  -- iCal VEVENT.UID (or synthesized hash)
  check_in       DATE NOT NULL,
  check_out      DATE NOT NULL,
  guest_name     TEXT,                           -- extracted from SUMMARY line
  status         TEXT NOT NULL DEFAULT 'confirmed',   -- iCal RESERVED/CONFIRMED/BLOCKED → confirmed
  raw_summary    TEXT,                           -- full SUMMARY line for audit
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT external_bookings_dates_ok CHECK (check_out > check_in),
  CONSTRAINT external_bookings_unique_uid UNIQUE (feed_id, external_uid)
);

CREATE INDEX IF NOT EXISTS external_bookings_property_idx ON public.external_bookings (property_id);
CREATE INDEX IF NOT EXISTS external_bookings_room_idx     ON public.external_bookings (room_id);
CREATE INDEX IF NOT EXISTS external_bookings_dates_idx    ON public.external_bookings (property_id, check_in, check_out);

ALTER TABLE public.external_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners see own external bookings" ON public.external_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = external_bookings.property_id AND p.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policy for authenticated users — the Edge Function
-- writes via service_role. Hoteliers can't hand-craft external bookings, only
-- the sync pipeline can. Keeps the "external" origin trustable in the UI.


-- ────────── updated_at trigger on ical_feeds ──────────
CREATE OR REPLACE FUNCTION public.ical_feeds_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ical_feeds_updated_at_trg ON public.ical_feeds;
CREATE TRIGGER ical_feeds_updated_at_trg
  BEFORE UPDATE ON public.ical_feeds
  FOR EACH ROW EXECUTE FUNCTION public.ical_feeds_touch_updated_at();


COMMENT ON TABLE public.ical_feeds IS
  'iCal URL subscriptions per room. Polled every ~15 min by the ical-sync Edge Function to import bookings from Little Hotelier, Airbnb, Booking.com, etc.';
COMMENT ON TABLE public.external_bookings IS
  'Bookings imported from third-party iCal feeds. Distinct from public.bookings (which holds STAYLO-native reservations with Stripe payment refs).';
