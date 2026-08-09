-- ============================================================================
-- 20260809000001_ship_bookings_full_unique
-- ============================================================================
-- Fixup for 20260809000000_ship_saas_foundation.
--
-- The parent migration created a PARTIAL unique index on
--   (hotel_id, source, external_id) WHERE external_id IS NOT NULL
--
-- Postgres CAN use partial unique indexes as ON CONFLICT targets in raw SQL,
-- but supabase-js `.upsert({ onConflict: 'a,b,c' })` compiles to a form that
-- requires a full (non-partial) unique constraint on the exact column set.
-- Result: the first inbound Postmark email failed with
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- Fix: drop the partial index, recreate as full. PostgreSQL NULL semantics
-- (NULL != NULL) still allow multiple rows with external_id=NULL for
-- direct/walkin bookings — no data-model regression. OTA rows with an
-- external_id continue to upsert correctly.
-- ============================================================================
DROP INDEX IF EXISTS public.ship_bookings_source_external_unique;

CREATE UNIQUE INDEX ship_bookings_source_external_unique
  ON public.ship_bookings(hotel_id, source, external_id);
