// ============================================
// Edge function: connect-onboarding
// ============================================
// Creates (or returns existing) Stripe Connect Express account for a hotelier
// and returns a hosted onboarding URL they should be redirected to.
//
// Body:
//   {
//     country?: string,         // ISO 3166-1 alpha-2, default 'TH'
//     default_currency?: string, // ISO 4217 lowercase, default 'usd'
//     business_type?: string,    // 'individual' | 'company'
//     return_url?: string,       // where Stripe sends the user after completion
//     refresh_url?: string,      // where Stripe sends if the link expires
//   }
//
// Returns: { url: string, account_id: string, already_existed: boolean }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { stripeFetch, StripeAccount, StripeAccountLink } from '../_shared/stripe.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    // 1. Auth
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await req.json().catch(() => ({}))
    const country = (body.country ?? 'TH').toUpperCase()
    const defaultCurrency = (body.default_currency ?? 'usd').toLowerCase()
    const businessType = body.business_type ?? 'individual'
    const origin = req.headers.get('origin') ?? 'https://staylo.app'
    const returnUrl = body.return_url ?? `${origin}/dashboard/banking?status=success`
    const refreshUrl = body.refresh_url ?? `${origin}/dashboard/banking?status=refresh`

    const supa = getServiceClient()

    // 2. Check existing account
    const { data: existing } = await supa
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let stripeAccountId: string
    let alreadyExisted = false

    if (existing?.stripe_account_id) {
      stripeAccountId = existing.stripe_account_id
      alreadyExisted = true
    } else {
      // 3. Create Express account
      const account = await stripeFetch<StripeAccount>('/accounts', {
        body: {
          type: 'express',
          country,
          default_currency: defaultCurrency,
          business_type: businessType,
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers:     { requested: true },
          },
          metadata: {
            staylo_user_id: user.id,
          },
        },
      })
      stripeAccountId = account.id

      // 4. Persist
      const { error: insertErr } = await supa.from('stripe_accounts').insert({
        user_id:           user.id,
        stripe_account_id: stripeAccountId,
        account_type:      'express',
        country,
        default_currency:  defaultCurrency,
        charges_enabled:   account.charges_enabled,
        payouts_enabled:   account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
      if (insertErr) {
        console.error('Failed to persist stripe_account:', insertErr)
        return errorResponse('Failed to save account', 500, { detail: insertErr.message })
      }
    }

    // 5. Account link (hosted onboarding URL)
    const link = await stripeFetch<StripeAccountLink>('/account_links', {
      body: {
        account:     stripeAccountId,
        refresh_url: refreshUrl,
        return_url:  returnUrl,
        type:        'account_onboarding',
      },
    })

    return jsonResponse({
      url:             link.url,
      account_id:      stripeAccountId,
      already_existed: alreadyExisted,
      expires_at:      link.expires_at,
    })
  } catch (err) {
    console.error('connect-onboarding error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
