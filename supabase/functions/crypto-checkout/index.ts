// ============================================
// Edge function: crypto-checkout
// ============================================
// Creates a Lightning invoice for a booking via the configured provider
// (MockProvider for Alpha, BTCPay/OpenNode/Strike later).
//
// Body:
//   {
//     booking_id:   uuid,
//     room_amount:  number,    // in smallest currency unit (cents/satang)
//     processing_fee: number,  // 0 for Lightning (free), > 0 for on-chain
//     currency:     string,    // ISO 4217 (USD, EUR, THB)
//     property_id:  uuid,
//     property_name: string,
//     room_name:    string,
//     nights:       number,
//     guest_email?: string,
//     payment_method: 'lightning' | 'btc_onchain',  // default 'lightning'
//     booking_ref?: string,
//   }
//
// Returns:
//   {
//     invoice_id:  uuid,           // STAYLO btc_invoices.id (used to poll status)
//     bolt11:      string,         // BOLT11 — render as QR code
//     amount_sats: number,         // For display
//     expires_at:  string,         // ISO timestamp
//     fiat_amount_cents: number,
//     mock?:       { will_pay_at?: string }   // Only present in mock mode
//   }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { getLightningProvider } from '../_shared/lightning.ts'

const COMMISSION_RATE = 0.10

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await req.json()
    const {
      booking_id,
      booking_ref,
      room_amount,
      processing_fee = 0,
      currency = 'USD',
      property_id,
      property_name,
      room_name,
      nights,
      payment_method = 'lightning',
    } = body

    if (!booking_id || !property_id) {
      return errorResponse('Missing required fields: booking_id, property_id')
    }
    const roomAmt = Number(room_amount ?? 0)
    const procFee = Number(processing_fee ?? 0)
    if (!Number.isInteger(roomAmt) || roomAmt < 50) {
      return errorResponse('room_amount must be an integer >= 50 (smallest currency unit)')
    }

    const supa = getServiceClient()

    // Validate booking belongs to user + not already in escrow
    const { data: booking } = await supa
      .from('bookings')
      .select('id, guest_id, escrow_status')
      .eq('id', booking_id)
      .single()
    if (!booking)                          return errorResponse('Booking not found', 404)
    if (booking.guest_id !== user.id)      return errorResponse('Forbidden', 403)
    if (booking.escrow_status !== 'none')  return errorResponse(
      `Booking already in escrow_status=${booking.escrow_status}`, 409,
    )

    // Total guest pays in fiat = room + processing fee
    const totalCents = roomAmt + procFee
    const description = [
      `${property_name ?? 'STAYLO'} — ${room_name ?? 'Room'}`,
      booking_ref ? `Ref ${booking_ref}` : null,
      `${nights ?? 1}n stay`,
    ].filter(Boolean).join(' · ')

    // Create invoice via the configured provider (mock by default)
    const provider = getLightningProvider()
    const invoice  = await provider.createInvoice({
      fiatAmountCents: totalCents,
      fiatCurrency:    (currency || 'USD').toUpperCase(),
      description,
      expirySeconds:   3600,  // 1h
      metadata: {
        booking_id,
        booking_ref:  booking_ref ?? null,
        property_id,
        payment_method,
      },
    })

    // Persist
    const { data: persisted, error: persistErr } = await supa
      .from('btc_invoices')
      .insert({
        booking_id,
        provider:            provider.name,
        provider_invoice_id: invoice.providerInvoiceId,
        bolt11:              invoice.bolt11,
        payment_hash:        invoice.paymentHash,
        amount_sats:         invoice.amountSats,
        fiat_currency:       invoice.fiatCurrency,
        fiat_amount_cents:   invoice.fiatAmountCents,
        exchange_rate_used:  invoice.exchangeRateUsed,
        status:              'pending',
        expires_at:          invoice.expiresAt,
        metadata:            invoice.metadata ?? {},
      })
      .select('id, expires_at, metadata')
      .single()

    if (persistErr) {
      console.error('btc_invoices insert failed:', persistErr)
      return errorResponse('Failed to persist invoice', 500, { detail: persistErr.message })
    }

    // Update booking with payment method + processing fee
    const platformFee  = Math.round(roomAmt * COMMISSION_RATE)
    const payoutAmount = roomAmt - platformFee
    await supa.from('bookings').update({
      payment_method,
      currency:             (currency || 'USD').toUpperCase(),
      processing_fee_cents: procFee,
      total_price:          totalCents / 100,
      payout_amount_cents:  payoutAmount,
      platform_fee_cents:   platformFee,
    }).eq('id', booking_id)

    // ── Mock mode: schedule a self-triggered payment confirmation ──
    // In production with a real provider, the webhook is fired by the
    // provider (BTCPay/OpenNode/etc.). Here we use the mock metadata
    // `mock_will_pay_at` to drive a deferred webhook self-call.
    const isMock = provider.name === 'mock'
    const mockWillPayAt = invoice.metadata?.mock_will_pay_at as string | undefined

    return jsonResponse({
      invoice_id:        persisted.id,
      provider:          provider.name,
      bolt11:            invoice.bolt11,
      payment_hash:      invoice.paymentHash,
      amount_sats:       invoice.amountSats,
      fiat_amount_cents: invoice.fiatAmountCents,
      fiat_currency:     invoice.fiatCurrency,
      expires_at:        invoice.expiresAt,
      ...(isMock ? { mock: { will_pay_at: mockWillPayAt } } : {}),
    })
  } catch (err) {
    console.error('crypto-checkout error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
