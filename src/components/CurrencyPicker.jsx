// ============================================================================
// CurrencyPicker — small dropdown that lets a guest pick their display currency
// ============================================================================
// Compact pill (symbol + code) that expands into the full ISO 4217 list on
// click. Persists via useDisplayCurrency. Mounted in the OTA header of every
// public page (Search, PropertyDetail, Checkout) — one control, one source
// of truth for what price the guest sees.
//
// The property's BASE currency (what the hotelier quoted in) is unchanged —
// this only affects the number the guest reads on the page.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { currencies } from '../lib/currencies'
import { useDisplayCurrency } from '../hooks/useDisplayCurrency'

export default function CurrencyPicker({ className = '' }) {
  const { displayCode, setDisplayCode, symbolFor } = useDisplayCurrency()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Click-outside dismiss — bind once, unbind on unmount.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-800 hover:border-gray-300 transition-colors"
        title="Display currency"
      >
        <span className="font-mono">{symbolFor(displayCode)}</span>
        <span>{displayCode}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 max-h-80 overflow-y-auto w-64 rounded-xl border border-gray-200 bg-white shadow-xl py-1">
          {currencies.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setDisplayCode(c.code); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                c.code === displayCode ? 'bg-orange/5 text-orange font-bold' : 'text-gray-800'
              }`}
            >
              <span className="font-mono w-6 text-center">{c.symbol}</span>
              <span className="w-12 font-mono text-xs text-gray-500">{c.code}</span>
              <span className="flex-1 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
