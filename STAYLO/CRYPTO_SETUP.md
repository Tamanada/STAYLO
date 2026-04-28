# ⚡ STAYLO — Crypto / Lightning Payments Setup

Chantier #9 ships with a **provider-agnostic** Lightning integration:

```
Frontend → crypto-checkout edge fn → LightningProvider → btc_invoices row
                                          │
                                          ↓
                              Mock | BTCPay | OpenNode | Strike
```

The active provider is selected via the env var `LIGHTNING_PROVIDER`.
Default = `mock` (Alpha demo, no KYC).

---

## 1. Alpha mode — MockProvider (default)

**Used for**: investor demos, dev testing, integration validation.

**What it does**:
- Generates a fake-but-well-formed BOLT11 invoice (`lnbcrt...`)
- Returns valid amounts in sats based on a hardcoded BTC/USD rate (~$95k)
- Auto-confirms payment after **8 seconds** (timer fires from the frontend)
- Writes a real row in `btc_invoices` with `provider='mock'`
- Triggers the same `confirm_btc_invoice_payment()` RPC that real
  webhooks use → booking flips to `confirmed` + `escrow_status='held'`

**No setup required.** Default. Just deploy the functions:

```bash
cd STAYLO-repo
supabase functions deploy crypto-checkout
supabase functions deploy crypto-webhook --no-verify-jwt
```

---

## 2. Production mode — BTCPay Server (recommended path)

When STAYLO Singapore Pte Ltd is incorporated, swap to BTCPay Server
(self-hosted, no KYC, full Bitcoin sovereignty):

### 2.1. Spin up BTCPay Server

Easiest paths:
- **LunaNode 1-click** ($10/mo): https://www.lunanode.com/btcpay
- **Voltage Cloud** (Lightning-only, $20/mo): https://voltage.cloud
- **Self-hosted on a VPS** ($5-10/mo Hetzner/DO + 24h to sync the BTC node)

Doc: https://docs.btcpayserver.org/Deployment/

### 2.2. Connect a Lightning node

BTCPay Server bundles c-lightning or LND. The included node syncs to the
LN graph in ~1h. You'll need to fund a channel with ~50k sats minimum to
receive payments (or use LSP like Voltage / Olympus for no-funding setup).

### 2.3. Get API credentials

In BTCPay UI:
1. **Account** → **Manage Account** → **API Keys** → **Generate Key**
2. Permissions: `btcpay.store.canviewinvoices`, `btcpay.store.cancreateinvoice`
3. Copy the key

### 2.4. Set Supabase env vars

```bash
supabase secrets set \
  LIGHTNING_PROVIDER=btcpay \
  BTCPAY_URL=https://your-btcpay-server.com \
  BTCPAY_STORE_ID=xxxxxxxx \
  BTCPAY_API_KEY=xxxxxxxxxxxx \
  BTCPAY_WEBHOOK_SECRET=xxxxxxxxxxxx
```

### 2.5. Configure the webhook

In BTCPay UI: **Store** → **Settings** → **Webhooks** → **Add new webhook**

| Field | Value |
|---|---|
| URL | `https://xicxajwqzlndqtzuvttd.supabase.co/functions/v1/crypto-webhook` |
| Events | `Invoice settled`, `Invoice expired`, `Invoice processing` |
| Secret | (BTCPay generates one — copy to Supabase as `BTCPAY_WEBHOOK_SECRET`) |

### 2.6. Add BTCPayProvider to the code

In `supabase/functions/_shared/lightning.ts`, uncomment the BTCPayProvider
case in `getLightningProvider()` and implement the class. Schema is
identical to MockProvider — just replace fake invoice generation with
real BTCPay API calls (`POST /api/v1/stores/{storeId}/invoices`).

Redeploy:
```bash
supabase functions deploy crypto-checkout
```

---

## 3. Alternative: OpenNode (hosted, requires KYC)

If you prefer hosted (no node maintenance):
- Sign up: https://www.opennode.com → **requires full corporate KYC**
- Sandbox available but also gated behind KYC nowadays
- Set `LIGHTNING_PROVIDER=opennode` + `OPENNODE_API_KEY` + `OPENNODE_WEBHOOK_SECRET`
- Implement OpenNodeProvider in `_shared/lightning.ts`

Trade-off: easier to operate, but you lose sovereignty (custodial,
KYC, geo-restrictions, can be deplatformed).

**Recommendation**: BTCPay self-hosted from day 1 of production.

---

## 4. Test the Mock flow end-to-end

1. Make sure migrations are applied:
   - `20260428000000_payment_method_and_processing_fee.sql`
   - `20260428100000_booking_ref.sql`
   - `20260428200000_btc_invoices.sql`

2. Deploy the functions (or skip if already done in chantier #9.2):
   ```bash
   supabase functions deploy crypto-checkout
   supabase functions deploy crypto-webhook --no-verify-jwt
   ```

3. As a guest:
   - Go to `/ota/<property-id>` (you must be logged in)
   - Reserve a room → Checkout
   - In the Booking Summary, select **⚡ Bitcoin Lightning**
   - The Total drops to "+$0" processing fee — Lightning is free
   - Click **Confirm & Pay**
   - **QR modal opens** with the BOLT11 invoice
   - 8 seconds later → "Payment received!" → success screen

4. Verify in DB:
   ```sql
   SELECT i.status, i.amount_sats, i.bolt11, b.status as booking_status, b.escrow_status
   FROM btc_invoices i JOIN bookings b ON b.id = i.booking_id
   ORDER BY i.created_at DESC LIMIT 3;
   ```
   You should see `status='paid'`, `booking_status='confirmed'`,
   `escrow_status='held'`.

---

## 5. What changes for chantier #10 (Ambassador BTC payouts)

The same provider abstraction will be reused for **outgoing** payments
to ambassador wallets. Need to add:
- `LightningProvider.payToAddress(args)` method (BOLT11 string or LNURL)
- Mock implementation that just simulates success
- Real implementations for BTCPay/OpenNode

---

## Troubleshooting

### `crypto-checkout` returns 401
→ Frontend is not sending the user JWT. Check that
`supabase.functions.invoke()` has a logged-in session. (Same fix as
chantier #1 banking page.)

### Modal opens but never auto-confirms in mock mode
→ Frontend timer didn't fire. Open DevTools console and look for the
`mock_action: 'pay'` POST log. Should fire after `mock.will_pay_at`.

### Polling doesn't pick up the paid status
→ Check RLS: the user must be `auth.uid() = booking.guest_id` to see
the invoice. Run the SELECT manually with their JWT to confirm.

### BTCPay/OpenNode webhook doesn't reach us
→ Verify the public URL is reachable: `curl https://xicxajwqzlndqtzuvttd.supabase.co/functions/v1/crypto-webhook -X POST -H "Content-Type: application/json" -d '{}'` should return some JSON.

### Mock mode is too fast / too slow
→ Adjust `MOCK_PAY_DELAY_SEC` in `supabase/functions/_shared/lightning.ts`.
   Redeploy the function for it to take effect.
