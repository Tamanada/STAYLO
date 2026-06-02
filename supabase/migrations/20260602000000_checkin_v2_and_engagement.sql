-- ============================================================================
-- 20260602000000_checkin_v2_and_engagement
-- ============================================================================
-- Foundation for the digital check-in V2 flow + tokenized engagement.
-- See the chat record + project_staylo_full_business.md for the full
-- product story; this is the schema that backs it.
--
-- What this migration ships
--   1. user_profiles         — passport saved-for-life (1 upload, reusable
--                              across every STAYLO stay; separate from
--                              auth.users so non-user roommates can ALSO
--                              have a profile_snapshot via the lead's
--                              upload).
--   2. country_passport_rules — platform-wide table curating the minimum
--                              passport validity window per destination
--                              country (Thailand = 6 months default).
--                              Hotels INHERIT from their own country.
--   3. booking_guests        — multi-guest per booking. A row per
--                              traveler with `role` lead/roommate and
--                              `checkin_status`. `user_id` is NULLABLE
--                              so the "guest non-user" mode works (the
--                              lead uploads their roommate's passport on
--                              their behalf — passport_snapshot copied
--                              into this row).
--   4. properties (alter)    — checkin_start_hour / checkin_end_hour /
--                              checkout_hour + default 6-month threshold
--                              inherited from country_passport_rules.
--   5. bookings (alter)      — early_checkin_unlocked_at, checkin_tapped_at,
--                              passport_validity_status, tm30_pdf_url.
--   6. staylo_points         — engagement points ledger. Pre-TGE these are
--                              "Points" (off-chain). Post-TGE M07 they
--                              convert 1:1 to $STAY. Each award row is
--                              idempotent via (user_id, action, ref_id)
--                              so we never reward twice.
--   7. staylo_points_balance — view that sums the ledger per user. Read-
--                              only, computed on the fly so no balance
--                              drift between ledger and cached sum.
--
-- Decisions locked with David in chat (2026-06-02):
--   · Allocation pool engagement = 5 % of 10B = 500 M $STAY (Y1=200M
--     decreasing curve, 4-year emission). Tracked by `pool` column
--     in staylo_points.
--   · Reward grid (locked):
--        roommate_signup_via_qr     +100 → inviter
--        new_user_profile_verified  +50  → new user
--        first_stay_completed       +50  → each guest present
--        verified_review_posted     +50  → review author
--        roommate_returns_own_book  +50  → original inviter
--        hotelier_onboarded         +1000→ ambassador who invited
--        dao_vote_cast              +25  → voter
--   · Per-country passport validity threshold (Thailand 6 months default,
--     overridable in country_passport_rules).
--   · Realtime via Supabase channels (no polling).
--
-- Anti-gaming primitives built in
--   · staylo_points unique (user_id, action, ref_id) — idempotent awards
--   · booking_guests references both booking + (optional) user_id, so
--     sybil farms can't claim a "first stay" without an actual stay
--     row in bookings with a checked-out status.
--   · user_profiles.passport_hash (sha256 of MRZ document_number) gives
--     us a 1-passport = 1 identity ceiling — same passport across 3 fake
--     accounts will be detected at signup and merged or blocked.
-- ============================================================================


-- ============================================================================
-- 1. user_profiles — passport saved-for-life
-- ============================================================================
-- One row per natural person (auth user OR non-user roommate). For auth
-- users, user_id references auth.users. For non-user roommates uploaded
-- by a lead, user_id is NULL and the profile is "orphaned" — claimable
-- later if that person installs STAYLO and matches via passport_hash.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Identity (extracted from passport MRZ via OCR.space + mrz npm lib)
  first_name              text,
  last_name               text,
  date_of_birth           date,
  sex                     text CHECK (sex IN ('M', 'F', 'X') OR sex IS NULL),
  nationality             text,                  -- ISO 3166-1 alpha-3 (THA, USA, FRA…)
  -- Passport document
  passport_number         text,
  passport_expires_at     date,
  passport_country        text,                  -- ISO 3166-1 alpha-3 (issuing country)
  passport_hash           text UNIQUE,           -- sha256(MRZ document_number || passport_country) — 1 person = 1 identity
  passport_photo_front_url text,                 -- Supabase Storage (private bucket `passports`)
  passport_photo_back_url  text,
  passport_selfie_url      text,                 -- optional, for face-match
  passport_verified_at     timestamptz,          -- set when OCR + MRZ checksums pass
  -- Legal
  signature_url           text,                  -- canvas signature PNG
  tc_accepted_version     text,                  -- version of T&Cs accepted (e.g. "2026-04-01")
  tc_accepted_at          timestamptz,
  -- Privacy / lifecycle
  passport_purged_at      timestamptz,           -- set when we delete the raw photos (J+90 default)
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS 'Passport + identity saved once, reused for every STAYLO stay. Separate from auth.users so non-user roommates uploaded by a lead can ALSO have a profile_snapshot. user_id NULL = orphaned profile claimable later by passport_hash match at signup.';
COMMENT ON COLUMN public.user_profiles.passport_hash IS 'sha256(document_number || country). Anti-sybil ceiling — a single passport cannot fund multiple reward-earning accounts.';
COMMENT ON COLUMN public.user_profiles.passport_purged_at IS 'Date the raw photos were deleted from Supabase Storage. Default purge schedule is J+90 after last check-out. The structured fields (name, DOB, expiry) are retained for TM30 history.';

CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx       ON public.user_profiles (user_id);
CREATE INDEX IF NOT EXISTS user_profiles_passport_hash_idx ON public.user_profiles (passport_hash);
CREATE INDEX IF NOT EXISTS user_profiles_expiry_idx        ON public.user_profiles (passport_expires_at);


-- ============================================================================
-- 2. country_passport_rules — per-country validity threshold
-- ============================================================================
-- Curated by STAYLO admin. Hotels inherit from their destination country
-- (properties.country) unless they explicitly override at property level.
-- Seed includes the major Asia-Pac destinations + Thailand-specific.
CREATE TABLE IF NOT EXISTS public.country_passport_rules (
  country_code               text PRIMARY KEY,    -- ISO 3166-1 alpha-3
  country_name               text NOT NULL,
  min_validity_months        smallint NOT NULL DEFAULT 6,
  block_check_in_if_expired  boolean NOT NULL DEFAULT true,
  notes                      text,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.country_passport_rules IS 'Platform-wide passport validity rules per destination country. Hotels inherit from properties.country; can override per-property if needed.';

INSERT INTO public.country_passport_rules (country_code, country_name, min_validity_months, notes) VALUES
  ('THA', 'Thailand',     6, 'Standard 6-month rule for tourist entry. Most strict in the region.'),
  ('IDN', 'Indonesia',    6, '6-month minimum required at port of entry.'),
  ('VNM', 'Vietnam',      6, 'Standard 6-month rule.'),
  ('MYS', 'Malaysia',     6, 'Standard 6-month rule.'),
  ('SGP', 'Singapore',    6, 'Standard 6-month rule.'),
  ('KHM', 'Cambodia',     6, 'Standard 6-month rule.'),
  ('LAO', 'Laos',         6, 'Standard 6-month rule.'),
  ('MMR', 'Myanmar',      6, 'Standard 6-month rule.'),
  ('PHL', 'Philippines',  6, 'Standard 6-month rule.'),
  ('JPN', 'Japan',        3, 'Stay + 3 months is the unofficial standard; check with embassy.'),
  ('FRA', 'France',       3, 'EU/Schengen: 3 months beyond intended stay departure date.'),
  ('USA', 'United States',0, 'Many nationalities only need passport to be valid through stay; check Visa Waiver Program.')
ON CONFLICT (country_code) DO NOTHING;


-- ============================================================================
-- 3. booking_guests — multi-guest per booking
-- ============================================================================
-- One row per traveler on a booking. `role` distinguishes the lead
-- (booker) from roommates. `user_id` is NULL for non-user roommates
-- whose passport the lead uploaded on their behalf. profile_snapshot
-- captures the user_profiles state at check-in time — even if the user
-- later edits their profile, we keep the historical snapshot for
-- regulatory traceability (TM30, dispute resolution).
CREATE TABLE IF NOT EXISTS public.booking_guests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id          uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  role                text NOT NULL CHECK (role IN ('lead', 'roommate')),
  invited_via         text CHECK (invited_via IN ('qr', 'sms', 'link', 'in_person') OR invited_via IS NULL),
  invited_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at           timestamptz,
  checkin_status      text NOT NULL DEFAULT 'pending_profile'
                       CHECK (checkin_status IN ('pending_profile', 'profile_ready', 'tap_pending', 'checked_in', 'checked_out')),
  profile_snapshot    jsonb,                     -- frozen copy of user_profiles at check-in
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- A single user can only appear once per booking
  UNIQUE (booking_id, user_id)
);

COMMENT ON TABLE public.booking_guests IS 'Multi-guest per booking. Lead = booker, roommates = invited via QR/SMS/link. user_id NULL = guest non-user mode (lead uploaded their docs). profile_snapshot = frozen copy at check-in for audit.';
COMMENT ON COLUMN public.booking_guests.checkin_status IS 'pending_profile → profile_ready → tap_pending → checked_in → checked_out. tap_pending = guest is at the reception and tapped "Tap to check in" in their app.';

CREATE INDEX IF NOT EXISTS booking_guests_booking_id_idx  ON public.booking_guests (booking_id);
CREATE INDEX IF NOT EXISTS booking_guests_user_id_idx     ON public.booking_guests (user_id);
CREATE INDEX IF NOT EXISTS booking_guests_profile_id_idx  ON public.booking_guests (profile_id);


-- ============================================================================
-- 4. properties — check-in window + validity inheritance
-- ============================================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS checkin_start_hour          smallint DEFAULT 14
                            CHECK (checkin_start_hour IS NULL OR (checkin_start_hour BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS checkin_end_hour            smallint DEFAULT 22
                            CHECK (checkin_end_hour IS NULL OR (checkin_end_hour BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS checkout_hour               smallint DEFAULT 11
                            CHECK (checkout_hour IS NULL OR (checkout_hour BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS passport_validity_override_months smallint;

COMMENT ON COLUMN public.properties.checkin_start_hour IS 'Hour of day (0-23) when standard check-in opens. Guests Tap to check in button activates from this hour onward.';
COMMENT ON COLUMN public.properties.checkin_end_hour IS 'Hour of day (0-23) when check-in nominally closes. Late arrivals are still possible via reception override.';
COMMENT ON COLUMN public.properties.passport_validity_override_months IS 'When set, overrides the country-level rule from country_passport_rules. Leave NULL to inherit from country.';


-- ============================================================================
-- 5. bookings — check-in flow state + passport validity
-- ============================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS early_checkin_unlocked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_tapped_at           timestamptz,
  ADD COLUMN IF NOT EXISTS passport_validity_status    text
                            CHECK (passport_validity_status IS NULL OR
                                   passport_validity_status IN ('ok', 'warning', 'expired', 'override_hotelier')),
  ADD COLUMN IF NOT EXISTS passport_validity_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS tm30_pdf_url                text,
  ADD COLUMN IF NOT EXISTS tm30_generated_at           timestamptz;

COMMENT ON COLUMN public.bookings.early_checkin_unlocked_at IS 'Set by reception when they manually unlock early check-in. The guest app then activates Tap to check in before the standard checkin_start_hour.';
COMMENT ON COLUMN public.bookings.checkin_tapped_at IS 'Set by the guest app when the lead taps "Tap to check in" from the reception. Receptionist sees this via Realtime and the CheckInModal pre-fills.';
COMMENT ON COLUMN public.bookings.passport_validity_status IS 'Auto-computed at booking time or when profile updates. ok = at least min_validity_months remaining at check-out. warning = below threshold. expired = past expires_at. override_hotelier = receptionist verified physical passport and overrode block.';
COMMENT ON COLUMN public.bookings.tm30_pdf_url IS 'Supabase Storage URL of the generated TM30 PDF. Re-generated on each check-in finalization (passport_snapshot may change). Audit trail.';


-- ============================================================================
-- 6. staylo_points — engagement ledger
-- ============================================================================
-- Pre-TGE (now → M07 2026-07): off-chain Points.
-- Post-TGE: convert 1:1 to $STAY SPL Token-2022 on Solana.
--
-- IDEMPOTENT: unique (user_id, action, ref_id) ensures we never reward
-- twice for the same event. Workers/triggers can replay safely.
CREATE TABLE IF NOT EXISTS public.staylo_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          text NOT NULL,                 -- enum below
  ref_id          text NOT NULL,                 -- typically booking_id, user_id (referee), property_id, etc.
  amount          integer NOT NULL,              -- positive = award, negative = clawback (anti-fraud)
  pool            text NOT NULL DEFAULT 'engagement_y1',
  metadata        jsonb DEFAULT '{}'::jsonb NOT NULL,
  awarded_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,                   -- set at TGE when converted to on-chain $STAY
  on_chain_tx     text,                          -- Solana tx signature once claimed
  UNIQUE (user_id, action, ref_id)
);

COMMENT ON TABLE public.staylo_points IS 'Engagement ledger. Pre-TGE = off-chain Points. Post-TGE = convert 1:1 to $STAY SPL Token. Idempotent via (user_id, action, ref_id) unique constraint.';
COMMENT ON COLUMN public.staylo_points.action IS 'Locked grid (2026-06): roommate_signup_via_qr 100 · new_user_profile_verified 50 · first_stay_completed 50 · verified_review_posted 50 · roommate_returns_own_book 50 · hotelier_onboarded 1000 · dao_vote_cast 25.';
COMMENT ON COLUMN public.staylo_points.pool IS 'Tracks which emission curve bucket the award draws from. engagement_y1 (Y1=200M cap), engagement_y2 (150M), engagement_y3 (100M), engagement_y4 (50M). After Y4, fee_redistribution.';

CREATE INDEX IF NOT EXISTS staylo_points_user_id_idx  ON public.staylo_points (user_id);
CREATE INDEX IF NOT EXISTS staylo_points_action_idx   ON public.staylo_points (action);
CREATE INDEX IF NOT EXISTS staylo_points_pool_idx     ON public.staylo_points (pool);


-- View — running balance per user. Read-only, computed live; no drift.
CREATE OR REPLACE VIEW public.staylo_points_balance AS
SELECT
  user_id,
  SUM(amount)                                                  AS total_points,
  SUM(amount) FILTER (WHERE claimed_at IS NULL)                AS unclaimed_points,
  SUM(amount) FILTER (WHERE claimed_at IS NOT NULL)            AS claimed_points,
  COUNT(*) FILTER (WHERE amount > 0)                           AS award_count,
  MIN(awarded_at)                                              AS first_awarded_at,
  MAX(awarded_at)                                              AS last_awarded_at
FROM public.staylo_points
GROUP BY user_id;

COMMENT ON VIEW public.staylo_points_balance IS 'Live per-user balance. Surfaced in the guest app "My rewards" screen. Multiplied by $0.10 (TGE price) for the USD-equivalent display.';


-- ============================================================================
-- 7. award_staylo_points() — helper function for app + triggers
-- ============================================================================
-- Wrapper that consults the locked grid + writes the row. Idempotent via
-- the unique constraint — second call with same (user_id, action, ref_id)
-- returns the existing row id without inserting.
CREATE OR REPLACE FUNCTION public.award_staylo_points(
  p_user_id  uuid,
  p_action   text,
  p_ref_id   text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer;
  v_pool   text;
  v_id     uuid;
BEGIN
  -- Locked award grid (see migration header).
  v_amount := CASE p_action
    WHEN 'roommate_signup_via_qr'      THEN 100
    WHEN 'new_user_profile_verified'   THEN 50
    WHEN 'first_stay_completed'        THEN 50
    WHEN 'verified_review_posted'      THEN 50
    WHEN 'roommate_returns_own_book'   THEN 50
    WHEN 'hotelier_onboarded'          THEN 1000
    WHEN 'dao_vote_cast'               THEN 25
    ELSE NULL
  END;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;

  -- Pool selection by current emission year. Hardcoded for now; future
  -- iterations can compute this against a pool_emission_schedule table.
  v_pool := CASE
    WHEN now() < '2027-06-01'::timestamptz THEN 'engagement_y1'
    WHEN now() < '2028-06-01'::timestamptz THEN 'engagement_y2'
    WHEN now() < '2029-06-01'::timestamptz THEN 'engagement_y3'
    WHEN now() < '2030-06-01'::timestamptz THEN 'engagement_y4'
    ELSE 'fee_redistribution'
  END;

  INSERT INTO public.staylo_points (user_id, action, ref_id, amount, pool, metadata)
  VALUES (p_user_id, p_action, p_ref_id, v_amount, v_pool, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, action, ref_id) DO NOTHING
  RETURNING id INTO v_id;

  -- If we hit the conflict, fetch the existing id so the caller knows
  -- this was already processed (idempotent semantics).
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.staylo_points
    WHERE user_id = p_user_id AND action = p_action AND ref_id = p_ref_id;
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.award_staylo_points IS 'Idempotent helper for awarding engagement points. Locks the amount table-side so client/edge function code stays simple. Returns the staylo_points.id (new or existing).';


-- ============================================================================
-- 8. updated_at trigger — shared across the new tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_touch_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_touch_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS booking_guests_touch_updated_at ON public.booking_guests;
CREATE TRIGGER booking_guests_touch_updated_at
  BEFORE UPDATE ON public.booking_guests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 9. RLS — Row-Level Security policies
-- ============================================================================
-- Locked-down by default; clients must authenticate to read/write.

ALTER TABLE public.user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_guests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staylo_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_passport_rules ENABLE ROW LEVEL SECURITY;

-- user_profiles: owner can read/write their own row; hoteliers can read
-- the profile_snapshot of a guest staying at their property (via the
-- booking_guests join). Orphaned profiles (user_id IS NULL) only the
-- creator-lead can read until claimed.
CREATE POLICY user_profiles_self_read ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      -- Hoteliers can see profiles of guests staying with them
      SELECT 1 FROM public.booking_guests bg
      JOIN public.bookings b ON b.id = bg.booking_id
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE bg.profile_id = user_profiles.id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

CREATE POLICY user_profiles_self_write ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY user_profiles_self_update ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- booking_guests: the guest themselves OR the hotelier of that property
-- can read. Lead can write (insert roommates). Hotelier can update
-- checkin_status when processing arrivals.
CREATE POLICY booking_guests_read ON public.booking_guests
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = invited_by_user_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = booking_guests.booking_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

CREATE POLICY booking_guests_lead_insert ON public.booking_guests
  FOR INSERT WITH CHECK (
    -- The booking's user_id is the lead; only they can add roommates.
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_guests.booking_id
        AND b.user_id = auth.uid()
    )
    OR
    -- Or the hotelier can add guests during front-desk check-in
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = booking_guests.booking_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

CREATE POLICY booking_guests_hotelier_update ON public.booking_guests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.property_members pm ON pm.property_id = b.property_id
      WHERE b.id = booking_guests.booking_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

-- staylo_points: users see their own balance. The award function uses
-- SECURITY DEFINER so edge functions / triggers can write regardless
-- of caller. No direct INSERT/UPDATE policy — go through award_staylo_points().
CREATE POLICY staylo_points_self_read ON public.staylo_points
  FOR SELECT USING (auth.uid() = user_id);

-- country_passport_rules: everyone reads (it's reference data), only
-- service_role writes (admin curates).
CREATE POLICY country_passport_rules_public_read ON public.country_passport_rules
  FOR SELECT USING (true);


-- ============================================================================
-- 10. Storage bucket — passports (private)
-- ============================================================================
-- Created via the storage.buckets table directly so this migration is
-- self-contained. Hard-private: every read goes through a signed URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('passports', 'passports', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — the uploader can read; hoteliers can read photos of
-- their guests via the booking_guests → profile_id chain.
-- Policy text uses storage.foldername convention: {user_id}/{profile_id}/{file}
CREATE POLICY "passports owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'passports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "passports owner write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'passports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "passports owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'passports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Hoteliers reading guest passports — go through edge function with
-- service_role for now; doing this purely in SQL requires a join to
-- booking_guests which is non-trivial in storage policies. Defer to
-- edge function `passport-signed-url` in S2c.
