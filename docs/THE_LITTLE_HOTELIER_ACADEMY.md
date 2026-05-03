# The Little Hotelier — International Standards & Regulations

> A free educational academy for independent hoteliers worldwide. Every
> property owner can find, in their language, what their local regulator
> actually requires AND what international hospitality standards expect —
> so they can prepare, modify, and operate their property to thrive.

**Status**: parking-lot vision · not started · captured 2026-05-03

---

## The vision in one paragraph

Independent hoteliers waste hundreds of hours every year decoding fragmented
local regulations (fire safety, accessibility, food handling, immigration
reporting, tax filing, employment law) AND wondering what the "real" hotel
standards actually are (room sizing, sound insulation, towel grams, breakfast
norms, ADA compliance, IATA airport-shuttle codes, SEO essentials). Most
existing answers are buried in PDF government circulars, paid consultancy
reports, or fragmentary forum threads. STAYLO publishes them — for free,
inspiringly written, in 14 languages, organised by country and by topic. The
academy lives at `staylo.app/academy` (or its own subdomain
`academy.staylo.app`) and is open to every hotelier on Earth — STAYLO
member or not.

---

## Why this is strategic, not just charity

1. **Moat via content gravity.**
   Hundreds of long-form articles, each targeting a low-competition long-tail
   keyword ("Thailand hotel license TM30 procedure", "France classement étoiles
   Atout France hôtel", "Bali HACCP for guesthouses"). Compounds into massive
   organic SEO. Every search becomes a STAYLO touch.

2. **Brand positioning vs OTAs.**
   Booking.com gives the hotelier nothing beyond bookings. STAYLO gives
   knowledge that helps the hotel succeed *outside* STAYLO too. That asymmetry
   is the kind of generosity hotels remember when commission renegotiation
   season comes around.

3. **Lead magnet for prospect outreach.**
   Our cold email becomes:
   > "I noticed your hotel is in Phuket. By the way, here's our free guide
   > to Thailand's new hotel licensing reform — saved a friend two months of
   > paperwork last quarter. No catch."
   That's a 3× reply rate vs commission talk first.

4. **Trust signal for guests.**
   Properties listed on STAYLO get a small badge: *"Hotelier trained on STAYLO
   Academy standards"*. Guests see effort, not theatre.

5. **Partnership leverage.**
   Once recognised, the academy can co-publish with regulators (Thai TAT,
   Indonesia Ministry of Tourism, France Atout France), hospitality schools
   (École hôtelière de Lausanne, Cornell), and accessibility orgs. Each
   partnership is a backlink + a credibility stack.

6. **Future revenue, optional.**
   - Paid certifications (€49 to take an exam, get a printable diploma)
   - Sponsored deep-dives by hospitality vendors (LinkedIn-style)
   - White-label academy for tourism boards
   None of this changes the free baseline. The free version is the moat.

---

## Content scope (initial buckets)

Each article: 800-2,000 words, scannable headers, one infographic, real
sources cited, last-reviewed date prominently shown.

### Per-country regulatory packs (priority 1 in launch markets)

For each country STAYLO operates in (Thailand first, Indonesia second,
then France, Spain, Greece, Vietnam, Japan, Mexico…):

- Hotel licensing — process, documents, fees, timelines, gotchas
- Fire safety code — what's required, who inspects, how often
- Immigration reporting — TM30 (Thailand), Indonesian POSTEL, Schengen
  guest registry, etc.
- Tourist taxes & VAT — what to collect, when to remit, exemptions
- Accessibility law — local minimum + the moral case for going further
- Employment law for hospitality staff — wages, contracts, work permits
  for foreigners
- Food & alcohol — HACCP equivalents, alcohol licensing, breakfast
  buffet norms
- Data protection — GDPR (EU), PDPA (Thailand, Singapore), LGPD (Brazil)
- Local zoning — short-term-let restrictions, neighbour rights
- Tax structure — LLC vs sole prop, VAT thresholds, annual filings

### International standards & best practices

- Room categorisation (standard, superior, deluxe, suite — what each
  actually means)
- Star rating systems compared (Hotelstars Union, AAA Diamond, Forbes,
  Atout France, Thai TAT) — what they measure, how to qualify
- IATA codes & airport-shuttle conventions
- Bedding and towel norms (300+ TC, weight in grams, replacement cycles)
- Sustainable hospitality certifications (EarthCheck, Green Key, LEED)
- Accessibility beyond legal min: universal design, sensory rooms
- Cybersecurity basics (PCI-DSS for card processing, GDPR-compliant CRM)
- Reputation management — how reviews mathematically influence ranking
- Revenue management primer — RevPAR, ADR, occupancy, length-of-stay
  optimisation

### Operations playbooks

- "Your first 100 days as an independent hotelier"
- "Surviving low season — 12 levers that work"
- "How to negotiate with OTAs without burning bridges"
- "Replacing your channel manager in a weekend"
- "Hiring your first full-time receptionist"
- "Going from 5 to 25 rooms — what changes in your back office"

### Inspiration vault

Quarterly long-reads about real hoteliers around the world doing
beautiful work. Not "10 best hotels", but "How a 6-room ryokan in Kyoto
manages 87% repeat-stay rate without spending a yen on marketing."
The kind of story that makes someone want to keep being a hotelier.

---

## Tone

- **Plain language.** No legalese. If we have to say "shall mean a
  facility for transient lodging" we've failed.
- **Source-cited.** Every regulatory claim links to the actual government
  PDF, statute, or official directive. Never trust me, trust this.
- **Last-reviewed date** at the top of every article, prominent.
  Out-of-date regulatory content is worse than no content.
- **Inspiring, not patronising.** Hoteliers are entrepreneurs, often
  multi-generational. Treat them that way.
- **Bilingual or trilingual minimum** per country (local language +
  English + tourism-major language: e.g. Thailand = TH/EN/ZH, Greece =
  EL/EN/DE).

---

## Phased rollout

### Phase 0 — Documented (today)
This file exists. We've defined scope. Nothing is built.

### Phase 1 — MVP (when STAYLO has 50+ hotels)
- `/academy` route, simple article-list layout
- 10 launch articles for Thailand only:
  - Hotel licensing
  - TM30 immigration reporting
  - Thai tourist tax (TGR fee)
  - Fire safety
  - HACCP basics
  - Employment law for foreign staff
  - Star rating (TAT system)
  - GDPR + PDPA for guest data
  - "Your first 100 days as a Thai hotelier"
  - Inspiration: real Koh Phangan story
- Markdown-driven, lightweight CMS (or just MDX + GitHub PR workflow)
- Multilingual via i18n keys (already in stack)
- SEO done right: per-article meta, schema.org Article + HowTo where
  applicable, sitemap auto-generated

### Phase 2 — Scale to 5 countries (when 200+ hotels)
- Indonesia, France, Spain, Greece, Vietnam articles
- Country dropdown filter
- Article tagging
- Search inside academy
- Comments / Q&A per article (light moderation)

### Phase 3 — Certifications & partnerships
- Paid optional certifications with proctored online exams
- Co-publish with at least 2 regulators
- White-label for at least 1 tourism board

### Phase 4 — Becomes the reference
- Cited by major hospitality publications
- Hospitality schools assign articles as readings
- "STAYLO Academy Certified" appears in real job descriptions

---

## Integration with the platform

- A property's `properties.academy_completion_pct` (future column)
  tracks which articles its hotelier has acknowledged reading
- Front Desk dashboard shows "📖 3 new articles for your country this
  month"
- Onboarding wizard for new hoteliers maps each registration step to
  the relevant academy article ("Why we ask for your TAT license →
  read here why it matters")
- Prospect outreach emails cite specific articles relevant to the
  prospect's country/situation
- Listing badge: "📖 STAYLO Academy hotelier" once 5+ articles read

---

## Editorial policy

- Articles authored by domain experts (lawyers, certified consultants,
  veteran hoteliers) — not by us alone
- Light contributor agreement: free article in exchange for byline +
  link to author's site
- All content under Creative Commons BY-SA — anyone can republish with
  attribution. Reinforces trust + spreads the brand
- Quarterly review cycle — every article re-checked for accuracy

---

## What this is NOT

- ❌ Not a paywall — the core academy is free forever
- ❌ Not a closed STAYLO-members-only resource — open to every hotelier
  on Earth
- ❌ Not a replacement for actual legal counsel — disclaimers on every
  regulatory article
- ❌ Not affiliate-link-stuffed marketing content — we trust the reader
  to be intelligent
- ❌ Not generic "top 10 tips" listicles — long-form, source-cited,
  inspiring
