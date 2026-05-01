// ============================================================================
// mark-booking-settled — admin escape hatch
// ============================================================================
// Sometimes the hotelier got paid outside of Stripe (bank transfer, Lightning,
// cash, manual Wise, etc.) and the booking's escrow needs to be marked as
// released without going through a Stripe Transfer. This function lets an
// admin do that with full audit trail.
//
// Use cases:
//   • Hotelier never finished Stripe Connect onboarding but settled with guest
//     directly (rare in production, common in Alpha tests)
//   • Stripe Transfer keeps failing for legitimate reasons (currency, account
//     restricted) and you've paid the hotelier through another channel
//   • Refund-as-credit deals
//
// Side effects:
//   - bookings.escrow_status = 'released'
//   - bookings.escrow_released_at = now()
//   - bookings.release_reason = 'manual_admin: <note>'
//   - DOES NOT call Stripe — funds stay on STAYLO's platform balance.
//     Operator must reconcile manually.
//
// Auth: admin-only.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface ReqBody { booking_id: string; note?: string }

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const sb = getServiceClient()
  const { data: profile } = await sb.from('users').select('role, email').eq('id', user.id).single()
  if (profile?.role !== 'admin') return jsonResponse({ error: 'Admin only' }, 403)

  let body: ReqBody
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.booking_id) return jsonResponse({ error: 'booking_id required' }, 400)

  const { data: booking, error: bErr } = await sb
    .from('bookings')
    .select('id, escrow_status')
    .eq('id', body.booking_id)
    .single()
  if (bErr || !booking) return jsonResponse({ error: 'Booking not found' }, 404)
  if (booking.escrow_status !== 'held') {
    return jsonResponse({
      error: `Booking is in escrow_status=${booking.escrow_status} — cannot mark settled (must be 'held')`,
    }, 409)
  }

  const note = (body.note || '').slice(0, 200)
  const reason = `manual_admin by ${profile.email || user.id}` + (note ? `: ${note}` : '')

  const { error: updErr } = await sb
    .from('bookings')
    .update({
      escrow_status:      'released',
      escrow_released_at: new Date().toISOString(),
      release_reason:     reason,
    })
    .eq('id', booking.id)
    .eq('escrow_status', 'held')   // optimistic lock — refuse if status raced

  if (updErr) return jsonResponse({ error: 'DB update failed', detail: updErr.message }, 500)

  return jsonResponse({
    ok: true,
    booking_id: booking.id,
    note: 'Marked as manually settled. Funds remain on platform balance — reconcile manually.',
    reason,
  })
})
