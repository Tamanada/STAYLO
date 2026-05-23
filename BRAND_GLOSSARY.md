# STAYLO — Brand & Vocabulary Glossary

> **Purpose:** the single source of truth for how we talk about STAYLO.
> Every contributor (humans, AI assistants, translators, copywriters,
> investors-deck designers) should align to this doc. Updates require a
> commit so the change is dated and visible.
>
> **Last updated:** 2026-05-23

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
| **Staff Messenger** | `staylo.app/messenger.html` | Single-file vanilla JS (~17,800 lines), localStorage in demo, Supabase-bound in prod | Hotelier teams (managers, front desk, F&B, housekeeping…) |

### How to refer to each (in copy)

- ✅ "the STAYLO app" → ambiguous, prefer one of the specific names below.
- ✅ "the **guest app**" / "**l'app guest**" / "**app.staylo.app**" — for the PWA at app.staylo.app
- ✅ "the **hotelier dashboard**" / "**le dashboard hôtelier**" — for the React dashboard at staylo.app/dashboard
- ✅ "the **staff messenger**" / "**le messenger**" — for the messenger.html app
- ❌ "the booking platform" — too generic, doesn't distinguish from competitors
- ❌ "our website" — too small, undersells the product

---

## 4. Audiences — who's who

| Role | Definition | Pricing | Rights |
|---|---|---|---|
| **Hotelier** | Owns or operates a hotel listed on STAYLO. The customer. | Free to join + 10% commission per booking | Vote in Solana DAO (1 hotel = 1 vote) |
| **Founding Partner (FP)** | First-cohort hotelier who buys Alpha shares ($1,000/share, up to 10/hotel). | $5K–$10K typical investment | Vote + dividends + commission rate locked at 10% for life |
| **Founder** | Member of the founding team (David et al.). | Sweat equity, vested | Vote in early phase; Founder Seats sunset at M36 if conditions met |
| **Private Investor** | Non-hotelier investor (World Round @ $1,500/share). | $1,500/share | Vote + dividends + BTC treasury benefit |
| **Ambassador** | Refers other hoteliers to STAYLO. | Free | Earns 2% commission for life on referred hotels' bookings (paid in BTC) |
| **Guest** | Books a stay at a STAYLO hotel via app.staylo.app. | Free | $STAY rewards + loyalty tier across the network |
| **Staff** | Works at a STAYLO hotel (manager, front desk, F&B, housekeeping, etc.). Uses the staff messenger. | Salaried by their hotel | Earns tips via the Pool (by points × hours), $STAY rewards |

### Common mistakes

- ❌ Calling a hotelier "user" or "client" → ✅ "hotelier" or "partner"
- ❌ Saying "Founding Partner = founder" → No. Founders ≠ Founding Partners. Founders = team. Founding Partners = first-cohort hoteliers who buy Alpha shares.
- ❌ "Guest" = "client" → in FR copy, "guest" is fine. In EN, never "client" for a hotel customer — always "guest".

---

## 5. Token & cooperative economics

| Term | Canonical | Notes |
|---|---|---|
| **$STAY** (with `$`) | Always with the dollar sign in copy | Distinguishes the token from the verb "stay". |
| **Solana SPL Token-2022** | Full technical name when precision matters | Use when talking to crypto-literate audience or in legal/term sheet. |
| **Token supply** | 10 billion (10,000,000,000), fixed forever | Bitcoin-style halving every 4 years on the earn-pool emissions. |
| **TGE** (Token Generation Event) | M07 on Raydium DEX | Target launch price $0.10, FDV $1B. |
| **Founding Partner Earn Pool** | 30% of supply (3,000,000,000 $STAY) | Rewards for Alpha FP hotels. |
| **Alpha share** | $1,000/share, max 3,000 shares, max 10 per hotel | The Founding Partner round. Locks 10% commission for life. |
| **World Round** | $1,500/share | Opens after the Alpha round. Non-hotelier investors. |
| **BTC Treasury** | 20% of every raise, permanent reserve | Written into company statutes. Requires 90% supermajority to change. |
| **Commission** | 10% per booking, for Founding Partners, **for life** | Compare: Booking.com 22%, Agoda 25%. |
| **Dividends** | 20% of net annual profit, distributed proportionally | Currency choice: USD / THB / BTC (shareholder's choice). |

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
| **"One app. Every hotel of the network. Forever yours."** | Guest-facing (welcome screen, app.staylo.app) |
| **"The booking platform owned by hoteliers."** | Marketing site (staylo.app) hero |
| **"10% commission for life, locked by the people who book it."** | Hotelier outreach, cold meetings |

Never mix taglines. One screen = one tagline.

---

## 10. Things we DO and DON'T claim (yet)

| ✅ We can say | ❌ We CANNOT say yet |
|---|---|
| "We're building the platform owned by hoteliers" | "We have 1,247 hotels" *(projection number)* |
| "10% commission for Founding Partners, for life" | "We accept payments in all major cryptocurrencies" *(only BTC/Lightning today)* |
| "Acquisition target: flagship hotel in Koh Phangan" | "We own hotels" *(not yet — target M01-M06)* |
| "Multi-layer governance: shareholders (DAO) + ops (board)" | "Audited smart contracts" *(audit budget allocated, not yet completed)* |
| "Built for Thai hospitality regulation (PDPA, hotelier license)" | "GDPR certified" *(compliance ≠ certification)* |

When in doubt: **say less, deliver more.** Promises broken in pitch = trust lost.

---

## 11. Versioning & ownership

- This doc lives at `BRAND_GLOSSARY.md` at the repo root.
- Any contributor adding new brand language → add a row to the relevant section, commit with `docs(glossary): add <term>` style message.
- Translators consuming this file should treat it as a **constraint**, not a suggestion.
- AI assistants (Claude, GPT-4, etc.) should be pointed to this file before being asked to write any STAYLO copy.

---

**End of glossary.** Last commit before this version: `d91623d` (Vision allocation refactor).
