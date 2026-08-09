-- ============================================================================
-- 20260809000002_ship_create_hotel_rpc
-- ============================================================================
-- The signup wizard's Step 3 was hitting "new row violates row-level security
-- policy" when calling ship_hotels.insert() from the browser, even though the
-- caller had a valid session and was passing created_by = auth.uid(). Root
-- cause is JWT context timing during freshly-confirmed accounts — Postgrest
-- occasionally sees a stale/missing role claim right after email confirmation.
--
-- Fix: move hotel + owner-membership creation into a SECURITY DEFINER RPC that:
--   · Checks auth.uid() server-side (still enforces auth)
--   · Inserts ship_hotels + ship_hotel_members in one transaction
--   · Handles slug collision with -2/-3 suffix (up to 10 attempts)
--   · Returns (hotel_id, slug) for the client to advance
--
-- The RLS INSERT policy on ship_hotels stays in place as a defence-in-depth
-- layer for any code path that does client-side inserts.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_ship_hotel(
  p_name                 text,
  p_country              text,
  p_city                 text,
  p_currency             text,
  p_timezone             text,
  p_property_type_main   text,
  p_property_type_sub    text,
  p_property_type_custom text DEFAULT NULL
)
RETURNS TABLE(hotel_id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_base_slug text := public.ship_slugify(p_name);
  v_slug      text := v_base_slug;
  v_attempt   int  := 0;
  v_hotel_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'hotel name too short' USING errcode = '22023';
  END IF;

  LOOP
    BEGIN
      INSERT INTO public.ship_hotels
        (slug, name, country, city, currency, timezone,
         property_type_main, property_type_sub, property_type_custom, created_by)
      VALUES
        (v_slug, p_name, p_country, p_city, p_currency, p_timezone,
         p_property_type_main, p_property_type_sub, p_property_type_custom, v_uid)
      RETURNING id INTO v_hotel_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_attempt := v_attempt + 1;
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'could not generate unique slug for %', p_name;
        END IF;
        v_slug := v_base_slug || '-' || (v_attempt + 1)::text;
    END;
  END LOOP;

  INSERT INTO public.ship_hotel_members (hotel_id, user_id, role, joined_at)
  VALUES (v_hotel_id, v_uid, 'owner', now());

  RETURN QUERY SELECT v_hotel_id, v_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ship_hotel(text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ship_hotel(text,text,text,text,text,text,text,text) TO authenticated;
