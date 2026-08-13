// ============================================================================
// useDisplayCurrency — guest's chosen display currency + live FX conversion
// ============================================================================
// One choice per browser (localStorage), shared across every OTA page. The
// hotelier still quotes their property in ONE base currency (property.
// currency = 'THB'), but the guest sees numbers in THEIR preferred one.
//
// FX source: Frankfurter (https://frankfurter.dev) — free, no auth, wide
// CORS, rates updated daily by the ECB. Missing crypto and thin-tier
// currencies (KHR, LAK, MMK) — those fall back to a 1:1 identity so
// prices still render, with a "quote in <base>" tooltip note.
//
// Rate cache: keyed by BASE currency, TTL 1 hour, stored in localStorage
// under `staylo_fx_<BASE>`. One fetch per (base, hour) per browser.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { currencies } from '../lib/currencies'

const STORAGE_KEY = 'staylo_display_currency'
const FX_TTL_MS = 60 * 60 * 1000   // 1 hour

// Currencies Frankfurter doesn't quote. We render prices in the base
// currency untouched when the target isn't quoted — better than showing
// zero or a stale rate.
const UNSUPPORTED_TARGETS = new Set(['KHR', 'LAK', 'MMK', 'MMR'])

// Read the guest's saved preference, defaulting to USD (a universally
// meaningful reference — the majority of travellers can eyeball it).
function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && currencies.some(c => c.code === v)) return v
  } catch { /* SSR / private mode */ }
  return 'USD'
}

// Frankfurter returns { amount, base, date, rates: { EUR: 0.85, THB: 34.5, … } }.
// The `rates` map does NOT contain the base itself → we add it as 1.0 for
// convenience so lookup is always `rates[target]`.
async function fetchRatesFor(base) {
  const url = `https://api.frankfurter.dev/latest?from=${encodeURIComponent(base)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FX fetch failed: HTTP ${res.status}`)
  const json = await res.json()
  const rates = { ...(json.rates || {}), [base]: 1 }
  return { base, rates, fetchedAt: Date.now(), date: json.date }
}

function readCachedRates(base) {
  try {
    const raw = localStorage.getItem(`staylo_fx_${base}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > FX_TTL_MS) return null
    return parsed
  } catch { return null }
}

function writeCachedRates(base, payload) {
  try { localStorage.setItem(`staylo_fx_${base}`, JSON.stringify(payload)) } catch { /* full/blocked */ }
}

export function useDisplayCurrency() {
  const [displayCode, setDisplayCodeState] = useState(readSaved)
  // Cache of { base → { rates, fetchedAt } } for every base we've seen
  // this session. Prevents refetching if the guest jumps between two
  // properties quoted in different currencies.
  const [ratesByBase, setRatesByBase] = useState({})

  const setDisplayCode = useCallback((code) => {
    setDisplayCodeState(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch { /* ignore */ }
  }, [])

  // Pre-fetch rates for a given base currency. Called lazily by convert()
  // when it discovers a base it hasn't loaded yet.
  const ensureRates = useCallback(async (base) => {
    if (!base) return
    if (ratesByBase[base]) return
    const cached = readCachedRates(base)
    if (cached) { setRatesByBase(prev => ({ ...prev, [base]: cached })); return }
    try {
      const payload = await fetchRatesFor(base)
      writeCachedRates(base, payload)
      setRatesByBase(prev => ({ ...prev, [base]: payload }))
    } catch (err) {
      // On failure, cache an identity payload so downstream convert()
      // falls back to 1:1 without hammering the API on every render.
      const fallback = { base, rates: { [base]: 1 }, fetchedAt: Date.now(), date: null, error: String(err) }
      setRatesByBase(prev => ({ ...prev, [base]: fallback }))
    }
  }, [ratesByBase])

  // Convert amount FROM base TO the guest's chosen display currency.
  // Returns { amount, from, to, converted, rate, isIdentity }.
  //   · isIdentity=true when from === to OR target is unsupported by Frankfurter
  const convert = useCallback((amount, fromBase) => {
    const from = (fromBase || 'USD').toUpperCase()
    const to = displayCode
    if (from === to) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    if (UNSUPPORTED_TARGETS.has(to)) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    const bag = ratesByBase[from]
    if (!bag) {
      // Not loaded yet — kick off the fetch, return identity for now.
      ensureRates(from)
      return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    }
    const rate = bag.rates[to]
    if (!rate) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    return { amount, from, to, converted: amount * rate, rate, isIdentity: false }
  }, [displayCode, ratesByBase, ensureRates])

  const symbolFor = useCallback((code) => {
    const c = currencies.find(x => x.code === code)
    return c?.symbol || code || '$'
  }, [])

  // Format an amount pre-converted to `displayCode`. Round to the right
  // number of decimals for the target currency (JPY/IDR/VND have 0).
  const format = useCallback((amount, fromBase) => {
    const { converted, isIdentity, from, to } = convert(amount, fromBase)
    const targetCode = isIdentity ? from : to
    const meta = currencies.find(c => c.code === targetCode)
    const dec = meta?.decimals ?? 2
    const sym = meta?.symbol || targetCode
    // Locale-aware thousand separators. en-US always works and reads
    // cleanly for hospitality prices; not risking fr-FR non-breaking
    // spaces that some fonts drop.
    const num = Number(converted).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    return `${sym} ${num}`
  }, [convert])

  // Publicly-usable helper: what's the current display symbol?
  const displaySymbol = useMemo(() => symbolFor(displayCode), [displayCode, symbolFor])

  return { displayCode, setDisplayCode, symbolFor, displaySymbol, convert, format, ensureRates, ratesByBase }
}
