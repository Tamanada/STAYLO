// ============================================
// Edge function: crypto-checkout
// ============================================
// Creates a Lightning invoice for a booking via the configured provider
// (MockProvider for Alpha, BTCPay/OpenNode/Strike later).
//
// Body:
//   {
//     booking_id:   uuid,
//     room_amount?:  number,   // what the browser displayed, minor units.
//                              // Informational only: the server recomputes
//                              // the price from the database (409
//                              // price_changed on mismatch).
//     processing_fee?: number, // same, informational only
//     property_id?: string,    // must equal the booking's property
//     currency?:    string,    // must equal the property's currency
//     guest_email?: string,
//     payment_method: 'lightning' | 'btc_onchain',  // default 'lightning'
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
//
// Security (guardian finding #1, 2026-10-05): the amount is never taken from
// the request. Same derivation as the card checkout (_shared/pricing.ts).
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { getLightningProvider } from '../_shared/lightning.ts'
import { deriveBookingCharge } from '../_shared/pricing.ts'

const COMMISSION_RATE = 0.10

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await req.json()
    const {
      booking_id,
      room_amount,
      processing_fee,
      currency: bodyCurrency,
      property_id: bodyPropertyId,
      payment_method = 'lightning',
    } = body

    if (!booking_id) return errorResponse('Missing required field: booking_id')
    if (!['lightning', 'btc_onchain'].includes(payment_method)) {
      return errorResponse('payment_method must be lightning or btc_onchain', 400, { code: 'payment_method_invalid' })
    }

    const supa = getServiceClient()

    // 1. Booking owned by the caller, not yet in escrow
    const { data: booking } = await supa
      .from('bookings')
      .select('id, guest_id, escrow_status, property_id, room_id, check_in, check_out, rooms_count, adults, children, package_id, booking_ref')
      .eq('id', booking_id)
      .single()
    if (!booking)                          return errorResponse('Booking not found', 404)
    if (booking.guest_id !== user.id)      return errorResponse('Forbidden', 403)
    if (booking.escrow_status !== 'none')  return errorResponse(
      `Booking already in escrow_status=${booking.escrow_status}`, 409,
    )
    if (bodyPropertyId && bodyPropertyId !== booking.property_id) {
      return errorResponse('property_id does not match the booking', 400, { code: 'property_mismatch' })
    }

    // 2. Property (from the booking row)
    const { data: property } = await supa
      .from('properties').select('id, name, currency, status').eq('id', booking.property_id).single()
    if (!property) return errorResponse('Property not found', 404)
    if (!['live', 'validated'].includes(property.status)) return errorResponse('Property is not bookable', 400)
    const cur = (property.currency ?? 'USD').toUpperCase()
    if (bodyCurrency && String(bodyCurrency).toUpperCase() !== cur) {
      return errorResponse('currency does not match the property', 400, { code: 'currency_mismatch' })
    }

    // 3. Room, rates, package
    const { data: room } = await supa
      .from('rooms')
      .select('id, property_id, name, is_active, base_price, monthly_rate, monthly_min_nights, weekly_discount_pct, weekly_min_nights, max_guests, extra_bed_available, extra_bed_max_qty, extra_bed_price, extra_bed_adults_allowed')
      .eq('id', booking.room_id)
      .maybeSingle()
    if (!room || room.property_id !== booking.property_id || room.is_active === false) {
      return errorResponse('Room is not available', 409, { code: 'room_unavailable' })
    }
    const { data: availability } = await supa
      .from('room_availability')
      .select('date, price_override, is_blocked, min_stay, promo_pct')
      .eq('room_id', room.id)
      .gte('date', booking.check_in)
      .lt('date', booking.check_out)

    let pkg = null
    let pkgQty = 1
    if (booking.package_id) {
      const { data: p } = await supa
        .from('packages')
        .select('id, price, pricing_type, pricing_mode, is_active, property_id, room_packages!inner(qty, room_id)')
        .eq('id', booking.package_id)
        .eq('room_packages.room_id', room.id)
        .maybeSingle()
      if (!p || p.is_active === false || p.property_id !== booking.property_id) {
        return errorResponse('Package is not available for this room', 400, { code: 'package_invalid' })
      }
      pkg = p
      // @ts-expect-error nested join shape
      pkgQty = Number(p.room_packages?.[0]?.qty) || 1
    }

    // 4. Server-side price
    const charge = deriveBookingCharge({
      room, availability: availability ?? [], pkg, pkgQty,
      checkIn: booking.check_in, checkOut: booking.check_out,
      roomsCount: booking.rooms_count, adults: booking.adults, children: booking.children,
      paymentMethod: payment_method,
    })
    if (charge.hasBlockedDay) return errorResponse('At least one night is unavailable', 409, { code: 'dates_unavailable' })
    if (!charge.minStayOK) {
      return errorResponse(`These dates require at least ${charge.minStayRequired} nights`, 400, { code: 'min_stay' })
    }
    if (charge.roomAmountCents < 50) return errorResponse('Booking amount too small to charge', 400, { code: 'amount_too_small' })
    const roomAmt = charge.roomAmountCents
    const procFee = charge.processingFeeCents
    if ((room_amount !== undefined && room_amount !== null && Number(room_amount) !== roomAmt) ||
        (processing_fee !== undefined && processing_fee !== null && Number(processing_fee) !== procFee)) {
      return errorResponse('The price of this booking has changed. Please review it.', 409, {
        code: 'price_changed',
        server: { room_amount_cents: roomAmt, processing_fee_cents: procFee, total_charged_cents: roomAmt + procFee, currency: cur },
      })
    }

    // 5. Invoice via the configured provider (mock by default)
    const totalCents = roomAmt + procFee
    const nights = charge.nights
    const description = [
      `${property.name} · ${room.name ?? 'Room'}`,
      booking.booking_ref ? `Ref ${booking.booking_ref}` : null,
      `${nights}n stay`,
    ].filter(Boolean).join(' · ')

    const provider = getLightningProvider()
    const invoice  = await provider.createInvoice({
      fiatAmountCents: totalCents,
      fiatCurrency:    cur,
      description,
      expirySeconds:   3600,  // 1h
      metadata: {
        booking_id,
        booking_ref:  booking.booking_ref ?? null,
        property_id:  booking.property_id,
        payment_method,
      },
    })

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

    // 6. Booking breakdown (server-derived)
    const platformFee  = Math.round(roomAmt * COMMISSION_RATE)
    const payoutAmount = roomAmt - platformFee
    await supa.from('bookings').update({
      payment_method,
      currency:             cur,
      processing_fee_cents: procFee,
      total_price:          totalCents / 100,
      payout_amount_cents:  payoutAmount,
      platform_fee_cents:   platformFee,
      extra_beds_count:     charge.extraBedsCount,
      extra_bed_subtotal:   charge.extraBedSubtotal,
    }).eq('id', booking_id)

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
