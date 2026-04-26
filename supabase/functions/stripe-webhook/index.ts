// ============================================
// Edge function: stripe-webhook
// ============================================
// Receives Stripe webhook events and syncs the DB. This is the source of
// truth for payment lifecycle — never trust the frontend to mark bookings
// as paid.
//
// Events handled:
//   - account.updated                 → sync stripe_accounts.{charges_enabled, payouts_enabled, ...}
//   - checkout.session.completed      → mark booking 'held', set escrow_release_at = now+24h
//   - payment_intent.succeeded        → safety net (should already be set by checkout.session.completed)
//   - payment_intent.payment_failed   → mark booking 'failed'
//   - charge.refunded                 → mark booking 'refunded'
//   - charge.dispute.created          → mark booking 'disputed'
//   - transfer.failed                 → mark booking 'failed' for retry
//
// Setup (Stripe Dashboard → Webhooks):
//   - Endpoint URL: https://<your-project>.supabase.co/functions/v1/stripe-webhook
//   - Events: account.updated, checkout.session.completed,
//             payment_intent.succeeded, payment_intent.payment_failed,
//             charge.refunded, charge.dispute.created, transfer.failed
//   - Copy the signing secret → set STRIPE_WEBHOOK_SECRET in Supabase env
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'

// 24h hold by default — overridden in chantier #2 by post-checkout questionnaire
const DEFAULT_HOLD_HOURS = 24

// Verify Stripe signature using HMAC-SHA256 (no Stripe SDK needed)
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  // Header format: "t=1234567890,v1=hex_signature,v0=..."
  const parts = sigHeader.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=')
    acc[k] = v
    return acc
  }, {} as Record<string, string>)
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${payload}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Reject events older than 5 minutes (replay protection)
  const eventAge = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (eventAge > 300) return false
  return hex === signature
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET not set')
    return new Response('Webhook not configured', { status: 503 })
  }

  const valid = await verifyStripeSignature(payload, sigHeader, secret)
  if (!valid) {
    console.warn('Invalid Stripe signature')
    return new Response('Invalid signature', { status: 401 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response('Bad payload', { status: 400 })
  }

  const supa = getServiceClient()

  try {
    switch (event.type) {
      // ─── Connect: hotelier account changes ────────────
      case 'account.updated': {
        const a = event.data.object as Record<string, unknown>
        const updates = {
          charges_enabled:   Boolean(a.charges_enabled),
          payouts_enabled:   Boolean(a.payouts_enabled),
          details_submitted: Boolean(a.details_submitted),
          country:           a.country,
          default_currency:  a.default_currency,
          last_synced_at:    new Date().toISOString(),
        }
        // If account just became fully active, stamp onboarding_completed_at
        const { data: existing } = await supa
          .from('stripe_accounts').select('onboarding_completed_at')
          .eq('stripe_account_id', a.id).maybeSingle()
        if (existing && !existing.onboarding_completed_at && updates.charges_enabled && updates.payouts_enabled) {
          (updates as Record<string, unknown>).onboarding_completed_at = new Date().toISOString()
        }
        await supa.from('stripe_accounts').update(updates).eq('stripe_account_id', a.id)
        break
      }

      // ─── Checkout completed → mark booking paid + start escrow timer ────
      case 'checkout.session.completed': {
        const s = event.data.object as Record<string, unknown>
        const meta = (s.metadata ?? {}) as Record<string, string>
        const bookingId = meta.booking_id
        if (!bookingId) { console.warn('Session has no booking_id metadata:', s.id); break }

        const releaseAt = new Date(Date.now() + DEFAULT_HOLD_HOURS * 60 * 60 * 1000).toISOString()
        await supa.from('bookings').update({
          status:                   'confirmed',
          escrow_status:            'held',
          stripe_payment_intent_id: s.payment_intent,
          payment_received_at:      new Date().toISOString(),
          escrow_release_at:        releaseAt,
        }).eq('id', bookingId)
        break
      }

      // ─── Payment intent updates (safety net + non-checkout flows) ───
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Record<string, unknown>
        const meta = (pi.metadata ?? {}) as Record<string, string>
        const bookingId = meta.booking_id
        if (!bookingId) break
        // Idempotent: only set if not already held/released
        await supa.from('bookings').update({
          stripe_payment_intent_id: pi.id,
        }).eq('id', bookingId).is('payment_received_at', null)
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Record<string, unknown>
        const meta = (pi.metadata ?? {}) as Record<string, string>
        const bookingId = meta.booking_id
        if (!bookingId) break
        await supa.from('bookings').update({
          status:        'cancelled',
          escrow_status: 'failed',
        }).eq('id', bookingId)
        break
      }

      // ─── Refunds & disputes ────────────────────────────
      case 'charge.refunded': {
        const ch = event.data.object as Record<string, unknown>
        const piId = ch.payment_intent as string
        if (!piId) break
        const refundsList = (ch.refunds as Record<string, unknown>)?.data as Array<Record<string, unknown>> | undefined
        const refund = refundsList?.[0]
        await supa.from('bookings').update({
          status:           'cancelled',
          escrow_status:    'refunded',
          stripe_refund_id: refund?.id,
        }).eq('stripe_payment_intent_id', piId)
        break
      }

      case 'charge.dispute.created': {
        const d = event.data.object as Record<string, unknown>
        const piId = d.payment_intent as string
        if (!piId) break
        await supa.from('bookings').update({ escrow_status: 'disputed' })
          .eq('stripe_payment_intent_id', piId)
        break
      }

      case 'transfer.failed': {
        const tr = event.data.object as Record<string, unknown>
        const meta = (tr.metadata ?? {}) as Record<string, string>
        const bookingId = meta.booking_id
        if (!bookingId) break
        await supa.from('bookings').update({
          escrow_status:  'failed',
          release_reason: 'transfer_failed_by_stripe',
        }).eq('id', bookingId)
        break
      }

      default:
        // ignore unknown events silently — Stripe sends many we don't care about
        console.log(`Webhook event ignored: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    // Return 200 so Stripe doesn't retry — we logged it
    return new Response(JSON.stringify({ received: true, handler_error: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
