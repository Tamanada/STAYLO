-- rooms.monthly_min_nights was NOT NULL DEFAULT 28. The room edit form
-- writes NULL when the "long-stay rates" toggle is OFF (mirrors the
-- shape of `monthly_rate`, which is nullable and means "not
-- configured"). Every Save with long-stay disabled crashed with:
--   null value in column "monthly_min_nights" violates not-null constraint
--
-- Make the column nullable so NULL = "long-stay is not configured on
-- this room". The DEFAULT 28 stays for INSERTs that don't specify the
-- column (some seed scripts) but existing NOT NULL enforcement was
-- fighting the form's semantics.
ALTER TABLE public.rooms
  ALTER COLUMN monthly_min_nights DROP NOT NULL;

COMMENT ON COLUMN public.rooms.monthly_min_nights IS
  'Minimum nights required to unlock monthly_rate. NULL = long-stay not configured on this room (pair with monthly_rate NULL). DEFAULT 28 applies only when INSERT omits the column.';

NOTIFY pgrst, 'reload schema';
