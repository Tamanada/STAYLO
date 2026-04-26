// ISO 4217 currency catalog used by /submit and /dashboard/banking.
// Stripe supports 135+ currencies — we list the most relevant for STAYLO's
// initial markets (SE Asia + Europe + USD baseline). Add more as needed.
//
// `decimals` is the number of decimal places (used to convert UI prices to
// Stripe's smallest unit: USD 12.34 → 1234, JPY 100 → 100, BHD 1.234 → 1234).

export const currencies = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',          decimals: 2, defaultCountries: ['US'] },
  { code: 'EUR', symbol: '€',   name: 'Euro',               decimals: 2, defaultCountries: ['FR','DE','ES','IT','PT','NL','BE','IE','AT','FI','GR'] },
  { code: 'THB', symbol: '฿',   name: 'Thai Baht',          decimals: 2, defaultCountries: ['TH'] },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      decimals: 2, defaultCountries: ['GB'] },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',       decimals: 0, defaultCountries: ['JP'] },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',  decimals: 2, defaultCountries: ['AU'] },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',    decimals: 2, defaultCountries: ['CA'] },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',        decimals: 2, defaultCountries: ['CH'] },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',   decimals: 2, defaultCountries: ['SG'] },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit',  decimals: 2, defaultCountries: ['MY'] },
  { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah',  decimals: 0, defaultCountries: ['ID'] },
  { code: 'PHP', symbol: '₱',   name: 'Philippine Peso',    decimals: 2, defaultCountries: ['PH'] },
  { code: 'VND', symbol: '₫',   name: 'Vietnamese Dong',    decimals: 0, defaultCountries: ['VN'] },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       decimals: 2, defaultCountries: ['IN'] },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',       decimals: 2, defaultCountries: ['CN'] },
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won',   decimals: 0, defaultCountries: ['KR'] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',   decimals: 2, defaultCountries: ['HK'] },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar',      decimals: 2, defaultCountries: ['TW'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, defaultCountries: ['NZ'] },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',     decimals: 2, defaultCountries: ['BR'] },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',       decimals: 2, defaultCountries: ['MX'] },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', decimals: 2, defaultCountries: ['ZA'] },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',         decimals: 2, defaultCountries: ['AE'] },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal',        decimals: 2, defaultCountries: ['SA'] },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira',       decimals: 2, defaultCountries: ['TR'] },
  { code: 'RUB', symbol: '₽',   name: 'Russian Ruble',      decimals: 2, defaultCountries: ['RU'] },
  { code: 'PLN', symbol: 'zł',  name: 'Polish Zloty',       decimals: 2, defaultCountries: ['PL'] },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',      decimals: 2, defaultCountries: ['SE'] },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',    decimals: 2, defaultCountries: ['NO'] },
  { code: 'DKK', symbol: 'kr',  name: 'Danish Krone',       decimals: 2, defaultCountries: ['DK'] },
]

const byCode = Object.fromEntries(currencies.map(c => [c.code, c]))

export function getCurrency(code) {
  return byCode[(code || 'USD').toUpperCase()] ?? byCode.USD
}

/** Convert a human-readable amount (e.g. 12.34) to Stripe's smallest unit. */
export function toMinorUnit(amount, code) {
  const cur = getCurrency(code)
  return Math.round(Number(amount) * Math.pow(10, cur.decimals))
}

/** Convert Stripe's smallest unit back to a human-readable amount. */
export function fromMinorUnit(minor, code) {
  const cur = getCurrency(code)
  return Number(minor) / Math.pow(10, cur.decimals)
}

/** Format an amount in the given currency, locale-aware. */
export function formatCurrency(amount, code, locale) {
  const cur = getCurrency(code)
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: cur.code,
      maximumFractionDigits: cur.decimals,
    }).format(Number(amount))
  } catch {
    return `${cur.symbol}${Number(amount).toFixed(cur.decimals)}`
  }
}
