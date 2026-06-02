-- ============================================================================
-- 20260603000000_checkin_v2_bridge
-- ============================================================================
-- Bridge migration. Reconciles S2a (`20260602000000_checkin_v2_and_engagement`)
-- with the pre-existing booking_guests / TM30 / check-in-token infrastructure
-- that ships since May 2026.
--
-- Audit (2026-06-02): S2a wrote `CREATE TABLE IF NOT EXISTS booking_guests`,
-- but that table already existed with a richer schema
-- (`first_name/last_name/sex/passport_number/...` inline + TM30 fields from
-- `20260503040000_tm30_fields`). The CREATE TABLE was a no-op, so the new
-- columns S2a expected (`user_id`, `profile_id`, `role`, `checkin_status`,
-- etc.) were NEVER added. Any code calling `award_staylo_points()` or the
-- `tap to check in` flow would have crashed against the real schema.
--
-- This migration ALTER TABLEs the columns onto the existing booking_guests
-- so:
--   · The mature PMSFrontDesk walk-in + PublicCheckIn QR flows keep working
--     unchanged (they only touch the inline fields).
--   · The new tap-to-check-in + viral roommate + tokenized-engagement flows
--     can resolve a booking_guests row to a `user_profiles` (saved-for-life
--     passport) and award $STAY points against `user_id`.
--   · The existing `is_lead` column already encodes the "lead vs roommate"
--     relationship — we do NOT add a parallel `role` enum. The S2a memory
--     doc is updated accordingly.
-- ============================================================================

ALTER TABLE public.booking_guests
  ADD COLUMN IF NOT EXISTS profile_id          uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id             uuid REFERENCES auth.users(id)           ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkin_status      text
    CHECK (checkin_status IS NULL OR checkin_status IN
      ('pending_profile', 'profile_ready', 'tap_pending', 'checked_in', 'checked_out')),
  ADD COLUMN IF NOT EXISTS invited_via         text
    CHECK (invited_via IS NULL OR invited_via IN ('qr', 'sms', 'link', 'in_person')),
  ADD COLUMN IF NOT EXISTS invited_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joined_at           timestamptz,
  ADD COLUMN IF NOT EXISTS profile_snapshot    jsonb;

COMMENT ON COLUMN public.booking_guests.profile_id IS 'Optional FK to user_profiles. Set when the guest has a saved-for-life passport — the new Tap-to-check-in flow uses this to skip re-typing at every stay. NULL = legacy walk-in row with inline fields only (PMSFrontDesk + PublicCheckIn pre-2026-06 path).';
COMMENT ON COLUMN public.booking_guests.user_id IS 'Optional FK to auth.users. Set when the guest has a STAYLO account. Required for $STAY engagement awards via award_staylo_points().';
COMMENT ON COLUMN public.booking_guests.checkin_status IS 'Optional state machine for the V2 tap-to-check-in flow. NULL on existing rows. pending_profile → profile_ready → tap_pending → checked_in → checked_out.';
COMMENT ON COLUMN public.booking_guests.invited_via IS 'Channel by which a roommate joined this booking (qr/sms/link/in_person). NULL for the lead booker and for rows created before the viral roommate flow.';

-- Useful indexes for the new lookup paths.
CREATE INDEX IF NOT EXISTS booking_guests_profile_id_idx ON public.booking_guests (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_guests_user_id_idx    ON public.booking_guests (user_id)    WHERE user_id    IS NOT NULL;

-- ============================================================================
-- Discoverability note for future maintainers
-- ============================================================================
-- The "role" of a guest on a booking lives in `is_lead BOOLEAN` (existing).
-- We deliberately do NOT add a `role` enum — the boolean already covers it,
-- with a partial unique index (`booking_guests_one_lead_idx`) ensuring at
-- most one lead per booking. The S2a memory doc previously mentioned
-- `role IN ('lead','roommate')`; that was a design that never reached the
-- database and is superseded by this bridge.
