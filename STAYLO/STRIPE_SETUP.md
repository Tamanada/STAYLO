# 🟣 STAYLO — Stripe Connect Setup Guide

This document walks you through wiring the **payment pipeline** built in chantier #1 (commits 1.1 → 1.4).

**End goal**: when a guest pays for a booking, money flows automatically through Stripe Connect:

```
Guest ──pays──▶ STAYLO platform balance ──escrow 24h──▶ Hotelier's bank account
                       │
                       └── 10% commission stays on STAYLO platform
```

---

## ✅ Prerequisites

- [ ] You have a Stripe account (free): https://dashboard.stripe.com
- [ ] Your STAYLO Supabase project is up and running
- [ ] You have access to the Supabase Dashboard for that project

---

## STEP 1 — Activate Stripe Connect

1. Go to https://dashboard.stripe.com → **Settings** (gear icon, top-right) → **Connect** in the left menu
2. Click **Get started** if Connect isn't enabled yet
3. Choose **Express** as the account type (recommended — Stripe handles KYC for hoteliers)
4. Choose **Platform or marketplace** as your business model
5. Submit STAYLO's basic info (this is the platform owner, not a hotelier)

**Category to declare**: `Plateformes et marketplaces` (or `Software / SaaS` as fallback). **Avoid `Hôtels`** — it triggers a long compliance review for nothing.

**Suggested description**:
> *STAYLO is a hotel booking marketplace that connects independent hoteliers with travelers, primarily in Thailand. We charge a 10% commission per booking and remit 90% to the hotelier after the guest checks out. Funds are held in escrow on our platform balance and transferred to the hotelier's connected Express account via Stripe Connect.*

---

## STEP 2 — Get your API keys

1. Go to **Developers** → **API keys**
2. Copy the **Secret key** (starts with `sk_test_...` in test mode, `sk_live_...` in production)
3. Keep it open in a tab — you'll paste it in Step 4

⚠️ **Use `sk_test_...` for now.** Switch to `sk_live_...` only after end-to-end testing.

---

## STEP 3 — Set up the webhook endpoint

This is how Stripe tells STAYLO about payment events (paid, failed, refunded, hotelier onboarded, etc.).

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**:
   ```
   https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook
   ```
   Find your project ref in Supabase → **Project Settings** → **General** → **Reference ID**.
3. **Events to listen for** — click "Select events" and add these:
   - `account.updated` *(only if you can select "Connected accounts" too — Stripe newer UI may force you to pick one source)*
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `transfer.reversed` *(was `transfer.failed` in older API versions — Stripe replaced it)*
4. Click **Add endpoint**
5. On the endpoint detail page, click **Reveal** next to **Signing secret** and copy the value (starts with `whsec_...`)

---

## STEP 4 — Push secrets to Supabase

You can do this **either** via the Supabase Dashboard UI **or** via the CLI.

### Option A — Dashboard UI (no CLI needed)

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add new secret** for each of these:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (from Step 2) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Step 3) |
| `CRON_SECRET` | a random string — generate with `openssl rand -hex 32` |

The standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are already set automatically — don't touch them.

### Option B — Supabase CLI (faster if you have it)

```bash
cd C:\Users\David\Desktop\STAYLO-repo

supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
```

---

## STEP 5 — Deploy the edge functions

If you have the Supabase CLI installed:

```bash
cd C:\Users\David\Desktop\STAYLO-repo

# Deploy all 5 functions at once
supabase functions deploy connect-onboarding connect-status release-escrow stripe-webhook checkout
```

The webhook function must allow unauthenticated calls (Stripe doesn't send a JWT). If it gets blocked:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

If you don't have the CLI, deploy them via the Dashboard:
1. **Edge Functions** → **Create new function** → name it exactly (e.g. `connect-onboarding`)
2. Paste the contents of `supabase/functions/<name>/index.ts`
3. **Deploy**
4. Repeat for each of the 5 functions

---

## STEP 6 — Apply the migration

If not done yet:

1. Go to **SQL Editor** in Supabase
2. Paste the contents of `supabase/migrations/20260422000000_stripe_connect_escrow.sql`
3. Click **Run**

Or via CLI: `supabase db push`

---

## STEP 7 — Test the flow end-to-end

### As a hotelier (you):

1. Log in to https://staylo.app
2. Go to **Dashboard** → **Banking**
3. Pick your country → **Set up payouts on Stripe**
4. Complete the Stripe onboarding (use test data — Stripe accepts `000-00-0000` as a test SSN, etc.)
5. You'll be redirected back to `/dashboard/banking` with status = **Active**

Verify in Supabase Dashboard:
- Table `stripe_accounts` should have a new row with your `user_id` and `charges_enabled = true`

### As a guest (use a different account or incognito):

1. Go to https://staylo.app/ota
2. Find a property owned by the hotelier you onboarded
3. Reserve a room → checkout → use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. After successful payment, you'll be redirected back to the dashboard

Verify in Supabase:
- `bookings` should have a row with `escrow_status = 'held'` and `escrow_release_at = ~now + 24h`
- `bookings.payout_amount_cents` should be 90% of the total
- `bookings.platform_fee_cents` should be 10%

### Trigger escrow release manually (admin)

From a logged-in admin account, in the browser console:

```javascript
const r = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/release-escrow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token,
  },
  body: JSON.stringify({ booking_id: 'BOOKING_UUID_HERE', reason: 'admin_test' }),
})
console.log(await r.json())
```

You should see a `transfer_id` (`tr_...`) returned, and the booking flips to `escrow_status = 'released'`.

---

## STEP 8 (optional, but recommended) — Set up the auto-release cron

Until chantier #2 (post-checkout questionnaire) is done, the auto-release fallback runs at T+24h after payment. You need a cron caller to invoke `/functions/v1/release-escrow` periodically.

### Easiest: GitHub Actions (free, runs in your repo)

Create `.github/workflows/release-escrow-cron.yml`:

```yaml
name: Release escrow cron

on:
  schedule:
    - cron: '0 * * * *'  # every hour
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call release-escrow
        env:
          CRON_SECRET: ${{ secrets.STAYLO_CRON_SECRET }}
          SUPABASE_URL: ${{ secrets.STAYLO_SUPABASE_URL }}
        run: |
          curl -X POST "$SUPABASE_URL/functions/v1/release-escrow" \
            -H "Content-Type: application/json" \
            -H "x-cron-secret: $CRON_SECRET" \
            -d '{"cron":true}'
```

Then in GitHub repo → **Settings** → **Secrets and variables** → **Actions**, add:
- `STAYLO_CRON_SECRET` = same value you put in Supabase as `CRON_SECRET`
- `STAYLO_SUPABASE_URL` = your `https://xxx.supabase.co`

### Alternative: Vercel Cron (also free)

Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/release-escrow-cron", "schedule": "0 * * * *" }
  ]
}
```

And create `api/release-escrow-cron.js` (Vercel serverless function) that calls the Supabase function.

### Alternative: cron-job.org (no-code)

1. Create account at https://cron-job.org
2. Add a job: URL = `https://xxx.supabase.co/functions/v1/release-escrow`, header `x-cron-secret: YOUR_CRON_SECRET`, body `{"cron":true}`, schedule every hour

---

## 🛠️ Troubleshooting

### "Stripe not configured" (503 from /checkout)
→ `STRIPE_SECRET_KEY` not set in Supabase Edge Functions secrets. Re-do Step 4.

### "Hotelier has not completed Stripe onboarding yet" (409)
→ The property's owner has no row in `stripe_accounts` table, or `charges_enabled = false`. Tell them to go to `/dashboard/banking` and complete onboarding.

### Webhook returns 401 (invalid signature)
→ `STRIPE_WEBHOOK_SECRET` doesn't match the actual signing secret. Re-copy from Stripe Dashboard → Webhooks → your endpoint → Signing secret.

### Webhook returns 405
→ The function needs to allow POST without JWT. Redeploy with `--no-verify-jwt`:
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Onboarding link expired
→ `account_links` URLs expire after a few minutes. Just click "Set up payouts on Stripe" again — `connect-onboarding` will create a fresh link without recreating the account.

### Cron returns "Cron auth failed" (401)
→ Either `CRON_SECRET` env var is missing in Supabase, or the `x-cron-secret` header value doesn't match.

---

## 📊 Inspecting state in Supabase

Useful SQL queries to run in the Supabase SQL Editor:

```sql
-- All hoteliers and their Stripe Connect status
SELECT u.email, sa.country, sa.charges_enabled, sa.payouts_enabled, sa.onboarding_completed_at
FROM stripe_accounts sa JOIN users u ON u.id = sa.user_id
ORDER BY sa.created_at DESC;

-- All bookings with their escrow status
SELECT id, status, escrow_status, currency, payout_amount_cents, platform_fee_cents,
       payment_received_at, escrow_release_at, escrow_released_at, release_reason
FROM bookings ORDER BY created_at DESC LIMIT 50;

-- Bookings ready to be released right now
SELECT * FROM bookings_due_for_escrow_release();

-- Live platform stats
SELECT * FROM platform_stats();
```

---

## 🎯 What's next (chantier #2)

When chantier #2 lands:
- The `escrow_release_at = now + 24h` default will be replaced by a trigger fired by the post-checkout questionnaire
- The `release_reason` column will start filling with `'questionnaire'` instead of `'auto_24h'`
- The cron from Step 8 becomes a fallback for guests who don't fill the questionnaire — still useful, just less hot a path
