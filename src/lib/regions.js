// ============================================
// Region & area aliases for the OTA search
// ============================================
// When a guest types "Koh Phangan", they expect to see properties whose
// city is "Baantai", "Thong Sala", "Haad Rin", etc. — all villages on
// the island. This file maps human-friendly region names to the list of
// city/area names that belong to them.
//
// Used by /ota Search.jsx to expand the destination filter so the
// guest's intent matches the data the hotelier entered.
// ============================================

export const REGIONS = {
  // ── Thailand — primary launch market ───────────────────
  'koh phangan': [
    'koh phangan', 'ko pha ngan', 'pha ngan',
    'thong sala', 'baan tai', 'baantai', 'baan tay',
    'haad rin', 'hat rin',
    'sri thanu', 'srithanu',
    'chaloklum', 'chalok lum',
    'haad yao', 'hat yao',
    'thong nai pan', 'malibu beach',
    'bottle beach',
  ],
  'koh samui': [
    'koh samui', 'ko samui', 'samui',
    'chaweng', 'lamai', 'bophut', 'bo phut', 'maenam', 'mae nam',
    'choeng mon', 'big buddha', 'fisherman village',
    'taling ngam', 'lipa noi', 'nathon',
  ],
  'koh tao': [
    'koh tao', 'ko tao',
    'sairee', 'sai ree', 'mae haad', 'chalok baan kao',
  ],
  'phuket': [
    'phuket', 'phuket town',
    'patong', 'kata', 'karon', 'rawai', 'kamala', 'surin',
    'bang tao', 'mai khao', 'nai harn', 'chalong',
  ],
  'krabi': [
    'krabi', 'krabi town',
    'ao nang', 'ao nam mao', 'railay', 'tonsai',
    'koh phi phi', 'phi phi', 'phi phi don', 'phi phi leh',
  ],
  'bangkok': [
    'bangkok', 'krung thep',
    'sukhumvit', 'silom', 'sathorn', 'siam', 'pratunam',
    'khao san', 'rattanakosin', 'thonburi',
    'nana', 'asok', 'ekkamai', 'phrom phong',
  ],
  'chiang mai': [
    'chiang mai',
    'old city', 'nimman', 'nimmanhaemin', 'santitham',
  ],
  'pai': ['pai'],
  'hua hin': ['hua hin', 'cha am', 'pranburi'],
  'pattaya': ['pattaya', 'jomtien', 'naklua'],

  // ── Indonesia ──────────────────────────────────────────
  'bali': [
    'bali', 'denpasar',
    'kuta', 'seminyak', 'canggu', 'ubud', 'sanur', 'jimbaran',
    'uluwatu', 'nusa dua', 'amed', 'lovina', 'pemuteran',
    'gili air', 'gili meno', 'gili trawangan',
  ],
  'lombok': ['lombok', 'kuta lombok', 'senggigi', 'gili'],

  // ── Vietnam ────────────────────────────────────────────
  'hanoi': ['hanoi', 'ha noi'],
  'hcmc':  ['ho chi minh', 'saigon', 'ho chi minh city', 'hcmc', 'sai gon'],
  'da nang': ['da nang', 'danang', 'hoi an'],

  // ── Malaysia ───────────────────────────────────────────
  'kuala lumpur': ['kuala lumpur', 'kl'],
  'penang': ['penang', 'george town', 'georgetown'],
  'langkawi': ['langkawi'],
}

/**
 * Returns the canonical region key for a free-text search, or null.
 * Examples:
 *   matchRegion('Koh Phangan')    → 'koh phangan'
 *   matchRegion('Phangan')        → 'koh phangan'
 *   matchRegion('Baan Tai')       → 'koh phangan' (because Baan Tai is in the list)
 *   matchRegion('Random Text')    → null
 */
export function matchRegion(query) {
  if (!query) return null
  const q = String(query).toLowerCase().trim()
  if (!q) return null
  for (const [region, aliases] of Object.entries(REGIONS)) {
    if (region.includes(q) || q.includes(region)) return region
    if (aliases.some(a => a.includes(q) || q.includes(a))) return region
  }
  return null
}

/** Returns true if a property's city/address belongs to the given region. */
export function propertyMatchesRegion(property, region) {
  if (!region) return false
  const aliases = REGIONS[region] ?? []
  const haystacks = [
    property?.city, property?.country, property?.address, property?.name,
  ].filter(Boolean).map(s => String(s).toLowerCase())
  return aliases.some(a => haystacks.some(h => h.includes(a) || a.includes(h)))
}
