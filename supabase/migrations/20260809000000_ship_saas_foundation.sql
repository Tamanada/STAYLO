-- ============================================================================
-- 20260809000000_ship_saas_foundation
-- ============================================================================
-- Foundation for SHIP as a standalone SaaS product ($49/mo).
--
-- Context (see project memory `project_staylo_full_business.md` and the SHIP
-- spinoff discussion 2026-08-08):
--   · STAYLO's existing `properties` + `bookings` tables serve the COOPERATIVE
--     platform (founding partners, 10% commission for life, shares, DAO).
--   · SHIP standalone is a DIFFERENT business model — pure SaaS, subscription,
--     no coop equity. Its customers ("SHIP hoteliers") are strictly distinct
--     from STAYLO's coop members ("Founding Partners").
--   · A user can eventually be both (a SHIP customer who later joins the coop)
--     but the DB must not confuse the two identities.
--
-- Naming convention: EVERY table this migration creates is prefixed `ship_*`.
-- This is deliberate — when SHIP eventually moves to its own Supabase project
-- (target: post $10k MRR), the migration becomes a single-line export:
--   pg_dump --table='public.ship_*' → import into new project. Done.
--
-- What's here:
--   1. ship_hotels             — one row per SHIP-subscribed property
--   2. ship_hotel_members      — owners + managers (login-capable)
--   3. ship_hotel_invitations  — pending manager/owner invites (token-based)
--   4. ship_bookings           — reservations (imported from OTAs OR direct)
--   5. ship_email_events       — raw Postmark webhook log (audit + debug)
--   6. RLS policies            — hotel-scoped; owner has admin, members read/write
--   7. Helper functions        — slug generation, membership check
-- ============================================================================


-- ============================================================================
-- Helper: slug generation for ship_hotels
-- ============================================================================
-- Used by the signup flow to produce a URL-safe unique tag per hotel, which
-- becomes the sub-address token for inbound email routing:
--     bookings+<slug>@app.ship.app
-- Slugs are lowercase kebab-case, alphanumeric + dashes only, max 40 chars.
-- Deduplication is handled by the caller (retry with -2, -3 suffix on conflict).
CREATE OR REPLACE FUNCTION public.ship_slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  s := lower(coalesce(input, ''));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := substring(s from 1 for 40);
  IF s = '' THEN s := 'hotel'; END IF;
  RETURN s;
END;
$$;


-- ============================================================================
-- 1. ship_hotels — the SHIP-subscribed property
-- ============================================================================
-- Subscription lifecycle:
--   · trial       — 14-day free, no CC required
--   · active      — paid subscription
--   · past_due    — payment failed, grace period
--   · cancelled   — user or admin cancelled, read-only mode until data purge
--   · suspended   — admin-forced (fraud, ToS violation)
--
-- property_type_* is redundant (main + sub + custom) so downstream analytics
-- can group by main category without joining a lookup table. `custom` is
-- populated only when sub = 'custom' (see PropertyTypePicker.jsx).
CREATE TABLE IF NOT EXISTS public.ship_hotels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  name                  text NOT NULL,

  -- Location + locale
  country               text NOT NULL,          -- ISO 3166-1 alpha-2 ("TH", "FR")
  city                  text,
  currency              text NOT NULL,          -- ISO 4217 ("THB", "USD")
  timezone              text NOT NULL,          -- IANA ("Asia/Bangkok")

  -- Property classification (from PropertyTypePicker)
  property_type_main    text NOT NULL,          -- "hotel", "resort", "homes", ...
  property_type_sub     text NOT NULL,          -- "boutique_hotel", "beach_resort", ...
  property_type_custom  text,                   -- populated only when sub='custom'

  -- Subscription
  subscription_status   text NOT NULL DEFAULT 'trial'
                          CHECK (subscription_status IN
                            ('trial','active','past_due','cancelled','suspended')),
  trial_ends_at         timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  subscription_ends_at  timestamptz,            -- when paid sub expires
  stripe_customer_id    text,                   -- linked when they add a card
  stripe_subscription_id text,

  -- Audit
  created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ship_hotels_created_by_idx
  ON public.ship_hotels(created_by);
CREATE INDEX IF NOT EXISTS ship_hotels_subscription_status_idx
  ON public.ship_hotels(subscription_status);
CREATE INDEX IF NOT EXISTS ship_hotels_trial_ends_at_idx
  ON public.ship_hotels(trial_ends_at)
  WHERE subscription_status = 'trial';


-- ============================================================================
-- 2. ship_hotel_members — owners + managers with login
-- ============================================================================
-- Roles:
--   · owner    — full admin, billing, can invite/remove others
--   · manager  — daily operations, cannot delete hotel or manage billing
--
-- Non-login staff (waiters, housekeeping) are represented by `ship_staff`
-- records added later in commit 6 (invitation flow) — those don't sit in this
-- table because they don't have auth.users rows.
--
-- A hotel MUST have exactly one 'owner' at any time (enforced by app logic
-- during transfer/deletion; not a DB constraint since transfers are atomic
-- transactions that briefly touch two rows).
CREATE TABLE IF NOT EXISTS public.ship_hotel_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.ship_hotels(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner','manager')),
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','suspended')),
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at    timestamptz,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, user_id)
);

CREATE INDEX IF NOT EXISTS ship_hotel_members_user_id_idx
  ON public.ship_hotel_members(user_id);
CREATE INDEX IF NOT EXISTS ship_hotel_members_hotel_id_idx
  ON public.ship_hotel_members(hotel_id);


-- ============================================================================
-- 3. ship_hotel_invitations — pending invites (token-based)
-- ============================================================================
-- Flow:
--   1. Owner clicks "Invite manager" in SHIP → provides email + role
--   2. Row created here with a random token, expires_at = now() + 7 days
--   3. Email sent with link https://app.ship.app/join?token=<token>
--   4. Invitee clicks → login OR signup with that email → auto-linked
--   5. accepted_at populated + ship_hotel_members row inserted (transaction)
--
-- Constraint: only ONE pending invite per (hotel_id, email) at a time.
-- Re-invite = update expires_at + regenerate token.
CREATE TABLE IF NOT EXISTS public.ship_hotel_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.ship_hotels(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL CHECK (role IN ('owner','manager')),
  token         text NOT NULL UNIQUE,
  invited_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enforce single pending invite per (hotel, email) — index on WHERE accepted_at IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS ship_hotel_invitations_pending_unique
  ON public.ship_hotel_invitations(hotel_id, lower(email))
  WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS ship_hotel_invitations_token_idx
  ON public.ship_hotel_invitations(token);


-- ============================================================================
-- 4. ship_bookings — reservations (imported OR direct)
-- ============================================================================
-- Sources:
--   · booking_com       — parsed from Booking.com inbound emails (Postmark)
--   · expedia           — same, Expedia partner emails
--   · agoda             — same
--   · airbnb            — same OR iCal sync
--   · direct            — hotelier entered manually
--   · walkin            — guest showed up without booking
--   · other             — future OTAs / channel manager sync
--
-- Deduplication: (hotel_id, source, external_id) is unique when external_id
-- is not null. This lets the same booking arrive multiple times (new,
-- modification, reminder) and get upserted instead of duplicated.
--
-- nights is a generated column so app code never has to compute it.
CREATE TABLE IF NOT EXISTS public.ship_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          uuid NOT NULL REFERENCES public.ship_hotels(id) ON DELETE CASCADE,

  -- Source + external tracking
  source            text NOT NULL
                      CHECK (source IN ('booking_com','expedia','agoda','airbnb',
                                        'direct','walkin','other')),
  external_id       text,                        -- OTA's booking number

  -- Guest identity (minimal — full profile lives in ship_guests, added later)
  guest_name        text NOT NULL,
  guest_email       text,
  guest_phone       text,
  guest_country     text,                        -- ISO alpha-2

  -- Stay
  check_in          date NOT NULL,
  check_out         date NOT NULL,
  nights            int GENERATED ALWAYS AS ((check_out - check_in)) STORED,
  room_type         text,
  room_number       text,                        -- assigned at check-in
  guests_count      int NOT NULL DEFAULT 1 CHECK (guests_count >= 1),

  -- Pricing
  total_price       numeric(12,2),
  currency          text,                        -- ISO 4217, may differ from hotel default
  commission_amount numeric(12,2),               -- OTA commission (informational)

  -- State machine
  status            text NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed','modified','cancelled',
                                        'no_show','checked_in','checked_out')),

  -- Raw payload for debugging (jsonb, unindexed)
  raw_data          jsonb,

  -- Audit
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CHECK (check_out > check_in)
);

-- Deduplication constraint (partial: only when external_id present)
-- NOTE: superseded by 20260809000001_ship_bookings_full_unique.sql because
-- partial indexes can't be used as ON CONFLICT targets by supabase-js.
CREATE UNIQUE INDEX IF NOT EXISTS ship_bookings_source_external_unique
  ON public.ship_bookings(hotel_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ship_bookings_hotel_id_idx
  ON public.ship_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS ship_bookings_check_in_idx
  ON public.ship_bookings(hotel_id, check_in);
CREATE INDEX IF NOT EXISTS ship_bookings_status_idx
  ON public.ship_bookings(hotel_id, status);


-- ============================================================================
-- 5. ship_email_events — raw Postmark inbound webhook log
-- ============================================================================
-- Every email hitting bookings+<slug>@app.ship.app gets a row here, BEFORE
-- parsing. This is our audit + debug + replay layer.
--
-- parse_status transitions:
--   · pending  — just received, awaiting parser
--   · parsed   — booking row created/updated (booking_id populated)
--   · failed   — parser couldn't extract data (parse_error populated)
--   · ignored  — spam, admin email, wrong sender (skipped intentionally)
--
-- We keep raw_payload forever (unless GDPR delete requested) so we can:
--   · Replay failed parses after fixing the parser
--   · Debug edge cases with real production emails
--   · Train the Claude Haiku fallback with real examples
CREATE TABLE IF NOT EXISTS public.ship_email_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Routing (extracted from To: field)
  hotel_slug      text,                         -- may be NULL if malformed
  hotel_id        uuid REFERENCES public.ship_hotels(id) ON DELETE SET NULL,

  -- Envelope summary (indexed)
  source_email    text NOT NULL,                -- From address
  subject         text,
  received_at     timestamptz NOT NULL DEFAULT now(),

  -- Full payload (Postmark JSON)
  raw_payload     jsonb NOT NULL,

  -- Parse outcome
  parse_status    text NOT NULL DEFAULT 'pending'
                    CHECK (parse_status IN ('pending','parsed','failed','ignored')),
  parse_error     text,
  parsed_at       timestamptz,
  booking_id      uuid REFERENCES public.ship_bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ship_email_events_hotel_id_idx
  ON public.ship_email_events(hotel_id);
CREATE INDEX IF NOT EXISTS ship_email_events_parse_status_idx
  ON public.ship_email_events(parse_status);
CREATE INDEX IF NOT EXISTS ship_email_events_received_at_idx
  ON public.ship_email_events(received_at DESC);


-- ============================================================================
-- 6. Helper functions for RLS
-- ============================================================================

-- is_ship_hotel_member(hotel_id) — TRUE if current user is an active member
CREATE OR REPLACE FUNCTION public.is_ship_hotel_member(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ship_hotel_members
    WHERE hotel_id = p_hotel_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- is_ship_hotel_owner(hotel_id) — TRUE if current user is the owner
CREATE OR REPLACE FUNCTION public.is_ship_hotel_owner(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ship_hotel_members
    WHERE hotel_id = p_hotel_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  );
$$;


-- ============================================================================
-- 7. Row-Level Security
-- ============================================================================
ALTER TABLE public.ship_hotels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ship_hotel_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ship_hotel_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ship_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ship_email_events       ENABLE ROW LEVEL SECURITY;

-- ── ship_hotels ──────────────────────────────────────────────────────────
-- Any active member can SELECT their hotel; only owner can UPDATE/DELETE.
-- INSERT is open to authenticated users (creating your own hotel).
CREATE POLICY ship_hotels_select
  ON public.ship_hotels FOR SELECT
  USING (public.is_ship_hotel_member(id));

CREATE POLICY ship_hotels_insert
  ON public.ship_hotels FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY ship_hotels_update
  ON public.ship_hotels FOR UPDATE
  USING (public.is_ship_hotel_owner(id))
  WITH CHECK (public.is_ship_hotel_owner(id));

CREATE POLICY ship_hotels_delete
  ON public.ship_hotels FOR DELETE
  USING (public.is_ship_hotel_owner(id));

-- ── ship_hotel_members ───────────────────────────────────────────────────
-- Members can see their own hotel's roster; only owner can modify.
CREATE POLICY ship_hotel_members_select
  ON public.ship_hotel_members FOR SELECT
  USING (public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_hotel_members_insert
  ON public.ship_hotel_members FOR INSERT
  WITH CHECK (
    public.is_ship_hotel_owner(hotel_id)
    OR user_id = auth.uid()  -- self-insert during signup (owner creates hotel + self as owner)
  );

CREATE POLICY ship_hotel_members_update
  ON public.ship_hotel_members FOR UPDATE
  USING (public.is_ship_hotel_owner(hotel_id));

CREATE POLICY ship_hotel_members_delete
  ON public.ship_hotel_members FOR DELETE
  USING (public.is_ship_hotel_owner(hotel_id));

-- ── ship_hotel_invitations ───────────────────────────────────────────────
-- Only owner can create/see invites; anyone with the token can validate it
-- (validation goes through an Edge Function, not direct SELECT).
CREATE POLICY ship_hotel_invitations_select
  ON public.ship_hotel_invitations FOR SELECT
  USING (public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_hotel_invitations_insert
  ON public.ship_hotel_invitations FOR INSERT
  WITH CHECK (public.is_ship_hotel_owner(hotel_id));

CREATE POLICY ship_hotel_invitations_delete
  ON public.ship_hotel_invitations FOR DELETE
  USING (public.is_ship_hotel_owner(hotel_id));

-- ── ship_bookings ────────────────────────────────────────────────────────
-- Active members can CRUD their hotel's bookings.
CREATE POLICY ship_bookings_select
  ON public.ship_bookings FOR SELECT
  USING (public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_bookings_insert
  ON public.ship_bookings FOR INSERT
  WITH CHECK (public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_bookings_update
  ON public.ship_bookings FOR UPDATE
  USING (public.is_ship_hotel_member(hotel_id));

CREATE POLICY ship_bookings_delete
  ON public.ship_bookings FOR DELETE
  USING (public.is_ship_hotel_owner(hotel_id));

-- ── ship_email_events ────────────────────────────────────────────────────
-- Members can view their hotel's email log (for debugging "why didn't my
-- booking show up?"). INSERT/UPDATE is service-role only (Edge Function).
CREATE POLICY ship_email_events_select
  ON public.ship_email_events FOR SELECT
  USING (
    hotel_id IS NOT NULL AND public.is_ship_hotel_member(hotel_id)
  );

-- (No INSERT/UPDATE/DELETE policies → only service_role can write, which is
--  correct: the Postmark webhook Edge Function uses the service role key.)


-- ============================================================================
-- 8. updated_at auto-touch triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ship_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ship_hotels_touch_updated_at
  BEFORE UPDATE ON public.ship_hotels
  FOR EACH ROW EXECUTE FUNCTION public.ship_touch_updated_at();

CREATE TRIGGER ship_bookings_touch_updated_at
  BEFORE UPDATE ON public.ship_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ship_touch_updated_at();


-- ============================================================================
-- Grants (Supabase defaults + explicit for the RLS-protected tables)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ship_hotels             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ship_hotel_members      TO authenticated;
GRANT SELECT, INSERT,         DELETE ON public.ship_hotel_invitations  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ship_bookings           TO authenticated;
GRANT SELECT                         ON public.ship_email_events       TO authenticated;

-- Service role (Edge Functions) needs full access to ship_email_events
GRANT ALL ON public.ship_email_events TO service_role;
