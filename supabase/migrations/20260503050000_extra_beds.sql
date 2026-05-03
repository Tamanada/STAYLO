-- ============================================================================
-- Extra bed support — for kids beyond a room's standard capacity
-- ============================================================================
-- A "Super King · 3 guests" room can sometimes accommodate a small child
-- on a roll-away bed for an extra fee. The walk-in form was letting
-- receptionists type "4 adults" into a 3-guest room (no cap), and there
-- was no way for the hotelier to declare "I do offer 1 extra bed at $15/
-- night for kids up to 10 years old".
--
-- This migration adds:
--   - 4 columns on rooms: opt-in toggle, max qty, price, max age
--   - 2 columns on bookings: how many extra beds, what they cost
--
-- Walk-in form caps adults at room.max_guests and surfaces the extra-bed
-- input only when the room offers them.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS extra_bed_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_bed_max_qty   INT     NOT NULL DEFAULT 1
    CHECK (extra_bed_max_qty BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS extra_bed_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS extra_bed_max_age   INT     NOT NULL DEFAULT 10
    CHECK (extra_bed_max_age BETWEEN 0 AND 17);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS extra_beds_count    INT     NOT NULL DEFAULT 0
    CHECK (extra_beds_count >= 0),
  ADD COLUMN IF NOT EXISTS extra_bed_subtotal  NUMERIC(10,2) NOT NULL DEFAULT 0
    CHECK (extra_bed_subtotal >= 0);

COMMENT ON COLUMN public.rooms.extra_bed_available IS
  'Does this room type offer extra beds (typically a roll-away for a child)?';
COMMENT ON COLUMN public.rooms.extra_bed_max_qty IS
  'Max number of extra beds that physically fit in the room. 1 = one roll-away.';
COMMENT ON COLUMN public.rooms.extra_bed_price IS
  'Per-night price for one extra bed in USD. NULL = free (rare but allowed).';
COMMENT ON COLUMN public.rooms.extra_bed_max_age IS
  'Max child age allowed on an extra bed. Default 10. Adults need a separate room.';

COMMENT ON COLUMN public.bookings.extra_beds_count IS
  'Number of extra beds added to this booking (charged per night).';
COMMENT ON COLUMN public.bookings.extra_bed_subtotal IS
  'extra_beds_count × nights × room.extra_bed_price at time of booking. Locked even if hotelier later changes the price.';
