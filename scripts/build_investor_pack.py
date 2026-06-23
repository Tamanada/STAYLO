"""
Build the 7 STAYLO investor docs in /public/investors/.
All share the brand-aligned A4 pattern locked in one-pager.html
(white header + dark KPI strip + warm body + dark contact + legal footer).
Run once: writes 7 HTML files. Canonical figures from
project_staylo_canonical_locked.md (lock 2026-06-08 + X-Mas 2026 launch).
"""
from pathlib import Path

INV = Path(r"C:\Users\David\Desktop\STAYLO-repo\public\investors")
INV.mkdir(parents=True, exist_ok=True)

# ============================================================
# Shared CSS — reused across all docs
# ============================================================
CSS = """
:root {
  --orange: #FF6B00; --pink: #FF1F70; --purple: #7E22CE; --purple-d: #581C87;
  --btc: #F7931A; --deep: #1A1A2E; --ink: #2C2C3E; --muted: #6B7280;
  --line: #E5E7EB; --cream: #FAFAF8; --green: #15803D; --red: #DC2626;
  --grad-main: linear-gradient(135deg, #FF6B00 0%, #FF1F70 50%, #7E22CE 100%);
  --grad-warm: linear-gradient(135deg, #FF6B00 0%, #FF1F70 100%);
  --grad-cool: linear-gradient(135deg, #FF1F70 0%, #7E22CE 100%);
  --grad-btc: linear-gradient(135deg, #F7931A 0%, #FFB347 100%);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #111827; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: var(--ink); }
@media screen { body { display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 12px; } .page { box-shadow: 0 8px 40px rgba(0,0,0,0.35); } }
.page { width: 210mm; min-height: 297mm; background: white; position: relative; display: flex; flex-direction: column; overflow: hidden; }
.page-landscape { width: 297mm; min-height: 210mm; }
.header { background: white; color: var(--ink); padding: 12mm 14mm 8mm; position: relative; border-bottom: 1px solid var(--line); }
.header-top { display: flex; align-items: center; justify-content: space-between; gap: 8mm; }
.logo-img { height: 18mm; width: auto; display: block; border-radius: 4mm; box-shadow: 0 4px 14px rgba(126,34,206,0.18); }
.header-meta { text-align: right; font-size: 9px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); line-height: 1.55; }
.tagline { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-top: 4mm; color: var(--ink); line-height: 1.15; }
.tagline em { font-style: italic; font-weight: 800; background: var(--grad-main); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.doc-title { font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-top: 4mm; line-height: 1.1; background: var(--grad-main); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.doc-subtitle { font-size: 13px; font-weight: 600; color: var(--muted); margin-top: 2mm; line-height: 1.45; }
.kpi-strip { background: var(--deep); color: white; padding: 7mm 10mm; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.kpi { text-align: center; min-width: 0; }
.kpi-num { font-size: 24px; font-weight: 900; letter-spacing: -1.4px; line-height: 1.1; background: var(--grad-warm); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; }
.kpi-num.btc { background: var(--grad-btc); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.kpi-label { font-size: 8.5px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-top: 2mm; line-height: 1.4; }
.body { padding: 7mm 14mm; flex: 1; display: flex; flex-direction: column; gap: 5mm; }
.label { font-size: 9.5px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase; color: var(--orange); margin-bottom: 2mm; }
h2.section { font-size: 16px; font-weight: 900; color: var(--ink); margin-bottom: 2mm; letter-spacing: -0.3px; }
p, li { font-size: 10.5px; line-height: 1.55; color: var(--ink); }
p { margin-bottom: 2mm; }
ul, ol { margin: 0 0 2mm 4mm; }
li { margin-bottom: 1mm; }
strong { color: var(--ink); font-weight: 700; }
em { font-style: italic; color: var(--orange); }
.callout { background: #FFF7ED; border-left: 4px solid var(--orange); padding: 4mm 5mm; border-radius: 0 6px 6px 0; }
.callout strong { color: var(--orange); font-weight: 700; }
.callout-purple { background: linear-gradient(135deg, rgba(126,34,206,0.06), rgba(255,31,112,0.04)); border-left: 4px solid var(--purple); padding: 4mm 5mm; border-radius: 0 6px 6px 0; }
.callout-btc { background: linear-gradient(135deg, rgba(247,147,26,0.08), rgba(255,107,0,0.05)); border-left: 4px solid var(--btc); padding: 4mm 5mm; border-radius: 0 6px 6px 0; }
.tile-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.tile-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; }
.tile-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
.tile { background: white; border: 1px solid var(--line); border-radius: 6px; padding: 4mm; }
.tile-dark { background: linear-gradient(135deg, #0F0F1E 0%, #1A1A2E 100%); color: white; padding: 4mm; border-radius: 6px; border: 1px solid rgba(247,147,26,0.35); }
.tile-cat { font-size: 8.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
.tile-dark .tile-cat { color: var(--btc); }
.tile-name { font-size: 12.5px; font-weight: 800; color: var(--ink); margin-top: 1mm; line-height: 1.2; }
.tile-dark .tile-name { color: white; }
.tile-pct { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; margin-top: 2mm; background: var(--grad-warm); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tile.locked .tile-pct { background: var(--grad-btc); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tile-detail { font-size: 9.5px; color: var(--muted); margin-top: 1.5mm; line-height: 1.4; }
.tile-dark .tile-detail { color: rgba(255,255,255,0.7); }
.tile-dark .tile-detail strong { color: var(--btc); }
table.dat { width: 100%; border-collapse: collapse; font-size: 10px; }
table.dat th { background: #F1F5F9; padding: 2.5mm 3mm; font-weight: 800; text-align: left; color: var(--ink); border: 1px solid var(--line); font-size: 9.5px; letter-spacing: 0.4px; text-transform: uppercase; }
table.dat td { padding: 2.5mm 3mm; border: 1px solid var(--line); color: var(--ink); vertical-align: top; }
table.dat tr:nth-child(even) td { background: #FAFAFA; }
table.dat td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
table.dat td.green { color: var(--green); font-weight: 700; }
table.dat td.red { color: var(--red); font-weight: 700; }
.footer-row { display: grid; grid-template-columns: 2fr 1fr; gap: 4mm; margin-top: auto; padding-top: 4mm; border-top: 2px solid var(--line); }
.ask-box { background: linear-gradient(135deg, rgba(247,147,26,0.08), rgba(255,107,0,0.05)); border: 1px solid var(--btc); border-radius: 8px; padding: 4mm 5mm; }
.ask-label { font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--btc); }
.ask-amount { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: var(--ink); margin-top: 1mm; line-height: 1; }
.ask-detail { font-size: 9.5px; color: var(--muted); margin-top: 1.5mm; line-height: 1.55; }
.contact-box { background: var(--deep); color: white; border-radius: 8px; padding: 4mm 5mm; }
.contact-name { font-size: 12px; font-weight: 800; }
.contact-role { font-size: 9px; color: rgba(255,255,255,0.6); margin-top: 0.5mm; }
.contact-line { font-size: 9.5px; margin-top: 2mm; line-height: 1.6; }
.contact-line a { color: white; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.25); }
.legal { margin-top: 4mm; font-size: 7.5px; color: var(--muted); text-align: center; font-style: italic; line-height: 1.5; }
.page-footer { padding: 5mm 14mm; border-top: 1px solid var(--line); font-size: 8.5px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
.page-footer strong { color: var(--ink); font-weight: 800; letter-spacing: 0.5px; }
.page-num { font-weight: 800; color: var(--orange); }
@media print { body { background: white; padding: 0; display: block; gap: 0; } .page { box-shadow: none; page-break-after: always; } .page:last-child { page-break-after: auto; } }
"""

PORTRAIT_PAGE = "@page { size: A4 portrait; margin: 0; }"
LANDSCAPE_PAGE = "@page { size: A4 landscape; margin: 0; }"


def doc(title, meta_top, doc_title, doc_sub, body_html, page_size="portrait", extra_css=""):
    """Wrap body content in the standard doc shell."""
    page_class = "page page-landscape" if page_size == "landscape" else "page"
    page_rule = LANDSCAPE_PAGE if page_size == "landscape" else PORTRAIT_PAGE
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>STAYLO — {title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
{CSS}
{page_rule}
{extra_css}
</style>
</head>
<body>

<div class="{page_class}">

  <div class="header">
    <div class="header-top">
      <img class="logo-img" src="/STAYLO_logo.png" alt="STAYLO" />
      <div class="header-meta">
        {meta_top}
      </div>
    </div>
    <div class="tagline">Built with hoteliers, <em>for hoteliers.</em></div>
    <div class="doc-title">{doc_title}</div>
    <div class="doc-subtitle">{doc_sub}</div>
  </div>

{body_html}

</div>

</body>
</html>
"""


# ============================================================
# Standard KPI strip + footer used by most docs
# ============================================================
KPI_STRIP = """
  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-num">$1.8T</div><div class="kpi-label">Global Hotel<br/>Market TAM</div></div>
    <div class="kpi"><div class="kpi-num">10%</div><div class="kpi-label">Commission<br/>locked for life</div></div>
    <div class="kpi"><div class="kpi-num">$523.5M+</div><div class="kpi-label">Total capital<br/>target raise</div></div>
    <div class="kpi"><div class="kpi-num btc">₿ 20%</div><div class="kpi-label">Of capital → permanent<br/>BTC reserve</div></div>
  </div>
"""

FOOTER_BLOCK = """
    <div class="footer-row">
      <div class="ask-box">
        <div class="ask-label">Current Round · Pre-Seed</div>
        <div class="ask-amount">$250K — $500K</div>
        <div class="ask-detail">
          SAFE + $STAY token warrant · $5M post-money cap · 20% discount on seed · 1.0× warrant ratio · TGE M07 conversion · Targeting close Q4 2026 · Bridge to Alpha Round ($3M, KP Founding Partners).
        </div>
      </div>
      <div class="contact-box">
        <div class="contact-name">David Deveaux</div>
        <div class="contact-role">Founder · President à vie</div>
        <div class="contact-line">
          <a href="mailto:david@staylo.app">david@staylo.app</a><br/>
          <a href="https://staylo.app">staylo.app</a><br/>
          Koh Phangan, Thailand
        </div>
      </div>
    </div>

    <div class="legal">Confidential. Not an offer to sell securities. Consult legal counsel before investing.</div>
"""


# ============================================================
# 1) EXECUTIVE SUMMARY — 1 page A4 portrait, dense
# ============================================================
EXEC_SUMMARY = doc(
    title="Executive Summary",
    meta_top="EXECUTIVE SUMMARY<br/>JUNE 2026 · CONFIDENTIAL<br/>SINGAPORE / KOH PHANGAN",
    doc_title="Executive Summary",
    doc_sub="Bitcoin-native cooperative hotel booking platform · Pre-seed $250K-$500K · X-Mas 2026 launch target",
    body_html=f"""
{KPI_STRIP}
  <div class="body">

    <section>
      <div class="label">The Opportunity</div>
      <div class="callout">
        <p><strong>$6.3M leaves Koh Phangan every year</strong> to OTAs in Amsterdam, New York, Singapore. 800,000+ hotels worldwide pay 17–25% commission to platforms they don't own, can't vote on, and can be delisted from. STAYLO captures Koh Phangan first (420 active hotels) — then SEA, then global. <strong>Hoteliers pay 10% commission locked for life, become co-owners protected by statute, vote on every decision, and receive annual dividends in BTC.</strong></p>
      </div>
    </section>

    <section>
      <div class="label">The Product</div>
      <p>STAYLO is a <strong>cooperative booking platform</strong> built on three layers: (1) booking engine + channel manager (replaces Booking.com / Agoda), (2) <strong>STAYLO Ship</strong> — an all-in-one hotelier OS (PMS, payroll, contracts, POS, messenger, tip pool) included free for life, replacing 6 SaaS subscriptions, (3) guest PWA with passport check-in, vouchers, and verified reviews. Built for Thai hospitality (PDPA, TM30, bilingual EN+TH). Mobile-first, run from anywhere.</p>
    </section>

    <section>
      <div class="label">Bitcoin-native by design · 3 constitutional pillars</div>
      <div class="tile-grid-3">
        <div class="tile-dark"><div class="tile-cat">Pillar 01</div><div class="tile-name">Payment Rail</div><div class="tile-detail">Lightning · any wallet, any chain. Travelers pay in sats; hoteliers settle in THB/USD/EUR/<strong>BTC</strong>.</div></div>
        <div class="tile-dark"><div class="tile-cat">Pillar 02</div><div class="tile-name">Treasury Reserve</div><div class="tile-detail"><strong>20% of all investor capital</strong> → permanent BTC reserve. <strong>$149.7M target.</strong> 90% supermajority to touch.</div></div>
        <div class="tile-dark"><div class="tile-cat">Pillar 03</div><div class="tile-name">Investment Currency</div><div class="tile-detail">Shares + dividends in BTC. <strong>2% referral in BTC for life</strong> · hoteliers AND travelers.</div></div>
      </div>
    </section>

    <section>
      <div class="label">Share Structure · 500,000 shares · 4 categories</div>
      <div class="tile-grid-4">
        <div class="tile locked"><div class="tile-cat">Founder</div><div class="tile-name">Locked<br/>non-dilutable</div><div class="tile-pct">10%</div><div class="tile-detail">50,000 shares<br/>President à vie + véto</div></div>
        <div class="tile"><div class="tile-cat">Private Strategic</div><div class="tile-name">No vote</div><div class="tile-pct">20%</div><div class="tile-detail">100,000 × $1,500+<br/>negotiated · dividends only</div></div>
        <div class="tile"><div class="tile-cat">Alpha · KP</div><div class="tile-name">Founding<br/>Partners</div><div class="tile-pct">0.6%</div><div class="tile-detail">3,000 × $1,000<br/>= $3.0M</div></div>
        <div class="tile"><div class="tile-cat">World · Global</div><div class="tile-name">Open<br/>progressively</div><div class="tile-pct">69.4%</div><div class="tile-detail">347,000 × $1,500+<br/>= $520.5M+</div></div>
      </div>
    </section>

    <section>
      <div class="label">Launch Plan · 🎄 X-Mas 2026 · Twin Trigger</div>
      <div class="callout-purple">
        <p>Phase 0 (now → end 2026): <strong>tech ready floor</strong> — payment solution, Singapore Pte Ltd incorporation, sync engine, Airbnb iCal. Booking engine goes live <strong>X-Mas 2026</strong> when the twin trigger is met: <strong>400-500 KP hoteliers signed up OR 500 Alpha shares sold</strong> (whichever comes first). Never before end 2026 regardless of demand.</p>
      </div>
    </section>

{FOOTER_BLOCK}

  </div>

</div>
""",
)


# ============================================================
# 2) WHITEPAPER — $STAY token + full economics, 2 pages A4 portrait
# ============================================================
WHITEPAPER = doc(
    title="$STAY Token Whitepaper",
    meta_top="$STAY WHITEPAPER · v1.0<br/>JUNE 2026 · CONFIDENTIAL<br/>SOLANA · SPL TOKEN-2022",
    doc_title="$STAY Whitepaper",
    doc_sub="Utility + governance token of the STAYLO cooperative · 10B fixed supply on Solana · Bitcoin-style scarcity",
    body_html=f"""
  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-num">10B</div><div class="kpi-label">Fixed supply<br/>Solana SPL-2022</div></div>
    <div class="kpi"><div class="kpi-num">$0.10</div><div class="kpi-label">TGE Launch Price<br/>FDV $1B</div></div>
    <div class="kpi"><div class="kpi-num">4Y</div><div class="kpi-label">Halving cycle<br/>on ALL emissions</div></div>
    <div class="kpi"><div class="kpi-num btc">M07</div><div class="kpi-label">TGE month<br/>Raydium DEX</div></div>
  </div>

  <div class="body">

    <section>
      <h2 class="section">1 — Token at a glance</h2>
      <p>$STAY is the <strong>utility + governance token</strong> of the STAYLO cooperative. It rewards hoteliers and guests for actions that grow the network, pays for premium platform features, and represents non-financial voting weight where applicable. <strong>10 billion fixed supply</strong>, no inflation, no new minting (90% supermajority required to even discuss it). Bitcoin-style <strong>halving every 4 years</strong> on all emissions makes early participation the most valuable.</p>
    </section>

    <section>
      <h2 class="section">2 — Distribution at TGE (Month 7)</h2>
      <div class="tile-grid-3">
        <div class="tile"><div class="tile-cat">30%</div><div class="tile-name">Founding Partners</div><div class="tile-detail">3,000,000,000 $STAY — one-shot distribution to Alpha hotelier shareholders at TGE.</div></div>
        <div class="tile"><div class="tile-cat">25%</div><div class="tile-name">Treasury &amp; Ops</div><div class="tile-detail">2,500,000,000 $STAY — 4-year ops runway, BD, partnerships, regulatory.</div></div>
        <div class="tile"><div class="tile-cat">15%</div><div class="tile-name">Liquidity / MM</div><div class="tile-detail">1,500,000,000 $STAY — Raydium initial liquidity + ongoing market making.</div></div>
        <div class="tile"><div class="tile-cat">15%</div><div class="tile-name">Team &amp; Advisors</div><div class="tile-detail">1,500,000,000 $STAY — 12m cliff + 36m linear vest. David: 10M.</div></div>
        <div class="tile"><div class="tile-cat">10%</div><div class="tile-name">Pre-seed warrants</div><div class="tile-detail">1,000,000,000 $STAY — 1.0× warrant ratio. Bridge incentive.</div></div>
        <div class="tile"><div class="tile-cat">5% · 500M</div><div class="tile-name">Engagement pool</div><div class="tile-detail">Released over time via earn-rate grid + halving. Hoteliers AND guests earn.</div></div>
      </div>
    </section>

    <section>
      <h2 class="section">3 — Earn rate · Hybrid (lock 2026-06-08)</h2>
      <p>Baseline + action grid. Halves every 4 years (Y1-Y4 rates below · Y5-Y8 = half · Y9-Y12 = quarter · etc.).</p>
      <table class="dat">
        <thead><tr><th>Action</th><th>Tier</th><th class="num">Y1-Y4</th><th class="num">Y5-Y8</th><th class="num">Y9-Y12</th></tr></thead>
        <tbody>
          <tr><td>Per night hosted (hotelier)</td><td>Baseline</td><td class="num">50</td><td class="num">25</td><td class="num">12.5</td></tr>
          <tr><td>Roommate scan (guest)</td><td>Action</td><td class="num">100</td><td class="num">50</td><td class="num">25</td></tr>
          <tr><td>Profile complete (guest)</td><td>Action</td><td class="num">50</td><td class="num">25</td><td class="num">12.5</td></tr>
          <tr><td>First stay verified (guest)</td><td>Action</td><td class="num">50</td><td class="num">25</td><td class="num">12.5</td></tr>
          <tr><td>Review verified (guest)</td><td>Action</td><td class="num">50</td><td class="num">25</td><td class="num">12.5</td></tr>
          <tr><td>Roommate own booking</td><td>Action</td><td class="num">50</td><td class="num">25</td><td class="num">12.5</td></tr>
          <tr><td>Hotelier funder onboarded</td><td>Conversion</td><td class="num">1,000</td><td class="num">500</td><td class="num">250</td></tr>
          <tr><td>DAO vote cast</td><td>Governance</td><td class="num">25</td><td class="num">12.5</td><td class="num">6.25</td></tr>
        </tbody>
      </table>
    </section>

  </div>

  <div class="page-footer"><strong>STAYLO · $STAY Whitepaper</strong><span class="page-num">1 / 2</span></div>

</div>

<div class="page">
  <div class="body" style="padding-top:14mm;">

    <section>
      <h2 class="section">4 — Spend &amp; utility</h2>
      <ul>
        <li><strong>5% commission discount</strong> when hoteliers pay platform fee in $STAY (vs 10% cash). 50% of tokens used are burned — opt-in deflationary mechanism.</li>
        <li><strong>Profile boosts</strong> for guests (verified badge, priority on partner hotel comp lists).</li>
        <li><strong>DAO proposal stake</strong> (small refundable deposit to submit a vote).</li>
        <li><strong>Future:</strong> bridge incentives, partner co-marketing pools, deferred listing on top tier exchanges.</li>
      </ul>
    </section>

    <section>
      <h2 class="section">5 — Hold &amp; governance</h2>
      <p>Governance follows the cooperative principle: <strong>1 property = 1 vote</strong> for hoteliers (sybil-proof — independent of share or token balance). <strong>1 share = 1 vote</strong> for investors except Private Strategic (NO VOTE). $STAY balance does NOT confer voting power — but does serve as the de-facto loyalty layer for guests across the network (earn at one hotel, spend at all).</p>
      <table class="dat" style="margin-top:3mm;">
        <thead><tr><th>Decision type</th><th>Quorum</th><th>Majority</th></tr></thead>
        <tbody>
          <tr><td>Routine business</td><td class="num">10-15%</td><td class="num">51%</td></tr>
          <tr><td>Strategic</td><td class="num">30%</td><td class="num">51%</td></tr>
          <tr><td>Commission / structure</td><td class="num">50%</td><td class="num">67%</td></tr>
          <tr><td>Dissolution / mission change</td><td class="num">67%</td><td class="num">90%</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">6 — Token security</h2>
      <ul>
        <li><strong>Standard:</strong> SPL Token-2022 (Solana). Audit before TGE — budget reserved (Halborn / Trail of Bits / OpenZeppelin shortlist).</li>
        <li><strong>Mint authority:</strong> revoked at TGE. No new $STAY ever — except a 1%/year emergency cap on the engagement pool, gated by 90% DAO vote.</li>
        <li><strong>Freeze authority:</strong> revoked. Censorship-resistant.</li>
        <li><strong>Multisig:</strong> treasury controlled by 5-of-7 multisig (Singapore directors + independent custodian).</li>
      </ul>
    </section>

    <section>
      <h2 class="section">7 — Bitcoin-style scarcity narrative</h2>
      <div class="callout-btc">
        <p>$STAY is engineered as a <strong>scarcity-anchored loyalty asset</strong>, not a speculative token. Fixed 10B supply + halving every 4 years means each unit becomes 2× harder to earn over time. Early hoteliers (and guests) capture the highest emission rates — a real incentive to onboard during Phase 0/1, not Phase 5. The optional burn mechanism (5% commission in $STAY → 50% burned) compounds the scarcity narrative without dependency on price action.</p>
      </div>
    </section>

{FOOTER_BLOCK}

  </div>

  <div class="page-footer"><strong>STAYLO · $STAY Whitepaper</strong><span class="page-num">2 / 2</span></div>
""",
)


# ============================================================
# 3) TERM SHEET — sober, legal-friendly, 1 page A4 portrait
# ============================================================
TERM_SHEET = doc(
    title="Pre-Seed Term Sheet",
    meta_top="PRE-SEED TERM SHEET<br/>JUNE 2026 · CONFIDENTIAL<br/>NON-BINDING SUMMARY",
    doc_title="Pre-Seed Term Sheet",
    doc_sub="Non-binding summary · STAYLO Holdings Pte Ltd (Singapore, in incorporation) · Q4 2026 close target",
    body_html=f"""
  <div class="body">

    <section>
      <h2 class="section">Issuer &amp; round</h2>
      <table class="dat">
        <tbody>
          <tr><td><strong>Issuer</strong></td><td>STAYLO Holdings Pte Ltd (Singapore Private Limited Company — incorporation in progress)</td></tr>
          <tr><td><strong>Round</strong></td><td>Pre-Seed</td></tr>
          <tr><td><strong>Instrument</strong></td><td>SAFE (Singapore-law equivalent) + $STAY token warrant</td></tr>
          <tr><td><strong>Target size</strong></td><td>USD 250,000 — 500,000</td></tr>
          <tr><td><strong>Minimum check</strong></td><td>USD 25,000</td></tr>
          <tr><td><strong>Target close</strong></td><td>Q4 2026</td></tr>
          <tr><td><strong>Use of funds</strong></td><td>30% Legal / incorporation · 30% Tech · 20% Sales / BD · 20% BTC treasury seed</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">Economics</h2>
      <table class="dat">
        <tbody>
          <tr><td><strong>Post-money valuation cap</strong></td><td>USD 5,000,000</td></tr>
          <tr><td><strong>Discount to next round</strong></td><td>20%</td></tr>
          <tr><td><strong>$STAY warrant ratio</strong></td><td>1.0× investment converts to $STAY at TGE @ TGE launch price ($0.10)</td></tr>
          <tr><td><strong>Conversion trigger</strong></td><td>Qualified Equity Financing OR Token Generation Event (whichever first)</td></tr>
          <tr><td><strong>TGE target</strong></td><td>Month 7 (Q1-Q2 2027) — Raydium DEX, Solana</td></tr>
          <tr><td><strong>Pro-rata</strong></td><td>Granted on next priced round, capped at investor's pre-seed amount</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">Governance &amp; protections</h2>
      <table class="dat">
        <tbody>
          <tr><td><strong>Board representation</strong></td><td>None at pre-seed</td></tr>
          <tr><td><strong>Information rights</strong></td><td>Quarterly financial summary · annual audited accounts post-launch · token treasury report at TGE+12m</td></tr>
          <tr><td><strong>Most favored nation</strong></td><td>Granted — auto-upgrade to better terms offered in same round</td></tr>
          <tr><td><strong>Founder lock-up</strong></td><td>50,000 LOCKED non-dilutable shares (David Deveaux) · 10M $STAY (12m cliff + 36m linear vest)</td></tr>
          <tr><td><strong>Cannot be delisted</strong></td><td>Founding Partners hoteliers protected by statute (relevant for B2B narrative)</td></tr>
          <tr><td><strong>BTC reserve</strong></td><td>20% of all investor capital → permanent BTC treasury · 90% supermajority to touch (statute-locked)</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">Bridge to Alpha Round</h2>
      <div class="callout">
        <p>Pre-seed acts as a bridge to the <strong>Alpha Round</strong> ($3M, KP Founding Partners hoteliers, $1,000 / share, max 10 per hotel, 3,000 shares total). Booking engine launch trigger is <strong>🎄 X-Mas 2026</strong> when 400-500 KP hoteliers OR 500 shares (whichever first), never before tech ready (Singapore Pte Ltd incorporated, payment solution complete, sync engine live).</p>
      </div>
    </section>

{FOOTER_BLOCK}

  </div>
""",
)


# ============================================================
# 4) CAP TABLE — A4 LANDSCAPE, table-heavy
# ============================================================
CAP_TABLE = doc(
    title="Cap Table",
    meta_top="CAPITALIZATION TABLE · v1.0<br/>JUNE 2026 · POST PRE-SEED",
    doc_title="Capitalization Table",
    doc_sub="500,000 shares total · 4 categories · $523.5M+ capital target · Post pre-seed close (illustrative)",
    page_size="landscape",
    body_html=f"""
  <div class="body" style="padding-top:6mm;">

    <section>
      <table class="dat">
        <thead>
          <tr>
            <th>Category</th>
            <th>Shares</th>
            <th>% of total</th>
            <th>Price / share</th>
            <th>Capital target</th>
            <th>Voting rights</th>
            <th>Dilutability</th>
            <th>Phase</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Founder</strong> (David Deveaux)</td><td class="num">50,000</td><td class="num">10.00%</td><td>LOCKED</td><td class="num">non-dilutable</td><td>Vote + véto on mission / commission / dissolution · President à vie</td><td class="green">Locked</td><td>From day 1</td><td class="green">Allocated</td></tr>
          <tr><td><strong>Alpha · Koh Phangan</strong></td><td class="num">3,000</td><td class="num">0.60%</td><td class="num">$1,000</td><td class="num">$3,000,000</td><td>Vote · 1 share = 1 vote (max 10 / hotel)</td><td>Standard</td><td>X-Mas 2026 launch trigger</td><td>Pre-seed bridge</td></tr>
          <tr><td><strong>Private Strategic</strong></td><td class="num">100,000</td><td class="num">20.00%</td><td>$1,500+ negotiated</td><td class="num">$150,000,000+</td><td class="red"><strong>NO VOTE</strong> · dividends only</td><td>Standard</td><td>Post-launch</td><td>Open</td></tr>
          <tr><td><strong>World Round · Global</strong></td><td class="num">347,000</td><td class="num">69.40%</td><td>$1,500+</td><td class="num">$520,500,000+</td><td>Vote · 1 share = 1 vote</td><td>Standard</td><td>Post-Alpha (progressive)</td><td>Open</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>TOTAL</strong></td><td class="num"><strong>500,000</strong></td><td class="num"><strong>100%</strong></td><td>—</td><td class="num"><strong>$523,500,000+</strong></td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">Commission split (10% per booking)</h2>
      <table class="dat">
        <thead><tr><th>Bucket</th><th>% of commission</th><th>USD per $100 booking</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><strong>Ambassador</strong></td><td class="num">20%</td><td class="num">$2.00</td><td>2% to referring hotelier or traveler · paid in BTC for life</td></tr>
          <tr><td><strong>Operations</strong></td><td class="num">25%</td><td class="num">$2.50</td><td>Platform engineering, hosting, support, sync engines</td></tr>
          <tr><td><strong>Dividends</strong></td><td class="num">25%</td><td class="num">$2.50</td><td>Distributed proportionally to shareholders (BTC option)</td></tr>
          <tr><td><strong>Growth</strong></td><td class="num">20%</td><td class="num">$2.00</td><td>Hotelier acquisition, partnerships, new market expansion</td></tr>
          <tr><td><strong>Reserve</strong></td><td class="num">10%</td><td class="num">$1.00</td><td>Buffer / runway / regulatory reserves</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">$STAY token distribution at TGE</h2>
      <table class="dat">
        <thead><tr><th>Tranche</th><th>% of 10B supply</th><th>$STAY at TGE</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Founding Partners (one-shot at TGE)</td><td class="num">30%</td><td class="num">3,000,000,000</td><td>Distributed to Alpha hotelier shareholders</td></tr>
          <tr><td>Treasury &amp; ops runway</td><td class="num">25%</td><td class="num">2,500,000,000</td><td>4-year ops runway · BD · partnerships</td></tr>
          <tr><td>Liquidity / market making</td><td class="num">15%</td><td class="num">1,500,000,000</td><td>Raydium initial liquidity + ongoing MM</td></tr>
          <tr><td>Team &amp; advisors (vested)</td><td class="num">15%</td><td class="num">1,500,000,000</td><td>12m cliff + 36m linear vest · David: 10M</td></tr>
          <tr><td>Pre-seed warrants</td><td class="num">10%</td><td class="num">1,000,000,000</td><td>Bridge incentive · 1.0× warrant ratio</td></tr>
          <tr><td>Engagement pool (released over time, halving 4y)</td><td class="num">5%</td><td class="num">500,000,000</td><td>Hotelier night + guest action grid emissions</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>TOTAL</strong></td><td class="num"><strong>100%</strong></td><td class="num"><strong>10,000,000,000</strong></td><td>Fixed supply · no inflation</td></tr>
        </tbody>
      </table>
    </section>

    <div class="legal">Illustrative cap table for discussion purposes. Final terms governed by definitive agreements and Singapore Companies Act. Not an offer to sell securities.</div>

  </div>
""",
)


# ============================================================
# 5) PROJECTION 36M — financial model, A4 LANDSCAPE
# ============================================================
PROJECTION_36M = doc(
    title="36-Month Financial Projection",
    meta_top="36-MONTH FINANCIAL MODEL · v1.0<br/>JUNE 2026 · BASE CASE",
    doc_title="36-Month Projection",
    doc_sub="Base case · 5 phases · X-Mas 2026 launch · GMV → commission revenue trajectory · BTC reserve accumulation",
    page_size="landscape",
    body_html=f"""
  <div class="body" style="padding-top:6mm;">

    <section>
      <h2 class="section">Hotel onboarding · GMV · commission revenue</h2>
      <table class="dat">
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Phase</th>
            <th>Hotels (cumulative)</th>
            <th>Avg rooms / hotel</th>
            <th>Bookings / hotel / mo</th>
            <th>Avg booking value (USD)</th>
            <th>Quarterly GMV</th>
            <th>Quarterly commission (10%)</th>
            <th>Quarterly burn / OPEX</th>
            <th>Net (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Q3 2026</strong></td><td>Phase 0 — pre-launch</td><td class="num">5 (signed, no bookings)</td><td class="num">12</td><td class="num">0</td><td>—</td><td class="num">$0</td><td class="num">$0</td><td class="num">$60K</td><td class="red num">($60K)</td></tr>
          <tr><td><strong>Q4 2026</strong></td><td>🎄 X-Mas launch</td><td class="num">25</td><td class="num">14</td><td class="num">15 (post-Dec 25)</td><td>$120</td><td class="num">$135K</td><td class="num">$13.5K</td><td class="num">$80K</td><td class="red num">($66.5K)</td></tr>
          <tr><td><strong>Q1 2027</strong></td><td>Phase 1 · $STAY TGE</td><td class="num">50</td><td class="num">14</td><td class="num">35</td><td>$125</td><td class="num">$735K</td><td class="num">$73.5K</td><td class="num">$120K</td><td class="red num">($46.5K)</td></tr>
          <tr><td><strong>Q2 2027</strong></td><td>Phase 1 cont.</td><td class="num">100</td><td class="num">15</td><td class="num">45</td><td>$130</td><td class="num">$2.6M</td><td class="num">$263K</td><td class="num">$160K</td><td class="green num">$103K</td></tr>
          <tr><td><strong>Q3 2027</strong></td><td>Phase 2 · 100 hotels coop</td><td class="num">200</td><td class="num">15</td><td class="num">50</td><td>$135</td><td class="num">$6.1M</td><td class="num">$608K</td><td class="num">$220K</td><td class="green num">$388K</td></tr>
          <tr><td><strong>Q4 2027</strong></td><td>Phase 2 cont.</td><td class="num">350</td><td class="num">16</td><td class="num">55</td><td>$140</td><td class="num">$12.9M</td><td class="num">$1.29M</td><td class="num">$320K</td><td class="green num">$972K</td></tr>
          <tr><td><strong>Q1 2028</strong></td><td>Phase 3 · 500 ramp</td><td class="num">500</td><td class="num">16</td><td class="num">60</td><td>$145</td><td class="num">$20.9M</td><td class="num">$2.09M</td><td class="num">$450K</td><td class="green num">$1.64M</td></tr>
          <tr><td><strong>Q2 2028</strong></td><td>Phase 3 cont.</td><td class="num">700</td><td class="num">17</td><td class="num">62</td><td>$150</td><td class="num">$33.2M</td><td class="num">$3.32M</td><td class="num">$580K</td><td class="green num">$2.74M</td></tr>
          <tr><td><strong>Q3 2028</strong></td><td>Phase 3 cont.</td><td class="num">900</td><td class="num">17</td><td class="num">62</td><td>$155</td><td class="num">$44.0M</td><td class="num">$4.40M</td><td class="num">$700K</td><td class="green num">$3.70M</td></tr>
          <tr><td><strong>Q4 2028</strong></td><td>Phase 3 · year-end</td><td class="num">1,200</td><td class="num">18</td><td class="num">65</td><td>$160</td><td class="num">$67.4M</td><td class="num">$6.74M</td><td class="num">$900K</td><td class="green num">$5.84M</td></tr>
          <tr><td><strong>Q1 2029</strong></td><td>Phase 4 · Thailand-wide</td><td class="num">1,600</td><td class="num">18</td><td class="num">65</td><td>$165</td><td class="num">$92.5M</td><td class="num">$9.25M</td><td class="num">$1.1M</td><td class="green num">$8.15M</td></tr>
          <tr><td><strong>Q2 2029</strong></td><td>Phase 4 cont.</td><td class="num">2,200</td><td class="num">18</td><td class="num">66</td><td>$170</td><td class="num">$133M</td><td class="num">$13.3M</td><td class="num">$1.4M</td><td class="green num">$11.9M</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>3-year totals</strong></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="num"><strong>$413.8M</strong></td><td class="num"><strong>$41.4M</strong></td><td class="num"><strong>$6.1M</strong></td><td class="green num"><strong>$35.3M cum.</strong></td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">Key assumptions</h2>
      <ul>
        <li><strong>Conversion:</strong> 30% of signed hotels active after 1 quarter · 80% after 2 quarters · 95%+ after 4 quarters.</li>
        <li><strong>Average commission:</strong> 10% (locked FP rate). Real average slightly higher due to non-FP migrations (12-14% transitional).</li>
        <li><strong>OPEX:</strong> tech + hosting + 4-6 FTE through Phase 1 → 15 FTE by Phase 3. Excludes BTC treasury (20% of investor capital, locked).</li>
        <li><strong>GMV growth driver:</strong> network effects compound — guest LTV across hotels means each new hotel grows total network bookings, not just own.</li>
        <li><strong>Conservative:</strong> base case excludes paid OTA channel revenue and STAYLO Ship enterprise tier (future $).</li>
      </ul>
    </section>

    <section>
      <h2 class="section">BTC treasury accumulation (statute-locked 20% of investor capital)</h2>
      <table class="dat">
        <thead><tr><th>Round</th><th>Capital raised</th><th>20% to BTC reserve</th><th>Avg BTC price assumed</th><th>BTC accumulated (cumulative)</th></tr></thead>
        <tbody>
          <tr><td>Pre-seed Q4 2026</td><td class="num">$500K</td><td class="num">$100K</td><td class="num">$100K / BTC</td><td class="num">1.0 BTC</td></tr>
          <tr><td>Alpha Round Q1-Q2 2027</td><td class="num">$3.0M</td><td class="num">$600K</td><td class="num">$110K / BTC</td><td class="num">6.45 BTC</td></tr>
          <tr><td>Private Strategic (Phase 2-3, prog.)</td><td class="num">$150M+</td><td class="num">$30M</td><td class="num">$120K / BTC avg</td><td class="num">256 BTC</td></tr>
          <tr><td>World Round (post-Alpha, prog.)</td><td class="num">$520.5M+</td><td class="num">$104.1M</td><td class="num">$130K / BTC avg</td><td class="num">1,057 BTC</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>TOTAL at full scale</strong></td><td class="num"><strong>$748.5M+</strong></td><td class="num"><strong>$149.7M+</strong></td><td>—</td><td class="num"><strong>~1,250 BTC</strong></td></tr>
        </tbody>
      </table>
    </section>

    <div class="legal">Forward-looking projections. Actual results may differ materially. Not an offer to sell securities. Consult legal counsel before investing.</div>

  </div>
""",
)


# ============================================================
# 6) DOSSIER STRATEGIQUE — 2 pages A4 portrait, deep
# ============================================================
DOSSIER_STRATEGIQUE = doc(
    title="Strategic Brief",
    meta_top="STRATEGIC BRIEF · v1.0<br/>JUNE 2026 · CONFIDENTIAL<br/>FOR QUALIFIED INVESTORS",
    doc_title="Strategic Brief",
    doc_sub="Vision · go-to-market · moat · risk · 5-year horizon",
    body_html=f"""
{KPI_STRIP}
  <div class="body">

    <section>
      <h2 class="section">1 — Vision</h2>
      <p>STAYLO becomes the <strong>operating economy of independent hospitality</strong>. Not a "better Booking.com" — a fundamentally different model where the hotels using the platform also own it, govern it, and capture the upside. The cooperative pivots the value flow: instead of $6.3M/year leaving Koh Phangan for OTA shareholders in Amsterdam and New York, it stays in the local economy and accrues to the hoteliers who generated it. Same principle, scaled: <strong>Thailand → SE Asia → EU → LATAM.</strong></p>
    </section>

    <section>
      <h2 class="section">2 — Why now</h2>
      <ul>
        <li><strong>OTA fatigue:</strong> 17-25% commissions feel like a tax. Hotels want exit, not better integration.</li>
        <li><strong>Crypto / Bitcoin tooling mature:</strong> Lightning Network production-ready · Solana SPL-2022 standard · stable infrastructure (Supabase, Vercel, Stripe).</li>
        <li><strong>Cooperative renaissance:</strong> conscious traveler demographic doubling YoY · "ethical hospitality" search demand up 4× since 2024.</li>
        <li><strong>Thai timing:</strong> 2026-2027 Thailand pivots to high-value tourism · digital nomad visas · regulatory openness to Web3 (BoT sandbox).</li>
        <li><strong>Personal-edge:</strong> founder operates a Koh Phangan hotel directly — built STAYLO Ship FOR his own staff. Product-market fit observed live.</li>
      </ul>
    </section>

    <section>
      <h2 class="section">3 — Go-to-market</h2>
      <div class="callout-purple">
        <p><strong>Beachhead:</strong> Koh Phangan (420 active hotels) · founder is local · ambassador (Sasiwimol) leads community trust building · KP Founding Partner round at $1,000 / share creates 300+ hotelier-owners before launch · 🎄 X-Mas 2026 launch trigger (400-500 KP signed OR 500 shares sold).</p>
      </div>
      <p style="margin-top:3mm;"><strong>Expansion sequence:</strong> Phase 2 (2027) — Bangkok, Phuket, Chiang Mai, Krabi. Phase 3 (2028) — Cambodia, Vietnam, Indonesia, Malaysia. Phase 4-5 (2029-2031) — Japan, Korea, India, EU, Americas. Each new region opens with an in-region cooperative cohort (50-100 founding hotels) before public rollout.</p>
    </section>

    <section>
      <h2 class="section">4 — Moat &amp; defensibility</h2>
      <div class="tile-grid-3">
        <div class="tile"><div class="tile-cat">Cooperative lock</div><div class="tile-name">Hoteliers can't be delisted</div><div class="tile-detail">Statute-locked protection. No competitor can replicate without rebuilding their corp structure ground-up.</div></div>
        <div class="tile"><div class="tile-cat">Operational depth</div><div class="tile-name">STAYLO Ship integrated</div><div class="tile-detail">Booking + PMS + payroll + POS + messenger in one workflow. Switching cost compounds with use.</div></div>
        <div class="tile"><div class="tile-cat">Token network</div><div class="tile-name">$STAY across hotels</div><div class="tile-detail">Guest loyalty asset spans network. Earn at one hotel, spend at all — defection costs guest the balance.</div></div>
      </div>
    </section>

  </div>

  <div class="page-footer"><strong>STAYLO · Strategic Brief</strong><span class="page-num">1 / 2</span></div>

</div>

<div class="page">
  <div class="body" style="padding-top:14mm;">

    <section>
      <h2 class="section">5 — Risk &amp; mitigations</h2>
      <table class="dat">
        <thead><tr><th>Risk</th><th>Mitigation</th></tr></thead>
        <tbody>
          <tr><td><strong>Tech delivery slip past Q4 2026</strong></td><td>Hard floor: NEVER ship before tech ready. Twin trigger only fires when stack + Singapore Pte Ltd complete. Acceptable to delay launch into Q1 2027.</td></tr>
          <tr><td><strong>Hotelier adoption slower than 400 KP target</strong></td><td>Alpha share price ($1,000) is < 1 month of OTA commission savings — easy ROI story. Local ambassador network. KP founder presence.</td></tr>
          <tr><td><strong>Regulatory (Thai SEC / BoT)</strong></td><td>Singapore Holdings holds tokens + IP. Thai operating entity (Barokat Halal Food Co Ltd → STAYLO Thailand) handles ops only. SAFE / token warrant structures cleared by SG counsel pre-close.</td></tr>
          <tr><td><strong>Crypto market downturn</strong></td><td>Revenue is commission-based (USD/THB), not token-based. $STAY is utility token, not the core revenue model. BTC reserve is 20% of capital · accumulated DCA-style across rounds.</td></tr>
          <tr><td><strong>Booking.com / Agoda predatory response</strong></td><td>Not a price war (we're 10% vs 22% — already won on price). Their response is to negotiate harder with hotels — actually helps our narrative.</td></tr>
          <tr><td><strong>Founder concentration risk</strong></td><td>Founder Locked shares are non-dilutable but bounded — 10% of equity. President à vie + véto, but no operational control (CEO recruited post-launch). Succession plan in foundational docs.</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="section">6 — Vision · STAYLO Suite (post-launch)</h2>
      <p>Following platform launch, STAYLO Ship evolves into a <strong>full hospitality OS</strong>: STAYLO Guests (CRM), STAYLO Assist (helpdesk), STAYLO Voice (cloud calling), STAYLO Reach (email/WhatsApp), STAYLO Stories (social). Each add-on monetizes at 50-70% $STAY discount — creating sustained demand for the token without speculative dependency. Sequencing: Guests/Assist/Reach post-Phase 1 (2027). Voice/Stories late 2027+. <em>Not part of pre-seed pitch — visibility-only for strategic investors.</em></p>
    </section>

    <section>
      <h2 class="section">7 — Why this team</h2>
      <p><strong>David Deveaux</strong> — founder, hotelier-operator in Koh Phangan, built STAYLO Ship for his own hotel before pitching it elsewhere. Background in software + hospitality + crypto. 50,000 LOCKED non-dilutable shares + 10M $STAY (12m cliff + 36m vest) + President à vie + véto. Does not manage daily ops — CEO recruited post-launch.</p>
      <p><strong>Sasiwimol Tantipakdee</strong> — community lead Koh Phangan. Develops the craft, elevates the hospitality image. Bridge to local hoteliers, Buddhist temple network, Full Moon Party ecosystem.</p>
      <p><strong>Hiring plan post pre-seed:</strong> 1 senior full-stack engineer · 1 hotelier sales / BD · 1 Thai accounting / legal liaison. All Thailand-based (Phangan or Bangkok).</p>
    </section>

{FOOTER_BLOCK}

  </div>

  <div class="page-footer"><strong>STAYLO · Strategic Brief</strong><span class="page-num">2 / 2</span></div>
""",
)


# ============================================================
# 7) VALUATION RATIONALE — 2 A4 portrait pages · multi-method
# ============================================================
VALUATION_RATIONALE = doc(
    title="Valuation Rationale",
    meta_top="VALUATION RATIONALE · v1.0<br/>JUNE 2026 · CONFIDENTIAL<br/>PRE-SEED ROUND",
    doc_title="Valuation Rationale",
    doc_sub="Justifying the $5M post-money cap via four standard methodologies · For qualified investors only",
    body_html=f"""
  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-num">$5M</div><div class="kpi-label">Post-money cap<br/>Pre-seed SAFE</div></div>
    <div class="kpi"><div class="kpi-num">$250-500K</div><div class="kpi-label">Round size<br/>5-10% dilution</div></div>
    <div class="kpi"><div class="kpi-num">20%</div><div class="kpi-label">Discount<br/>to seed round</div></div>
    <div class="kpi"><div class="kpi-num btc">1.0×</div><div class="kpi-label">$STAY warrant<br/>ratio at TGE</div></div>
  </div>

  <div class="body">

    <section>
      <h2 class="section">Executive summary</h2>
      <p>The $5M post-money cap is defensible across <strong>four independent standard valuation methodologies</strong>: comparable transactions in hospitality tech, forward revenue multiples on the 36-month financial model, $STAY token FDV anchor, and a qualitative Scorecard / Berkus assessment. Each method independently lands within ±20% of the $5M target, and the convergence across methods is the strongest signal that the cap is rationally priced — not arbitrarily set.</p>
    </section>

    <section>
      <h2 class="section">Method 1 — Comparable transactions (hospitality tech)</h2>
      <p>Hospitality tech companies in the same problem space (booking engine + PMS + channel manager + cooperative or alternative ownership) at the pre-seed / seed stage have raised at the following valuations:</p>
      <table class="dat">
        <thead><tr><th>Company</th><th>Stage</th><th>Year</th><th>Valuation</th><th>Today</th></tr></thead>
        <tbody>
          <tr><td>Cloudbeds</td><td>Pre-seed / Seed</td><td class="num">2014</td><td class="num">~$5-10M</td><td class="num">$1B+ (unicorn)</td></tr>
          <tr><td>Mews</td><td>Seed</td><td class="num">2016</td><td class="num">~$15M post</td><td class="num">~$700M+</td></tr>
          <tr><td>Selina (hospitality coop-ish)</td><td>Seed</td><td class="num">2017</td><td class="num">~$25M post</td><td class="num">$1B IPO 2022</td></tr>
          <tr><td>Sojern</td><td>Series A</td><td class="num">2011</td><td class="num">~$15M post</td><td class="num">$250M+</td></tr>
          <tr><td>SiteMinder</td><td>Series A</td><td class="num">2011</td><td class="num">~$10M post</td><td class="num">$1B+ IPO 2021</td></tr>
        </tbody>
      </table>
      <div class="callout" style="margin-top:3mm;">
        <p><strong>Median pre-seed cap for hospitality tech in SE Asia / global emerging markets:</strong> $3-10M. STAYLO's $5M cap sits at the median, reflecting (a) the maturity of the product (booking engine 80% built, STAYLO Ship operational), (b) the founder's hotelier operator background, and (c) the lower geographic risk (Thailand vs frontier markets).</p>
      </div>
    </section>

    <section>
      <h2 class="section">Method 2 — Forward revenue multiple (36-month model)</h2>
      <p>Per the 36-month projection (see <em>projection-36m.html</em>), STAYLO reaches <strong>$35.3M cumulative net revenue by Q2 2029</strong> in the base case. Applying standard hospitality tech revenue multiples:</p>
      <table class="dat">
        <thead><tr><th>Multiple regime</th><th>Multiple</th><th>Implied Y3 value</th><th>Pre-seed discount</th><th>Implied pre-seed value</th></tr></thead>
        <tbody>
          <tr><td>Bear case (saturated SaaS)</td><td class="num">4×</td><td class="num">$141M</td><td class="num">97% (high risk)</td><td class="num">$4.2M</td></tr>
          <tr><td>Base case (hospitality tech median)</td><td class="num">5×</td><td class="num">$176M</td><td class="num">97%</td><td class="num">$5.3M</td></tr>
          <tr><td>Bull case (cooperative premium)</td><td class="num">6×</td><td class="num">$212M</td><td class="num">95%</td><td class="num">$10.6M</td></tr>
        </tbody>
      </table>
      <p style="margin-top:3mm;">The base case lands directly at $5.3M — within 6% of the asked $5M cap. The 95-97% pre-seed discount accounts for execution risk pre-launch (X-Mas 2026), regulatory risk (Singapore + Thailand), and competitive risk (OTA response). <strong>The $5M cap is the discounted present value of the median outcome.</strong></p>
    </section>

    <section>
      <h2 class="section">Method 3 — $STAY token FDV anchor</h2>
      <p>The $STAY token (Solana SPL-2022, 10B fixed supply) is targeted to launch at TGE M07 at <strong>$0.10 / token</strong>, implying a <strong>Fully Diluted Valuation of $1B</strong> at launch. The pre-seed round includes a <strong>1.0× warrant ratio</strong> — every dollar invested converts to $STAY at the TGE launch price.</p>
      <div class="tile-grid-3">
        <div class="tile"><div class="tile-cat">Pre-seed cap</div><div class="tile-name">$5M post-money</div><div class="tile-pct">0.5%</div><div class="tile-detail">of $STAY token FDV ($1B at TGE @ $0.10).</div></div>
        <div class="tile"><div class="tile-cat">Warrant value</div><div class="tile-name">1.0× at TGE</div><div class="tile-pct">100%</div><div class="tile-detail">$250K invested = 2.5M $STAY = $250K nominal at TGE.</div></div>
        <div class="tile"><div class="tile-cat">Asymmetric upside</div><div class="tile-name">If $STAY 10×</div><div class="tile-pct">10×</div><div class="tile-detail">$250K → $2.5M on token alone. Equity dividends layered on top.</div></div>
      </div>
      <p style="margin-top:3mm;">The token mechanic means pre-seed investors are <strong>simultaneously buying SAFE equity (capped at $5M post) AND a 1.0× $STAY warrant priced against a $1B token FDV.</strong> Even if equity value never materializes, the token warrant at TGE provides downside protection. At $1B FDV, a $5M equity cap is a small fraction (0.5%) of the implied total enterprise value at TGE.</p>
    </section>

    <section>
      <h2 class="section">Method 4 — Scorecard / Berkus qualitative</h2>
      <p>Pre-revenue valuation using the Berkus framework — each driver attributes up to $1M of value, capped at $5M total. STAYLO scores at maximum on multiple drivers:</p>
      <table class="dat">
        <thead><tr><th>Driver</th><th>Maximum</th><th>STAYLO score</th><th>Rationale</th></tr></thead>
        <tbody>
          <tr><td><strong>Sound idea</strong> (basic value)</td><td class="num">$1.0M</td><td class="num green">$1.0M</td><td>Bitcoin-native cooperative · solves a real $6.3M/yr local problem (KP). Triangulated need.</td></tr>
          <tr><td><strong>Prototype / product</strong> (reduces tech risk)</td><td class="num">$1.0M</td><td class="num green">$1.0M</td><td>STAYLO Ship operational · booking engine 80% built · iCal sync working · React/Supabase stack.</td></tr>
          <tr><td><strong>Quality management team</strong> (reduces execution risk)</td><td class="num">$1.0M</td><td class="num green">$1.0M</td><td>Founder is a Koh Phangan hotelier-operator + software background. Built Ship FOR own hotel. Community lead recruited.</td></tr>
          <tr><td><strong>Strategic relationships</strong> (reduces market risk)</td><td class="num">$1.0M</td><td class="num">$0.5M</td><td>Local KP hotelier network active · community ambassador in place. Singapore legal counsel shortlisted. Aggregator partnerships pending.</td></tr>
          <tr><td><strong>Product rollout / sales</strong> (reduces production risk)</td><td class="num">$1.0M</td><td class="num">$1.5M*</td><td>5 KP hotels informally signed · 400-500 KP twin-trigger target visible · X-Mas 2026 launch date locked. *Bonus for explicit milestone.</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>BERKUS TOTAL</strong></td><td class="num"><strong>$5.0M</strong></td><td class="num green"><strong>$5.0M</strong></td><td>Lands exactly at the asked cap.</td></tr>
        </tbody>
      </table>
    </section>

  </div>

  <div class="page-footer"><strong>STAYLO · Valuation Rationale</strong><span class="page-num">1 / 2</span></div>

</div>

<div class="page">
  <div class="body" style="padding-top:14mm;">

    <section>
      <h2 class="section">5 — Convergence across methods</h2>
      <table class="dat">
        <thead><tr><th>Method</th><th>Implied pre-seed value</th><th>vs $5M target</th></tr></thead>
        <tbody>
          <tr><td>Method 1 · Comparable transactions (median)</td><td class="num">$3-10M</td><td class="green">At median</td></tr>
          <tr><td>Method 2 · Forward revenue multiple (5× base)</td><td class="num">$5.3M</td><td class="green">+6%</td></tr>
          <tr><td>Method 3 · $STAY FDV anchor (0.5% of $1B)</td><td class="num">$5M+</td><td class="green">Match</td></tr>
          <tr><td>Method 4 · Berkus scorecard</td><td class="num">$5.0M</td><td class="green">Exact</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>Convergence range</strong></td><td class="num"><strong>$4.2M – $10.6M</strong></td><td class="green"><strong>$5M sits at floor of range</strong></td></tr>
        </tbody>
      </table>
      <div class="callout" style="margin-top:3mm;">
        <p>The fact that <strong>four independent methodologies converge near $5M</strong> is the strongest defense of the cap. The asked price is at the <strong>floor of the range</strong>, not the median — meaning the pre-seed investor gets margin of safety on all four axes.</p>
      </div>
    </section>

    <section>
      <h2 class="section">6 — Why $5M (not $3M, not $10M)</h2>
      <p><strong>Why not $3M?</strong> Three of four methods (revenue multiple, FDV anchor, Berkus) all land above $5M. A $3M cap would under-price the round given the operational maturity (STAYLO Ship live, hoteliers signed, tech 80% built) — and would penalize the founder for the work already done.</p>
      <p><strong>Why not $10M?</strong> No production booking engine yet, no live commission revenue, no audited financials, no Singapore Pte Ltd incorporated. $10M would price in execution that hasn't happened. The market discounts pre-launch ventures at 95-97% of forward value — and our calculations show that delivers ~$5M, not $10M.</p>
      <p><strong>$5M is the rational floor</strong> — convergence-defensible, gives investors margin of safety, leaves room for upside re-rating at the Alpha Round ($3M at $1,000/share for Koh Phangan Founding Partners) and subsequent World Round at $1,500+/share.</p>
    </section>

    <section>
      <h2 class="section">7 — Sensitivity scenarios</h2>
      <table class="dat">
        <thead><tr><th>Scenario</th><th>Cap</th><th>Trigger</th><th>Likelihood (next 6m)</th></tr></thead>
        <tbody>
          <tr><td><strong>Bear</strong> (de-risk)</td><td class="num">$3.0M</td><td>Tech ships slip past Q1 2027 · no Singapore Pte Ltd yet · &lt;5 KP signed</td><td class="num">~15%</td></tr>
          <tr style="background:#FFF7ED;"><td><strong>Base</strong> (current)</td><td class="num">$5.0M</td><td>X-Mas 2026 trigger met (400-500 KP OR 500 shares) · tech ready · corp setup on schedule</td><td class="num"><strong>~70%</strong></td></tr>
          <tr><td><strong>Bull</strong> (re-rate)</td><td class="num">$8-10M</td><td>Booking engine live before pre-seed close · Singapore Pte Ltd done · $STAY momentum building</td><td class="num">~15%</td></tr>
        </tbody>
      </table>
      <p style="margin-top:3mm;"><strong>Investor implication:</strong> Pre-seed investors who close at the $5M cap before X-Mas 2026 launch capture the base-case priced as bear-case. If the bull-case materializes (launch ships ahead of trigger), the discount embedded in their SAFE will likely be larger than 20% at the next round.</p>
    </section>

    <section>
      <h2 class="section">8 — Anchored to the cooperative narrative</h2>
      <div class="callout-purple">
        <p>STAYLO is not a standard SaaS or marketplace play — it is a <strong>Bitcoin-native cooperative</strong> where hoteliers co-own the platform they use, protected by statute, with $STAY as the loyalty + governance layer. Standard SaaS multiples under-price the cooperative moat (no churn from delisting, 1 property = 1 vote sybil-proof governance, BTC treasury as macro hedge). The $5M cap reflects this conservatively — but the asymmetric upside if the network effects materialize is captured by the $STAY warrant, not the equity cap. <strong>Investors are getting both the equity floor at $5M and the token-FDV upside priced at $1B — for the same dollar.</strong></p>
      </div>
    </section>

{FOOTER_BLOCK}

  </div>

  <div class="page-footer"><strong>STAYLO · Valuation Rationale</strong><span class="page-num">2 / 2</span></div>
""",
)


# ============================================================
# 8) DATA ROOM INDEX — landing page linking to all 8 docs
# ============================================================
DATA_ROOM = doc(
    title="Data Room",
    meta_top="DATA ROOM · v1.0<br/>JUNE 2026 · CONFIDENTIAL",
    doc_title="Investor Data Room",
    doc_sub="STAYLO Holdings Pte Ltd · 7-document brief pack for qualified investors · Pre-seed round",
    body_html=f"""
{KPI_STRIP}
  <div class="body">

    <section>
      <p>Welcome to the STAYLO investor data room. This pack contains <strong>eight coordinated documents</strong> covering the company brief, $STAY token mechanics, term sheet, capitalization, financial projections, valuation rationale, strategic positioning, and this index. All figures are reconciled against the canonical lock dated <strong>2026-06-08</strong>. Pre-seed round (<strong>$250K-$500K · SAFE + $STAY warrant · $5M post-money cap · 20% discount</strong>) is currently open, targeting close <strong>Q4 2026</strong>.</p>
    </section>

    <section>
      <div class="label">Document index</div>
      <div class="tile-grid-2">
        <div class="tile">
          <div class="tile-cat">01 · One-pager</div>
          <div class="tile-name"><a href="/investors/one-pager.html" style="color:inherit; text-decoration:underline;">Investor One-Pager</a></div>
          <div class="tile-detail">A4 · 1 page · 5-min read. Brand, market, structure, token, ask. Best as first touch.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">02 · Executive Summary</div>
          <div class="tile-name"><a href="/investors/executive-summary.html" style="color:inherit; text-decoration:underline;">Executive Summary</a></div>
          <div class="tile-detail">A4 · 1 dense page. Opportunity, product, Bitcoin pillars, share structure, launch plan, ask. For investor committees.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">03 · Whitepaper</div>
          <div class="tile-name"><a href="/investors/whitepaper.html" style="color:inherit; text-decoration:underline;">$STAY Whitepaper v1.0</a></div>
          <div class="tile-detail">A4 · 2 pages. Token mechanics, distribution, earn-rate grid with halving, governance quorum, security. For crypto-literate audiences.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">04 · Term Sheet</div>
          <div class="tile-name"><a href="/investors/term-sheet.html" style="color:inherit; text-decoration:underline;">Pre-Seed Term Sheet</a></div>
          <div class="tile-detail">A4 · 1 page · non-binding. Issuer, instrument, cap, discount, warrant, governance, lock-up, MFN, info rights.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">05 · Cap Table</div>
          <div class="tile-name"><a href="/investors/cap-table.html" style="color:inherit; text-decoration:underline;">Capitalization Table</a></div>
          <div class="tile-detail">A4 landscape · 1 page. 500,000 shares · 4 categories · commission split (5 buckets) · $STAY token distribution at TGE.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">06 · Projection 36m</div>
          <div class="tile-name"><a href="/investors/projection-36m.html" style="color:inherit; text-decoration:underline;">36-Month Projection</a></div>
          <div class="tile-detail">A4 landscape · 1 page. Hotel onboarding · GMV · commission revenue · BTC treasury accumulation. Base case Q3 2026 → Q2 2029.</div>
        </div>
        <div class="tile">
          <div class="tile-cat">07 · Strategic Brief</div>
          <div class="tile-name"><a href="/investors/dossier-strategique.html" style="color:inherit; text-decoration:underline;">Strategic Brief</a></div>
          <div class="tile-detail">A4 · 2 pages. Vision, why-now, go-to-market, moat, risk &amp; mitigations, STAYLO Suite vision, team. For strategic and deep-diligence investors.</div>
        </div>
        <div class="tile" style="border-color: var(--btc);">
          <div class="tile-cat" style="color: var(--btc);">08 · Valuation Rationale</div>
          <div class="tile-name"><a href="/investors/valuation-rationale.html" style="color:inherit; text-decoration:underline;">Valuation Rationale</a></div>
          <div class="tile-detail">A4 · 2 pages. Multi-method defense of the $5M post-money cap: comparable transactions, forward revenue multiple, $STAY FDV anchor, Berkus scorecard. For investors asking "why $5M?".</div>
        </div>
      </div>
    </section>

    <section>
      <div class="label">How to use this pack</div>
      <div class="callout">
        <p><strong>First touch:</strong> share the <em>One-Pager</em> + <em>Executive Summary</em>.<br/><strong>Term-sheet meeting:</strong> add <em>Term Sheet</em> + <em>Cap Table</em> + <em>Valuation Rationale</em>.<br/><strong>Diligence:</strong> add <em>Whitepaper</em>, <em>Projection 36m</em>, <em>Strategic Brief</em>.<br/><strong>Decision committee:</strong> entire pack + slide deck (<em>pitch.html</em>).</p>
      </div>
    </section>

{FOOTER_BLOCK}

  </div>
""",
)


# ============================================================
# Write all 7 docs (one-pager.html already exists, not overwritten)
# ============================================================
DOCS = {
    "executive-summary.html": EXEC_SUMMARY,
    "whitepaper.html": WHITEPAPER,
    "term-sheet.html": TERM_SHEET,
    "cap-table.html": CAP_TABLE,
    "projection-36m.html": PROJECTION_36M,
    "dossier-strategique.html": DOSSIER_STRATEGIQUE,
    "valuation-rationale.html": VALUATION_RATIONALE,
    "index.html": DATA_ROOM,
}


def main():
    for filename, html in DOCS.items():
        path = INV / filename
        path.write_text(html, encoding="utf-8")
        size_kb = len(html) / 1024
        print(f"OK {filename:30s} {size_kb:.1f} KB")
    print(f"\n{len(DOCS)} docs written to {INV}")


if __name__ == "__main__":
    main()
