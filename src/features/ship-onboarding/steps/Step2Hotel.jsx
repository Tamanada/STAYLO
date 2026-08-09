/*
  Step 2 — Hotel identity
  =======================
  Hotel name, country, city. On country change we auto-populate currency +
  timezone via suggestFromCountry(), which the user can override. This is
  purely UI state — nothing hits the DB yet (INSERT happens in Step 3).
*/
import { useState, useMemo } from 'react'
import { ArrowRight, Building2, MapPin, Globe } from 'lucide-react'
import { COUNTRIES, suggestFromCountry } from '../data/countries'

export default function Step2Hotel({ data, patch, goNext }) {
  const [hotelName, setHotelName] = useState(data.hotelName)
  const [country, setCountry] = useState(data.country)
  const [city, setCity] = useState(data.city)
  const [currency, setCurrency] = useState(data.currency)
  const [timezone, setTimezone] = useState(data.timezone)

  // Country list sorted: SE Asia + hotelier priority first, then alphabetical.
  const sortedCountries = useMemo(() => {
    return [...COUNTRIES].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.name.localeCompare(b.name)
    })
  }, [])

  const handleCountryChange = (e) => {
    const code = e.target.value
    setCountry(code)
    if (code) {
      const s = suggestFromCountry(code)
      setCurrency(s.currency)
      setTimezone(s.timezone)
    }
  }

  const canSubmit = hotelName.trim().length >= 2 && country && city.trim().length >= 2 && currency && timezone

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    patch({
      hotelName: hotelName.trim(),
      country,
      city: city.trim(),
      currency,
      timezone,
    })
    goNext()
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-black text-3xl sm:text-4xl mb-3" style={{
          color: '#1A1A2E', letterSpacing: '-0.8px',
        }}>
          Tell us about your place.
        </h1>
        <p className="text-gray-500">
          We'll auto-fill your currency and timezone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hotel name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Hotel or property name
          </label>
          <div className="relative">
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g. Dancing Elephant Bungalows"
              autoFocus
              required
              maxLength={80}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base"
              style={{ borderColor: '#E8E0D8', background: 'white' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            />
          </div>
        </div>

        {/* Country dropdown */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Country
          </label>
          <div className="relative">
            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={country}
              onChange={handleCountryChange}
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base appearance-none bg-no-repeat"
              style={{
                borderColor: '#E8E0D8', background: 'white',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'none\' stroke=\'%238892A0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M1 1.5l5 5 5-5\'/%3E%3C/svg%3E")',
                backgroundPosition: 'right 16px center',
                backgroundSize: '12px',
                paddingRight: '40px',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            >
              <option value="">Pick your country…</option>
              {sortedCountries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            City / town
          </label>
          <div className="relative">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ko Phangan"
              required
              maxLength={80}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base"
              style={{ borderColor: '#E8E0D8', background: 'white' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            />
          </div>
        </div>

        {/* Currency + Timezone (auto-populated, editable) */}
        {country && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base font-mono uppercase"
                style={{ borderColor: '#E8E0D8', background: 'white' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
              />
              <div className="mt-1 text-xs text-gray-400">ISO 4217, 3 letters</div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-sm font-mono"
                style={{ borderColor: '#E8E0D8', background: 'white' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
              />
              <div className="mt-1 text-xs text-gray-400">IANA</div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-2 py-4 rounded-xl font-black text-white text-base transition-all flex items-center justify-center gap-2"
          style={{
            background: canSubmit
              ? 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)'
              : '#E8E0D8',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 12px 32px rgba(255,31,112,0.35)' : 'none',
          }}
          onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Continue <ArrowRight size={18} strokeWidth={2.8} />
        </button>
      </form>
    </div>
  )
}
