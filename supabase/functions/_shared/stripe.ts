// Thin Stripe helper using native fetch (no npm SDK needed in Deno).
// All Stripe API calls go through `stripeFetch()` which handles auth, encoding,
// and error parsing.

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

export interface StripeError {
  type: string
  code?: string
  message: string
  param?: string
}

export class StripeApiError extends Error {
  status: number
  stripeError: StripeError
  constructor(status: number, stripeError: StripeError) {
    super(`Stripe ${status}: ${stripeError.message}`)
    this.status = status
    this.stripeError = stripeError
  }
}

/**
 * Encode a nested object as Stripe's bracket-notation form-urlencoded body.
 *   { foo: { bar: 'baz' } }  →  "foo[bar]=baz"
 *   { items: [{ a: 1 }, { a: 2 }] }  →  "items[0][a]=1&items[1][a]=2"
 */
export function stripeEncode(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(stripeEncode(item as Record<string, unknown>, `${fullKey}[${i}]`))
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      parts.push(stripeEncode(value as Record<string, unknown>, fullKey))
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.join('&')
}

export async function stripeFetch<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown>; stripeAccount?: string } = {},
): Promise<T> {
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY env var not set')

  const method = options.method ?? 'POST'
  const headers: HeadersInit = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  // For Stripe Connect calls "on behalf of" a connected account
  if (options.stripeAccount) {
    headers['Stripe-Account'] = options.stripeAccount
  }

  const url = path.startsWith('http') ? path : `${STRIPE_API_BASE}${path}`
  const init: RequestInit = { method, headers }
  if (options.body && method !== 'GET') {
    init.body = stripeEncode(options.body)
  }

  const res = await fetch(url, init)
  const json = await res.json()

  if (!res.ok) {
    throw new StripeApiError(res.status, (json.error ?? { type: 'unknown', message: 'Unknown Stripe error' }) as StripeError)
  }
  return json as T
}

// ── Common Stripe entities (minimal typings) ──────────
export interface StripeAccount {
  id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country?: string
  default_currency?: string
  business_type?: string
}

export interface StripeCheckoutSession {
  id: string
  url: string
  payment_intent?: string
  metadata?: Record<string, string>
}

export interface StripePaymentIntent {
  id: string
  status: string
  amount: number
  currency: string
  metadata: Record<string, string>
  latest_charge?: string
  transfer_group?: string
}

export interface StripeTransfer {
  id: string
  amount: number
  currency: string
  destination: string
}

export interface StripeAccountLink {
  url: string
  expires_at: number
}
