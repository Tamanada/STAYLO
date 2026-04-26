// ============================================
// Edge function: connect-status
// ============================================
// Returns the hotelier's Stripe Connect account status. Optionally re-syncs
// from Stripe (so we always have fresh charges_enabled / payouts_enabled).
//
// Body (optional): { sync?: boolean }   // default true
// Returns: { account_id, charges_enabled, payouts_enabled, details_submitted, ... }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { stripeFetch, StripeAccount } from '../_shared/stripe.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await req.json().catch(() => ({}))
    const shouldSync = body.sync !== false

    const supa = getServiceClient()
    const { data: row, error } = await supa
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return errorResponse('DB error', 500, { detail: error.message })
    if (!row) {
      return jsonResponse({ has_account: false })
    }

    let acct = row
    if (shouldSync) {
      try {
        const fresh = await stripeFetch<StripeAccount>(`/accounts/${row.stripe_account_id}`, { method: 'GET' })
        const updates = {
          charges_enabled:   fresh.charges_enabled,
          payouts_enabled:   fresh.payouts_enabled,
          details_submitted: fresh.details_submitted,
          country:           fresh.country ?? row.country,
          default_currency:  fresh.default_currency ?? row.default_currency,
          last_synced_at:    new Date().toISOString(),
          onboarding_completed_at:
            (fresh.charges_enabled && fresh.payouts_enabled && !row.onboarding_completed_at)
              ? new Date().toISOString()
              : row.onboarding_completed_at,
        }
        const { data: updated } = await supa
          .from('stripe_accounts')
          .update(updates)
          .eq('user_id', user.id)
          .select('*')
          .single()
        if (updated) acct = updated
      } catch (syncErr) {
        // Don't fail the request if Stripe sync hiccups — return what we have
        console.warn('Stripe sync failed, returning cached row:', syncErr)
      }
    }

    return jsonResponse({
      has_account:             true,
      account_id:              acct.stripe_account_id,
      country:                 acct.country,
      default_currency:        acct.default_currency,
      charges_enabled:         acct.charges_enabled,
      payouts_enabled:         acct.payouts_enabled,
      details_submitted:       acct.details_submitted,
      onboarding_completed_at: acct.onboarding_completed_at,
      last_synced_at:          acct.last_synced_at,
    })
  } catch (err) {
    console.error('connect-status error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
