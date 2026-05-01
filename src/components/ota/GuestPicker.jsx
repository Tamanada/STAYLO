// ============================================================================
// GuestPicker — popover for adults + children with manual input
// ============================================================================
// Usage:
//   <GuestPicker
//     adults={2} children={1}
//     onChange={({adults, children}) => ...}
//     maxTotal={6}             // optional cap on total people
//     compact={false}          // small variant for tight headers
//   />
//
// UX:
//   - Compact button shows "2 adults · 1 child ▼"
//   - Click to open popover with two rows:
//        Adults    [- 2 +]   13+ years
//        Children  [- 1 +]    0-12 years
//   - Both rows have +/- AND a number input you can type into directly.
//   - Closes on outside-click or Apply.
//   - maxTotal warning shown if adults+children > maxTotal.
// ============================================================================
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Users, Plus, Minus } from 'lucide-react'

export default function GuestPicker({
  adults = 1,
  children = 0,
  onChange,
  maxTotal,
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function update(next) {
    const a = Math.max(1, Math.min(99, Math.floor(Number(next.adults ?? adults) || 0)))
    const c = Math.max(0, Math.min(99, Math.floor(Number(next.children ?? children) || 0)))
    onChange?.({ adults: a, children: c })
  }

  const total = adults + children
  const exceedsCap = maxTotal != null && total > maxTotal

  // Display label
  const label = (() => {
    const parts = []
    parts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`)
    if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`)
    return parts.join(' · ')
  })()

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 ${
          compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-base'
        } rounded-lg border ${
          exceedsCap ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
        } transition-colors`}
      >
        <span className="flex items-center gap-2 text-gray-900 font-medium">
          <Users size={compact ? 14 : 16} className="text-gray-500" />
          {label}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-2xl p-4 min-w-[280px]">
          <Row
            label="Adults"
            sub="13+ years"
            value={adults}
            min={1}
            onChange={a => update({ adults: a })}
          />
          <div className="my-3 border-t border-gray-100" />
          <Row
            label="Children"
            sub="0–12 years"
            value={children}
            min={0}
            onChange={c => update({ children: c })}
          />

          {exceedsCap && (
            <p className="mt-3 text-xs text-red-600">
              ⚠️ Total {total} exceeds room capacity ({maxTotal}). Reduce or pick a larger room / add rooms.
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full mt-3 px-4 py-2 rounded-lg bg-deep text-white font-bold text-sm hover:bg-deep/90 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, sub, value, min, onChange }) {
  function dec() { onChange(Math.max(min, value - 1)) }
  function inc() { onChange(value + 1) }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-deep">{label}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={dec} disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-deep disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={e => onChange(Math.max(min, Math.floor(Number(e.target.value) || min)))}
          className="w-12 text-center text-sm font-bold text-deep bg-white border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" onClick={inc}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-deep cursor-pointer transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
