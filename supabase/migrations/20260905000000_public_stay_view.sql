-- ============================================================================
-- PublicMyStay — anonymous per-booking "guest webapp" surface
-- ============================================================================
-- Phase 2 of the hoteligy-inspired sprint. A guest scans the QR at check-in
-- (encoding https://staylo.app/checkin/<check_in_token>) and after
-- registering, lands on /stay/<check_in_token> — a mobile-first "digital
-- concierge" page they can bookmark and use for the whole stay.
--
-- SAME token as check-in. Same trust model (holder = guest). No new column
-- on bookings — we just add a second SECURITY DEFINER read that returns
-- more surface (wifi, house rules, contact) than get_booking_for_checkin.
--
-- Adds three fields to `properties` that were missing:
--   * wifi_ssid + wifi_password: the number-one thing a guest scans for
--   * house_rules: free-form policies shown on the page
-- Contact info reuses the existing contact_phone / contact_email / address
-- columns already on the table.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS wifi_ssid     text,
  ADD COLUMN IF NOT EXISTS wifi_password text,
  ADD COLUMN IF NOT EXISTS house_rules   text;

COMMENT ON COLUMN public.properties.wifi_ssid     IS 'Broadcast WiFi network name shown on the guest stay page. Optional.';
COMMENT ON COLUMN public.properties.wifi_password IS 'WiFi password shown on the guest stay page. Read-only from the guest side (they cannot change it). Store in plain text: this is a network password, not an account credential.';
COMMENT ON COLUMN public.properties.house_rules   IS 'Free-form house rules shown on the guest stay page (quiet hours, pool schedule, pet policy, etc.).';

-- ============================================================================
-- get_stay_view — anon-callable read for /stay/<token>
-- ============================================================================
-- Returns everything the mobile stay page needs in a single round-trip. Only
-- fields safe for a public URL: no prices, no payment refs, no internal
-- notes. Just what a guest already knows or would expect to see on a QR-code
-- welcome sheet.
--
-- We JSON-agg the property + room details so the client can render the
-- whole page without a second query. Empty result set (0 rows) when the
-- token is unknown or the booking is fully in the past — caller shows a
-- "link expired" state.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_stay_view(p_token uuid)
RETURNS TABLE (
  booking_id       uuid,
  status           text,
  check_in         date,
  check_out        date,
  guest_name       text,
  adults           int,
  children         int,
  property_name    text,
  property_city    text,
  property_country text,
  address          text,
  lat              numeric,
  lng              numeric,
  check_in_time    text,
  check_out_time   text,
  contact_phone    text,
  contact_email    text,
  website          text,
  description      text,
  house_rules      text,
  wifi_ssid        text,
  wifi_password    text,
  amenities        text[],
  languages_spoken text[],
  cancellation_policy text,
  photo_urls       text[],
  room_name        text,
  room_beds        text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    b.id,
    b.status,
    b.check_in,
    b.check_out,
    b.guest_name,
    COALESCE(b.adults, 1),
    COALESCE(b.children, 0),
    p.name,
    p.city,
    p.country,
    p.address,
    p.lat,
    p.lng,
    p.check_in_time,
    p.check_out_time,
    p.contact_phone,
    p.contact_email,
    p.website,
    p.description,
    p.house_rules,
    p.wifi_ssid,
    p.wifi_password,
    p.amenities,
    p.languages_spoken,
    p.cancellation_policy,
    p.photo_urls,
    r.name,
    r.bed_type
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.rooms      r ON r.id = b.room_id
  WHERE b.check_in_token = p_token
    AND b.check_out >= (CURRENT_DATE - interval '1 day')
    AND b.status IS DISTINCT FROM 'cancelled';
$$;

REVOKE ALL ON FUNCTION public.get_stay_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stay_view(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_stay_view(uuid) IS
  'Anon-callable: full guest-facing view of a booking for /stay/<check_in_token>. Returns only fields safe to show on a public URL (no prices, no payment refs). Silent when token is unknown, booking ended, or cancellation status is cancelled.';

NOTIFY pgrst, 'reload schema';
