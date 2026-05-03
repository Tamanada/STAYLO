# STAYLO Foundation — Beds for Beds

> A platform where people sleep in beds → pays back to people who don't have one.

---

## The commitment (David, 2026-05-03)

**100% of the founder's personal Ambassador commission revenue is donated to a
foundation that provides beds, shelter and basic comfort to people who have
none.**

This applies to every booking made on STAYLO at a hotel that David personally
referred — the 2% BTC commission that would otherwise land in his Lightning
wallet flows instead, automatically, to the STAYLO Foundation wallet.

This is a **lifetime, non-revocable commitment** from David. It's recorded
here, in the public repo, on the day of the decision, so future-David can be
held to it by present-David.

---

## Why this is the right move for STAYLO

1. **Brand integrity.** Hospitality means giving someone a place to be safe
   and comfortable. STAYLO turning hospitality revenue back into hospitality
   for people without a roof is the most honest expression of what the
   platform stands for. It's not CSR theatre — it's the literal product
   working both ways.

2. **Differentiation.** No OTA on Earth does this. Booking.com cannot
   credibly claim it, ever, because their commission flows to shareholders.
   STAYLO can, because the Ambassador layer was always going to be a small
   personal-revenue stream — donating it costs nothing structurally and
   gains everything narratively.

3. **Trust signal for hoteliers.** The biggest pushback from suspicious
   hoteliers will be "another Silicon Valley platform pretending to care."
   When David can show that his personal upside on every referral
   automatically becomes a bed for someone who needs one, that suspicion
   collapses.

4. **Story for guests.** Travellers in 2026 want to feel that their booking
   means something beyond a transaction. STAYLO can credibly say: "every
   night you book here helps someone get a bed of their own." This is the
   marketing line the next generation of hospitality will be sold on.

5. **Compounding effect.** The bigger STAYLO grows, the more David's
   Ambassador wallet would have earned, the more beds the Foundation funds.
   It's a flywheel where success ≡ social return.

---

## How it will work technically

(Specs to be implemented — capturing the design now so we don't drift.)

### Phase 1 — Manual (immediate, no code)

- David's Ambassador commissions land in his configured Lightning Address
  (already in `users.ln_address`).
- Once a quarter, he manually forwards the accumulated balance to the
  Foundation wallet (a separate Lightning Address held by the Foundation
  legal entity once it exists, or a multi-sig BTC wallet meanwhile).
- Posts a public transaction-hash receipt on staylo.app/foundation and on
  X @STAYLO_007.

### Phase 2 — Automated (post-Foundation legal setup)

Add a new column to `public.users`:
```sql
ALTER TABLE public.users
  ADD COLUMN foundation_donation_pct numeric DEFAULT 0
    CHECK (foundation_donation_pct >= 0 AND foundation_donation_pct <= 100);
```

- David sets `foundation_donation_pct = 100` on his own user record.
- The `release-escrow` / `pay-ambassador-commission` Edge Function checks
  this column when paying out. If > 0, it splits the BTC payment:
  `(100 - pct)%` to `users.ln_address`, `pct%` to the Foundation address.
- Each split is recorded in a new `foundation_donations` table for
  public-ledger transparency.

### Phase 3 — Open the model to ambassadors and hotels

Once the Foundation has a real legal entity and proven track record:
- Every ambassador can opt-in: "Donate X% of my commissions to the Foundation."
- Every hotelier can opt-in: "Add Y% on top of my STAYLO commission, sent
  directly to the Foundation."
- Every guest can opt-in at checkout: "Round up my booking to the nearest
  $5, the rounding goes to the Foundation."

Three opt-in funnels → three independent revenue streams for the Foundation,
each transparent on-chain.

---

## What the Foundation actually does

Scope to be defined with partner NGOs in Thailand first (since that's
STAYLO's launch market). The starting frame:

**Mission:** Provide beds, mattresses, bedding, and basic shelter
infrastructure to people who don't have a home — starting in Thailand,
expanding as the Foundation grows.

**Initial partner candidates** (to validate, not yet committed):
- **Mirror Foundation** (Thailand) — works with refugees and stateless
  populations on the Thai-Burmese border, often providing first-time
  shelter.
- **Hands of Hope** (Bangkok) — homeless outreach with a beds-and-meals
  programme.
- **Local monk-led shelters** in Surat Thani / Koh Phangan — direct,
  hyperlocal, low-overhead.

**Reporting:** Quarterly public report on staylo.app/foundation:
- BTC received this quarter
- BTC distributed
- Number of beds/people served (verified by partner NGO with photos +
  signed receipt)
- All transactions linked on-chain for verification

---

## What this is NOT

- ❌ Not a tax-deduction scheme for STAYLO the company.
- ❌ Not run by STAYLO employees (independent legal entity, separate board).
- ❌ Not an excuse to skim from hotelier commissions — it's strictly funded
  by David's personal Ambassador upside, plus voluntary opt-in from
  others.
- ❌ Not a marketing prop without follow-through — quarterly reports with
  on-chain proof or it doesn't exist.

---

## Communications

This commitment should appear in:

1. **`/foundation` page** on staylo.app (to be built) — explains the model,
   shows the live BTC wallet balance + recent grants, lists partner NGOs.
2. **About / Vision page** — single line linking to /foundation.
3. **Pitch deck** — slide 8 (trust) gets a sub-bullet:
   "Founder's referral commissions → STAYLO Foundation (beds for those
   without one)."
4. **Hotelier outreach email** (the `send-prospect-invite` template) —
   add a final paragraph: "And — full disclosure — when I personally
   refer you to STAYLO, my 2% commission on your future bookings goes
   straight to a foundation that provides beds to people who have
   none. So onboarding you is, in a small way, also a kindness."
5. **Twitter pinned post** on @STAYLO_007.

---

## The day this commitment was made

- **Date:** 2026-05-03
- **Made by:** David, founder
- **Witness:** This file, public on github.com/Tamanada/STAYLO
- **First public mention:** TBD (slide 8 of pitch deck OR a launch tweet OR
  the /foundation page going live — whichever happens first).

If David is reading this in 5 years and the Foundation doesn't exist or
has never made a grant, **that's a betrayal of the original mission and
of every hotelier who joined STAYLO partly because of it.** Past-David
will be very disappointed. Don't be that guy.
