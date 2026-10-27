// ============================================
// Edge function: checkout (Stripe Connect + escrow)
// ============================================
// Creates a Stripe Checkout Session for a booking.
//
// Strategy: Separate Charges and Transfers (SCT).
//   1. Guest pays the platform account (no transfer_data, no application_fee)
//   2. Funds land in STAYLO platform balance → escrow
//   3. release-escrow function later transfers 90% to the hotelier's connected
//      account (linked via source_transaction)
//
// Why SCT instead of destination charges? Because we need real escrow control
// (hold funds, release on questionnaire / T+24h, refund easily). Destination
// charges transfer immediately and are harder to claw back.
//
// Body:
//   {
//     booking_id: uuid,
//     room_amount?: number,       // what the browser displayed, minor units.
//                                 // Informational only: the server recomputes
//                                 // the price from the booking's room, dates,
//                                 // rates, extra beds and package. A mismatch
//                                 // returns 409 price_changed so the guest sees
//                                 // the fresh price instead of being charged
//                                 // something else.
//     processing_fee?: number,    // same, informational only
//     property_id?: string,       // must equal the booking's property (400 if not)
//     currency?: string,          // must equal the property's currency (400 if not)
//     guest_email?: string,
//     payment_method?: 'card',    // this function is the card rail only
//   }
// Stripe charges the guest:  room_amount + processing_fee (3% for card)
// Hotelier receives:          90% of room_amount  (NOT total)
// STAYLO commission:          10% of room_amount
// Returns: { url, session_id, total_charged_cents, payout_amount_cents, platform_fee_cents }
//
// Security (guardian finding #1, 2026-10-05): nothing money-related is taken
// from the request. Price, currency, property and hotelier account all come
// from the database rows of the booking the caller owns.
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { stripeFetch, StripeCheckoutSession } from '../_shared/stripe.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { deriveBookingCharge } from '../_shared/pricing.ts'

const COMMISSION_RATE = 0.10  // 10% to STAYLO

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      return errorResponse('Stripe not configured', 503)
    }

    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await req.json()
    const {
      booking_id,
      room_amount,
      processing_fee,
      currency: bodyCurrency,
      property_id: bodyPropertyId,
      guest_email,
      payment_method = 'card',
      amount: legacyAmount,   // old clients sent `amount` (= total)
    } = body

    if (!booking_id) return errorResponse('Missing required field: booking_id')
    if (payment_method !== 'card') {
      return errorResponse('checkout only handles card payments', 400, { code: 'payment_method_invalid' })
    }

    const supa = getServiceClient()

    // 1. The booking, and only what the caller owns
    const { data: booking, error: bErr } = await supa
      .from('bookings')
      .select('id, guest_id, escrow_status, property_id, room_id, check_in, check_out, rooms_count, adults, children, guests, package_id, booking_ref')
      .eq('id', booking_id)
      .single()
    if (bErr || !booking) return errorResponse('Booking not found', 404)
    if (booking.guest_id !== user.id) return errorResponse('Forbidden', 403)
    if (booking.escrow_status !== 'none') {
      return errorResponse(`Booking already in escrow_status=${booking.escrow_status}`, 409)
    }
    if (bodyPropertyId && bodyPropertyId !== booking.property_id) {
      return errorResponse('property_id does not match the booking', 400, { code: 'property_mismatch' })
    }

    // 2. Property, from the booking row (never from the request)
    const { data: property, error: pErr } = await supa
      .from('properties').select('id, name, user_id, currency, status').eq('id', booking.property_id).single()
    if (pErr || !property) return errorResponse('Property not found', 404)
    if (!['live', 'validated'].includes(property.status)) {
      return errorResponse('Property is not bookable', 400)
    }
    const cur = (property.currency ?? 'USD').toUpperCase()
    if (bodyCurrency && String(bodyCurrency).toUpperCase() !== cur) {
      return errorResponse('currency does not match the property', 400, { code: 'currency_mismatch' })
    }

    // 3. Room + rates for the stay, package if any
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
      paymentMethod: 'card',
    })
    if (charge.hasBlockedDay) {
      return errorResponse('At least one night is unavailable', 409, { code: 'dates_unavailable' })
    }
    if (!charge.minStayOK) {
      return errorResponse(`These dates require at least ${charge.minStayRequired} nights`, 400, { code: 'min_stay' })
    }
    if (charge.roomAmountCents < 50) {
      return errorResponse('Booking amount too small to charge', 400, { code: 'amount_too_small' })
    }
    const roomAmt = charge.roomAmountCents
    const procFee = charge.processingFeeCents

    // The browser's figures are compared, never used. A mismatch means the
    // price moved (or the request was edited): the guest gets the fresh price.
    const clientRoom = room_amount ?? legacyAmount
    const clientFee  = processing_fee
    if ((clientRoom !== undefined && clientRoom !== null && Number(clientRoom) !== roomAmt) ||
        (clientFee  !== undefined && clientFee  !== null && Number(clientFee)  !== procFee)) {
      return errorResponse('The price of this booking has changed. Please review it.', 409, {
        code: 'price_changed',
        server: { room_amount_cents: roomAmt, processing_fee_cents: procFee, total_charged_cents: roomAmt + procFee, currency: cur },
      })
    }

    // 5. Hotelier Stripe Connect account (of the booking's property owner)
    const { data: hotelierAccount } = await supa
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('user_id', property.user_id)
      .maybeSingle()
    if (!hotelierAccount) {
      return errorResponse(
        'Hotelier has not completed Stripe onboarding yet. Booking is on hold.',
        409,
        { code: 'hotelier_not_onboarded' },
      )
    }
    // TEMPORARY (Alpha test): only a stripe_accounts row is required, not
    // charges_enabled/payouts_enabled. The platform charge succeeds (funds on
    // STAYLO balance); release-escrow's transfer fails later if the destination
    // is still restricted, which is the right behavior. RE-ENABLE before
    // production by uncommenting the block below.
    //
    // if (!hotelierAccount.charges_enabled || !hotelierAccount.payouts_enabled) {
    //   return errorResponse('Hotelier Stripe account is not fully active yet.', 409, { code: 'hotelier_account_inactive' })
    // }

    // 6. Split (commission on ROOM AMOUNT, NOT total; processing fee is not split)
    const platformFee  = Math.round(roomAmt * COMMISSION_RATE)
    const payoutAmount = roomAmt - platformFee
    const totalCharged = roomAmt + procFee

    // 7. Checkout Session: one line item with the total the guest pays.
    const origin = req.headers.get('origin') ?? 'https://staylo.app'
    const nights = charge.nights
    const session = await stripeFetch<StripeCheckoutSession>('/checkout/sessions', {
      body: {
        mode: 'payment',
        payment_method_types: ['card'],
        success_url: `${origin}/dashboard/bookings?booking=success&id=${booking_id}`,
        cancel_url:  `${origin}/ota/${booking.property_id}/checkout?cancelled=1`,
        customer_email: guest_email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: cur.toLowerCase(),
              unit_amount: totalCharged,
              product_data: {
                name:        `${property.name} · ${room.name ?? 'Room'}${booking.booking_ref ? `  ·  ${booking.booking_ref}` : ''}`,
                description: `${nights} night${nights > 1 ? 's' : ''} stay${booking.booking_ref ? `  ·  Ref ${booking.booking_ref}` : ''}`,
              },
            },
          },
        ],
        metadata: {
          booking_id,
          booking_ref:    booking.booking_ref ?? '',
          property_id:    booking.property_id,
          hotelier_user_id:           property.user_id,
          hotelier_stripe_account_id: hotelierAccount.stripe_account_id,
          room_amount:    String(roomAmt),
          processing_fee: String(procFee),
          total_charged:  String(totalCharged),
          payout_amount:  String(payoutAmount),
          platform_fee:   String(platformFee),
          currency:       cur,
          payment_method,
        },
        payment_intent_data: {
          transfer_group: `booking_${booking_id}`,
          metadata: {
            booking_id,
            property_id: booking.property_id,
            hotelier_stripe_account_id: hotelierAccount.stripe_account_id,
            payout_amount: String(payoutAmount),
            platform_fee:  String(platformFee),
          },
        },
      },
    })

    // 8. Persist session id + server-derived breakdown
    await supa.from('bookings').update({
      stripe_checkout_session_id: session.id,
      currency:             cur,
      payment_method,
      processing_fee_cents: procFee,
      total_price:          totalCharged / 100,    // bookings.total_price is decimal
      payout_amount_cents:  payoutAmount,
      platform_fee_cents:   platformFee,
      extra_beds_count:     charge.extraBedsCount,
      extra_bed_subtotal:   charge.extraBedSubtotal,
    }).eq('id', booking_id)

    return jsonResponse({
      url: session.url,
      session_id: session.id,
      total_charged_cents: totalCharged,
      payout_amount_cents: payoutAmount,
      platform_fee_cents:  platformFee,
      processing_fee_cents: procFee,
    })
  } catch (err) {
    console.error('checkout error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
