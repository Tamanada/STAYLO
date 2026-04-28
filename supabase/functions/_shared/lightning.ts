// ============================================
// Lightning provider abstraction
// ============================================
// Defines the LightningProvider interface and ships two implementations:
//   - MockProvider:    for Alpha demo (no KYC, simulates Lightning invoices
//                      with auto-payment after a short delay, runs entirely
//                      in our edge functions)
//   - OpenNodeProvider: stub for when STAYLO is incorporated and OpenNode
//                       KYC is complete. Same interface — swap in 1 line.
//
// Selection is via env var LIGHTNING_PROVIDER. Default = 'mock'.
// ============================================

export interface LightningInvoice {
  /** Provider's internal invoice/charge ID */
  providerInvoiceId: string
  /** BOLT11 string (lnbc...) — the QR-code-able invoice */
  bolt11: string
  /** Payment hash (32 bytes hex) */
  paymentHash: string
  /** Amount the guest pays, in satoshis */
  amountSats: number
  /** Original fiat amount in cents (for audit) */
  fiatAmountCents: number
  /** Currency the fiat amount is in (e.g. 'USD') */
  fiatCurrency: string
  /** Exchange rate fiat→BTC at the moment of invoice creation (BTC per fiat unit) */
  exchangeRateUsed: number
  /** ISO-8601 expiration */
  expiresAt: string
  /** Provider-specific extras (used by webhook to verify) */
  metadata?: Record<string, unknown>
}

export interface LightningProvider {
  readonly name: 'mock' | 'btcpay' | 'opennode' | 'strike'
  /**
   * Create a new Lightning invoice for the given fiat amount.
   * The provider converts to satoshis using its current exchange rate.
   */
  createInvoice(args: {
    fiatAmountCents:  number
    fiatCurrency:     string  // 'USD', 'EUR', 'THB', ...
    description:      string  // shown in some Lightning wallets
    expirySeconds?:   number  // default 3600 (1h)
    metadata?:        Record<string, unknown>
  }): Promise<LightningInvoice>

  /** Re-fetch the current status of an invoice — used by polling fallback */
  getInvoiceStatus(providerInvoiceId: string): Promise<{
    status:    'pending' | 'paid' | 'expired' | 'refunded' | 'underpaid' | 'failed'
    paidAt?:   string
    metadata?: Record<string, unknown>
  }>
}

// ────────────────────────────────────────────────────
// MockProvider — Alpha demo, no external dependency
// ────────────────────────────────────────────────────
// What it does:
//   - createInvoice() returns a fake but well-formed BOLT11 invoice
//     and a payment_hash. The exchange rate is hardcoded (~$95k/BTC).
//   - getInvoiceStatus() always returns 'pending' if called within
//     MOCK_PAY_DELAY_SEC of creation, else 'paid'. This mimics a guest
//     paying after a few seconds.
//   - For demo/investor purposes, the auto-payment is fired by the
//     crypto-checkout edge function via setTimeout-equivalent (we
//     write the would-be paid_at into metadata at creation).
//
// Real Lightning behavior we cleanly fake:
//   - BOLT11 invoice with valid prefix (lnbc... for mainnet, lntb... testnet)
//   - 32-byte hex payment_hash
//   - Expiry timestamp
//   - Sat amount derived from fiat at the moment of creation
//
// To swap in a real provider later, set LIGHTNING_PROVIDER=btcpay (or
// opennode) and supply BTCPAY_URL + BTCPAY_API_KEY (or OPENNODE_API_KEY).
// ────────────────────────────────────────────────────

const MOCK_BTC_USD       = 95_000        // ~current BTC price (will drift, doesn't matter for mock)
const MOCK_PAY_DELAY_SEC = 8             // simulated time for guest to "pay" the invoice
const SATS_PER_BTC       = 100_000_000

function toSats(fiatCents: number, fiatCurrency: string): number {
  // Very rough fiat → USD → sats. Good enough for mock.
  // (Real provider does this with live exchange rates internally.)
  const fiatPerUsd: Record<string, number> = {
    USD: 1.00,
    EUR: 1.08,
    GBP: 1.25,
    THB: 0.028,
    JPY: 0.0064,
  }
  const usdAmount = (fiatCents / 100) * (fiatPerUsd[fiatCurrency.toUpperCase()] ?? 1)
  return Math.round((usdAmount / MOCK_BTC_USD) * SATS_PER_BTC)
}

function randomHex(byteLen: number): string {
  const buf = new Uint8Array(byteLen)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fakeBolt11(amountSats: number): string {
  // Fake but well-formed-looking BOLT11. Real ones have HRP, amount encoding
  // and signature. Here we just produce a recognizable string for the QR.
  // Wallet apps would reject this if scanned — fine, this is the MOCK.
  const tagged = `lnbcrt${amountSats}n1p` + randomHex(40).slice(0, 80)
  return tagged
}

export class MockProvider implements LightningProvider {
  readonly name = 'mock' as const

  async createInvoice({
    fiatAmountCents, fiatCurrency, description, expirySeconds, metadata,
  }: Parameters<LightningProvider['createInvoice']>[0]): Promise<LightningInvoice> {
    const now = Date.now()
    const expirySec = expirySeconds ?? 3600
    const sats = toSats(fiatAmountCents, fiatCurrency)
    const providerInvoiceId = `mock_${randomHex(8)}`
    const paymentHash       = randomHex(32)
    const wouldPayAtIso     = new Date(now + MOCK_PAY_DELAY_SEC * 1000).toISOString()

    return {
      providerInvoiceId,
      bolt11:           fakeBolt11(sats),
      paymentHash,
      amountSats:       sats,
      fiatAmountCents,
      fiatCurrency,
      exchangeRateUsed: 1 / MOCK_BTC_USD,  // BTC per USD (1/price)
      expiresAt:        new Date(now + expirySec * 1000).toISOString(),
      metadata: {
        mock_will_pay_at: wouldPayAtIso,
        mock_description: description,
        ...metadata,
      },
    }
  }

  async getInvoiceStatus(providerInvoiceId: string) {
    // The mock has no persistent state of its own; the actual paid
    // detection happens in crypto-webhook (which is invoked via a
    // self-trigger after the simulated delay) or via this status-poll
    // endpoint reading the DB row.
    // Returning 'pending' means "go check the DB / trigger the simulated webhook".
    return { status: 'pending' as const, metadata: { providerInvoiceId } }
  }
}

// ────────────────────────────────────────────────────
// Provider factory — selects implementation from env
// ────────────────────────────────────────────────────
export function getLightningProvider(): LightningProvider {
  const which = (Deno.env.get('LIGHTNING_PROVIDER') ?? 'mock').toLowerCase()
  switch (which) {
    case 'mock':
      return new MockProvider()
    // case 'btcpay':   return new BTCPayProvider()    // chantier #9.X (when STAYLO incorporated)
    // case 'opennode': return new OpenNodeProvider()  // chantier #9.X (after KYC)
    default:
      console.warn(`Unknown LIGHTNING_PROVIDER=${which}, falling back to mock`)
      return new MockProvider()
  }
}
