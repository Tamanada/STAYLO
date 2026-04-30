// ============================================
// Edge function: release-escrow
// ============================================
// Releases the held escrow for one or many bookings by transferring 90% to
// the hotelier's connected account. The 10% platform fee stays on STAYLO's
// balance.
//
// Two modes:
//   1. Specific booking — POST { booking_id, reason? }
//      Used by admin UI / questionnaire trigger.
//   2. Cron mode — POST { cron: true }
//      Reads bookings_due_for_escrow_release() RPC and releases all eligible
//      bookings whose escrow window has elapsed (T+24h default).
//
// Auth:
//   - Specific mode: requires admin user
//   - Cron mode: requires header `x-cron-secret` matching CRON_SECRET env var
//
// Returns: { released: [{booking_id, transfer_id, amount, currency}], errors: [...] }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { stripeFetch, StripeTransfer, StripePaymentIntent } from '../_shared/stripe.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'

interface BookingToRelease {
  booking_id: string
  stripe_account_id: string
  stripe_payment_intent_id: string
  payout_amount_cents: number
  currency: string
}

async function releaseOne(b: BookingToRelease, reason: string) {
  const supa = getServiceClient()

  // 1. Resolve the actual charge id from the payment intent (needed for source_transaction)
  const pi = await stripeFetch<StripePaymentIntent>(`/payment_intents/${b.stripe_payment_intent_id}`, { method: 'GET' })
  if (!pi.latest_charge) throw new Error(`PaymentIntent ${pi.id} has no latest_charge`)

  // 2. Create the transfer
  const transfer = await stripeFetch<StripeTransfer>('/transfers', {
    body: {
      amount:             b.payout_amount_cents,
      currency:           b.currency.toLowerCase(),
      destination:        b.stripe_account_id,
      source_transaction: pi.latest_charge,
      transfer_group:     `booking_${b.booking_id}`,
      description:        `STAYLO payout for booking ${b.booking_id}`,
      metadata: {
        booking_id:     b.booking_id,
        release_reason: reason,
      },
    },
  })

  // 3. Update the booking
  const { error } = await supa
    .from('bookings')
    .update({
      escrow_status:     'released',
      escrow_released_at: new Date().toISOString(),
      stripe_transfer_id: transfer.id,
      release_reason:    reason,
    })
    .eq('id', b.booking_id)
    .eq('escrow_status', 'held')  // optimistic lock
  if (error) {
    console.error(`DB update failed after transfer ${transfer.id}:`, error)
    // Transfer already happened — don't fail the whole batch, log loud
  }

  return { booking_id: b.booking_id, transfer_id: transfer.id, amount: transfer.amount, currency: transfer.currency }
}

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const body = await req.json().catch(() => ({}))
    const isCron = body.cron === true
    const supa = getServiceClient()

    // Auth
    if (isCron) {
      const cronSecret = Deno.env.get('CRON_SECRET')
      const provided = req.headers.get('x-cron-secret')
      if (!cronSecret || provided !== cronSecret) {
        return errorResponse('Cron auth failed', 401)
      }
    } else {
      const user = await getAuthUser(req)
      if (!user) return errorResponse('Unauthorized', 401)
      const { data: profile } = await supa.from('users').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return errorResponse('Admin only', 403)
    }

    // Collect bookings to release
    let toRelease: BookingToRelease[] = []
    let reason: string

    if (isCron) {
      reason = 'auto_24h'
      const { data, error } = await supa.rpc('bookings_due_for_escrow_release')
      if (error) return errorResponse('RPC failed', 500, { detail: error.message })
      toRelease = (data ?? []).map((r: Record<string, unknown>) => ({
        booking_id:               r.booking_id as string,
        stripe_account_id:        r.stripe_account_id as string,
        stripe_payment_intent_id: r.stripe_payment_intent_id as string,
        payout_amount_cents:      r.payout_amount_cents as number,
        currency:                 r.currency as string,
      }))
    } else {
      reason = body.reason ?? 'admin_manual'
      if (!body.booking_id) return errorResponse('booking_id required when cron=false')

      // Use LEFT joins so we can return a useful error per missing piece,
      // instead of a generic "Booking not found" when really the hotelier
      // just hasn't completed Stripe Connect onboarding.
      const { data, error } = await supa
        .from('bookings')
        .select(`
          id, stripe_payment_intent_id, payout_amount_cents, currency, escrow_status,
          properties:properties(
            id, name, user_id,
            owner:users!properties_user_id_fkey(email, full_name),
            stripe_accounts(stripe_account_id, charges_enabled, payouts_enabled)
          )
        `)
        .eq('id', body.booking_id)
        .single()
      if (error || !data) return errorResponse('Booking not found', 404, { detail: error?.message })
      if (data.escrow_status !== 'held') {
        return errorResponse(`Booking is in escrow_status=${data.escrow_status}, cannot release`, 409)
      }
      if (!data.stripe_payment_intent_id) {
        return errorResponse('Booking has no Stripe payment to transfer (Lightning or manual booking?)', 400)
      }
      const props = data.properties as Record<string, unknown> | null
      if (!props) {
        return errorResponse('Booking has no linked property', 500)
      }
      const owner = props.owner as Record<string, unknown> | null
      const accts = props.stripe_accounts as Record<string, unknown> | Record<string, unknown>[] | null
      const acct = Array.isArray(accts) ? accts[0] : accts
      if (!acct?.stripe_account_id) {
        return errorResponse(
          `Hotelier ${owner?.email ?? props.user_id} has not completed Stripe Connect onboarding. ` +
          `They must finish setup at /dashboard/banking before payout is possible. ` +
          `As a workaround, you can use "Mark as manually settled" to release the funds without a Stripe transfer.`,
          409,
          { hotelier_email: owner?.email, property_name: props.name }
        )
      }
      if (acct?.payouts_enabled === false) {
        return errorResponse(
          `Hotelier ${owner?.email ?? ''}'s Stripe account has payouts disabled (account: ${acct.stripe_account_id}). ` +
          `They must complete Stripe verification before payout is possible.`,
          409
        )
      }
      toRelease = [{
        booking_id:               data.id,
        stripe_account_id:        acct.stripe_account_id as string,
        stripe_payment_intent_id: data.stripe_payment_intent_id,
        payout_amount_cents:      data.payout_amount_cents,
        currency:                 data.currency,
      }]
    }

    // Process
    const released: unknown[] = []
    const errors: unknown[] = []
    for (const b of toRelease) {
      try {
        released.push(await releaseOne(b, reason))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`release failed for booking ${b.booking_id}:`, msg)
        errors.push({ booking_id: b.booking_id, error: msg })
        // Mark as failed so cron doesn't retry forever
        await supa.from('bookings').update({
          escrow_status:  'failed',
          release_reason: `${reason}_error: ${msg.slice(0, 200)}`,
        }).eq('id', b.booking_id).eq('escrow_status', 'held')
      }
    }

    return jsonResponse({ released, errors, count: released.length })
  } catch (err) {
    console.error('release-escrow error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
