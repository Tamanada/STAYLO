// ============================================================================
// phoneCodes.js — international dialing codes for the PhoneInput component
// ============================================================================
// Sorted by usage / region. Top section = most common, then alpha.
// Format: { code: '+66', flag: '🇹🇭', name: 'Thailand', iso: 'TH' }
// ============================================================================

export const PHONE_CODES = [
  // Top section — most common in STAYLO's audience
  { code: '+66', flag: '🇹🇭', name: 'Thailand',         iso: 'TH' },
  { code: '+33', flag: '🇫🇷', name: 'France',           iso: 'FR' },
  { code: '+1',  flag: '🇺🇸', name: 'United States',    iso: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom',   iso: 'GB' },
  { code: '+49', flag: '🇩🇪', name: 'Germany',          iso: 'DE' },
  { code: '+39', flag: '🇮🇹', name: 'Italy',            iso: 'IT' },
  { code: '+34', flag: '🇪🇸', name: 'Spain',            iso: 'ES' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands',      iso: 'NL' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium',          iso: 'BE' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland',      iso: 'CH' },
  { code: '+43', flag: '🇦🇹', name: 'Austria',          iso: 'AT' },
  { code: '+45', flag: '🇩🇰', name: 'Denmark',          iso: 'DK' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden',           iso: 'SE' },
  { code: '+47', flag: '🇳🇴', name: 'Norway',           iso: 'NO' },
  { code: '+358', flag: '🇫🇮', name: 'Finland',         iso: 'FI' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland',         iso: 'IE' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal',        iso: 'PT' },
  { code: '+30', flag: '🇬🇷', name: 'Greece',           iso: 'GR' },

  // Asia
  { code: '+81', flag: '🇯🇵', name: 'Japan',            iso: 'JP' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea',      iso: 'KR' },
  { code: '+86', flag: '🇨🇳', name: 'China',            iso: 'CN' },
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong',       iso: 'HK' },
  { code: '+886', flag: '🇹🇼', name: 'Taiwan',          iso: 'TW' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore',        iso: 'SG' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia',         iso: 'MY' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia',        iso: 'ID' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines',      iso: 'PH' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam',          iso: 'VN' },
  { code: '+855', flag: '🇰🇭', name: 'Cambodia',        iso: 'KH' },
  { code: '+856', flag: '🇱🇦', name: 'Laos',            iso: 'LA' },
  { code: '+95', flag: '🇲🇲', name: 'Myanmar',          iso: 'MM' },
  { code: '+91', flag: '🇮🇳', name: 'India',            iso: 'IN' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan',         iso: 'PK' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh',      iso: 'BD' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka',        iso: 'LK' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal',           iso: 'NP' },

  // Oceania
  { code: '+61', flag: '🇦🇺', name: 'Australia',        iso: 'AU' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand',      iso: 'NZ' },
  { code: '+679', flag: '🇫🇯', name: 'Fiji',            iso: 'FJ' },

  // Middle East
  { code: '+971', flag: '🇦🇪', name: 'UAE',             iso: 'AE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia',    iso: 'SA' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey',           iso: 'TR' },
  { code: '+972', flag: '🇮🇱', name: 'Israel',          iso: 'IL' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan',          iso: 'JO' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon',         iso: 'LB' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar',           iso: 'QA' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait',          iso: 'KW' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain',         iso: 'BH' },
  { code: '+968', flag: '🇴🇲', name: 'Oman',            iso: 'OM' },

  // Africa
  { code: '+27', flag: '🇿🇦', name: 'South Africa',     iso: 'ZA' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt',            iso: 'EG' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco',         iso: 'MA' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia',         iso: 'TN' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria',         iso: 'DZ' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya',           iso: 'KE' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria',         iso: 'NG' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana',           iso: 'GH' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania',        iso: 'TZ' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda',          iso: 'UG' },

  // Americas
  { code: '+52', flag: '🇲🇽', name: 'Mexico',           iso: 'MX' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil',           iso: 'BR' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina',        iso: 'AR' },
  { code: '+56', flag: '🇨🇱', name: 'Chile',            iso: 'CL' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia',         iso: 'CO' },
  { code: '+51', flag: '🇵🇪', name: 'Peru',             iso: 'PE' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela',        iso: 'VE' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay',         iso: 'UY' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica',      iso: 'CR' },
  { code: '+507', flag: '🇵🇦', name: 'Panama',          iso: 'PA' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador',         iso: 'EC' },

  // Eastern Europe
  { code: '+7',  flag: '🇷🇺', name: 'Russia',           iso: 'RU' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine',         iso: 'UA' },
  { code: '+48', flag: '🇵🇱', name: 'Poland',           iso: 'PL' },
  { code: '+420', flag: '🇨🇿', name: 'Czech Republic',  iso: 'CZ' },
  { code: '+421', flag: '🇸🇰', name: 'Slovakia',        iso: 'SK' },
  { code: '+36', flag: '🇭🇺', name: 'Hungary',          iso: 'HU' },
  { code: '+40', flag: '🇷🇴', name: 'Romania',          iso: 'RO' },
  { code: '+359', flag: '🇧🇬', name: 'Bulgaria',        iso: 'BG' },
  { code: '+385', flag: '🇭🇷', name: 'Croatia',         iso: 'HR' },
  { code: '+386', flag: '🇸🇮', name: 'Slovenia',        iso: 'SI' },
]

// Default to Thailand since STAYLO is HQ'd in Koh Phangan
export const DEFAULT_COUNTRY_CODE = '+66'

// Parse a stored phone string (e.g. "+66 96 269 4286" or just "9626954286")
// → { code, number } so the picker can pre-fill correctly.
export function parsePhone(stored) {
  if (!stored) return { code: DEFAULT_COUNTRY_CODE, number: '' }
  const trimmed = String(stored).trim()
  // Try to match the longest country code that prefixes the string
  const sorted = [...PHONE_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (trimmed.startsWith(c.code)) {
      return { code: c.code, number: trimmed.slice(c.code.length).trim() }
    }
  }
  // No prefix detected — assume default country
  return { code: DEFAULT_COUNTRY_CODE, number: trimmed }
}

// Combine a code + number into the canonical stored format
export function combinePhone(code, number) {
  const cleanNumber = String(number || '').trim().replace(/^0+/, '') // drop leading zeros
  if (!cleanNumber) return ''
  return `${code} ${cleanNumber}`
}
