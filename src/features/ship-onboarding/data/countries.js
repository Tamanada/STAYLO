// ============================================================================
// SHIP-specific country catalog with ISO code + default currency + timezone
// ============================================================================
// Self-contained (no dep on STAYLO's src/lib/countries.js) so the whole
// ship-onboarding module can be lifted to app.ship.app repo verbatim.
//
// Not exhaustive — covers the ~60 countries that make up 95% of independent
// hotelier markets. Add more as we sign customers in new regions.
// Country groupings ordered by SHIP's target-market priority:
//   1. SE Asia (launch market, ~40% expected V1 volume)
//   2. Europe + UK
//   3. Americas + English-speaking world
//   4. MENA + India + rest
// ============================================================================

export const COUNTRIES = [
  // ── SE Asia ────────────────────────────────────────────────────────────
  { code: 'TH', name: 'Thailand',     currency: 'THB', timezone: 'Asia/Bangkok',    priority: 1 },
  { code: 'ID', name: 'Indonesia',    currency: 'IDR', timezone: 'Asia/Jakarta',    priority: 1 },
  { code: 'MY', name: 'Malaysia',     currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', priority: 1 },
  { code: 'VN', name: 'Vietnam',      currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', priority: 1 },
  { code: 'PH', name: 'Philippines',  currency: 'PHP', timezone: 'Asia/Manila',     priority: 1 },
  { code: 'SG', name: 'Singapore',    currency: 'SGD', timezone: 'Asia/Singapore',  priority: 1 },
  { code: 'MM', name: 'Myanmar',      currency: 'MMK', timezone: 'Asia/Yangon',     priority: 1 },
  { code: 'KH', name: 'Cambodia',     currency: 'KHR', timezone: 'Asia/Phnom_Penh', priority: 1 },
  { code: 'LA', name: 'Laos',         currency: 'LAK', timezone: 'Asia/Vientiane',  priority: 1 },
  { code: 'LK', name: 'Sri Lanka',    currency: 'LKR', timezone: 'Asia/Colombo',    priority: 1 },
  { code: 'MV', name: 'Maldives',     currency: 'MVR', timezone: 'Indian/Maldives', priority: 1 },
  { code: 'NP', name: 'Nepal',        currency: 'NPR', timezone: 'Asia/Kathmandu',  priority: 1 },

  // ── East Asia ──────────────────────────────────────────────────────────
  { code: 'JP', name: 'Japan',        currency: 'JPY', timezone: 'Asia/Tokyo',      priority: 2 },
  { code: 'KR', name: 'South Korea',  currency: 'KRW', timezone: 'Asia/Seoul',      priority: 2 },
  { code: 'HK', name: 'Hong Kong',    currency: 'HKD', timezone: 'Asia/Hong_Kong',  priority: 2 },
  { code: 'TW', name: 'Taiwan',       currency: 'TWD', timezone: 'Asia/Taipei',     priority: 2 },
  { code: 'CN', name: 'China',        currency: 'CNY', timezone: 'Asia/Shanghai',   priority: 2 },

  // ── Europe ─────────────────────────────────────────────────────────────
  { code: 'FR', name: 'France',       currency: 'EUR', timezone: 'Europe/Paris',    priority: 2 },
  { code: 'DE', name: 'Germany',      currency: 'EUR', timezone: 'Europe/Berlin',   priority: 2 },
  { code: 'ES', name: 'Spain',        currency: 'EUR', timezone: 'Europe/Madrid',   priority: 2 },
  { code: 'IT', name: 'Italy',        currency: 'EUR', timezone: 'Europe/Rome',     priority: 2 },
  { code: 'PT', name: 'Portugal',     currency: 'EUR', timezone: 'Europe/Lisbon',   priority: 2 },
  { code: 'NL', name: 'Netherlands',  currency: 'EUR', timezone: 'Europe/Amsterdam', priority: 2 },
  { code: 'BE', name: 'Belgium',      currency: 'EUR', timezone: 'Europe/Brussels', priority: 2 },
  { code: 'CH', name: 'Switzerland',  currency: 'CHF', timezone: 'Europe/Zurich',   priority: 2 },
  { code: 'AT', name: 'Austria',      currency: 'EUR', timezone: 'Europe/Vienna',   priority: 2 },
  { code: 'IE', name: 'Ireland',      currency: 'EUR', timezone: 'Europe/Dublin',   priority: 2 },
  { code: 'GR', name: 'Greece',       currency: 'EUR', timezone: 'Europe/Athens',   priority: 2 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', priority: 2 },
  { code: 'PL', name: 'Poland',       currency: 'PLN', timezone: 'Europe/Warsaw',   priority: 2 },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague', priority: 2 },
  { code: 'HR', name: 'Croatia',      currency: 'EUR', timezone: 'Europe/Zagreb',   priority: 2 },
  { code: 'HU', name: 'Hungary',      currency: 'HUF', timezone: 'Europe/Budapest', priority: 2 },
  { code: 'RO', name: 'Romania',      currency: 'RON', timezone: 'Europe/Bucharest', priority: 2 },
  { code: 'BG', name: 'Bulgaria',     currency: 'BGN', timezone: 'Europe/Sofia',    priority: 2 },
  { code: 'DK', name: 'Denmark',      currency: 'DKK', timezone: 'Europe/Copenhagen', priority: 2 },
  { code: 'SE', name: 'Sweden',       currency: 'SEK', timezone: 'Europe/Stockholm', priority: 2 },
  { code: 'NO', name: 'Norway',       currency: 'NOK', timezone: 'Europe/Oslo',     priority: 2 },
  { code: 'FI', name: 'Finland',      currency: 'EUR', timezone: 'Europe/Helsinki', priority: 2 },
  { code: 'IS', name: 'Iceland',      currency: 'ISK', timezone: 'Atlantic/Reykjavik', priority: 2 },

  // ── Americas + English-speaking ────────────────────────────────────────
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', priority: 2 },
  { code: 'CA', name: 'Canada',       currency: 'CAD', timezone: 'America/Toronto', priority: 2 },
  { code: 'MX', name: 'Mexico',       currency: 'MXN', timezone: 'America/Mexico_City', priority: 2 },
  { code: 'BR', name: 'Brazil',       currency: 'BRL', timezone: 'America/Sao_Paulo', priority: 2 },
  { code: 'AR', name: 'Argentina',    currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', priority: 2 },
  { code: 'CL', name: 'Chile',        currency: 'CLP', timezone: 'America/Santiago', priority: 2 },
  { code: 'CO', name: 'Colombia',     currency: 'COP', timezone: 'America/Bogota',   priority: 2 },
  { code: 'PE', name: 'Peru',         currency: 'PEN', timezone: 'America/Lima',     priority: 2 },
  { code: 'AU', name: 'Australia',    currency: 'AUD', timezone: 'Australia/Sydney', priority: 2 },
  { code: 'NZ', name: 'New Zealand',  currency: 'NZD', timezone: 'Pacific/Auckland', priority: 2 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', priority: 2 },

  // ── MENA + India + rest ────────────────────────────────────────────────
  { code: 'IN', name: 'India',        currency: 'INR', timezone: 'Asia/Kolkata',    priority: 3 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', priority: 3 },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh',     priority: 3 },
  { code: 'IL', name: 'Israel',       currency: 'ILS', timezone: 'Asia/Jerusalem',  priority: 3 },
  { code: 'TR', name: 'Turkey',       currency: 'TRY', timezone: 'Europe/Istanbul', priority: 3 },
  { code: 'EG', name: 'Egypt',        currency: 'EGP', timezone: 'Africa/Cairo',    priority: 3 },
  { code: 'MA', name: 'Morocco',      currency: 'MAD', timezone: 'Africa/Casablanca', priority: 3 },
  { code: 'KE', name: 'Kenya',        currency: 'KES', timezone: 'Africa/Nairobi',  priority: 3 },
  { code: 'NG', name: 'Nigeria',      currency: 'NGN', timezone: 'Africa/Lagos',    priority: 3 },
]

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code)
}

// Country default suggestions for currency/timezone. Signup users can still
// override if their hotel operates in a different currency (rare).
export function suggestFromCountry(code) {
  const c = findCountry(code)
  return c ? { currency: c.currency, timezone: c.timezone } : { currency: 'USD', timezone: 'UTC' }
}
