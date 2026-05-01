// ============================================================================
// PhoneInput — international phone with country code dropdown + number field
// ============================================================================
// Stores a single string ("+66 96 269 4286") via onChange. Parses on mount
// to pre-fill the right country.
//
// Usage:
//   <PhoneInput
//     value={form.contact_phone}
//     onChange={v => setForm(f => ({ ...f, contact_phone: v }))}
//   />
// ============================================================================
import { useEffect, useState } from 'react'
import { PHONE_CODES, parsePhone, combinePhone } from '../../lib/phoneCodes'

export default function PhoneInput({ value, onChange, className = '', placeholder = '96 269 4286' }) {
  // Parse once on mount + when external value changes externally (e.g. form reset)
  const initial = parsePhone(value)
  const [code, setCode] = useState(initial.code)
  const [number, setNumber] = useState(initial.number)

  // Re-sync when parent updates value (e.g. switching between properties)
  useEffect(() => {
    const parsed = parsePhone(value)
    setCode(parsed.code)
    setNumber(parsed.number)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function emit(nextCode, nextNumber) {
    onChange?.(combinePhone(nextCode, nextNumber))
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      <select
        value={code}
        onChange={e => { setCode(e.target.value); emit(e.target.value, number) }}
        className="px-2 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 max-w-[140px]"
      >
        {PHONE_CODES.map(c => (
          <option key={c.code + c.iso} value={c.code}>
            {c.flag} {c.code} {c.iso}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        value={number}
        onChange={e => { setNumber(e.target.value); emit(code, e.target.value) }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
      />
    </div>
  )
}
