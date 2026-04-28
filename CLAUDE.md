# STAYLO — Project Context for Claude Code

> This file is the single source of truth for the Staylo project.
> Read it entirely before writing any code, component, or copy.

---

## 1. What is Staylo

Staylo is a **universal booking super-app** — a fair alternative to
Booking.com, Airbnb, TripAdvisor and OpenTable combined.

**Tagline:** Book everything. Own the experience.
**Domain:** staylo.app
**Stage:** Alpha (validation + onboarding tool, NOT a full booking engine yet)

### The core idea
Hoteliers pay 15–22% commission to Booking.com and Agoda every month.
That money leaves Thailand forever. Staylo proposes:
- Commission of **10%** (vs 17–22%)
- Hoteliers invest the equivalent of **1 month of commission** to become
  **shareholders** of the platform
- **1 property = 1 vote** in governance (regardless of shares held)
- Dividends on platform profits redistributed to founding partners
- Shares are **freely transferable** — voting rights stay with the active
  property registration, not the shares

### Why it works (the flywheel)
1. Lower fees → hoteliers join
2. Hoteliers recommend Staylo to their own guests → free traveler acquisition
3. More hotels + more travelers → network densifies
4. At critical mass (>60% bookings via Staylo) → hoteliers cut OTAs entirely
5. Hoteliers are shareholders → they never leave, they recruit neighbors

---

## 2. Alpha Launch Strategy

**Phase Alpha target:** Koh Phangan, Thailand — first 100 businesses
**Why Koh Phangan first:**
- ~600 hotels/guesthouses on the island, 420 active
- ~$6.3M/year in commissions leave the island to foreign OTAs
- Agoda is the #1 OTA (Bangkok HQ, 17% commission)
- Dense nomad/backpacker community = early adopters
- Founder is based on the island

**Alpha is NOT a booking engine.** It is:
- A validation tool to measure hotelier interest
- An onboarding tool to capture hotel data
- A community builder with referral mechanics
- A data collector for future platform migration

---

## 3. Share Structure

| Parameter | Value |
|-----------|-------|
| Price per share | $1,000 USD (~35,000 THB) |
| Minimum per property | 1 share |
| Maximum per property | 10 shares |
| Total alpha shares | 3,000 |
| Total shares (all rounds) | 500,000 |
| Voting rule | 1 property = 1 vote (NOT 1 share = 1 vote) |
| Share transfer | Freely transferable (voting rights stay with property) |
| Dividend | Proportional to shares held, after profitability |

**2 Rounds:**
- Alpha (now): $1,000/share — 3,000 shares — Koh Phangan founding partners — $3M
- World (next): $1,500/share — 497,000 shares — Worldwide — $745.5M
- Total capital: $748.5M · BTC reserve (20%): $149.7M

### Bitcoin Strategy

**BTC as Payment Rail:** Travelers pay card/PayPal/bank OR Bitcoin. Lightning Network at M03. Hotelier receives THB, USD, EUR, or BTC — their choice.

**BTC as Treasury Reserve:** 20% of ALL capital raised → permanent Bitcoin reserve. Written into company statutes. 90% shareholder vote to change. At full scale: $149.7M in BTC. Never sold.

**BTC as Investment Currency:** Founding Partners buy shares WITH Bitcoin. $1,000 in BTC = 1 Alpha share. Annual dividends claimable in BTC.

### Capital Allocation — Alpha Round ($3M)

| Line item | Amount | % |
|-----------|--------|---|
| Bitcoin Reserve | $600K | 20% |
| Acquisitions — Flagship Hotels KP | $750K | 25% |
| Product & Tech | $660K | 22% |
| Operations runway | $690K | 23% |
| Marketing & Legal | $300K | 10% |

### Built-in Wallet

Native in-app wallet for travelers and hoteliers:
- Load in BTC, USDT, or card
- Pay bookings, receive payments, collect dividends, earn referrals
- Withdraw in THB, USD, EUR, or keep in BTC

### Referral Program

- 2% referral reward in BTC for life on every new hotelier brought in
- Both hoteliers AND travelers can refer
- Paid automatically via the wallet

### Founding Partners — Correct Terminology

- Alpha Round = 3,000 shares at $1,000 each
- Founding Partners = the hoteliers who buy those shares

---

## 3.bis — Solana Stack & $STAY Token

> **Source of truth**: STAYLO IP Protection Document (STAYLO-IP-2025-001),
> SHA-256 anchored to Bitcoin blockchain via originstamp.org on 2026-04-25.
> The architecture below is constitutional; do not deviate without explicit
> founder approval.

### Why Solana (not Ethereum, not Cosmos, not Polkadot)

Solana fills the roles Bitcoin cannot:
- Sub-second finality + sub-cent fees → DAO votes feasible at scale
- Mature SPL token + Metaplex NFT primitives
- Native Phantom wallet (90M+ MAU SE Asia heavy)
- Raydium for DEX listing of $STAY
- Realms framework for SPL Governance (1 property = 1 vote)

Bitcoin keeps payments + treasury + dividends. Solana powers governance,
loyalty, and ambassador rewards. Best of both — never one chain doing
everything.

### Three Solana roles

1. **DAO Governance** — Realms-based SPL Governance program. 1 property
   = 1 vote (regardless of share count). Quorum 30%. Simple majority
   51% for routine decisions; supermajority 90% required to change the
   commission rate, BTC treasury mandate, or token supply.
2. **$STAY token** — SPL token, fixed supply, used as loyalty + governance
   gating (≥1,000 $STAY required to vote).
3. **Ambassador & loyalty rewards** — programmable smart contract for
   the 2% BTC commission stream (currently DB-backed via chantier #10,
   migration to on-chain planned in chantier #12.4).

### $STAY Tokenomics (canonical)

| Parameter | Value |
|-----------|-------|
| Total supply | **10,000,000,000** (10 billion) — fixed forever |
| Blockchain | **Solana** (Raydium DEX) |
| TGE price | **$0.10 USD** |
| FDV at TGE | **$1B** |
| Halving | **Every 4 years** (Bitcoin-style) |
| Y0–Y4 earn rate | 10 $STAY / night hosted |
| Y4–Y8 earn rate | 5 $STAY / night |
| Y8–Y12 earn rate | 2.5 $STAY / night |
| Annual burn | 10–15% of commission revenue → buy & burn $STAY |
| Emergency mint | 90% governance vote only · cap 1%/year of supply |
| TGE target | Month 07 post-Alpha funding |

#### $STAY Allocation (10B total)

| Pool | Amount | % | Purpose |
|------|--------|---|---------|
| Founding Partner Earn Pool | 3.0B | 30% | Earn rewards for Alpha FP hotels (earliest participants) |
| Platform Earn Pool | 2.0B | 20% | Per-night $STAY earnings — hotels and travelers |
| Reserve | 2.0B | 20% | Strategic reserve, future programs |
| Ambassador Program | 1.5B | 15% | Referral rewards + signing bonuses |
| Team & Founders | 1.0B | 10% | 4-year vesting, 1-year cliff |
| DEX Liquidity | 0.5B | 5% | Raydium launch liquidity pool |
| **TOTAL** | **10.0B** | **100%** | — |

### Full Share Structure (per IP doc)

| Category | Shares | % | Price | Conditions |
|----------|--------|---|-------|------------|
| Founders (seed cohort) | 50,000 | 10% | Sweat equity | 12m cliff + 36m vesting |
| Private Investors (non-hotelier) | 100,000 | 20% | $1,500 | Vote · Dividends · BTC treasury benefit |
| Alpha Round — Koh Phangan | 3,000 | 0.6% | $1,000 | KP hoteliers only — limited |
| World Round — Global Hotels | 347,000 | 69.4% | $1,500 | Hotel owners worldwide — open |
| **TOTAL** | **500,000** | **100%** | — | — |

### Dual-sided Referral Matrix (per IP doc, supersedes earlier "Referral Program" section)

| Who refers | What | Reward |
|------------|------|--------|
| Property or FP | New hotel | 1,000 $STAY one-time + 2% BTC on bookings for life |
| Property or FP | New traveler (Member) | 100 $STAY at their first booking |
| Member (traveler) | A hotel | 2% BTC on that hotel's bookings for life → becomes Ambassador |
| Member (traveler) | Another Member | $STAY reward (rate TBD) — builds platform demand |
| Ambassador | More hotels | Additional 2% BTC stream per hotel |

### Governance — Two layers

STAYLO uses a **dual-layer governance** model: corporate matters
(Singapore Pte Ltd) are decided by all shareholders weighted by shares;
operational/platform matters (Solana DAO) follow the cooperative
"1 property = 1 vote" rule, with a small allocation of Founder Seats.

#### Layer 1 — Singapore Corporate Vote (off-chain)

Standard Singapore Companies Act voting, weighted **1 share = 1 vote**.
All share-holders participate (Founders + Private Investors + Founding
Partners). Decides:

- Distribution of dividends (20% net profit/year)
- Issuance of new shares (with 30-day pre-emptive rights for existing
  shareholders to maintain pro-rata)
- M&A, acquisitions, dissolution
- BTC treasury allocation
- Appointment of board / executive team / auditor / CFO
- Annual budget
- Any modification of the company statutes (90% supermajority)

#### Layer 2 — Solana DAO (on-chain) — TWO seat types

Two seat categories, votes are **summed**:

**Hotel Seats** — unbounded, scales with the cooperative
- Eligibility: hold ≥1,000 $STAY AND have an active listing on Staylo
  (status `live` or `validated`)
- Vote: 1 vote per active property (a hotelier with 3 properties votes 3×)
- Lose seat: when listing becomes inactive or $STAY balance < 1,000

**Founder Seats** — capped, sunsets as the coop grows
- Eligibility: hold ≥1,000 $STAY AND was part of the seed cohort
  (50K Founder share allocation), AND signed quarterly attestation of
  active engagement
- Vote: 1 vote per Founder
- **Cap absolute: 10 seats** (5 currently filled + 5 reserved for future
  senior hires / late co-founders)
- **Sunset clause**: at M36, if the platform has >10,000 active
  hotelier seats, Founder Seats can be abolished by 51% vote of Hotel
  Seats alone (Founder Seats themselves do not vote on this question)
- No cumul: a Founder who later becomes a hotelier counts as a Hotel
  Seat (not both). The list of Founder Seat holders is publicly
  on-chain and verifiable.

**Decisions taken at the DAO layer**:
- Product features and roadmap
- OTA partnerships (Booking, Airbnb integrations)
- Marketing campaigns
- Channel Manager priorities
- $STAY emission rate, halving timing
- Commission rate (within the 10% lock — 90% supermajority required to change)

**Decisions NOT in the DAO** (handled at corporate layer):
- Dividends, M&A, dilution, executive appointments, audit, CFO

#### DAO Voting parameters

| Param | Value |
|-------|-------|
| Quorum | 30% of total eligible seats (Hotel + Founder combined) |
| Simple majority | 51% — features, partnerships, marketing |
| Supermajority | 90% — commission rate, BTC mandate, token supply |

#### Founder Seat dilution over time (illustrative)

| Period | Hotel Seats | Founder Seats | Founder weight |
|--------|-------------|---------------|----------------|
| M03 (10 hôtels actifs) | 10 | 5 | 33% — strong influence at start |
| M12 (380 hôtels) | 380 | 5 | 1.3% |
| M24 (4,800 hôtels) | 4,800 | 5 | 0.1% |
| M36 (16,649 hôtels) | 16,649 | 5 | 0.03% — pure cooperative |

Natural sunset: Founders are influential when their judgment matters
most (early days), then automatically dilute as the network scales.

#### Private Investors Rights — "Engaged but not Controlling" (5 mechanisms)

Private Investors put up cash without operating hotels. They deserve
voice + protection on their financial stake, but cannot take control of
day-to-day operations (which would defeat the cooperative purpose). The
following five mechanisms achieve that balance — formalized in the
Shareholders Agreement (Drew & Napier counsel, post-Singapore
incorporation).

**1. Information rights** (full transparency, zero power)
- Quarterly written report: bookings, revenue, BTC treasury, $STAY
  metrics, roadmap, risks
- Mandatory Annual General Meeting (AGM) — physical or virtual
- Quarterly investor call with the founder/CEO
- Private Telegram/Discord "Investor Circle" channel — direct line
  to the founder

**2. Advisory Board** (consultative seat, no decision power)
- Private Investors elect **2 members** of an Advisory Board (one seat
  per ~50K shares as a guideline)
- The Advisory Board *advises* the Executive Board (composed of
  Founders + Founding Partners) but does not vote on operations
- The Advisory Board may issue *public recommendations* on any topic
- Standard practice in venture-backed cooperatives

**3. Veto rights — minority defensive only** (51% of PI class required)
The Private Investors as a class can BLOCK (but not initiate) any of:
- Share dilution > 10% of existing capital
- Sale of the company (M&A)
- Any change to the 10% commission rate
- Removal of the 20% BTC treasury mandate
- Liquidation preference modification
→ Standard VC blocking minority. They can say "no" to 5 critical things,
  cannot force anything.

**4. Pre-emptive rights** (anti-dilution protection)
- On every new share issuance (e.g., World Round, future Series B),
  Private Investors have **30 days** to exercise their pro-rata right
- If they invest again → maintain their 20% stake
- If they decline → accept the dilution
- Standard private equity. Zero cost to STAYLO.

**5. Voting on financial-only matters** (1 share = 1 vote, Layer 1)
Private Investors vote at the **corporate (Singapore Pte Ltd) layer
only**, never in the Solana DAO. Topics they vote on:
- Annual dividend distribution (20% net profit)
- New share emissions (Series B, etc.) + their pre-emptive right
- M&A, acquisitions
- Annual financial audit
- CFO / auditor appointment

Topics they DO NOT vote on (handled in DAO Layer 2 by hoteliers):
- Product features, roadmap
- Marketing campaigns, OTA partnerships
- Channel Manager priorities
- Day-to-day operational decisions

#### Sumary table — who votes where

| Class | Layer 1 (Singapore Corp) | Layer 2 (Solana DAO) |
|-------|--------------------------|----------------------|
| Founders | ✅ 1 share = 1 vote | ✅ 1 Founder Seat (max 10 total) |
| Private Investors | ✅ 1 share = 1 vote on financial matters · 5 minority rights (info, advisory, veto, pre-emptive, financial vote) | ❌ Not eligible |
| Founding Partners | ✅ 1 share = 1 vote | ✅ 1 Hotel Seat per active property |
| Property (free listing) | ❌ No shares | ✅ 1 Hotel Seat per active property (if ≥1,000 $STAY held) |

### Roles & Sides (canonical 4-role model)

| Role | Side | Condition | Reward |
|------|------|-----------|--------|
| Property | Hotels | Free listing | 10% commission · $STAY tokens/night |
| Founding Partner (FP) | Hotels | Signed $1,000 contract | Co-owner · 1 vote · 20% dividends · $STAY |
| Member | Travelers | Free Staylo account | $STAY/booking · referral rewards |
| Ambassador | Travelers | Member who referred ≥1 hotel | % of referred hotels' bookings in BTC for life |

### Competitive matrix (vs Travala — direct crypto-OTA competitor)

| Feature | Booking.com / Airbnb | Travala | **Staylo** |
|---------|----------------------|---------|------------|
| Commission | 14–22% | 0–5% | **10% LOCKED for life** |
| Hotelier ownership | None | None | **Real shares** |
| Governance vote | None | None | **1 property = 1 vote** |
| Annual dividends | None | None | **20% net profit/year** |
| Bitcoin Lightning | None | Crypto only | **Constitutional pillar** |
| BTC Treasury reserve | None | None | **20% all capital — locked** |
| Hotel referral | None | None | **1,000 $STAY + 2% BTC/life** |
| Traveler referral | None | None | **2% BTC life or $STAY** |
| Platform token | None | AVA | **$STAY — Bitcoin halving** |
| Cooperative / DAO | None | None | **DAO on Solana** |
- Starting target = 400 Founding Partners in Koh Phangan
- NOT "3,000 Founding Partners" — shares ≠ people

---

## 4. Documents in /STAYLO folder

| File | Description |
|------|-------------|
| `staylo_letter_of_intent.docx` | LOI bilingual TH/EN — for hoteliers to sign NOW (non-binding) |
| `staylo_founding_partner_thai.docx` | Full partnership agreement bilingual TH/EN — for later |
| `staylo_founding_partner_contract.docx` | Full partnership agreement English only — for reference |

---

## 5. Tech Stack

```
Frontend:   React (Vite) + Tailwind CSS — mobile-first PWA
Backend:    Supabase (Auth + PostgreSQL + Storage + Edge Functions)
Hosting:    Vercel (CDN, CI/CD)
Payments:   Stripe Connect Express (SCT — separate charges and transfers)
            + Lightning Network via BTCPay Server (post-incorporation)
            + USDT/USDC via Solana (planned, chantier #12)
Crypto Gov: Solana — DAO governance + $STAY SPL token + Ambassador
            smart contracts (Realms framework, Anchor for programs)
Wallet UX:  Phantom (primary), Solflare, plus BTC Lightning wallets
            (Phoenix, Wallet of Satoshi, Alby)
AI:         Claude API (Anthropic) — booking assistant, content gen
KYC/AML:    Third-party — Singapore MAS compliance
i18n:       react-i18next (14 languages)
Routing:    react-router-dom v7
Icons:      Lucide React
Fonts:      System stack (-apple-system, BlinkMacSystemFont, "Segoe UI")
Domain:     staylo.app (registered)
```

> **Note**: the IP Protection Document mentions Netlify; we use Vercel
> in practice. Functionally equivalent (CDN + serverless build).

### Payment pipeline (chantier #1, April 2026)

End-to-end flow: guest → STAYLO platform balance (escrow) → hotelier's
Stripe Connect Express account (90%) + STAYLO commission (10%).

**Key files**:
- DB migration: `supabase/migrations/20260422000000_stripe_connect_escrow.sql`
- Edge functions: `supabase/functions/{connect-onboarding, connect-status, checkout, release-escrow, stripe-webhook}/index.ts`
- Shared helpers: `supabase/functions/_shared/{cors, stripe, supabase}.ts`
- Hotelier UI: `src/pages/dashboard/Banking.jsx` (route `/dashboard/banking`)
- Currency catalog: `src/lib/currencies.js` (30 ISO 4217 codes)
- Setup guide: `STAYLO/STRIPE_SETUP.md`

**Required env vars (Supabase Edge Function secrets)**:
- `STRIPE_SECRET_KEY` (from Stripe Dashboard → API keys)
- `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard → Webhooks → endpoint)
- `CRON_SECRET` (random hex string for the auto-release cron)

**Strategy = Separate Charges and Transfers (SCT)**, NOT destination
charges. The whole payment lands on STAYLO's balance first; we manually
trigger `transfer.create()` later when the escrow window elapses or the
post-checkout questionnaire (chantier #2) fires. This is the only way to
hold money across a check-in window with refund flexibility.

**Default escrow hold**: 24 h after `checkout.session.completed`. Will be
overridden by chantier #2's post-checkout questionnaire trigger.

**Multi-currency from day 1**: every property declares its listing
currency at `/submit`. Bookings inherit that currency. Stripe handles FX
on the guest side automatically.

### Supabase Database Schema

```sql
-- Users / Hoteliers
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  referral_code text UNIQUE, -- format: STAYLO-XXXXX
  referred_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Properties
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  type text CHECK (type IN ('hotel','guesthouse','resort','villa','hostel','restaurant','activity')),
  country text,
  city text,
  booking_link text,
  airbnb_link text,
  room_count integer,
  avg_nightly_rate decimal,
  monthly_commission decimal, -- self-reported OTA commission/month
  contact_email text,
  contact_phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','reviewing','validated','live')),
  created_at timestamptz DEFAULT now()
);

-- Shares
CREATE TABLE shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  property_id uuid REFERENCES properties(id),
  quantity integer DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  price_per_share decimal DEFAULT 1000,
  total_amount decimal GENERATED ALWAYS AS (quantity * price_per_share) STORED,
  loi_signed boolean DEFAULT false,
  loi_signed_at timestamptz,
  contract_signed boolean DEFAULT false,
  payment_confirmed boolean DEFAULT false,
  reference_code text UNIQUE, -- format: STAYLO-LOI-KPG-XXX
  created_at timestamptz DEFAULT now()
);

-- Survey answers
CREATE TABLE survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  platforms_used text[],        -- ['agoda','booking','airbnb']
  monthly_commission decimal,   -- self-reported USD
  commission_pct decimal,       -- estimated %
  ota_dependency text,          -- '<30%','30-50%','50-70%','>70%'
  biggest_frustration text,
  interest_score integer CHECK (interest_score BETWEEN 1 AND 10),
  would_join boolean,
  intended_investment decimal,  -- how much they'd invest
  room_count integer,
  created_at timestamptz DEFAULT now()
);

-- Referrals
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id),
  referred_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Waitlist (non-hoteliers or not-ready-yet)
CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text,
  created_at timestamptz DEFAULT now()
);
```

---

## 6. App Routes & Pages

```
/                   → Home (landing page with commission calculator)
/survey             → Hotelier qualification survey
/submit             → Property submission form
/vision             → Vision page (roadmap, ownership model)
/join               → Register + referral capture (?ref=STAYLO-XXXXX)
/login              → Login
/dashboard          → Hotelier dashboard (status, referrals, LOI)
/loi/[ref]          → LOI signing page for a specific hotelier
```

---

## 7. Design System

### Brand Colors
```css
--staylo-blue:    #1B6FE8;  /* Primary CTA */
--staylo-navy:    #0A1628;  /* Hero backgrounds */
--staylo-green:   #1D9E75;  /* Success, savings, ownership */
--staylo-orange:  #FF6B35;  /* Activities category accent */
--staylo-white:   #F5F3EF;  /* Warm background */
```

### Typography
- **Headings:** Inter or Plus Jakarta Sans, weight 600–700
- **Body:** Inter, weight 400
- **Thai text:** Sarabun or Kanit (Google Fonts)
- **Monospace (codes):** JetBrains Mono

### Style Rules
- Mobile-first, full responsive
- Rounded corners: `border-radius: 12px` for cards
- Clean, trustworthy, slightly premium
- NO heavy gradients except hero section
- Dark mode: background `#050B18`, grid texture, blue glow effects

---

## 8. Key Components to Build

### Hero Section — Commission Calculator
The #1 conversion tool. Hotelier enters:
- Monthly revenue (slider)
- Current commission % (slider)
→ Instantly sees: "You pay $X,XXX/month to Agoda. Invest that once → become owner."

```jsx
// Key logic
const monthlyOTA = revenue * 0.60 * (commission / 100);
const annualOTA = monthlyOTA * 12;
const annualStaylo = revenue * 0.60 * 0.10 * 12;
const annualSaving = annualOTA - annualStaylo;
const roi = (annualSaving / monthlyOTA).toFixed(1); // x times ROI
```

### Survey Flow
4 questions max, conversational style:
1. Monthly OTA commission amount → show annual equivalent
2. % of bookings via OTA
3. How much would you invest? (multiple choice)
4. Property name + email

### Dashboard
After signup, hotelier sees:
- LOI status (not signed / signed / contract pending)
- Property status (pending → reviewing → validated → live)
- Referral count + referral link
- Position in founding members list
- Commission savings calculator (personalized)
- "Your shares" section (locked until payment)

---

## 9. Multilingual Setup

Priority order:
1. `th` — Thai (primary for Koh Phangan launch)
2. `en` — English (default fallback)
3. `ja` — Japanese
4. `zh` — Chinese Simplified
5. `ko` — Korean
6. `ru` — Russian
7. `fr` — French
8. `es` — Spanish
9. `de` — German
10. `id` — Indonesian
11. `pt` — Portuguese
12. `ar` — Arabic (RTL)
13. `my` — Burmese

Use `react-i18next`. All strings in `/src/i18n/[lang].json`.

---

## 10. Product Roadmap

### Geographic Expansion (per IP doc, section 11)

| Phase | Geography | Target | Timeline | Key Metric |
|-------|-----------|--------|----------|------------|
| Alpha | Koh Phangan, Thailand | 400 Founding Partners | M01–M06 | 10 FP/week |
| Expand TH | Samui, Phuket, Krabi, Chiang Mai | 2,000 hotels | M06–M12 | 380 hotels by M12 |
| SEA | TH + 6 SEA countries | 5,000 hotels | M12–M24 | 4,800 hotels by M24 |
| World Round | 190+ countries ($1,500/share opens) | 16,649 hotels | M12+ | 16,649 by M36 |

### Product Phases

| Phase | Timeline | Category | Description |
|-------|----------|----------|-------------|
| Alpha | Now | **Stay** | Hotel onboarding, LOI signing, survey, referral |
| **Stripe Connect + Lightning MockProvider** | **DONE** | **Pay** | **Card via Stripe Connect Express + Lightning via mock (chantier #1, #1.5, #9, #10)** |
| Wallet | M03 | **BTC** | Built-in wallet, real Lightning (BTCPay), BTC payments |
| V1 | M6 | **Stay** | Live booking engine, 10% commission |
| **$STAY TGE** | **M07** | **Token** | **SPL token launch on Raydium DEX, fixed 10B supply, halving every 4y** |
| **Channel Manager** | **M9** | **Stay** | **Free 2-way sync with Booking, Airbnb, Agoda, Expedia, Hostelworld, Trip.com (+ iCal) — included gratis for every hotelier** |
| **DAO Governance live** | **M10** | **Solana** | **Realms-based SPL Governance, 1 property = 1 vote** |
| V2 | M12 | **Eat** | Restaurants, beach clubs, food experiences |
| V3 | M18 | **Do** | Activities, tours, diving, yoga, spa |
| V4 | M24 | **Fly** | Flights, transfers |
| V5 | M30+ | **Super App** | Full platform, token governance mature, global |

### 🔌 Channel Manager (M9 milestone)

**The promise**: a free, fully-integrated channel manager that syncs
availability, rates and reservations between STAYLO and every major OTA
in the world. Comparable products (Cloudbeds, Hostex, Hostfully, RoomRaccoon)
charge **$50–300/month per property**. STAYLO ships it for **$0**.

**Why STAYLO can do this for free**:
- Our economic model is the 10% commission on direct bookings — we don't
  need to monetize the PMS layer
- Channel manager = retention moat. Once a hotelier syncs their OTAs
  through us, they stay
- The more we know about their OTA bookings (via webhooks back from
  the channels), the better we can position STAYLO bookings

**Technical scope (V1)**:
- iCal in/out sync for all OTAs that expose calendar feeds (Booking,
  Airbnb, Vrbo, basic level — read availability)
- Booking.com Connectivity APIs (Content + ARI + Reservations) — XML
- Airbnb API (requires Partner status — apply M6)
- Agoda Channel API
- Expedia EQC (Expedia QuickConnect)
- Internal queue + retry + conflict resolver
- Hotelier UI: connect OTA accounts, view sync status, manual override

This is NOT in chantier #1-#5. It's a separate **chantier #6** scheduled
post-Alpha launch.

---

## 11. Key Pitch Numbers

These numbers go in the copy and landing page:

| Metric | Value | Source |
|--------|-------|--------|
| Commissions leaving Koh Phangan/year | $6.3M | Calculation: 420 properties × avg $1,253/month |
| Booking Holdings 2024 revenue | $23.7B | Official results |
| Airbnb 2024 revenue | $11.1B | Official results |
| Agoda commission Thailand | 15–17% | Agoda Partner Hub |
| Thailand #1 on Agoda awards | 5,640 properties | Agoda 2024 report |
| Total OTA commissions Thailand/year | ~$680M | Calculated estimate |
| Staylo commission | 10% | Fixed |
| ROI year 1 (avg guesthouse) | ~5.9x | Savings / investment |

---

## 12. Folder Structure

```
/staylo
  /src
    /components
      /ui           Button, Input, Card, Badge, Modal, Slider
      /layout       Navbar, Footer, Layout
      /sections     Hero, CommissionCalc, HowItWorks, Flywheel, Vision
      /forms        SurveyForm, PropertyForm, AuthForm, LOIForm
      /dashboard    StatusCard, ReferralWidget, SharesWidget
    /pages
      Home.jsx
      Survey.jsx
      Submit.jsx
      Vision.jsx
      Dashboard.jsx
      Login.jsx
      Register.jsx
      LOI.jsx
    /i18n
      th.json       ← PRIMARY
      en.json
      ja.json
      [+ 10 others]
    /lib
      supabase.js
      referral.js   generateCode(), trackClick(), getStats()
      analytics.js
    /hooks
      useAuth.js
      useReferral.js
      useSurvey.js
    /context
      AuthContext.jsx
  /public
    /assets
      logo.svg
      og-image.png  1200×630 for social sharing
  /STAYLO           ← documents folder (LOI, contracts)
    CLAUDE.md       ← this file
    staylo_letter_of_intent.docx
    staylo_founding_partner_thai.docx
    staylo_founding_partner_contract.docx
  index.html
  vite.config.js
  tailwind.config.js
  .env.example
```

---

## 13. Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=https://staylo.app
VITE_REFERRAL_BASE=https://staylo.app/join
```

---

## 14. Build Priority Order

Build in this exact order:

1. Project setup (Vite + React + Tailwind + Supabase + i18n)
2. Design system (colors, typography, Tailwind config)
3. Supabase schema (run SQL above)
4. i18n structure (th.json + en.json with all keys)
5. **Landing page with Commission Calculator** ← most important
6. Survey flow (4 steps, conversational)
7. Property submission form
8. Auth (register + login + referral code generation)
9. Dashboard
10. LOI signing page
11. Vision page
12. All 13 language files
13. Mobile optimization
14. Analytics events

---

## 15. Tone & Copy Guidelines

- **Direct, not salesy.** Numbers do the work.
- **Emotional before rational.** "Your money is leaving the island" before "$6.3M/year".
- **Short sentences.** Max 15 words per sentence in Thai.
- **CTA is always "Devenir Founding Partner" / "สมัครเป็น Founding Partner"** — never "sign up" or "register".
- **The key reframe:** It's not an expense. It's an investment in the platform that feeds you.

---

*Last updated: April 2025 — Bitcoin strategy update + capital allocation revision*
*For questions: contact the founder directly via staylo.app*
