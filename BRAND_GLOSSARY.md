# STAYLO — Brand & Vocabulary Glossary

> **Purpose:** the single source of truth for how we talk about STAYLO.
> Every contributor (humans, AI assistants, translators, copywriters,
> investors-deck designers) should align to this doc. Updates require a
> commit so the change is dated and visible.
>
> **Last updated:** 2026-06-18 (canonical lock — see [[project_staylo_canonical_locked]] in agent memory)

---

## 1. Brand name & writing

| ✅ Use | ❌ Don't use | Why |
|---|---|---|
| **STAYLO** (all caps) | Staylo, staylo, sTayLo | The brand mark uses all caps in headlines, marketing, legal. |
| **Staylo** (capitalized) | STAYLO, staylo | Acceptable in running prose, body copy, and where all-caps would feel shouted. |
| **staylo.app** (lowercase domain) | STAYLO.app, Staylo.app | Domain names are conventionally lowercase. |
| **STAYLO Hotels** | Staylo Hotel, Stay Lo Hotels | Long-form brand when we need to disambiguate from generic "stay" verbs. |

**Logotype rule (visual):** the wordmark splits "stay" (deep / black) and "lo" (orange / accent). Never split it any other way ("sta-ylo", "stayl-o").

---

## 2. Legal entities — the two-layer structure

This is the most-confused area. **Memorize this table.**

| Entity | Type | Where | Role |
|---|---|---|---|
| **Staylo Pte Ltd** | Singapore Private Limited | 🇸🇬 Singapore | **Parent / maison mère / legal seat.** Holds IP, contracts with investors, signs Founding Partner agreements. Subject to Singapore law (English common law tradition). |
| **Solana DAO (Realms)** | On-chain governance layer | Solana blockchain | Where shareholder votes happen. Dividends, share emissions, treasury allocations. |
| **Thai operational entity** | TBD — Thai LLC or branch | 🇹🇭 Koh Phangan, Thailand | **Operational HQ.** Team, office, flagship hotel acquisition, hospitality compliance, PDPA, local hotelier outreach. NOT the parent — a branch / sub-entity of Staylo Pte Ltd. |

### Common mistakes to AVOID

- ❌ "STAYLO is a Thai company" → ✅ "STAYLO is a Singapore-incorporated coop with operational HQ in Thailand"
- ❌ "Our legal headquarters in Thailand" → ✅ "Our operational HQ in Thailand; legal parent in Singapore"
- ❌ "Thai law firm for the cooperative structure" → ✅ "Singapore law firm for the parent structure; Thai counsel for local hospitality regulation"
- ❌ "Delaware C-corp" → STAYLO is NOT a Delaware C-corp. Don't mention Delaware except to contrast ("we're not a Delaware-shell SaaS, we're a SG/TH coop").

### Why Singapore + Thailand (the pitch one-liner)

> "Singapore for legal certainty (English law system, crypto-friendly, 80+ tax treaties, AAA-rated jurisdiction). Thailand for everything that happens on the ground (where the team is, where the hotels are, where the customers stay)."

---

## 3. Product surfaces (the 3 apps)

| Surface | URL | Tech | Audience |
|---|---|---|---|
| **Marketing site + Hotelier dashboard** | `staylo.app` | React 19 / Vite, Supabase | Public visitors + signed-up hoteliers |
| **Guest PWA** | `app.staylo.app` | Same React build, separate entry (`guest.html`), routed via Edge Middleware | Hotel guests (mobile-first, PWA-installable) |
| **Staff Messenger** | `staylo.app/ship.html` | Single-file vanilla JS (~17,800 lines), localStorage in demo, Supabase-bound in prod | Hotelier teams (managers, front desk, F&B, housekeeping…) |

### How to refer to each (in copy)

- ✅ "the STAYLO app" → ambiguous, prefer one of the specific names below.
- ✅ "the **guest app**" / "**l'app guest**" / "**app.staylo.app**" — for the PWA at app.staylo.app
- ✅ "the **hotelier dashboard**" / "**le dashboard hôtelier**" — for the React dashboard at staylo.app/dashboard
- ✅ "the **staff messenger**" / "**le messenger**" — for the ship.html app
- ❌ "the booking platform" — too generic, doesn't distinguish from competitors
- ❌ "our website" — too small, undersells the product

---

## 4. Audiences — who's who

| Role | Definition | Pricing | Rights |
|---|---|---|---|
| **Hotelier** | Owns or operates a hotel listed on STAYLO. The customer. | Free to join + 10% commission per booking | Vote in Solana DAO (1 property = 1 vote) · **Cannot be delisted** |
| **Founding Partner (FP)** | First-cohort hotelier who buys Alpha shares ($1,000/share, up to 10/hotel). 3,000 shares total. | $1K–$10K | Vote + dividends + 10% commission locked for life · **Cannot be delisted (protected by statute)** |
| **Founder** | **David Deveaux only.** 50,000 shares LOCKED non-dilutable. Lifetime President of the Conseil. | Founder package | LOCKED shares + 10M $STAY (12m cliff + 36m vest) + véto rights on commission / dissolution / mission |
| **Private Strategic Investor** | Non-hotelier investor — 100,000 shares total, negotiated entry. | **$1,500+ / share (negotiated minimum)** | **NO VOTE · dividends only** · BTC treasury benefit |
| **World Round Investor** | Global open round — 347,000 shares. Opens progressively post-Alpha. | $1,500+ / share | Vote + dividends + BTC treasury benefit |
| **Ambassador** | Refers other hoteliers (and travelers) to STAYLO. | Free | Earns **2% commission for life** on referred hotels' bookings (paid in BTC) |
| **Guest** | Books a stay at a STAYLO hotel via app.staylo.app. | Free | $STAY rewards + loyalty tier across the network |
| **Staff** | Works at a STAYLO hotel. Uses the staff messenger. | Salaried by their hotel | Earns tips via the Pool (by points × hours), $STAY rewards |

### 🛡️ Hotelier protection — cannot be delisted (lock 2026-06-18)

Once a hotelier joins as a **Founding Partner**, they **cannot be delisted** from the platform. Ever. The protection is written into the statutes. Booking.com / Agoda / Expedia can delist a hotel at will (ToS violations, scoring algorithm, payment disputes). STAYLO removes that sword: you are a co-owner, not a vendor on a marketplace. Use this point in every hotelier outreach — it is one of the strongest differentiators vs traditional OTAs.

### Common mistakes

- ❌ Calling a hotelier "user" or "client" → ✅ "hotelier" or "partner"
- ❌ Saying "Founding Partner = founder" → No. Founders ≠ Founding Partners. Founders = team. Founding Partners = first-cohort hoteliers who buy Alpha shares.
- ❌ "Guest" = "client" → in FR copy, "guest" is fine. In EN, never "client" for a hotel customer — always "guest".
- ❌ **"Travelers and hoteliers can both become co-owners"** → No. **Only people who BUY shares** become co-owners (= Hoteliers via Founding Partner Alpha round, OR Private Investors via World Round, OR Founders via vested equity). A traveler who just books a stay does NOT become a co-owner — they earn $STAY rewards (loyalty) + can become an Ambassador if they refer hotels. To become a co-owner a traveler must either (a) open their own hotel + buy FP shares, or (b) invest cash in the World Round ($1,500/share).
  - ✅ Correct framing: "Both win — travelers earn $STAY rewards on every stay, hoteliers can become co-owners of the platform."
  - ❌ Wrong framing (used until 2026-05-25 on /home How-It-Works section, since fixed): "Both win, and both can become co-owners."

---

## 5. Token & cooperative economics

| Term | Canonical | Notes |
|---|---|---|
| **$STAY** (with `$`) | Always with the dollar sign in copy | Distinguishes the token from the verb "stay". |
| **Solana SPL Token-2022** | Full technical name when precision matters | Use when talking to crypto-literate audience or in legal/term sheet. |
| **Token supply** | 10 billion (10,000,000,000), fixed forever | Bitcoin-style **halving every 4 years** on ALL emissions. |
| **TGE** (Token Generation Event) | M07 on Raydium DEX | Target launch price $0.10, FDV $1B. |
| **Founding Partner allocation at TGE** | 30% of supply (3,000,000,000 $STAY) — **distributed at TGE** to Alpha FP hotels | Not an earn pool over time — one-shot distribution at Month 7. |
| **Engagement earn pool** | **5% of supply (500,000,000 $STAY)** — released over time to hoteliers and guests via actions | Per-night baseline (50/night) + action grid (roommate scan 100, profile 50, etc.) Halves every 4 years. |
| **Alpha share** | $1,000/share, max 3,000 shares, max 10 per hotel — **Koh Phangan only** | The Founding Partner round. Locks 10% commission for life. |
| **World Round share** | $1,500+/share · 347,000 shares · opens progressively | Global open round post-Alpha. |
| **Private Strategic share** | $1,500+/share (negotiated min) · 100,000 shares · **NO VOTE, dividends only** | Strategic non-voting capital. |
| **Founder shares** | 50,000 LOCKED non-dilutable — David Deveaux only | President à vie + véto rights. |
| **Total shares** | **500,000 across 4 categories** · capital target $523.5M+ | Founder 10% · Alpha 0.6% · Private 20% · World 69.4% |
| **BTC Treasury** | **20% of every investor raise**, permanent reserve · target $149.7M at full scale | Written into statutes. **90% supermajority to change.** |
| **Commission** | 10% per booking, for Founding Partners, **for life** | Compare: Booking.com 22%, Agoda 25%. |
| **Commission split (10%)** | Ambassador 20% · Operations 25% · Dividends 25% · Growth 20% · Reserve 10% | No auto-burn. Coop-first, not tokenomic-first. |
| **Dividends** | 25% of commission revenue, distributed proportionally | Currency choice: USD / THB / BTC (shareholder's choice). |

### The numbers to ALWAYS use (canonical figures)

| Stat | Figure | Source / context |
|---|---|---|
| Booking.com commission | **22%** | OTA average for SE Asia hotels |
| Agoda commission | **25%** | OTA average for SE Asia hotels |
| STAYLO commission | **10%** | Locked for life for FPs |
| Hotel target Y1 | 500 hotels | Network-effect threshold |
| Founding Partner cohort cap | 3,000 Alpha shares | Hard limit by design |
| Marketing claim (scale stats on guest welcome page) | 1,247 hotels · 86 cities · 142K guests · ฿14.4M saved | **These are projection figures used as a north star, not current actuals.** Mark as "target" or "projected" in any pitch to investors. |
| BTC treasury allocation | 20% of every raise | Statute-locked |
| Total addressable token supply | 10,000,000,000 (10B) | Fixed forever |
| TGE price | $0.10 | FDV = $1B |

---

## 6. Geographic & market

| ✅ Use | ❌ Don't use | Notes |
|---|---|---|
| **Koh Phangan** | Ko Pha Ngan, Pangan, Phangan Island | The official spelling — anchor of the Alpha launch. |
| **Thailand** | Tailand, Tahiland | Stick to "Thailand" in EN, "Thaïlande" in FR. |
| **Singapore** | Singapour (EN), SG (in formal copy) | "Singapour" is fine in FR; "Singapore" in EN/TH. |
| **South-East Asia / SE Asia** | South East Asia | Hyphenated when used as adjective. |
| **APAC** | Acceptable | Use when grouping with broader Asia-Pacific. |

### Launch geography

- **Alpha launch:** Koh Phangan, Thailand (M01–M06)
- **Year 1 expansion:** Phuket, Krabi, Bangkok, Chiang Mai (Thailand-wide)
- **Year 2:** Cambodia, Vietnam, Indonesia, Malaysia (SE Asia)
- **Year 3+:** Japan, Korea, India, Europe, Americas (global)

---

## 7. Vocabulary — FR / EN / TH equivalents

Common terms that translators MUST normalize. (Pulled from the i18n
bundles for shared reference.)

| EN | FR | TH | Notes |
|---|---|---|---|
| Hotelier | Hôtelier | เจ้าของโรงแรม | Use "hôtelier" (FR), not "hôtelier-restaurateur" |
| Booking | Réservation | การจอง | "Booking" (EN noun) — capitalize only at start of sentence |
| Guest | Guest / client | แขก / ผู้เข้าพัก | "Guest" in EN, "guest" or "client" in FR, "แขก" in TH |
| Commission | Commission | ค่าคอมมิชชั่น | Same word EN/FR |
| Founding Partner | Founding Partner | Founding Partner | **DO NOT TRANSLATE** — keep "Founding Partner" untranslated everywhere. Brand term. |
| Alpha share | Part Alpha | หุ้น Alpha | Mixed usage acceptable: "Part Alpha à 1 000 $" |
| Cooperative | Coopérative | สหกรณ์ | Avoid "co-op" abbreviation in formal copy |
| Token | Token / Jeton | โทเค็น | "Token" is now acceptable in FR finance copy |
| Vote / Governance | Vote / Gouvernance | การลงคะแนน / การกำกับดูแล | — |
| Treasury (BTC reserve) | Trésorerie / Réserve | คลังเงิน | Use "Réserve BTC" for the 20% locked fund |
| Smart contract | Smart contract | สัญญาอัจฉริยะ | Acceptable to keep "smart contract" untranslated in FR/TH technical contexts |
| Operational HQ | Siège opérationnel | สำนักงานปฏิบัติการ | NOT to be confused with "Legal HQ / Maison mère" = Singapour |
| Parent company / Maison mère | Maison mère | บริษัทแม่ | ALWAYS refers to Staylo Pte Ltd (Singapore) |

---

## 8. Tone & voice

### Across all copy

- **Confident, never cocky.** "We replace your OTA dependency" not "We crush Booking.com".
- **Hotelier-first, not tech-first.** Don't open with "blockchain", "Solana", or "smart contracts" unless asked. Open with money saved + control regained.
- **Numbers > adjectives.** "Saves you 12% per booking" beats "Cheaper than the competition".
- **Show the path, then the dream.** First sentence = today's problem. Last sentence = the future state. Middle = how we get there.

### Per audience

| Audience | Tone | Example opener |
|---|---|---|
| **Hotelier (cold)** | Direct, money-first, peer-to-peer | "How much do you pay Booking.com per month?" |
| **Investor (Founding Partner)** | Strategic, governance-aware, long-horizon | "STAYLO is a hotelier-owned cooperative aligning operational majority with shareholder voting." |
| **Guest** | Warm, simple, traveler-focused | "Your stay, one app. Forever yours." |
| **Staff** | Functional, efficient, ESL-friendly | "Clock in. See your shift. Tip pool live. All in one app." |
| **Press / industry** | Factual, sourced, restrained | "STAYLO is a Singapore-incorporated hospitality cooperative…" |

### What to AVOID

- ❌ Crypto-bro language: "moon", "WAGMI", "we're so back", "diamond hands"
- ❌ Generic SaaS clichés: "leverage synergies", "best-in-class", "next-gen"
- ❌ Overclaiming: "the only platform that…", "revolutionary"
- ❌ Anglicisms in FR when a French term is established: "le booking" → ✅ "la réservation"

---

## 9. Three taglines (use the right one per context)

| Tagline | Use when |
|---|---|
| **"Built with hoteliers, for hoteliers."** ⭐ canonical | **Master tagline for all investor + brand docs** (lock 2026-06-08). Use on the pitch decks, one-pagers, exec summary, term sheet. |
| **"One app. Every hotel of the network. Forever yours."** | Guest-facing (welcome screen, app.staylo.app) |
| **"The booking platform owned by hoteliers."** | Marketing site (staylo.app) hero |
| **"10% commission for life, locked by the people who book it."** | Hotelier outreach, cold meetings |

Never mix taglines. One screen = one tagline. The canonical "Built with hoteliers, for hoteliers." wins on any investor surface.

---

## 10. Things we DO and DON'T claim (yet)

| ✅ We can say | ❌ We CANNOT say yet |
|---|---|
| "We're building the platform owned by hoteliers" | "We have 1,247 hotels" *(projection number)* |
| "10% commission for Founding Partners, for life" | "We accept payments in all major cryptocurrencies" *(only BTC/Lightning today)* |
| "Acquisition target: flagship hotel in Koh Phangan" | "We own hotels" *(not yet — target M01-M06)* |
| "Multi-layer governance: shareholders (DAO) + ops (board)" | "Audited smart contracts" *(audit budget allocated, not yet completed)* |
| "Built for Thai hospitality regulation (PDPA, hotelier license)" | "GDPR certified" *(compliance ≠ certification)* |
| **"90% of every booking goes to the hotelier (not Wall Street)"** *(this IS the canonical ethical claim — verifiable, locked in FP contracts)* | **"Save up to 15% / 20% / X% cheaper than Booking.com"** *(price-discount claims are NOT under our control — each hotelier sets their own rates; we don't control whether they pass the commission savings to the guest)* |

### Pricing-claim rule (added 2026-05-25)

NEVER claim a specific % discount for guests vs OTAs. Reasons:

1. **We don't set the room price** — each hotelier does. They MIGHT pass the 12-point commission saving to the guest, or they MIGHT keep it as margin. Both are legitimate choices.
2. **Promising what we don't control = broken trust.** A guest who lands on a STAYLO hotel at the same price as Booking.com (because the hotelier kept the savings) feels deceived if we said "20% cheaper".
3. **The ETHICAL angle is stronger.** "90% goes to your hotelier (not Wall Street)" is a verifiable, brand-aligned claim that resonates with the rising "conscious traveler" demographic. It re-frames the value from "I save money" to "my money goes to the right place" — a more durable and defensible message.

If you need to put a number on the comparison, the ONLY safe number is the **commission split** (10% STAYLO vs 22% Booking → 12 percentage-point delta on the hotelier side). That's a fact. Anything translated to "guest savings" is speculation.

When in doubt: **say less, deliver more.** Promises broken in pitch = trust lost.

---

## 11. Product feature catalog — canonical names

When writing copy or building UI, use these EXACT names (in the user's
language) to refer to product surfaces and modules. Inconsistent naming
across the app makes the product feel half-finished.

### 11.1 — Hotelier dashboard modules (`staylo.app/dashboard`)

| Internal slug | EN canonical | FR canonical | TH canonical |
|---|---|---|---|
| `/dashboard` | **Overview** | Vue d'ensemble | ภาพรวม |
| `/dashboard/bookings` | **My Trips** *(as guest)* / **Bookings received** *(as host)* | Mes voyages / Réservations reçues | การเดินทางของฉัน / การจองที่ได้รับ |
| `/dashboard/properties` | **My Properties** | Mes propriétés | คุณสมบัติของฉัน |
| `/dashboard/front-desk` | **PMS Front Desk** | PMS Réception | PMS โต๊ะต้อนรับ |
| `/dashboard/housekeeping` | **Housekeeping** | Housekeeping *(or "Ménage")* | แม่บ้าน |
| `/dashboard/reports` | **Reports** | Rapports | รายงาน |
| `/dashboard/banking` | **Banking** | Banque | ธนาคาร |
| `/dashboard/shares` | **My Shares** | Mes parts | หุ้นของฉัน |
| `/dashboard/kit` | **My Kit** | Mon kit | ชุดของฉัน |
| `/dashboard/referrals` | **Referrals** | Parrainages | การแนะนำ |

### 11.2 — Staff messenger modules (`staylo.app/ship.html`)

| Module | EN canonical | FR canonical | What it does |
|---|---|---|---|
| Chat | **Chat** | Chat | Channels, direct messages, structured cards (order tickets, maintenance requests, room status) |
| Team | **Team** (or HR if formal) | Équipe | Employee profiles, contracts, documents, payroll, evaluations |
| Roster | **Roster** | Roster | List view of all employees with filters |
| Schedule | **Schedule** | Planning | Day/week/fortnight/month grid with shift editor |
| Tasks | **Tasks** | Tâches | Recurring + one-off task assignments |
| Recipes | **Recipes** (or "Fiches techniques") | Fiches techniques | Chef recipes with ingredients, cost, prep time, video |
| Pulse | **Pulse** *(brand name, do not translate)* | Pulse | POS hub: revenue live, tip pool, server credit |
| Stock | **Stock** | Stock | Inventory levels, auto-reorder, supplier links |
| Score | **Score** | Score | Network benchmark KPIs vs STAYLO network average |
| Pool | **Tip Pool** | Pool de pourboires | Server tip redistribution by points × hours |
| Payroll | **Payroll** | Paie | Auto-computed from schedule + clock events |
| Alerts | **Alerts** | Alertes | Emergency broadcasts, break reminders, low-stock |
| Settings | **Hotel Settings** | Paramètres hôtel | Country, currency, pools, contacts, custom roles/depts |

### 11.3 — Guest PWA modules (`app.staylo.app`)

| Route | EN canonical | FR canonical |
|---|---|---|
| `/welcome` | **Welcome** | Bienvenue |
| `/` | **Stay** *(your current stay)* | Séjour |
| `/booking` | **Booking** | Réservation |
| `/checkin` | **Check-in** | Enregistrement |
| `/chat` | **Chat** | Chat |
| `/services` | **Services** | Services |
| `/history` | **History** | Historique |

### 11.4 — Module DO NOT confuse

- **Pulse ≠ Pool.** Pulse = POS aggregator + revenue dashboard. Pool = tip redistribution engine. They sit side-by-side in the messenger Me view.
- **Score ≠ Reports.** Score = comparison vs network benchmark (relative). Reports = absolute revenue/occupancy/ADR/RevPAR for the hotel.
- **Booking (dashboard) ≠ Booking (guest PWA route).** Hotelier sees a list of bookings received; guest sees their booking confirmation.

---

## 12. Acronyms & abbreviations

Stop guessing what these mean. One canonical expansion each.

### Industry / hospitality

| Acronym | Full form | Notes |
|---|---|---|
| **OTA** | Online Travel Agency | Booking.com, Agoda, Expedia, Hotels.com, Trip.com |
| **PMS** | Property Management System | The hotelier's daily-ops software |
| **ADR** | Average Daily Rate | Revenue per occupied room |
| **RevPAR** | Revenue Per Available Room | ADR × occupancy rate |
| **GMV** | Gross Merchandise Value | Total $ booked through the platform |
| **NPS** | Net Promoter Score | Guest satisfaction metric |
| **F&B** | Food & Beverage | Restaurant / bar / room service |
| **FOH** | Front of House | Reception, concierge, bell, valet |
| **BOH** | Back of House | Kitchen, housekeeping, maintenance |
| **LTV** | Lifetime Value | Total revenue from a single guest across all stays |
| **OCC** | Occupancy | Rooms sold ÷ rooms available |
| **LOI** | Letter of Intent | Founding Partner pre-commitment doc |

### STAYLO-specific

| Acronym | Full form | Notes |
|---|---|---|
| **FP** | Founding Partner | First-cohort hotelier who buys Alpha shares |
| **KP** | Koh Phangan | The Alpha launch geography |
| **$STAY** | The STAYLO token | Always with $, Solana SPL Token-2022 |
| **TGE** | Token Generation Event | When $STAY goes live on Raydium (M07 target) |
| **FDV** | Fully Diluted Valuation | $STAY: $1B at $0.10/token × 10B supply |
| **DAO** | Decentralized Autonomous Organization | On-chain governance via Solana Realms |
| **DEX** | Decentralized Exchange | Raydium = where $STAY trades |
| **SPL** | Solana Program Library | Token standard ($STAY uses SPL Token-2022) |
| **AMM** | Automated Market Maker | The mechanism Raydium uses for liquidity |
| **BTC** | Bitcoin | The 20% treasury reserve asset |
| **PWA** | Progressive Web App | What app.staylo.app installs as on phones |
| **PDPA** | Personal Data Protection Act | Thai equivalent of GDPR |
| **RLS** | Row-Level Security | Postgres / Supabase access control |
| **HQ** | Headquarters | Always clarify: legal HQ (Singapore) vs operational HQ (Thailand) |

---

## 13. Roadmap & milestones

This is the canonical timeline (lock 2026-06-18). Phase-based, not month-based.

### 5 Phases — calendar timeline

| Phase | Window | What ships | Hotel count |
|---|---|---|---|
| **Phase 0** | **2026 (now → end of year)** | Tech + payments solution + Singapore Pte Ltd incorporation + Airbnb iCal + Booking Connectivity Partner submitted. **No booking engine live yet — tech floor.** | 5 KP signed (informal) |
| **🎄 X-Mas 2026 Launch** | **Dec 25, 2026** (target) | **Booking engine goes live to production** when twin trigger met: **400-500 KP hoteliers signed-up OR 500 Alpha shares sold** (whichever comes first). Never before end of 2026 regardless of count. | Threshold met |
| **Phase 1** | Q1-Q2 2027 | 25 hotels live + **$STAY TGE M07 on Raydium @ $0.10** + Booking via aggregator + BTC treasury active | 25 hotels |
| **Phase 2** | Q3-Q4 2027 | 100 hotels coop launch + Direct Booking certification + DAO live + Agoda direct | 100 hotels |
| **Phase 3** | 2028 | 500 hotels Thailand + Yield AI + Accounting module + open-source channel-kit + $30M+ ARR | 500 hotels |
| **Phase 4-5** | 2029-2031 | SEA → EU → LATAM rollout + 10-20K hotels + $500M+ token cap + $1B+ ARR | 10-20K hotels |

### 🎄 The X-Mas 2026 launch twin trigger

The booking engine goes live to production when **both** of the following hold:
1. **Tech floor:** all tech ready (payment solution, Singapore Pte Ltd incorporated, sync engine running, Airbnb iCal adapter live)
2. **Demand floor:** either 400-500 KP hoteliers signed up **OR** 500 Alpha shares sold (whichever first)

**Why this matters:**
- **Never ship before end 2026 regardless of signup count.** Shipping a half-finished platform destroys trust. Tech ready > rushed launch.
- **Twin trigger is decoupled from the full $3M Alpha raise.** A few hundred committed hotels + ~$500K in shares is enough to deploy meaningfully. The remaining 2,500 Alpha shares fund continued growth post-launch.
- **In marketing copy:** "Platform launches X-Mas 2026" not "Platform launches when 3,000 shares are sold". The launch trigger is the lower bar; the FP round can close later.

### Founder Seat — locked, not sunset

The earlier draft mentioned a "Founder Seat sunset at M36 if >10K hotels". **Removed.** Per canonical 2026-06-08: Founder shares (50,000) are **LOCKED non-dilutable**, lifetime President, with véto rights on commission / dissolution / mission. No sunset clause.

### Phase letters used in the marketing copy

- **Phase 0 / Phase 1 / Phase 2 / Phase 3 / Phase 4-5** = calendar-phase canonical
- **Alpha** = Founding Partner round only (3,000 shares max, $1,000 each, Koh Phangan only)
- **Private Strategic** = 100,000 shares · $1,500+ negotiated · NO VOTE
- **World Round** = post-Alpha public-ish round (347,000 shares · $1,500+) — opens progressively

These are NOT interchangeable. Phase 0-5 = calendar timeline; Alpha / Private / World = investment cohorts.

---

## 14. Visual identity

### Color palette (CSS tokens, current as of `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| `--color-deep` | `#2D3436` | Body text, hero headlines |
| `--color-orange` (brand) | `#FF6B00` | Primary accent — STAYLO orange |
| `--color-sunset` | `#FF3CB4` | Secondary accent, gradients |
| `--color-electric` | `#6C5CE7` | Tertiary (purple) — used for "Dashboard" link, info badges |
| `--color-libre` | `#00B894` | Teal — success states, "Live", positive deltas |
| `--color-golden` | `#FDCB6E` | Founding Partner / premium accent |
| `--color-deep-bg` | `#0F2847` | Dark backgrounds (Investor table, footer dark) |
| `--color-red` | `#E74C3C` | Errors, warnings, illegal-shift banners |
| `--color-light` | `#F8F6F0` | Page backgrounds (warm off-white) |
| BTC orange | `#F7931A` | ONLY for Bitcoin-related UI (treasury, BTC chart bars) |
| Gold (illustrative) | `#FFD700` | ONLY in comparisons (BTC vs Gold chart) |

### Brand gradient

The signature STAYLO gradient:
```css
linear-gradient(90deg, #FF6B00, #FF1F70)
/* or 135deg for hero areas */
linear-gradient(135deg, #FF6B00, #FF3CB4)
```

Used on: DEMO banner top, messenger bottom-nav, guest welcome screen, "List your hotel" CTA, primary buttons.

### Typography

- **Headlines:** `font-black` (900) — extra-bold sans
- **Body:** `font-medium` (500) for paragraphs
- **Brand wordmark:** "stay" (deep) + "lo" (orange or gradient), font-extrabold
- **Code/data:** `font-mono` for numbers in tables
- System stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — no custom web font

### Logo rules

- Always two-word split: `stay` + `lo`
- Never insert hyphens, dots, or other glyphs between
- Minimum size: 24px height (digital), 8mm (print)
- Clear space around logo: ≥ height of the "S"
- On dark backgrounds: white "stay" + orange "lo"
- On light backgrounds: deep-color "stay" + orange "lo"

---

## 15. Competitor positioning

### How to talk about Booking.com / Agoda / Expedia

**The framing:** they're not enemies. They're a comparison point. Hotels will keep using them in parallel for the first 2-3 years until STAYLO has enough direct demand.

✅ **Allowed phrasings:**
- "Booking.com charges 22% commission. We charge 10%."
- "OTAs are great for discovery. STAYLO is great for retention."
- "You can keep your Booking.com listing. We don't ask for exclusivity."
- "Booking.com keeps the guest's email. STAYLO sends it to you."

❌ **Forbidden phrasings:**
- "Booking.com is a leech / parasite / scam"
- "Death to Big OTA"
- "We will destroy Booking.com"
- Comparisons that make us look petty or insecure

### How to talk about Airbnb

Different product (vacation rentals + experiences vs hotels). Not a direct competitor for STAYLO V1. **Don't mention Airbnb in hotelier pitches** — it confuses the value proposition. Only mention if specifically asked.

### How to talk about other booking coops / hospitality DAOs

These exist (e.g. "HotelDAO", various Web3 hotel projects). Most are vaporware or pre-product.

✅ Allowed: "We're aware of other cooperative experiments. We're the only one shipping production hospitality software in 2026."

❌ Avoid: detailed comparisons by name. Looks defensive.

### The "we are NOT" list (define ourselves by contrast)

- We are **NOT** Booking.com (we don't dominate the relationship)
- We are **NOT** Airbnb (we focus on professional hotels, not P2P rentals)
- We are **NOT** a Web3 startup (we're a hospitality company that uses blockchain selectively)
- We are **NOT** a SaaS subscription (no monthly fee — commission-based)
- We are **NOT** an OTA (we don't markup; we redirect transparently)

---

## 16. Format conventions

### Dates

- **Display format (hotelier/guest UI):** localized via `_localeDate()` — "12 May 2026" / "12 mai 2026" / "๑๒ พฤษภาคม ๒๕๖๙"
- **Storage format:** ISO 8601 `YYYY-MM-DD`. NEVER store as `MM/DD/YYYY` or `DD/MM/YYYY`.
- **In marketing copy:** "May 2026" / "Mai 2026" — month + year. Avoid "5/26" or "5-26".

### Numbers

- **Prices:** comma thousands separator → `$1,000` / `1 000 €` / `฿1,000`
- **Percentages:** integer when possible → "10%", "22%". Decimals only when meaningful → "22.5%".
- **Token amounts:** comma thousands → `10,000,000,000 $STAY`
- **Hotel counts, guest counts:** abbreviate above 1K → "1,247 hotels", "142K guests", "1.2M bookings"

### Currencies

- **Primary symbol per market:** `฿` (THB) for Thai context, `$` (USD) for international, `€` (EUR) for EU.
- **Crypto:** `$STAY`, `₿` (BTC), `SOL`
- **Always show the unit:** "฿1,200" not "1,200" alone. Ambiguity kills trust.

### Naming conventions in code

- **Files:** kebab-case for components (`property-manage.jsx` would be wrong — use `PropertyManage.jsx` per React convention)
- **i18n keys:** `snake_case` namespaced by section → `vision.btc_detail_title`
- **CSS classes:** kebab-case → `.guest-rail-btn`, `.dwp-col`

---

## 17. Vendor / partner stack

For transparency in legal docs and trust-building copy. Each vendor is
chosen because they're industry-leading for their function. Names appear
"as-is" — no need to brand-protect them.

| Function | Vendor | Why |
|---|---|---|
| **Frontend hosting + CDN** | Vercel | Edge network global, instant deploys, multi-domain routing |
| **Database + Auth + Realtime + Storage** | Supabase | Postgres + RLS + OAuth + edge functions, hotelier-data sovereignty |
| **Payment (card)** | Stripe (Connect) | Best-in-class; we use Stripe Connect so hoteliers receive payouts directly |
| **Payment (crypto)** | Lightning Network (BTC) | Self-custody, instant settlement, 14% of crypto bookings are travel |
| **Token chain** | Solana | High throughput, low fees, mature SPL Token-2022 standard |
| **Email** | Resend | Transactional + marketing email, modern API, deliverability strong |
| **i18n** | i18next | 14 languages, mature, used by major hospitality brands |
| **Error monitoring** | Sentry | (Planned) — error tracking + performance |
| **Maps / location** | TBD (Mapbox vs Google) | Decision pending based on cost at scale |
| **Analytics** | First-party (`page_views` table in Supabase) | No third-party trackers, GDPR/PDPA friendly |
| **Legal — Singapore parent** | (TBD law firm name) | Local SG corporate counsel |
| **Legal — Thai operations** | (TBD law firm name) | Hospitality license, PDPA, labor law |
| **Accounting** | (TBD Thai accounting firm) | Quarterly investor reports, statutory audit |
| **Security audit** | (TBD — Halborn / Trail of Bits / OpenZeppelin) | Smart contract audit before TGE |

### "Powered by" / partner mentions

- Use sparingly. The hotelier doesn't care that we use Supabase.
- Acceptable in: investor decks, technical docs, term sheets.
- NOT acceptable on: marketing site, hotelier outreach, guest app.

---

## 18. Canonical phrases & punchlines

The recurring one-liners we use across pitches, copy, and team talk. If
you write a new one, add it here so we can reuse it everywhere.

### The 6 official punchlines

1. ⭐ **"Built with hoteliers, for hoteliers."** ← canonical master tagline (lock 2026-06-08)
   *Every investor doc. Every long-form. The master signature.*

2. **"The booking platform owned by hoteliers."**
   *Marketing hero, 1st impression. Communicates ownership + booking + hotelier-first.*

3. **"One app. Every hotel of the network. Forever yours."**
   *Guest welcome screen. Communicates permanence + network effect.*

4. **"10% commission for life — locked by the people who book it."**
   *Hotelier cold meeting opener. The economic hook.*

5. **"Singapore for legal certainty. Thailand for everything that happens on the ground."**
   *Investor / legal pitch — the structure summary.*

6. **"We're not building a better Booking.com. We're building the one you own."**
   *Closing line. Reframes the entire conversation.*

### Supporting one-liners (use as needed)

- ⭐ **"You can't be delisted. Ever."** *(Hotelier protection — vs OTAs that can delist at will.)*
- "Your guests, not their guests."
- "Direct relationship. Direct payment. Direct upside."
- "From locataire to copropriétaire." *(FR-only, plays on the rent/owner contrast)*
- "Earn $STAY on every stay. Spend it on the next."
- "Bitcoin in the treasury. Code in the platform. Hoteliers in the driver's seat."
- "We replace 6 SaaS subscriptions with 1 cooperative." *(when pitching the staff messenger)*
- ⭐ **"Bitcoin-style scarcity, built in."** *(For $STAY token: halving every 4 years on all emissions.)*
- ⭐ **"X-Mas 2026 launch. Twin trigger. Tech-ready floor."** *(For the launch timing canonical.)*

### Phrases to AVOID

- "Disrupting hospitality" — overused, sounds 2015
- "The future of travel" — generic
- "Web3 for hotels" — narrows us to crypto natives
- "Better booking experience" — vague, what does "better" mean
- "AI-powered" — we don't sell AI, we sell control + economics

---

## 19. Versioning & ownership

- This doc lives at `BRAND_GLOSSARY.md` at the repo root.
- Any contributor adding new brand language → add a row to the relevant section, commit with `docs(glossary): add <term>` style message.
- Translators consuming this file should treat it as a **constraint**, not a suggestion.
- AI assistants (Claude, GPT-4, etc.) should be pointed to this file before being asked to write any STAYLO copy.

### Change log

| Date | Commit | Change |
|---|---|---|
| 2026-05-23 | `5907bfe` | Initial creation (11 sections) + Singapore/Thailand fix |
| 2026-05-23 | (prior) | Extended to 19 sections: feature catalog, acronyms, roadmap, visual ID, competitor positioning, formats, vendor stack, canonical phrases |
| **2026-06-18** | *(this commit)* | **Canonical lock 2026-06-08 reconciliation:** §4 audiences updated (Founder = David 50k LOCKED · Private Strategic NO VOTE · cannot-be-delisted protection) · §5 token economics (FP allocation 30% TGE ≠ Engagement pool 5%/500M · halving 4y · 4-category shares · commission split detailed) · §9 + §18 tagline canonical "Built with hoteliers, for hoteliers." · §13 roadmap rewrite (Phase 0-5 + 🎄 X-Mas 2026 twin-trigger launch · Founder Seat sunset removed) |

---

**End of glossary.** Last commit before this version: `5907bfe` (initial glossary + Singapore fix).
