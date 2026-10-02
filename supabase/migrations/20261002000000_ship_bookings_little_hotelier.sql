-- ============================================================================
-- ship_bookings: allow 'little_hotelier' as a booking source
-- ============================================================================
-- Little Hotelier (SiteMinder) has no public API and no iCal feeds, but its
-- "New Reservation" notification emails carry the full booking core. The
-- hotelier auto-forwards those emails to their SHIP inbound address and the
-- ship-inbound-email edge function parses them (parsers/little-hotelier.ts).
--
-- LH is a channel-manager relay: the booking's true origin (Booking.com,
-- Expedia, direct...) is detected from the body and stored in
-- ship_bookings.raw_data.origin_channel. `source` stays 'little_hotelier'
-- because that's the pipe the data arrived through, and the external_id
-- space (Booking Confirmation Id) is LH's.

ALTER TABLE public.ship_bookings DROP CONSTRAINT IF EXISTS ship_bookings_source_check;
ALTER TABLE public.ship_bookings ADD CONSTRAINT ship_bookings_source_check
  CHECK (source = ANY (ARRAY['booking_com'::text, 'expedia'::text, 'agoda'::text, 'airbnb'::text, 'little_hotelier'::text, 'direct'::text, 'walkin'::text, 'other'::text]));
