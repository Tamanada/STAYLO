// ============================================
// Edge function: crypto-webhook
// ============================================
// Handles Lightning provider webhooks (invoice paid / expired).
//
// Two modes, selected by LIGHTNING_PROVIDER (default 'mock'):
//   1. MOCK self-trigger (Alpha, LIGHTNING_PROVIDER=mock): the frontend calls
//      { invoice_id, mock_action: 'pay' } with the guest's JWT to simulate a
//      payment. Only the booking owner, only for 'mock' invoices. Closed as
//      soon as a real provider is configured.
//   2. Provider webhook (LIGHTNING_PROVIDER=btcpay | opennode): the request
//      must carry a valid provider signature (_shared/webhookAuth.ts) and the
//      invoice must belong to that provider. Closed while the provider is the
//      mock: there is no provider to trust, so nothing is accepted.
//
// On invoice paid:
//   - btc_invoices.status = 'paid'
//   - booking.status = 'confirmed', escrow_status = 'held', escrow_release_at set
// (confirm_btc_invoice_payment is idempotent; service_role only.)
//
// Deploy note: this function must be reachable by the provider without a
// Supabase JWT (verify_jwt = false in supabase/config.toml); the signature
// check above is the authentication.
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { verifyProviderWebhook, secretEnvName } from '../_shared/webhookAuth.ts'

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const supa = getServiceClient()
    const providerName = (Deno.env.get('LIGHTNING_PROVIDER') ?? 'mock').toLowerCase()

    // Raw body first: provider signatures cover the exact bytes received.
    const rawBody = await req.text()
    let body: Record<string, unknown> = {}
    try { body = rawBody ? JSON.parse(rawBody) : {} } catch { body = {} }

    // ─── MODE 1: Mock self-trigger (Alpha) ──────────────────
    if (body.mock_action === 'pay') {
      if (providerName !== 'mock') {
        return errorResponse('Mock payments are disabled', 403, { code: 'mock_disabled' })
      }
      const user = await getAuthUser(req)
      if (!user) return errorResponse('Unauthorized', 401)
      if (!body.invoice_id) return errorResponse('invoice_id required for mock_action')

      // The caller must own the booking behind the invoice
      const { data: invoice } = await supa
        .from('btc_invoices')
        .select('id, status, booking_id, provider, bookings!inner(guest_id)')
        .eq('id', body.invoice_id as string)
        .single()
      if (!invoice) return errorResponse('Invoice not found', 404)
      // @ts-expect-error nested join shape
      if (invoice.bookings?.guest_id !== user.id) return errorResponse('Forbidden', 403)
      if (invoice.provider !== 'mock')             return errorResponse('Not a mock invoice', 400)
      if (invoice.status === 'paid') return jsonResponse({ ok: true, already_paid: true })

      const { data: rpcData, error: rpcErr } = await supa.rpc('confirm_btc_invoice_payment', {
        p_invoice_id: body.invoice_id,
        p_paid_at:    new Date().toISOString(),
      })
      if (rpcErr) return errorResponse('Failed to confirm payment', 500, { detail: rpcErr.message })
      return jsonResponse({ ok: true, mock: true, ...rpcData })
    }

    // ─── MODE 2: Real provider webhook ──────────────────────
    if (providerName === 'mock') {
      // No real provider is configured: there is nobody to accept a webhook from.
      return errorResponse('Provider webhooks are disabled', 403, { code: 'provider_webhooks_disabled' })
    }

    const secretName = secretEnvName(providerName)
    const verdict = await verifyProviderWebhook({
      provider: providerName,
      rawBody,
      body,
      headers: req.headers,
      secret: secretName ? Deno.env.get(secretName) : null,
    })
    if (!verdict.ok) {
      console.warn(`crypto-webhook: rejected ${providerName} webhook (${verdict.reason})`)
      return errorResponse('Invalid webhook signature', 401, { code: 'invalid_signature' })
    }

    const eventType = String(body.type || body.event || body.status || 'unknown')
    const providerInvoiceId = (body.id || body.invoice_id || body.charge_id) as string | undefined
    if (!providerInvoiceId) {
      return errorResponse('Missing provider invoice id', 400)
    }

    // Only invoices issued through this provider can be settled by it
    const { data: invoice } = await supa
      .from('btc_invoices')
      .select('id, status, booking_id')
      .eq('provider', providerName)
      .eq('provider_invoice_id', providerInvoiceId)
      .maybeSingle()
    if (!invoice) {
      console.warn('crypto-webhook: invoice not found for provider', providerName, providerInvoiceId)
      return jsonResponse({ ok: true, ignored: true })  // 200: the provider must not retry forever
    }
    if (invoice.status === 'paid') return jsonResponse({ ok: true, already_paid: true })

    const lower = eventType.toLowerCase()
    const isPaid    = ['paid', 'settled', 'invoicesettled', 'invoice.paid', 'charge.paid', 'invoice.settled'].some(s => lower.includes(s))
    const isExpired = ['expired', 'invoiceexpired', 'invoice.expired'].some(s => lower.includes(s))

    if (isPaid) {
      const { data: rpcData, error: rpcErr } = await supa.rpc('confirm_btc_invoice_payment', {
        p_invoice_id: invoice.id,
        p_paid_at:    new Date().toISOString(),
      })
      if (rpcErr) {
        console.error('confirm_btc_invoice_payment failed:', rpcErr)
        return jsonResponse({ ok: true, handler_error: rpcErr.message })
      }
      return jsonResponse({ ok: true, ...rpcData })
    }

    if (isExpired) {
      await supa.from('btc_invoices').update({ status: 'expired' }).eq('id', invoice.id).eq('status', 'pending')
      return jsonResponse({ ok: true, expired: true })
    }

    console.log(`crypto-webhook: ignored event ${eventType}`)
    return jsonResponse({ ok: true, ignored: true })
  } catch (err) {
    console.error('crypto-webhook error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
