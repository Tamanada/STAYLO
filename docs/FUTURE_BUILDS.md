# Future Builds — Parking Lot

Ideas captured during dev sessions, kept here so we don't lose them.

---

## 🤖 Content Automation Bot (HIGH priority, post-50 sign-ups)

**Goal**: An admin-side bot that, every day, automatically:
- Generates an **image** (Claude / DALL-E / Stable Diffusion via API) — branded STAYLO graphic with the day's stat ("47 hôteliers économisent 12% chacun")
- Generates a **short video** (Runway ML / Veo / similar) — 15s reel/short with the same stat animated
- Generates an **article** (Claude API) — 800-word blog post on a topic from a content calendar (e.g. "Booking 2026 commission war", "How a Koh Phangan hostel saved €4k in Q1", etc.)
- **Auto-publishes** to:
  - Twitter/X (text + image)
  - Instagram (image + caption + hashtags)
  - Facebook page (image + caption)
  - LinkedIn (article + image)
  - TikTok (video, when ready)
  - The STAYLO blog (`/blog/[slug]`)

**Built into**: `/admin/content-bot` page with:
- Calendar of scheduled posts (next 30 days)
- Manual override / approve-before-post toggle per channel
- Per-channel API key config (Twitter API, Meta Graph API, LinkedIn API)
- Templates library (image styles, article angles)
- Performance dashboard: which posts → most clicks back to staylo.app
  (tied to the existing `page_views` referrer tracking)

**Tech stack candidates**:
- Image gen: Anthropic API doesn't generate images → use Replicate (cheap, many models) or DALL-E 3
- Video gen: Replicate (Sora2 / Veo / Runway) — €0.10-0.50 per video
- Text gen: Claude Sonnet (~€0.01 per article)
- Image API: Buffer / Hootsuite / direct platform APIs
- Scheduler: Supabase pg_cron OR a daily Vercel cron job

**Estimated build time**: 2-3 weeks for a real v1 with all 4 channels.
**Estimated monthly cost**: €30-100 in API tokens (scales with publishing frequency).

**WHY post-50 sign-ups**: makes no sense to automate content amplification when there's nothing to amplify. First need real signed-hotelier stories to fuel the content. Premature now.

---

## Other ideas captured along the way

- **WhatsApp Business via Brevo** — once 5+ hoteliers are pinged via WhatsApp regularly, formalise this with the Meta Business API. €0.06/msg.

- **Reply tracking via Resend webhooks** — capture opens/clicks/bounces, mark prospects automatically as "engaged" / "bounced" / "replied". 45 min ship.

- **Conversational hotelier bot on staylo.app** (chat widget) — pre-conversion FAQ + objection handling in EN/TH. Powered by Claude API + a STAYLO_KNOWLEDGE.md system prompt. 2-3h ship.

- **Check-out flow Front Desk** — close the PMS loop. 20 min ship.

- **Public stats page** (/community) — "X hoteliers · Y bookings · Z€ saved" social proof. 1h ship.

- **Bulk send (Brevo dashboard direct, no code needed)** — operator workflow not a feature.

- **Pre-rendering / SSR for SEO** — convert from SPA to SSG via vite-react-ssg or migrate to Next.js. Big lift, real SEO impact, but only worth it once content marketing exists.

- **Dedicated landing pages per province** (`/koh-phangan`, `/phuket`, `/chiang-mai`) — local SEO play. Each page lists hotels in that province, has province-specific copy. Multiplies our SEO surface.

- **Hotel directory pages** (`/hotels/[slug]`) — once we have 50+ properties live, each gets its own SEO-optimised page with structured data (LodgingBusiness schema).
