// ============================================================================
// promoCatalog.js — pre-defined Rewards & Special Rates for STAYLO hoteliers
// ============================================================================
// Philosophy: prefer ADDING VALUE (rewards) over CUTTING PRICE (discounts).
// The hotelier-facing modal lets them pick from this catalog so labels are
// consistent across listings (translatable, filterable, brand-aligned).
//
// Each REWARD entry produces:
//   { promo_label: '🍳 Christmas Special', perk: 'Christmas dinner included' }
//
// Each DISCOUNT entry produces:
//   { promo_label: '🍂 Low Season Rate', promo_pct: 25 }
//
// Both can coexist on the same day (rare but valid: low-season Christmas).
// ============================================================================

export const REWARD_CATEGORIES = [
  {
    key: 'inclusions',
    icon: '🎁',
    label: 'Free Inclusions',
    desc: 'Add value with free perks — no price discount needed',
    options: [
      { label: '🍳 Free breakfast for 2',          perk: 'Free breakfast for 2 included' },
      { label: '✈️ Free airport pickup',            perk: 'Free airport pickup on arrival' },
      { label: '💆 Free spa session (30 min)',      perk: 'Free 30-minute spa session per stay' },
      { label: '🍹 Welcome cocktail',               perk: 'Welcome cocktail on arrival' },
      { label: '🛏️ Free room upgrade (subject to availability)', perk: 'Free room upgrade subject to availability' },
      { label: '🕒 Late check-out (until 4pm)',     perk: 'Late check-out until 4pm' },
      { label: '🌅 Early check-in (from 11am)',     perk: 'Early check-in from 11am' },
    ],
  },
  {
    key: 'experiences',
    icon: '✨',
    label: 'Exclusive Experiences',
    desc: 'Memorable moments that make your property unique',
    options: [
      { label: '🌅 Sunset boat trip',           perk: 'Sunset boat trip included' },
      { label: '👨‍🍳 Cooking class with the chef', perk: 'Cooking class with the chef included' },
      { label: '🧘 Sunrise yoga session',        perk: 'Sunrise yoga session included' },
      { label: '🗺️ Half-day local guide',         perk: 'Half-day local guide included' },
      { label: '🎨 Visit local artist studios',  perk: 'Guided visit to local artist studios' },
    ],
  },
  {
    key: 'local_events',
    icon: '🎊',
    label: 'Local Events',
    desc: 'Tag dates around major local events (Full Moon, festivals…)',
    options: [
      { label: '🌕 Full Moon Party',              perk: 'Free shuttle to Haad Rin + recovery breakfast next morning', minStay: 3 },
      { label: '🌖 Half Moon Party',              perk: 'Free shuttle to the venue',                                    minStay: 2 },
      { label: '🌑 Black Moon Party',             perk: 'Free shuttle to the venue',                                    minStay: 2 },
      { label: '🛕 Songkran (Thai New Year)',      perk: 'Welcome water blessing + Thai snacks',                         minStay: 3 },
      { label: '🎵 Music Festival nearby',        perk: 'Festival shuttle + late check-out next day' },
      { label: '🌊 Beach Festival',               perk: 'Beach mat + cooler bag included' },
      { label: '🎪 Local Cultural Event',         perk: 'Insider info + transport tips from your host' },
    ],
  },
  {
    key: 'audience',
    icon: '👥',
    label: 'Audience-Specific',
    desc: 'Target a specific traveler profile',
    options: [
      { label: '👨‍👩‍👧 Family Welcome',     perk: 'Kids menu + crib/cot included' },
      { label: '💑 Couples Retreat',         perk: 'Romantic turn-down service' },
      { label: '💍 Honeymoon Package',       perk: 'Bottle of wine + flowers in room' },
      { label: '💼 Digital Nomad',            perk: 'Fast WiFi + dedicated desk + coffee on tap' },
      { label: '🧘 Wellness Seeker',          perk: '1 yoga session per stay' },
      { label: '🧗 Adventure Traveler',       perk: 'Free kayak / bike rental' },
      { label: '🌟 Returning Guest',          perk: 'Welcome bottle on arrival' },
    ],
  },
  {
    key: 'staylo_perks',
    icon: '🪙',
    label: 'STAYLO Member Perks',
    desc: 'Exclusive to the cooperative',
    options: [
      { label: '🪙 2× $STAY tokens',                 perk: '2× $STAY tokens earned for this stay' },
      { label: '💎 Founding Partner exclusive rate', perk: 'Founding Partner exclusive rate (KYC required)' },
      { label: '🎁 Refer-a-Friend bonus',            perk: 'Bring a friend → both get +10% $STAY tokens' },
    ],
  },
  {
    key: 'community',
    icon: '🌍',
    label: 'Community / Sustainability',
    desc: 'Highlight your eco/social impact',
    options: [
      { label: '🌱 Carbon-Neutral Stay',            perk: 'We plant 5 trees for this stay' },
      { label: '🥬 Locally-Sourced Breakfast',      perk: '100% locally-sourced breakfast' },
      { label: '♻️ Plastic-Free Stay',               perk: 'Refillable toiletries + glass bottles' },
      { label: '🤝 Supports Local NGO',             perk: '5% of this booking donated to a local NGO' },
    ],
  },
  {
    key: 'event_packages',
    icon: '🎉',
    label: 'Holiday & Event Packages',
    desc: 'Calendar-based holidays and special days',
    options: [
      { label: '🎄 Christmas Special',     perk: 'Christmas gala dinner included' },
      { label: '🎆 New Year\'s Eve',        perk: 'NYE fireworks viewing + champagne toast' },
      { label: '💝 Valentine\'s Day',        perk: 'Romantic dinner for 2 included' },
      { label: '🎂 Birthday Celebration',   perk: 'Birthday cake + welcome bottle' },
    ],
  },
  {
    key: 'long_stay',
    icon: '📆',
    label: 'Long Stay Rewards',
    desc: 'Reward longer bookings without discounting',
    options: [
      { label: '🎁 Stay 4 nights, 5th free',  perk: 'Stay 4 paid nights, the 5th is on us', minStay: 5 },
      { label: '🎁 Weekly: free spa day',     perk: 'Stay 7+ nights, get a free spa day',   minStay: 7 },
      { label: '🎁 Monthly: free cleaning',   perk: 'Stay 28+ nights, weekly cleaning included', minStay: 28 },
    ],
  },
]

// Discount presets — kept SEPARATE from rewards so the UI clearly distinguishes
// "value-add reward" from "honest price drop". STAYLO discourages discounts as
// a default play, but allows them for genuine economic situations (low season,
// vacant mid-week nights).
export const DISCOUNT_PRESETS = [
  { label: '🍂 Low Season Rate',  defaultPct: 25 },
  { label: '🌙 Mid-Week Rate',    defaultPct: 10 },
  { label: '🍃 Off-Peak Special', defaultPct: 20 },
]
