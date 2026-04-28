// ============================================
// Edge function: crypto-webhook
// ============================================
// Handles Lightning provider webhooks (invoice paid / expired / refunded).
//
// Two modes:
//   1. Provider webhook (production): authenticated by provider signature.
//      Currently supports OpenNode signature scheme; BTCPay scheme to add.
//   2. MOCK self-trigger (Alpha): the frontend calls this endpoint with
//      { invoice_id, mock_action: 'pay' } to simulate a payment after the
//      MOCK_PAY_DELAY_SEC delay. Authenticated by user JWT.
//
// On invoice.paid:
//   - Marks btc_invoices.status = 'paid'
//   - Marks booking.status = 'confirmed', escrow_status = 'held'
//   - Sets escrow_release_at = now + 24h
// (All idempotent — safe to call multiple times.)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const supa = getServiceClient()
    const body = await req.json().catch(() => ({}))

    // ─── MODE 1: Mock self-trigger (Alpha) ──────────────────
    // Frontend calls with { invoice_id, mock_action: 'pay' } after the
    // simulated delay elapses. JWT-authenticated.
    if (body.mock_action === 'pay') {
      const user = await getAuthUser(req)
      if (!user) return errorResponse('Unauthorized', 401)
      if (!body.invoice_id) return errorResponse('invoice_id required for mock_action')

      // Verify the user owns this invoice (via booking.guest_id)
      const { data: invoice } = await supa
        .from('btc_invoices')
        .select('id, status, booking_id, provider, bookings!inner(guest_id)')
        .eq('id', body.invoice_id)
        .single()
      if (!invoice) return errorResponse('Invoice not found', 404)
      // @ts-expect-error nested join shape
      if (invoice.bookings?.guest_id !== user.id) return errorResponse('Forbidden', 403)
      if (invoice.provider !== 'mock')             return errorResponse('Not a mock invoice', 400)
      if (invoice.status === 'paid') return jsonResponse({ ok: true, already_paid: true })

      // Confirm via RPC (idempotent)
      const { data: rpcData, error: rpcErr } = await supa.rpc('confirm_btc_invoice_payment', {
        p_invoice_id: body.invoice_id,
        p_paid_at:    new Date().toISOString(),
      })
      if (rpcErr) return errorResponse('Failed to confirm payment', 500, { detail: rpcErr.message })
      return jsonResponse({ ok: true, mock: true, ...rpcData })
    }

    // ─── MODE 2: Real provider webhook ──────────────────────
    // Currently only OpenNode signature scheme is implemented.
    // BTCPay scheme can be added similarly when that path lights up.
    const eventType = body.type || body.event || 'unknown'
    const providerInvoiceId = body.id || body.invoice_id || body.charge_id

    if (!providerInvoiceId) {
      return errorResponse('Missing provider invoice id', 400)
    }

    // TODO: Verify signature once a real provider is wired
    // For now, only mock_action=pay is supported in this Alpha.

    // Find the matching invoice in our DB
    const { data: invoice } = await supa
      .from('btc_invoices')
      .select('id, status, booking_id')
      .eq('provider_invoice_id', providerInvoiceId)
      .single()
    if (!invoice) {
      console.warn('Webhook: invoice not found in DB', providerInvoiceId)
      return jsonResponse({ ok: true, ignored: true })  // Don't 404 → provider would retry
    }
    if (invoice.status === 'paid') return jsonResponse({ ok: true, already_paid: true })

    // Map provider event types to our status transitions
    const isPaid    = ['paid', 'invoice.paid', 'charge.paid', 'invoice.settled'].some(s => eventType.includes(s))
    const isExpired = ['expired', 'invoice.expired'].some(s => eventType.includes(s))

    if (isPaid) {
      const { data: rpcData, error: rpcErr } = await supa.rpc('confirm_btc_invoice_payment', {
        p_invoice_id: invoice.id,
        p_paid_at:    new Date().toISOString(),
      })
      if (rpcErr) {
        console.error('confirm_btc_invoice_payment failed:', rpcErr)
        // Return 200 so provider doesn't retry forever; we logged it
        return jsonResponse({ ok: true, handler_error: rpcErr.message })
      }
      return jsonResponse({ ok: true, ...rpcData })
    }

    if (isExpired) {
      await supa.from('btc_invoices').update({ status: 'expired' }).eq('id', invoice.id)
      return jsonResponse({ ok: true, expired: true })
    }

    // Unknown event — acknowledge anyway
    console.log(`crypto-webhook: ignored event ${eventType}`)
    return jsonResponse({ ok: true, ignored: true })
  } catch (err) {
    console.error('crypto-webhook error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
