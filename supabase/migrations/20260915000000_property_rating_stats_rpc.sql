-- Aggregated review stats per property, exposed to anon browsers via
-- a SECURITY DEFINER RPC so we don't have to open stay_reviews itself
-- to unauthenticated reads (individual reviews stay privacy-scoped).
--
-- Scale conversion: each of the 5 aspects (cleanliness, location,
-- vibe, value, service) is a 1 to 5 star integer. We average across
-- ALL non-null aspects across ALL reviews for a property, then scale
-- to a /10 number so the frontend can render "8.4" like the current
-- hardcoded "8.5" placeholder. Round to 1 decimal.
--
-- Function accepts an array of property_ids so the search page can
-- fetch stats for the full result set in a single round-trip. Empty
-- input returns zero rows (not an error) so the caller can safely
-- pass whatever they have without a guard.

CREATE OR REPLACE FUNCTION public.get_property_rating_stats(p_property_ids uuid[])
RETURNS TABLE (property_id uuid, review_count bigint, avg_rating numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH per_review AS (
    SELECT
      b.property_id,
      sr.id,
      (
        COALESCE(sr.cleanliness, 0)
        + COALESCE(sr.location, 0)
        + COALESCE(sr.vibe, 0)
        + COALESCE(sr.value, 0)
        + COALESCE(sr.service, 0)
      )::numeric
      / NULLIF(
        (CASE WHEN sr.cleanliness IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN sr.location    IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN sr.vibe        IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN sr.value       IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN sr.service     IS NOT NULL THEN 1 ELSE 0 END),
        0
      ) AS review_avg_1to5
    FROM public.stay_reviews sr
    JOIN public.bookings b ON b.id = sr.booking_id
    WHERE b.property_id = ANY(p_property_ids)
  )
  SELECT
    property_id,
    COUNT(*)::bigint AS review_count,
    ROUND(AVG(review_avg_1to5) * 2, 1) AS avg_rating
  FROM per_review
  WHERE review_avg_1to5 IS NOT NULL
  GROUP BY property_id;
$$;

REVOKE ALL ON FUNCTION public.get_property_rating_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_rating_stats(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_property_rating_stats(uuid[]) IS
  'Aggregated review count and average rating (scale 0 to 10) per property. SECURITY DEFINER so anon browsers can read stats without direct access to stay_reviews rows (privacy).';

NOTIFY pgrst, 'reload schema';
