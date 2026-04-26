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
//     amount: number,         // in smallest currency unit (cents, satang, ...)
//     currency: string,       // ISO 4217 lowercase (usd, eur, thb, ...)
//     property_id: uuid,
//     property_name: string,
//     room_name: string,
//     nights: number,
//     guest_email?: string,
//   }
// Returns: { url, session_id }
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
    const { booking_id, amount, currency, property_id, property_name, room_name, nights, guest_email } = body

    if (!booking_id || !amount || !property_id) {
      return errorResponse('Missing required fields: booking_id, amount, property_id')
    }
    const amt = Number(amount)
    if (!Number.isInteger(amt) || amt < 50) {
      return errorResponse('amount must be an integer >= 50 (smallest currency unit)')
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
    if (!hotelierAccount.charges_enabled || !hotelierAccount.payouts_enabled) {
      return errorResponse(
        'Hotelier Stripe account is not fully active yet.',
        409,
        { code: 'hotelier_account_inactive' },
      )
    }

    // 4. Compute split
    const platformFee = Math.round(amt * COMMISSION_RATE)
    const payoutAmount = amt - platformFee

    // 5. Create Checkout Session
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
              unit_amount: amt,
              product_data: {
                name:        `${property_name ?? property.name} — ${room_name ?? 'Room'}`,
                description: `${nights ?? 1} night${(nights ?? 1) > 1 ? 's' : ''} stay`,
              },
            },
          },
        ],
        metadata: {
          booking_id,
          property_id,
          hotelier_user_id:  property.user_id,
          hotelier_stripe_account_id: hotelierAccount.stripe_account_id,
          payout_amount:     String(payoutAmount),
          platform_fee:      String(platformFee),
          currency:          cur,
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

    // 6. Persist session id + commission preview
    await supa.from('bookings').update({
      stripe_checkout_session_id: session.id,
      currency:           cur,
      payout_amount_cents: payoutAmount,
      platform_fee_cents:  platformFee,
    }).eq('id', booking_id)

    return jsonResponse({ url: session.url, session_id: session.id })
  } catch (err) {
    console.error('checkout error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
