-- ============================================
-- Migration: Add full property details columns
-- Date: 2026-04-18
-- Purpose: Align properties table with Submit.jsx form fields.
--          Previously ~15 form fields (description, amenities,
--          accessibility, attractions, address, lat/lng, etc.)
--          were collected but never persisted.
-- ============================================

ALTER TABLE public.properties
  -- Basic details
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS star_rating        integer CHECK (star_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS website            text,

  -- Location
  ADD COLUMN IF NOT EXISTS address            text,
  ADD COLUMN IF NOT EXISTS lat                decimal(10, 7),
  ADD COLUMN IF NOT EXISTS lng                decimal(10, 7),

  -- Operations
  ADD COLUMN IF NOT EXISTS check_in_time      text DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS check_out_time     text DEFAULT '12:00',

  -- Services & features (array columns)
  ADD COLUMN IF NOT EXISTS amenities          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessibility      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bed_types          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attractions        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages_spoken   text[] DEFAULT '{en}',

  -- Policies & notes
  ADD COLUMN IF NOT EXISTS special_requests   text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT 'flexible'
    CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict', 'non_refundable')),
  ADD COLUMN IF NOT EXISTS smoking_policy     text DEFAULT 'no_smoking'
    CHECK (smoking_policy IN ('no_smoking', 'smoking_allowed', 'designated_areas')),

  -- Media
  ADD COLUMN IF NOT EXISTS photo_urls         text[] DEFAULT '{}';

-- Helpful indexes for future dashboard queries
CREATE INDEX IF NOT EXISTS idx_properties_city        ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_country     ON public.properties(country);
CREATE INDEX IF NOT EXISTS idx_properties_star_rating ON public.properties(star_rating);
CREATE INDEX IF NOT EXISTS idx_properties_status      ON public.properties(status);

COMMENT ON COLUMN public.properties.amenities          IS 'Array of amenity keys (wifi, pool, spa, ...) — see Submit.jsx AMENITY_CATEGORIES';
COMMENT ON COLUMN public.properties.accessibility      IS 'Array of accessibility feature keys';
COMMENT ON COLUMN public.properties.attractions        IS 'Array of nearby-attraction keys';
COMMENT ON COLUMN public.properties.bed_types          IS 'Array of bed-type keys offered across rooms';
COMMENT ON COLUMN public.properties.languages_spoken   IS 'ISO-639-1 codes of languages spoken by staff';
