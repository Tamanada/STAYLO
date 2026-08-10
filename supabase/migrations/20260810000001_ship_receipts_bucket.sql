-- ============================================================================
-- 20260810000001_ship_receipts_bucket
-- ============================================================================
-- Storage bucket + RLS for SHIP receipt photos and bank-transfer proofs.
--
-- Why: ship.html originally stored expense photos as base64 data URLs in
-- localStorage. Each downscaled JPEG was 150-400 KB → the 5-10 MB browser
-- quota tripped after ~5-8 receipts and blocked further saves. Photos now
-- upload to this bucket and only the returned URL persists in the expense
-- row, which is a short string that fits forever.
--
-- Path convention (enforced client-side, not by RLS):
--   <hotel_slug>/<yyyy-mm>/receipt-<uuid>.jpg
--   <hotel_slug>/<yyyy-mm>/proof-<uuid>.jpg
--
-- Security posture:
--   · public=true so <img src="…"> works without auth headers
--   · URL contains a UUID → hard to enumerate, same pattern as Google
--     Photos share links / Postmark inbound tokens
--   · Uploads restricted to authenticated users (hotel members log in
--     through the SHIP standalone signup); anon can only GET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ship-receipts', 'ship-receipts', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='ship_receipts_insert_authenticated'
  ) THEN
    CREATE POLICY ship_receipts_insert_authenticated
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'ship-receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='ship_receipts_public_read'
  ) THEN
    CREATE POLICY ship_receipts_public_read
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'ship-receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='ship_receipts_delete_authenticated'
  ) THEN
    CREATE POLICY ship_receipts_delete_authenticated
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'ship-receipts');
  END IF;
END $$;
