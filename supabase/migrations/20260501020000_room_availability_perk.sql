-- ============================================================================
-- room_availability.perk — value-add description shown to guests
-- ============================================================================
-- STAYLO philosophy: instead of pushing hoteliers into a race-to-the-bottom
-- discount war, encourage them to ADD VALUE. The `perk` field stores a
-- free-text description of what the guest gets EXTRA on top of the room
-- (e.g. "Free breakfast for 2 + welcome cocktail").
--
-- This is independent from promo_pct (which stays for honest discount cases
-- like low-season or mid-week off-peak) and from price_override (which can
-- adjust the rate up OR down based on real demand like Full Moon Party).
--
-- The result: a hotelier can offer a "Christmas Special" with perk = dinner
-- included AND a normal price — without slashing margins.
-- ============================================================================

ALTER TABLE public.room_availability
  ADD COLUMN IF NOT EXISTS perk text;

COMMENT ON COLUMN public.room_availability.perk IS
  'Free inclusion / experience description shown to guests as a value-add (e.g. "🍳 Free breakfast for 2 + welcome drink"). NULL = no perk. Independent from promo_pct (discount).';
