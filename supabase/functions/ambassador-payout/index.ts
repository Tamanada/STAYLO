// ============================================
// Edge function: ambassador-payout
// ============================================
// Pays an ambassador's accumulated 'ready' commissions in Bitcoin via
// the configured Lightning provider.
//
// Two modes:
//   1. Self-trigger (ambassador clicks "Withdraw now")
//      Body: { /* nothing */ }
//      Auth:  user JWT — pays only their own commissions
//
//   2. Cron mode — pays all ambassadors with auto_payout=TRUE whose
//      accumulated ready_cents >= min_payout_sats threshold
//      Body: { cron: true }
//      Auth:  x-cron-secret header
//
// In MOCK provider mode, the payout is simulated (status flips to 'paid'
// without actually moving sats). When BTCPay/OpenNode is wired (chantier
// future), the provider's real .payToAddress() is called.
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { getLightningProvider } from '../_shared/lightning.ts'

const MIN_PAYOUT_FALLBACK_SATS = 1000  // ~$1 — tiny floor to avoid sub-dust payouts

interface AmbassadorRow {
  id: string
  ln_address: string | null
  btc_address: string | null
  min_payout_sats: number | null
  auto_payout: boolean | null
}

interface CommissionRow {
  id: string
  ambassador_user_id: string
  commission_cents: number
  currency: string
}

async function payOneAmbassador(ambassadorId: string) {
  const supa     = getServiceClient()
  const provider = getLightningProvider()

  // 1. Load ambassador wallet info
  const { data: amb, error: ambErr } = await supa
    .from('users')
    .select('id, ln_address, btc_address, min_payout_sats, auto_payout')
    .eq('id', ambassadorId)
    .single<AmbassadorRow>()
  if (ambErr || !amb) return { ambassador_id: ambassadorId, error: 'Ambassador not found' }
  if (!amb.ln_address && !amb.btc_address) {
    return { ambassador_id: ambassadorId, error: 'No payout address set (ln_address or btc_address)' }
  }

  // 2. Load all 'ready' commissions for this ambassador
  const { data: rows, error: rowsErr } = await supa
    .from('ambassador_commissions')
    .select('id, ambassador_user_id, commission_cents, currency')
    .eq('ambassador_user_id', ambassadorId)
    .eq('status', 'ready')
    .order('ready_at', { ascending: true })
    .returns<CommissionRow[]>()
  if (rowsErr) return { ambassador_id: ambassadorId, error: rowsErr.message }
  if (!rows || rows.length === 0) {
    return { ambassador_id: ambassadorId, paid_count: 0, paid_cents: 0, message: 'No ready commissions' }
  }

  // 3. Sum up. For now, assume all commissions are in the same currency (USD).
  //    In a future iteration, we'd convert each to a common base.
  const totalCents = rows.reduce((acc, r) => acc + (r.commission_cents || 0), 0)
  const currency   = rows[0].currency || 'USD'

  // 4. Create the payout invoice via the provider.
  //    The provider returns an invoice; we record amount_sats and metadata.
  const invoice = await provider.createInvoice({
    fiatAmountCents: totalCents,
    fiatCurrency:    currency,
    description:     `STAYLO ambassador payout — ${rows.length} commission${rows.length > 1 ? 's' : ''}`,
    expirySeconds:   3600,
    metadata: {
      ambassador_user_id: amb.id,
      commission_ids:     rows.map(r => r.id),
      payout_address:     amb.ln_address || amb.btc_address,
    },
  })

  if (invoice.amountSats < (amb.min_payout_sats ?? MIN_PAYOUT_FALLBACK_SATS)) {
    return {
      ambassador_id: ambassadorId,
      skipped:       true,
      reason:        `below min_payout_sats threshold (${invoice.amountSats} < ${amb.min_payout_sats ?? MIN_PAYOUT_FALLBACK_SATS})`,
    }
  }

  // 5. MOCK provider: simulate the payout immediately. Real provider would
  //    call provider.payToAddress(amb.ln_address, sats). To be implemented
  //    when BTCPay/OpenNode lands.
  const isMock     = provider.name === 'mock'
  const paymentHash = invoice.paymentHash
  const paidAt     = new Date().toISOString()

  // 6. Mark all commissions paid
  const { error: updErr } = await supa
    .from('ambassador_commissions')
    .update({
      status:              'paid',
      paid_at:             paidAt,
      payout_provider:     provider.name,
      payout_invoice:      invoice.bolt11,
      payout_payment_hash: paymentHash,
      payout_address_used: amb.ln_address || amb.btc_address,
      amount_sats:         invoice.amountSats,  // pro-rata-ed below if needed
    })
    .in('id', rows.map(r => r.id))
  if (updErr) {
    return { ambassador_id: ambassadorId, error: `DB update failed: ${updErr.message}` }
  }

  return {
    ambassador_id: ambassadorId,
    paid_count:    rows.length,
    paid_cents:    totalCents,
    paid_sats:     invoice.amountSats,
    currency,
    address_used:  amb.ln_address || amb.btc_address,
    mock:          isMock,
  }
}

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const supa = getServiceClient()
    const body = await req.json().catch(() => ({}))
    const isCron = body.cron === true

    if (isCron) {
      const cronSecret = Deno.env.get('CRON_SECRET')
      const provided   = req.headers.get('x-cron-secret')
      if (!cronSecret || provided !== cronSecret) {
        return errorResponse('Cron auth failed', 401)
      }

      // Find all ambassadors with auto_payout=TRUE who have at least 1 'ready'
      // commission AND meet their min_payout_sats threshold.
      const { data: candidates, error: candErr } = await supa
        .from('users')
        .select('id')
        .eq('auto_payout', true)
        .returns<{ id: string }[]>()
      if (candErr) return errorResponse('Cron query failed', 500, { detail: candErr.message })

      const results = []
      for (const c of candidates ?? []) {
        try {
          results.push(await payOneAmbassador(c.id))
        } catch (err) {
          results.push({ ambassador_id: c.id, error: err instanceof Error ? err.message : String(err) })
        }
      }
      return jsonResponse({ count: results.length, results })
    }

    // Manual / self-trigger mode
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const result = await payOneAmbassador(user.id)
    return jsonResponse(result)
  } catch (err) {
    console.error('ambassador-payout error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
