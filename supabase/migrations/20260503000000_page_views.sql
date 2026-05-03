-- ============================================================================
-- page_views — self-hosted visitor analytics (admin-only)
-- ============================================================================
-- Lightweight first-party analytics so we don't need Plausible / Vercel
-- Analytics / GA. Every public page navigation logs ONE row here. The
-- admin dashboard at /admin/analytics aggregates these into Today / Week /
-- Month / Year visitor counts.
--
-- Privacy:
--   - We DON'T store IP addresses (avoid PDPA / GDPR mess)
--   - We store a session_id (random per browser-session, not persistent)
--     so we can deduplicate "same person clicking 5 pages"
--   - user_id is set when the visitor is logged in (gives us "logged-in vs
--     anon" split for free)
--
-- RLS:
--   - INSERT: anyone (anon + authenticated). Required so cold visitors
--     can be tracked. Path is sanitised client-side (no query strings,
--     no fragments).
--   - SELECT: admins only — visitors should NEVER be able to query
--     traffic stats.
--
-- Volume estimate: 100 visitors/day × 5 page views = 500 rows/day = 180k
-- rows/year. Tiny. We can keep raw for ~2 years before considering
-- materialised views or partitioning.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id          BIGSERIAL PRIMARY KEY,
  path        TEXT NOT NULL,                       -- e.g. "/", "/vision", "/community"
  referrer    TEXT,                                -- where the visitor came from (incoming traffic source)
  session_id  TEXT NOT NULL,                       -- random per-browser-session id (dedup)
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device      TEXT,                                -- 'mobile' | 'tablet' | 'desktop' (parsed from UA client-side)
  language    TEXT,                                -- e.g. 'en', 'fr', 'th' (navigator.language)
  country     TEXT,                                -- 2-letter ISO code (later: from Vercel header or IP geolocation)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the aggregation queries the admin dashboard does
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_idx       ON public.page_views (path);
CREATE INDEX IF NOT EXISTS page_views_session_idx    ON public.page_views (session_id);
CREATE INDEX IF NOT EXISTS page_views_user_idx       ON public.page_views (user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon visitors) can insert their own page view
DROP POLICY IF EXISTS page_views_insert_any ON public.page_views;
CREATE POLICY page_views_insert_any ON public.page_views
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read the data
DROP POLICY IF EXISTS page_views_select_admin ON public.page_views;
CREATE POLICY page_views_select_admin ON public.page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE  public.page_views IS 'First-party visitor analytics — admin-only.';
COMMENT ON COLUMN public.page_views.session_id IS 'Random per-browser-session id (regenerated each tab open) — used for unique visitor dedup. NOT a persistent tracker.';
