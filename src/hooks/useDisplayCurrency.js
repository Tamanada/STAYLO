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
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { currencies } from '../lib/currencies'

const STORAGE_KEY = 'staylo_display_currency'
const FX_TTL_MS = 60 * 60 * 1000   // 1 hour

// ─────────────────────────────────────────────────────────────────────────
// Shared external store for the display-currency choice
// ─────────────────────────────────────────────────────────────────────────
// Every component that calls useDisplayCurrency() gets its OWN local state
// via useState — which means the CurrencyPicker updating its state doesn't
// notify PropertyDetail / Checkout instances. Prices stayed on the initial
// displayCode until the user hard-refreshed.
//
// useSyncExternalStore fixes this by making localStorage the single source
// of truth: setter writes + fires an event, every subscriber re-renders.
// Works same-tab (custom event) AND cross-tab (native `storage` event).
const CHANGE_EVENT = 'staylo:display_currency_change'

function readCurrentCode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && currencies.some(c => c.code === v)) return v
  } catch { /* SSR / private mode */ }
  return 'USD'
}

// Subscribe function for useSyncExternalStore. Listens to BOTH:
//   · same-tab dispatch of our custom event (fires on every setter call)
//   · cross-tab `storage` event (browser-native, fires when another tab
//     writes to the same localStorage key)
function subscribeCurrency(onChange) {
  const handler = () => onChange()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

// Setter — updates localStorage + fires the custom event so every
// subscribed component re-renders immediately.
function writeCurrentCode(code) {
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* full/blocked */ }
  try { window.dispatchEvent(new Event(CHANGE_EVENT)) } catch { /* SSR */ }
}

// Currencies Frankfurter doesn't quote. We render prices in the base
// currency untouched when the target isn't quoted — better than showing
// zero or a stale rate.
const UNSUPPORTED_TARGETS = new Set(['KHR', 'LAK', 'MMK', 'MMR'])

// ─────────────────────────────────────────────────────────────────────────
// Crypto rates (BTC + SOL) — via CoinGecko public API
// ─────────────────────────────────────────────────────────────────────────
// Frankfurter is fiat-only. For crypto display we pull "1 X in USD" from
// CoinGecko once, cache 1 h, then cross-multiply with any Frankfurter
// base→USD rate to get base→BTC / base→SOL. Same TTL as fiat so we don't
// hammer either API. Public tier gives 10-50 req/min — well within reach.
const CG_STORAGE_KEY = 'staylo_fx_crypto'

async function fetchCryptoUsdRates() {
  const ids = currencies.filter(c => c.isCrypto && c.cgId).map(c => c.cgId).join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Crypto FX fetch failed: HTTP ${res.status}`)
  const json = await res.json()
  // Map back to { BTC: 63170, SOL: 75.83 } — the USD-value of ONE crypto unit.
  const perCryptoUsd = {}
  for (const c of currencies) {
    if (c.isCrypto && c.cgId && json[c.cgId]?.usd) perCryptoUsd[c.code] = json[c.cgId].usd
  }
  // Derived units (SATS from BTC, and any future micro-unit like GWEI
  // from ETH) — one CoinGecko call, N display currencies. `divisor` is
  // "how many derived units make one parent unit" (100_000_000 sats per
  // BTC) → USD-per-derived-unit = parent-USD / divisor.
  for (const c of currencies) {
    if (c.isCrypto && c.derivedFrom && c.divisor && perCryptoUsd[c.derivedFrom]) {
      perCryptoUsd[c.code] = perCryptoUsd[c.derivedFrom] / c.divisor
    }
  }
  return { perCryptoUsd, fetchedAt: Date.now() }
}

function readCachedCrypto() {
  try {
    const raw = localStorage.getItem(CG_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > FX_TTL_MS) return null
    return parsed
  } catch { return null }
}

function writeCachedCrypto(payload) {
  try { localStorage.setItem(CG_STORAGE_KEY, JSON.stringify(payload)) } catch { /* full/blocked */ }
}


// Frankfurter returns { amount, base, date, rates: { EUR: 0.85, THB: 34.5, … } }.
// The `rates` map does NOT contain the base itself → we add it as 1.0 for
// convenience so lookup is always `rates[target]`.
//
// URL: `/v1/latest?base=XXX`. Earlier drafts used `frankfurter.dev/latest?from=`
// (no /v1 prefix, `from=` param) which is a legacy alias that now returns
// 404 → the whole hook silently fell back to identity conversion and no
// price ever changed. Verified against a live curl on 2026-08-13.
async function fetchRatesFor(base) {
  const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`
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
  // Shared external store — every instance of the hook subscribes to the
  // same localStorage-backed value. When ANY component (typically the
  // CurrencyPicker) calls setDisplayCode, every mounted subscriber gets
  // re-notified via the custom `staylo:display_currency_change` event
  // AND cross-tab via the native `storage` event. Server snapshot returns
  // 'USD' for SSR fallback (no localStorage during Node render).
  const displayCode = useSyncExternalStore(
    subscribeCurrency,
    readCurrentCode,
    () => 'USD',
  )
  // Cache of { base → { rates, fetchedAt } } for every base we've seen
  // this session. Prevents refetching if the guest jumps between two
  // properties quoted in different currencies. Kept LOCAL per-component
  // (not shared) because a stale rate mid-session is cheap to refetch
  // and duplicating the cache across components is harmless.
  const [ratesByBase, setRatesByBase] = useState({})
  // Crypto USD-rates ({ BTC: 63170, SOL: 75.83 } — "USD-value of 1 unit
  // of X crypto"). Loaded once on mount, refreshed after 1 h TTL.
  const [cryptoUsd, setCryptoUsd] = useState(() => readCachedCrypto()?.perCryptoUsd || null)

  useEffect(() => {
    if (cryptoUsd) return   // already loaded from cache
    let cancelled = false
    fetchCryptoUsdRates()
      .then(payload => {
        if (cancelled) return
        writeCachedCrypto(payload)
        setCryptoUsd(payload.perCryptoUsd)
      })
      .catch(() => { /* silent — crypto conversion just falls back to identity */ })
    return () => { cancelled = true }
  }, [cryptoUsd])

  const setDisplayCode = useCallback((code) => {
    writeCurrentCode(code)   // fires the event → every subscriber re-renders
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
  //   · crypto targets (BTC, SOL) route: from → USD (Frankfurter) → crypto
  //     (CoinGecko USD-per-1-crypto rate, inverted)
  const convert = useCallback((amount, fromBase) => {
    const from = (fromBase || 'USD').toUpperCase()
    const to = displayCode
    if (from === to) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    if (UNSUPPORTED_TARGETS.has(to)) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }

    // Crypto path: convert to USD first (via Frankfurter), then divide by
    // the crypto's USD price. Falls back to identity if either leg isn't
    // loaded yet — the next render (once fetch lands) picks it up.
    if (cryptoUsd && cryptoUsd[to]) {
      const cryptoUsdPrice = cryptoUsd[to]        // e.g. BTC = 63170 USD
      if (from === 'USD') {
        return { amount, from, to, converted: amount / cryptoUsdPrice, rate: 1 / cryptoUsdPrice, isIdentity: false }
      }
      const bag = ratesByBase[from]
      if (!bag) { ensureRates(from); return { amount, from, to, converted: amount, rate: 1, isIdentity: true } }
      const usdRate = bag.rates.USD
      if (!usdRate) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
      const inUsd = amount * usdRate
      const inCrypto = inUsd / cryptoUsdPrice
      return { amount, from, to, converted: inCrypto, rate: usdRate / cryptoUsdPrice, isIdentity: false }
    }

    const bag = ratesByBase[from]
    if (!bag) {
      // Not loaded yet — kick off the fetch, return identity for now.
      ensureRates(from)
      return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    }
    const rate = bag.rates[to]
    if (!rate) return { amount, from, to, converted: amount, rate: 1, isIdentity: true }
    return { amount, from, to, converted: amount * rate, rate, isIdentity: false }
  }, [displayCode, ratesByBase, ensureRates, cryptoUsd])

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
