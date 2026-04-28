// ============================================
// Edge function: checkout (refactored for Stripe Connect + escrow)
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
//     room_amount: number,        // smallest currency unit; what hotelier prices
//     processing_fee: number,     // smallest currency unit; what guest pays extra
//                                 //   to cover Stripe (3% for card, 0 for Lightning)
//                                 // Defaults to 0 if absent.
//     currency: string,           // ISO 4217 lowercase
//     property_id: uuid,
//     property_name: string,
//     room_name: string,
//     nights: number,
//     guest_email?: string,
//     payment_method?: string,    // 'card' | 'lightning' | 'btc_onchain'
//   }
// Stripe charges the guest:  room_amount + processing_fee
// Hotelier receives:          90% of room_amount  (NOT total)
// STAYLO commission:          10% of room_amount
// processing_fee covers Stripe's actual cost (~2.9% + $0.30) — guest absorbs.
// Returns: { url, session_id, total_charged_cents, payout_amount_cents, platform_fee_cents }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { stripeFetch, StripeCheckoutSession } from '../_shared/stripe.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'

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
      booking_ref,                          // human-friendly STY-XXXXXX
      room_amount,
      processing_fee = 0,
      currency,
      property_id,
      property_name,
      room_name,
      nights,
      guest_email,
      payment_method = 'card',
      // Backward-compat: old clients still send `amount` (= total)
      amount: legacyAmount,
    } = body

    if (!booking_id || !property_id) {
      return errorResponse('Missing required fields: booking_id, property_id')
    }
    // Resolve room_amount (preferred) or fall back to legacy `amount`
    const roomAmt = Number(room_amount ?? legacyAmount ?? 0)
    const procFee = Number(processing_fee ?? 0)
    if (!Number.isInteger(roomAmt) || roomAmt < 50) {
      return errorResponse('room_amount must be an integer >= 50 (smallest currency unit)')
    }
    if (!Number.isInteger(procFee) || procFee < 0) {
      return errorResponse('processing_fee must be a non-negative integer')
    }

    const supa = getServiceClient()

    // 1. Validate booking exists & belongs to this guest
    const { data: booking, error: bErr } = await supa
      .from('bookings').select('id, guest_id, escrow_status').eq('id', booking_id).single()
    if (bErr || !booking) return errorResponse('Booking not found', 404)
    if (booking.guest_id !== user.id) return errorResponse('Forbidden', 403)
    if (booking.escrow_status !== 'none') {
      return errorResponse(`Booking already in escrow_status=${booking.escrow_status}`, 409)
    }

    // 2. Validate property + currency
    const { data: property, error: pErr } = await supa
      .from('properties').select('id, name, user_id, currency, status').eq('id', property_id).single()
    if (pErr || !property) return errorResponse('Property not found', 404)
    if (!['live', 'validated'].includes(property.status)) {
      return errorResponse('Property is not bookable', 400)
    }
    const cur = (currency ?? property.currency ?? 'USD').toUpperCase()

    // 3. Check hotelier has functional Stripe Connect account
    const { data: hotelierAccount } = await supa
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('user_id', property.user_id)
      .maybeSingle()
    if (!hotelierAccount) {
      return errorResponse(
        'Hotelier has not completed Stripe onboarding yet — booking is on hold.',
        409,
        { code: 'hotelier_not_onboarded' },
      )
    }
    // ⚠️ TEMPORARY (Alpha test): we only require that a stripe_account row
    // exists, not that charges_enabled/payouts_enabled are TRUE. This lets
    // us demo the platform-charge flow even if the hotelier hasn't fully
    // completed Stripe Express onboarding (e.g., 'Restricted' state in TH).
    // The platform charge will succeed (funds land on STAYLO balance);
    // release-escrow's transfer step will fail later if the destination
    // is still restricted, which is the right behavior — payment is held
    // and refundable until the hotelier finishes.
    // RE-ENABLE before production by uncommenting the block below.
    //
    // if (!hotelierAccount.charges_enabled || !hotelierAccount.payouts_enabled) {
    //   return errorResponse(
    //     'Hotelier Stripe account is not fully active yet.',
    //     409,
    //     { code: 'hotelier_account_inactive' },
    //   )
    // }

    // 4. Compute split (commission is on ROOM AMOUNT, NOT total)
    //    Processing fee is consumed by Stripe / processor — not part of split.
    const platformFee  = Math.round(roomAmt * COMMISSION_RATE)
    const payoutAmount = roomAmt - platformFee
    const totalCharged = roomAmt + procFee  // What the guest's card is charged

    // 5. Create Checkout Session — single line item with the TOTAL the guest pays.
    //    We could break it into 2 line items (room + processing fee) for full
    //    transparency on the Stripe page, but most guests prefer a clean single
    //    line. The breakdown is shown on STAYLO's checkout page beforehand.
    const origin = req.headers.get('origin') ?? 'https://staylo.app'
    const session = await stripeFetch<StripeCheckoutSession>('/checkout/sessions', {
      body: {
        mode: 'payment',
        payment_method_types: ['card'],
        success_url: `${origin}/dashboard/bookings?booking=success&id=${booking_id}`,
        cancel_url:  `${origin}/ota/${property_id}/checkout?cancelled=1`,
        customer_email: guest_email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: cur.toLowerCase(),
              unit_amount: totalCharged,  // room + processing fee
              product_data: {
                name:        `${property_name ?? property.name} — ${room_name ?? 'Room'}${booking_ref ? `  ·  ${booking_ref}` : ''}`,
                description: `${nights ?? 1} night${(nights ?? 1) > 1 ? 's' : ''} stay${booking_ref ? `  ·  Ref ${booking_ref}` : ''}`,
              },
            },
          },
        ],
        metadata: {
          booking_id,
          booking_ref:    booking_ref ?? '',
          property_id,
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
            property_id,
            hotelier_stripe_account_id: hotelierAccount.stripe_account_id,
            payout_amount: String(payoutAmount),
            platform_fee:  String(platformFee),
          },
        },
      },
    })

    // 6. Persist session id + breakdown
    await supa.from('bookings').update({
      stripe_checkout_session_id: session.id,
      currency:             cur,
      payment_method,
      processing_fee_cents: procFee,
      total_price:          totalCharged / 100,    // bookings.total_price is decimal
      payout_amount_cents:  payoutAmount,
      platform_fee_cents:   platformFee,
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
