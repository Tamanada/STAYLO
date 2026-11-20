// Nationality picker for guest registration (public check-in, front desk).
// Options are the countries Thai Immigration accepts on the TM30 import,
// so what the guest picks can always be exported. The stored value stays
// the ISO alpha-2 code (booking_guests.nationality), as before.
import { useMemo } from 'react'
import { TM30_NATIONALITIES, ALPHA2_TO_TM30 } from '../../lib/tm30Template'

function titleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/(^|[\s(\-'])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase())
    .replace(/\bOf\b/g, 'of').replace(/\bAnd\b/g, 'and').replace(/\bThe\b/g, 'the')
}

// Short, familiar labels for the countries guests pick most; the official
// long form (REPUBLIC OF ...) stays for the others.
const SHORT = {
  US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany', CN: 'China', RU: 'Russia',
  KR: 'South Korea', KP: 'North Korea', TW: 'Taiwan', VN: 'Vietnam', LA: 'Laos', IR: 'Iran', SY: 'Syria',
  CZ: 'Czech Republic', NL: 'Netherlands', CH: 'Switzerland', AE: 'United Arab Emirates', TH: 'Thailand',
  MM: 'Myanmar', TZ: 'Tanzania', VE: 'Venezuela', BO: 'Bolivia', MD: 'Moldova', MK: 'North Macedonia',
}

function nationalityOptions() {
  const byCode = new Map(TM30_NATIONALITIES.map(n => [n.code, n.en]))
  return Object.entries(ALPHA2_TO_TM30)
    .map(([a2, code]) => ({ value: a2, label: SHORT[a2] ?? titleCase(byCode.get(code) ?? code) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export default function NationalitySelect({ value, onChange, className, placeholder = 'Select a country', autoFocus }) {
  const options = useMemo(() => nationalityOptions(), [])
  const known = options.some(o => o.value === value)
  return (
    <select value={known ? value : ''} onChange={e => onChange(e.target.value)} className={className} autoFocus={autoFocus}>
      <option value="">{placeholder}</option>
      {!known && value ? <option value="" disabled>{`Unknown code: ${value}`}</option> : null}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
