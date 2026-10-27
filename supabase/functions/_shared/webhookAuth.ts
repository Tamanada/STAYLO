// ============================================================================
// webhookAuth.ts: signature verification for Lightning provider webhooks
// ============================================================================
// Pure module (Web Crypto only) so tests/unit/webhookAuth.test.mjs can run it
// in Node. Used by crypto-webhook before any invoice is confirmed.
//
// Schemes:
//   btcpay  : header "BTCPay-Sig: sha256=<hex>", HMAC-SHA256 of the raw
//              request body with the webhook secret.
//   opennode: body.hashed_order = HMAC-SHA256(key = API key, message = body.id).
// Any other provider, a missing secret, a missing header or a mismatch is a
// rejection. Comparison is constant-time.
// ============================================================================

export type ProviderName = 'btcpay' | 'opennode' | string

export interface VerifyInput {
  provider: ProviderName
  rawBody: string
  body: Record<string, unknown>
  headers: { get(name: string): string | null }
  secret: string | undefined | null
}

export interface VerifyResult {
  ok: boolean
  reason?: string
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison (both sides are short hex strings). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const n = Math.max(ab.length, bb.length)
  for (let i = 0; i < n; i++) {
    diff |= (ab[i % ab.length] ?? 0) ^ (bb[i % bb.length] ?? 0)
  }
  return diff === 0
}

/** The env var that holds each provider's webhook secret (names only). */
export function secretEnvName(provider: ProviderName): string | null {
  switch (provider) {
    case 'btcpay':   return 'BTCPAY_WEBHOOK_SECRET'
    case 'opennode': return 'OPENNODE_API_KEY'
    default:         return null
  }
}

export async function verifyProviderWebhook(input: VerifyInput): Promise<VerifyResult> {
  const { provider, rawBody, body, headers, secret } = input
  if (!secret) return { ok: false, reason: 'secret_not_configured' }

  if (provider === 'btcpay') {
    const header = headers.get('BTCPay-Sig') ?? headers.get('btcpay-sig')
    if (!header) return { ok: false, reason: 'missing_signature' }
    const [algo, provided] = header.split('=')
    if (algo !== 'sha256' || !provided) return { ok: false, reason: 'malformed_signature' }
    const expected = await hmacSha256Hex(secret, rawBody)
    return timingSafeEqual(expected, provided.trim().toLowerCase())
      ? { ok: true }
      : { ok: false, reason: 'signature_mismatch' }
  }

  if (provider === 'opennode') {
    const id = typeof body?.id === 'string' ? body.id : null
    const provided = typeof body?.hashed_order === 'string' ? body.hashed_order : null
    if (!id || !provided) return { ok: false, reason: 'missing_signature' }
    const expected = await hmacSha256Hex(secret, id)
    return timingSafeEqual(expected, provided.trim().toLowerCase())
      ? { ok: true }
      : { ok: false, reason: 'signature_mismatch' }
  }

  return { ok: false, reason: 'unsupported_provider' }
}
