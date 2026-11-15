-- Public reading of real guest reviews for the OTA property page, replacing
-- the hard-coded FAKE_REVIEWS of src/pages/ota/PropertyDetail.jsx.
--
-- stay_reviews is readable by property staff and admins only (RLS). These two
-- SECURITY DEFINER functions expose the public-safe part:
--   get_property_reviews        latest reviews: first name + initial (or NULL
--                               when anonymous), text, rating /10, date
--   get_property_review_breakdown  averages per aspect /10 and the share of
--                               guests who would recommend
-- Reviews flagged needs_staylo_help (an open or past dispute) stay private:
-- no moderation flow exists yet, so a complaint is not published as a review.
-- Same /10 scale as get_property_rating_stats (1..5 average x 2).

CREATE OR REPLACE FUNCTION public.get_property_reviews(p_property_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE (
  id            uuid,
  reviewer_name text,
  review_text   text,
  rating        numeric,
  created_at    timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      sr.id,
      sr.is_anonymous,
      NULLIF(trim(sr.reviewer_name), '') AS raw_name,
      NULLIF(trim(sr.review_text), '')   AS review_text,
      (COALESCE(sr.cleanliness, 0) + COALESCE(sr.location, 0) + COALESCE(sr.vibe, 0)
       + COALESCE(sr.value, 0) + COALESCE(sr.service, 0))::numeric
      / NULLIF(
          (CASE WHEN sr.cleanliness IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN sr.location  IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN sr.vibe      IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN sr.value     IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN sr.service   IS NOT NULL THEN 1 ELSE 0 END), 0) AS avg_1to5,
      sr.created_at
    FROM public.stay_reviews sr
    JOIN public.bookings b ON b.id = sr.booking_id
    WHERE b.property_id = p_property_id
      AND sr.needs_staylo_help = false
  )
  SELECT
    id,
    CASE
      WHEN is_anonymous OR raw_name IS NULL THEN NULL
      ELSE split_part(raw_name, ' ', 1)
           || CASE WHEN split_part(raw_name, ' ', 2) <> '' THEN ' ' || left(split_part(raw_name, ' ', 2), 1) || '.' ELSE '' END
    END AS reviewer_name,
    review_text,
    ROUND(avg_1to5 * 2, 1) AS rating,
    created_at
  FROM scored
  WHERE review_text IS NOT NULL OR avg_1to5 IS NOT NULL
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_property_reviews(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_reviews(uuid, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_property_review_breakdown(p_property_id uuid)
RETURNS TABLE (
  cleanliness   numeric,
  location      numeric,
  vibe          numeric,
  value         numeric,
  service       numeric,
  recommend_pct numeric,
  review_count  bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(sr.cleanliness) * 2, 1),
    ROUND(AVG(sr.location)    * 2, 1),
    ROUND(AVG(sr.vibe)        * 2, 1),
    ROUND(AVG(sr.value)       * 2, 1),
    ROUND(AVG(sr.service)     * 2, 1),
    ROUND(100 * AVG(CASE WHEN sr.would_recommend THEN 1 WHEN sr.would_recommend = false THEN 0 END), 0),
    COUNT(*)::bigint
  FROM public.stay_reviews sr
  JOIN public.bookings b ON b.id = sr.booking_id
  WHERE b.property_id = p_property_id
    AND sr.needs_staylo_help = false;
$$;

REVOKE ALL ON FUNCTION public.get_property_review_breakdown(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_review_breakdown(uuid) TO anon, authenticated;
