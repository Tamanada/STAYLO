-- ============================================================================
-- prospects — outreach CRM for hoteliers we want to invite to STAYLO
-- ============================================================================
-- Source data comes from staylo_tat_collector.py (OSM Overpass for now;
-- TAT API later if/when their account gets unblocked). The collector
-- produces JSON which is upserted into this table by the ingest script
-- C:\Users\David\staylo_ingest_prospects.py.
--
-- This is internal CRM data — admins only, never exposed to hoteliers
-- or guests. RLS policy enforces admin-only access.
--
-- Status lifecycle:
--   new            — just imported, not contacted
--   contacted      — outreach email sent (manually marked or via webhook)
--   replied        — they replied (positive or negative)
--   meeting_set    — call/visit scheduled
--   signed_up      — they created a STAYLO account (linked via converted_user_id)
--   not_interested — politely declined
--   unreachable    — bounced / no response after multiple tries
--   blacklisted    — do not contact again
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable identifier from the source — `osm_node_12345` or TAT place_id.
  -- UNIQUE so re-running the ingest is idempotent (upsert by source_place_id).
  source_place_id text NOT NULL UNIQUE,
  source          text NOT NULL CHECK (source IN ('osm', 'tat', 'manual', 'referral')),

  -- Display fields
  name_en         text,
  name_th         text,
  category        text,                  -- hotel | hostel | guest_house | resort | ...

  -- Location
  district        text,
  province        text,
  latitude        numeric,
  longitude       numeric,

  -- Contact
  email           text,
  phone           text,
  website         text,
  facebook        text,

  -- CRM state
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN (
                    'new', 'contacted', 'replied', 'meeting_set',
                    'signed_up', 'not_interested', 'unreachable', 'blacklisted'
                  )),
  notes           text,                              -- free-form admin notes
  contacted_at    timestamptz,                       -- last outreach
  contact_count   int NOT NULL DEFAULT 0,            -- # of times we tried
  next_follow_up  date,                              -- reminder for the admin

  -- Conversion link — set when they sign up on STAYLO
  converted_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  converted_at    timestamptz,

  -- Audit
  imported_at     timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  imported_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  raw             jsonb                              -- full row from collector for ref
);

-- Useful indexes for the admin UI
CREATE INDEX IF NOT EXISTS prospects_status_idx       ON public.prospects (status);
CREATE INDEX IF NOT EXISTS prospects_province_idx     ON public.prospects (province);
CREATE INDEX IF NOT EXISTS prospects_category_idx     ON public.prospects (category);
CREATE INDEX IF NOT EXISTS prospects_email_idx        ON public.prospects (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_converted_idx    ON public.prospects (converted_user_id) WHERE converted_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_followup_idx     ON public.prospects (next_follow_up) WHERE next_follow_up IS NOT NULL;

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.prospects_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospects_touch ON public.prospects;
CREATE TRIGGER trg_prospects_touch
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.prospects_touch_updated_at();

-- ============================================================================
-- RLS — admins only. Hoteliers and guests should never see this table.
-- ============================================================================
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prospects_admin_all ON public.prospects;
CREATE POLICY prospects_admin_all ON public.prospects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid()
         AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid()
         AND role = 'admin'
    )
  );

-- ============================================================================
-- Auto-link conversion: when a new user signs up with an email that matches
-- a prospect, mark the prospect as 'signed_up' and link converted_user_id.
-- This is the "did our outreach actually convert them?" attribution loop.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.link_prospect_on_signup()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.prospects
       SET converted_user_id = NEW.id,
           converted_at      = now(),
           status            = 'signed_up'
     WHERE lower(email) = lower(NEW.email)
       AND converted_user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_link_prospect_on_signup ON public.users;
CREATE TRIGGER trg_link_prospect_on_signup
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.link_prospect_on_signup();

COMMENT ON TABLE  public.prospects IS 'Internal hotelier outreach CRM — admin-only.';
COMMENT ON COLUMN public.prospects.source_place_id IS 'Stable id from source (e.g. osm_node_12345) — used for idempotent upserts.';
COMMENT ON COLUMN public.prospects.converted_user_id IS 'Set automatically when a user signs up with a matching email.';
