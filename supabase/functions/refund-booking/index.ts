// ============================================================================
// refund-booking — admin-only Stripe refund
// ============================================================================
// Caller: must be authenticated AND have role='admin' in public.users.
// Behavior:
//   - Look up the booking by id
//   - If escrow already 'released' (transfer to hotelier done), refund needs
//     to come from the hotelier's connected account. We do best-effort:
//     attempt the refund; Stripe will surface the error if balance is short.
//   - Otherwise: simple refund of the platform charge.
//   - Update bookings: status='cancelled', escrow_status='refunded',
//     refunded_at=now(), stripe_refund_id=re_xxx
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { stripeFetch } from '../_shared/stripe.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface RefundReq { booking_id: string; reason?: string }
interface StripeRefund { id: string; status: string; amount: number }

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // 1. Auth — must be a logged-in admin
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const sb = getServiceClient()
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Admin role required' }, 403)
  }

  // 2. Parse body
  let body: RefundReq
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.booking_id) return jsonResponse({ error: 'booking_id required' }, 400)

  // 3. Fetch the booking
  const { data: booking, error: bErr } = await sb
    .from('bookings')
    .select('id, stripe_payment_intent_id, escrow_status, status, total_price, currency')
    .eq('id', body.booking_id)
    .single()

  if (bErr || !booking) return jsonResponse({ error: 'Booking not found' }, 404)
  if (!booking.stripe_payment_intent_id) {
    return jsonResponse({ error: 'No Stripe payment to refund (Lightning or manual booking)' }, 400)
  }
  if (booking.status === 'cancelled') {
    return jsonResponse({ error: 'Booking already cancelled' }, 400)
  }

  // 4. Call Stripe — full refund of the payment intent
  let refund: StripeRefund
  try {
    refund = await stripeFetch<StripeRefund>('/refunds', {
      method: 'POST',
      body: new URLSearchParams({
        payment_intent: booking.stripe_payment_intent_id,
        reason: body.reason === 'fraudulent' || body.reason === 'duplicate'
          ? body.reason
          : 'requested_by_customer',
      }),
    })
  } catch (err) {
    console.error('Stripe refund failed:', err)
    return jsonResponse({
      error: 'Stripe refund failed',
      detail: (err as Error).message,
    }, 502)
  }

  // 5. Persist the new state
  const { error: updErr } = await sb
    .from('bookings')
    .update({
      status: 'cancelled',
      escrow_status: 'refunded',
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
  if (updErr) {
    console.error('Booking update failed after refund:', updErr)
    // Refund went through but DB update failed — return partial success so
    // the operator knows to fix the row manually rather than re-refunding.
    return jsonResponse({
      ok: true,
      refund_id: refund.id,
      warning: 'Refund processed but DB update failed. Manually set status=cancelled, escrow_status=refunded.',
    })
  }

  return jsonResponse({
    ok: true,
    refund_id: refund.id,
    amount_refunded: refund.amount / 100,
    currency: booking.currency,
  })
})
