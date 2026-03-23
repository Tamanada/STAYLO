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
| Total alpha shares | 3,000 (Phase 1 of 10,000 total) |
| Voting rule | 1 property = 1 vote (NOT 1 share = 1 vote) |
| Share transfer | Freely transferable (voting rights stay with property) |
| Dividend | Proportional to shares held, after profitability |

**Phase pricing:**
- Phase Alpha (now): $1,000/share — Koh Phangan founding partners
- Phase V1 (M6–M12): $1,500–$2,000/share — Southeast Asia
- Phase V2+: Market price

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
Frontend:   React (Vite) + Tailwind CSS
Backend:    Supabase (Auth + PostgreSQL + Storage)
i18n:       react-i18next
Routing:    react-router-dom
Icons:      Lucide React
Fonts:      Inter or Plus Jakarta Sans
```

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

| Phase | Timeline | Category | Description |
|-------|----------|----------|-------------|
| Alpha | Now | **Stay** | Hotel onboarding, LOI signing, survey, referral |
| V1 | M6 | **Stay** | Live booking engine, 10% commission |
| V2 | M12 | **Eat** | Restaurants, beach clubs, food experiences |
| V3 | M18 | **Do** | Activities, tours, diving, yoga, spa |
| V4 | M24 | **Fly** | Flights, transfers |
| V5 | M30+ | **Super App** | Full platform, token governance, global |

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

*Last updated: March 2025 — Generated from strategic session in Claude.ai*
*For questions: contact the founder directly via staylo.app*
