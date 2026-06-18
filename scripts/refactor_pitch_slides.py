"""
One-shot script: convert pitch.html slides 4-13 (except 12) to the new
editorial 'slide-reason' template. The horizon SVG band + bottom feature
strip are auto-injected by the page's <template>+<script>, so each slide
only needs the .reason-cols block.
"""
import re
import sys
from pathlib import Path

PITCH = Path(r"C:\Users\David\Desktop\STAYLO-repo\public\pitch.html")

def slide(num, eyebrow_en, eyebrow_th, hl_en, hl_th, lead_en, lead_th,
          bullets, callout_en, callout_th, cta_en, cta_th, visual,
          total="13"):
    """Build a single .slide-reason section."""
    blines = []
    for icon, en, th in bullets:
        blines.append(
            f'          <li class="reason-bullet"><span class="reason-bullet-icon">{icon}</span>'
            f'<span><span class="en">{en}</span><span class="th">{th}</span></span></li>'
        )
    bullets_html = "\n".join(blines)
    return f'''<section class="slide slide-reason" data-slide="{num}">
  <div class="brand"><div class="brand-mark">S</div><span class="brand-name">STAYLO</span></div>
  <div class="content">
    <div class="reason-cols">
      <div class="reason-text">
        <div class="reason-eyebrow"><span class="en">{eyebrow_en}</span><span class="th">{eyebrow_th}</span></div>
        <h1 class="reason-headline en">{hl_en}</h1>
        <h1 class="reason-headline th">{hl_th}</h1>
        <div class="reason-divider"></div>
        <p class="reason-lead en">{lead_en}</p>
        <p class="reason-lead th">{lead_th}</p>
        <ul class="reason-bullets">
{bullets_html}
        </ul>
        <div class="reason-callout en">{callout_en}</div>
        <div class="reason-callout th">{callout_th}</div>
        <p class="reason-cta en">{cta_en}</p>
        <p class="reason-cta th">{cta_th}</p>
      </div>
      <div class="reason-visual">{visual}</div>
    </div>
  </div>
  <div class="footer-url"><a href="https://staylo.app">staylo.app</a></div>
  <div class="slide-num">{num} / {total}</div>
</section>'''


def circle(center, bubbles):
    """Build the right-column circle with bubbles."""
    blines = []
    for pos, icon, grad, ten, tth, sen, sth in bubbles:
        blines.append(
            f'          <div class="reason-bubble {pos}"><div class="reason-bubble-icon" '
            f'style="background:linear-gradient(135deg,{grad});">{icon}</div>'
            f'<strong><span class="en">{ten}</span><span class="th">{tth}</span></strong>'
            f'<span class="en">{sen}</span><span class="th">{sth}</span></div>'
        )
    return f'''
        <div class="reason-circle">
          <div class="reason-center">{center}</div>
{chr(10).join(blines)}
        </div>
      '''


# Shorthand color gradients
G_ORANGE = "#FF6B00,#FF9F50"
G_PINK = "#FF1F70,#C026D3"
G_GREEN = "#10B981,#059669"
G_BTC = "#F7931A,#FF6B00"
G_RED = "#DC2626,#991B1B"
G_PURPLE = "#7E22CE,#5E2A78"
G_TEAL = "#00897B,#26A69A"


# ============================================================
# SLIDE 4 — YOUR STACK (SHIP)
# ============================================================
SLIDE_4 = slide(
    num=4,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Stack.",
    hl_th="แพลตฟอร์มของคุณ",
    lead_en="6 SaaS in one — included <strong>free for life</strong>. PMS, channel, payroll, contracts, POS, messenger. No subscriptions. No IT team.",
    lead_th="6 SaaS รวมในที่เดียว — <strong>ฟรีตลอดชีวิต</strong> PMS, channel, payroll, สัญญา, POS, messenger ไม่มีค่ารายเดือน ไม่ต้องมีทีม IT",
    bullets=[
        ("&#128176;", "Cloudbeds $250-500/mo. STAYLO $0.", "Cloudbeds $250-500/ด STAYLO $0"),
        ("&#127760;", "14 languages. Built for Thai law.", "14 ภาษา สร้างเพื่อกฎหมายไทย"),
        ("&#128241;", "Mobile-first. Run from anywhere.", "Mobile-first บริหารจากที่ไหนก็ได้"),
    ],
    callout_en="&#11088; <strong>STAYLO Ship</strong> — Hotelier In-Pocket",
    callout_th="&#11088; <strong>STAYLO Ship</strong> — โรงแรมในกระเป๋า",
    cta_en="Run the hotel.<br/>From anywhere.",
    cta_th="บริหารโรงแรม<br/>จากที่ไหนก็ได้",
    visual=circle(
        center='<img src="/SHIP_LOGO.png" alt="SHIP" style="width:160px;height:160px;border-radius:24px;box-shadow:0 6px 20px rgba(126,34,206,0.25);" /><small style="margin-top:8px;"><span class="en">All-in-one hotelier OS</span><span class="th">ระบบโรงแรมครบจบ</span></small>',
        bubbles=[
            ("b-top", "&#128197;", G_ORANGE, "Schedule", "ตารางงาน", "Weekly grid · OT calc", "ตารางสัปดาห์ · OT"),
            ("b-right", "&#128221;", G_PURPLE, "Contracts", "สัญญา", "EN + TH bilingual", "EN + TH สองภาษา"),
            ("b-bottom", "&#128176;", G_GREEN, "Payslips", "เงินเดือน", "SSO · tax · service charge", "SSO · ภาษี · เซอร์วิส"),
            ("b-left", "&#128181;", G_PINK, "$0 / month", "$0 ต่อเดือน", "Free forever, included", "ฟรีตลอดชีพ รวมแล้ว"),
        ],
    ),
)


# ============================================================
# SLIDE 5 — YOUR VOICE (governance)
# ============================================================
SLIDE_5 = slide(
    num=5,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Voice.",
    hl_th="เสียงของคุณ",
    lead_en="1 property = 1 vote. Whether you own 5 rooms or 500 — your hotel has <strong>one voice</strong> in the DAO. No share-buying votes.",
    lead_th="1 อสังหา = 1 เสียง ไม่ว่าคุณจะมี 5 ห้องหรือ 500 ห้อง โรงแรมของคุณมี<strong>เสียงเดียว</strong>ใน DAO ไม่มีการซื้อสิทธิ์โหวต",
    bullets=[
        ("&#128499;", "1 property = 1 vote (sybil-proof).", "1 อสังหา = 1 เสียง (กันบอท)"),
        ("&#128203;", "Routine: 10-15% quorum.", "การลงคะแนนทั่วไป: ครบ 10-15%"),
        ("&#127942;", "Commission change: 67% supermajority.", "เปลี่ยนคอมมิชชัน: ต้อง 67%"),
    ],
    callout_en="&#11088; <strong>Your hotel.</strong> Your vote. Forever.",
    callout_th="&#11088; <strong>โรงแรมของคุณ</strong> เสียงของคุณ ตลอดไป",
    cta_en="The cooperative votes.<br/>The platform listens.",
    cta_th="สหกรณ์โหวต<br/>แพลตฟอร์มฟัง",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#128499;</div><small style="margin-top:4px;"><span class="en">DAO Governance</span><span class="th">การกำกับดูแล DAO</span></small>',
        bubbles=[
            ("b-top", "&#128737;", G_ORANGE, "Founder veto", "ผู้ก่อตั้งวีโต้", "Mission, commission, dissolution", "พันธกิจ คอมมิชชัน ยุติ"),
            ("b-right", "&#128202;", G_GREEN, "Routine", "ทั่วไป", "10-15% quorum", "ครบ 10-15%"),
            ("b-bottom", "&#9888;", G_PURPLE, "Strategic", "เชิงกลยุทธ์", "67% supermajority", "ต้อง 67%"),
            ("b-left", "&#128176;", G_PINK, "Investors", "นักลงทุน", "NO VOTE · dividends only", "ไม่มีสิทธิ์โหวต · ปันผลเท่านั้น"),
        ],
    ),
)


# ============================================================
# SLIDE 6 — YOUR CONTROL (the shift)
# ============================================================
SLIDE_6 = slide(
    num=6,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Control.",
    hl_th="การควบคุมของคุณ",
    lead_en="Booking owns your relationship. STAYLO gives it back. <strong>Your guests' emails. Your direct line. Your data.</strong> Always.",
    lead_th="Booking เป็นเจ้าของความสัมพันธ์ของคุณ STAYLO คืนให้คุณ <strong>อีเมลแขก สายตรง ข้อมูล</strong> เป็นของคุณเสมอ",
    bullets=[
        ("&#128231;", "Your guests' emails — yours.", "อีเมลแขก — ของคุณ"),
        ("&#128241;", "Your direct line — protected.", "สายตรง — คุ้มครอง"),
        ("&#128274;", "Your data — never sold.", "ข้อมูล — ไม่ขายให้ใคร"),
    ],
    callout_en="&#11088; <strong>Your business.</strong> Your way.",
    callout_th="&#11088; <strong>ธุรกิจของคุณ</strong> แบบของคุณ",
    cta_en="Take back control.<br/>Forever.",
    cta_th="ทวงคืนการควบคุม<br/>ตลอดไป",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#128737;</div><small style="margin-top:4px;"><span class="en">Direct relationship</span><span class="th">สายตรงกับแขก</span></small>',
        bubbles=[
            ("b-top", "&#128231;", G_ORANGE, "Direct emails", "อีเมลตรง", "Yours — not Booking's", "ของคุณ ไม่ใช่ Booking"),
            ("b-right", "&#128175;", G_GREEN, "No algorithm", "ไม่มี algorithm", "Hotels pick rates, not us", "โรงแรมตั้งราคา ไม่ใช่เรา"),
            ("b-bottom", "&#128274;", G_PURPLE, "No delisting", "ไม่มีการลบออก", "Protected by statute", "คุ้มครองตามกฎ"),
            ("b-left", "&#128202;", G_PINK, "Your data", "ข้อมูลของคุณ", "Never sold. Never shared.", "ไม่ขาย ไม่แชร์"),
        ],
    ),
)


# ============================================================
# SLIDE 7 — YOUR NETWORK (launch threshold) — UPDATED 2026-06-18
# Twin trigger: 400-500 KP hoteliers OR 500 shares sold. Never before end 2026.
# ============================================================
SLIDE_7 = slide(
    num=7,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Network.",
    hl_th="เครือข่ายของคุณ",
    lead_en="<strong>&#127876; X-Mas 2026 launch</strong> — when <strong>400-500 KP hoteliers</strong> OR <strong>500 shares</strong> are reached. Never before end 2026 (tech + payments + corp must be ready first).",
    lead_th="<strong>&#127876; เปิดตัว X-Mas 2026</strong> — เมื่อมี <strong>400-500 โรงแรม KP</strong> หรือ <strong>ขาย 500 หุ้น</strong> ไม่เปิดก่อนปลายปี 2026 (tech + ระบบจ่ายเงิน + บริษัทต้องพร้อมก่อน)",
    bullets=[
        ("&#127876;", "X-Mas 2026 launch — never before end 2026.", "เปิด X-Mas 2026 — ไม่ก่อนปลายปี 2026"),
        ("&#127968;", "400-500 KP hoteliers OR 500 shares sold.", "400-500 โรงแรม KP หรือ 500 หุ้น"),
        ("&#127757;", "KP &rarr; Thailand &rarr; SE Asia &rarr; Globe.", "KP &rarr; ไทย &rarr; SEA &rarr; โลก"),
    ],
    callout_en="&#11088; <strong>Twin trigger.</strong> Tech-ready floor.",
    callout_th="&#11088; <strong>สองเงื่อนไข</strong> · tech พร้อมก่อน",
    cta_en="From one island.<br/>To the world.",
    cta_th="จากหนึ่งเกาะ<br/>สู่โลก",
    visual=circle(
        center='<div style="font-size:64px; line-height:1;">&#127876;</div><div style="font-size:32px; font-weight:900; background:linear-gradient(135deg,#FF6B00,#FF1F70); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-top:6px; letter-spacing:-1px; line-height:1;">X-Mas 26</div><small style="margin-top:6px;"><span class="en">Platform launch target</span><span class="th">เป้าหมายเปิดตัว</span></small>',
        bubbles=[
            ("b-top", "&#127794;", G_ORANGE, "400-500 KP", "400-500 KP", "Hoteliers signed-up", "โรงแรมเข้าร่วม"),
            ("b-right", "&#128181;", G_GREEN, "500 shares", "500 หุ้น", "Or shares sold (twin)", "หรือหุ้นขาย (สอง)"),
            ("b-bottom", "&#9203;", G_PURPLE, "Tech floor", "พื้น tech", "Never before end 2026", "ไม่ก่อนปลาย 2026"),
            ("b-left", "&#127757;", G_PINK, "Globe by Y5", "ทั่วโลกปี 5", "SE Asia &rarr; EU &rarr; LATAM", "SEA &rarr; EU &rarr; LATAM"),
        ],
    ),
)


# ============================================================
# SLIDE 8 — YOUR OWNERSHIP (alpha round)
# ============================================================
SLIDE_8 = slide(
    num=8,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Ownership.",
    hl_th="สิทธิ์ความเป็นเจ้าของ",
    lead_en="Buy shares as a Founding Partner. <strong>$1,000 / share</strong>. Max 10 per property — so the platform stays in the hands of many, not few.",
    lead_th="ซื้อหุ้นเป็น Founding Partner <strong>$1,000 / หุ้น</strong> สูงสุด 10 หุ้นต่อโรงแรม — แพลตฟอร์มอยู่ในมือคนหลายคน ไม่ใช่ไม่กี่คน",
    bullets=[
        ("&#128181;", "$1,000 / share — Alpha · KP only.", "$1,000 / หุ้น — Alpha · เฉพาะ KP"),
        ("&#128737;", "Max 10 per hotel (anti-concentration).", "สูงสุด 10/โรงแรม (กันกระจุก)"),
        ("&#128274;", "Locked 10% commission for life.", "ล็อกคอมมิชชัน 10% ตลอดชีวิต"),
    ],
    callout_en="&#11088; <strong>Own the platform</strong> that books you.",
    callout_th="&#11088; <strong>เป็นเจ้าของแพลตฟอร์ม</strong>ที่จองให้คุณ",
    cta_en="Become a Founding Partner.<br/>Forever Alpha.",
    cta_th="เป็น Founding Partner<br/>Alpha ตลอดไป",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#127942;</div><small style="margin-top:4px;"><span class="en">Founding Partner — Alpha · KP</span><span class="th">Founding Partner — Alpha · KP</span></small>',
        bubbles=[
            ("b-top", "&#128176;", G_ORANGE, "$1,000 / share", "$1,000 / หุ้น", "Alpha price · locked", "ราคา Alpha · ล็อก"),
            ("b-right", "&#127968;", G_GREEN, "Max 10 / hotel", "สูงสุด 10/โรงแรม", "Anti-concentration", "กันกระจุก"),
            ("b-bottom", "&#128064;", G_PURPLE, "3,000 shares", "3,000 หุ้น", "Total Alpha cap", "เพดาน Alpha ทั้งหมด"),
            ("b-left", "&#127881;", G_PINK, "30% $STAY", "30% $STAY", "Tokens to FPs at TGE", "โทเค็นให้ FP ที่ TGE"),
        ],
    ),
)


# ============================================================
# SLIDE 9 — YOUR STRUCTURE (ownership categories)
# ============================================================
SLIDE_9 = slide(
    num=9,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Structure.",
    hl_th="โครงสร้างของคุณ",
    lead_en="500,000 shares total · 4 categories. Founder LOCKED. Private NO VOTE. Alpha KP. World Global. <strong>$523.5M+ capital target.</strong>",
    lead_th="หุ้นรวม 500,000 · 4 หมวด ผู้ก่อตั้งล็อก นักลงทุนไม่มีสิทธิ์โหวต Alpha KP World ทั่วโลก <strong>เป้าทุน $523.5M+</strong>",
    bullets=[
        ("&#128274;", "50k Founder shares — LOCKED non-dilutable.", "50k หุ้นผู้ก่อตั้ง — ล็อกไม่เจือจาง"),
        ("&#127968;", "3k Alpha KP — $1,000 · max 10/hotel.", "3k Alpha KP — $1,000 · สูงสุด 10/โรงแรม"),
        ("&#127942;", "100k Private — $1,500+ · NO VOTE.", "100k Private — $1,500+ · ไม่มีโหวต"),
        ("&#127757;", "347k World — $1,500+ · global open.", "347k World — $1,500+ · เปิดทั่วโลก"),
    ],
    callout_en="&#11088; <strong>$523.5M+</strong> · total capital target",
    callout_th="&#11088; <strong>$523.5M+</strong> · เป้าหมายทุนรวม",
    cta_en="4 categories.<br/>Built to last.",
    cta_th="4 หมวด<br/>สร้างเพื่อคงอยู่",
    visual=circle(
        center='<div style="font-size:64px; font-weight:900; background:linear-gradient(135deg,#FF6B00,#FF1F70); -webkit-background-clip:text; -webkit-text-fill-color:transparent; line-height:1; letter-spacing:-2px;">500K</div><small style="margin-top:6px;"><span class="en">Shares · 4 categories</span><span class="th">หุ้น · 4 หมวด</span></small>',
        bubbles=[
            ("b-top", "&#128737;", G_ORANGE, "50k Founder", "50k ผู้ก่อตั้ง", "LOCKED non-dilutable", "ล็อกไม่เจือจาง"),
            ("b-right", "&#127968;", G_GREEN, "3k Alpha · KP", "3k Alpha · KP", "$1,000 / share", "$1,000 / หุ้น"),
            ("b-bottom", "&#128181;", G_PURPLE, "100k Private", "100k Private", "$1,500+ · NO VOTE", "$1,500+ · ไม่มีโหวต"),
            ("b-left", "&#127757;", G_PINK, "347k World", "347k World", "$1,500+ · open progressively", "$1,500+ · เปิดทยอย"),
        ],
    ),
)


# ============================================================
# SLIDE 10 — YOUR TOKEN ($STAY)
# ============================================================
SLIDE_10 = slide(
    num=10,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Token.",
    hl_th="โทเค็นของคุณ",
    lead_en="$STAY — <strong>10B fixed</strong> supply on Solana. Halves every 4 years. Earned by hoteliers and guests alike. TGE M07 on Raydium @ $0.10.",
    lead_th="$STAY — supply <strong>10B คงที่</strong>บน Solana ลดครึ่งทุก 4 ปี โรงแรมและแขกได้รับเหมือนกัน TGE M07 บน Raydium @ $0.10",
    bullets=[
        ("&#128176;", "10B fixed supply · SPL Token-2022.", "10B คงที่ · SPL Token-2022"),
        ("&#127881;", "TGE M07 @ $0.10 · FDV $1B.", "TGE M07 @ $0.10 · FDV $1B"),
        ("&#8383;", "50/night baseline · halving 4y.", "50/คืน · ลดครึ่งทุก 4 ปี"),
    ],
    callout_en="&#11088; <strong>Bitcoin-style scarcity</strong> · built in.",
    callout_th="&#11088; <strong>ความหายากแบบ Bitcoin</strong> · สร้างมาแบบนี้",
    cta_en="Earn. Vote.<br/>Build the network.",
    cta_th="หา โหวต<br/>สร้างเครือข่าย",
    visual=circle(
        center='<div style="font-size:48px; font-weight:900; background:linear-gradient(135deg,#FF6B00,#FF1F70); -webkit-background-clip:text; -webkit-text-fill-color:transparent; line-height:1; letter-spacing:-1.5px;">$STAY</div><small style="margin-top:6px;"><span class="en">10B · Solana SPL · M07 TGE</span><span class="th">10B · Solana SPL · TGE M07</span></small>',
        bubbles=[
            ("b-top", "&#128176;", G_ORANGE, "10B supply", "supply 10B", "Fixed forever", "คงที่ตลอดไป"),
            ("b-right", "&#127881;", G_GREEN, "TGE M07", "TGE M07", "Raydium @ $0.10", "Raydium @ $0.10"),
            ("b-bottom", "&#9203;", G_BTC, "Halving 4y", "ลดครึ่ง 4 ปี", "Bitcoin-style scarcity", "หายากแบบ Bitcoin"),
            ("b-left", "&#127775;", G_PINK, "500M pool", "พูล 500M", "Engagement rewards", "รางวัลการมีส่วนร่วม"),
        ],
    ),
)


# ============================================================
# SLIDE 11 — YOUR ROADMAP (5 phases) — UPDATED 2026-06-18
# Phase 0 = tech + corp through end 2026, X-Mas 2026 platform launch.
# ============================================================
SLIDE_11 = slide(
    num=11,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Roadmap.",
    hl_th="โรดแมปของคุณ",
    lead_en="<strong>5 phases. 5 years.</strong> Tech + Singapore Pte Ltd through 2026. <strong>&#127876; Platform launch X-Mas 2026</strong> under twin trigger. Then KP &rarr; Thailand &rarr; SE Asia &rarr; EU &rarr; LATAM.",
    lead_th="<strong>5 เฟส 5 ปี</strong> Tech + Singapore Pte Ltd ตลอดปี 2026 <strong>&#127876; เปิดตัว X-Mas 2026</strong> ภายใต้สองเงื่อนไข แล้ว KP &rarr; ไทย &rarr; SEA &rarr; EU &rarr; LATAM",
    bullets=[
        ("&#127876;", "X-Mas 26 — platform launch (400-500 KP OR 500 shares).", "X-Mas 26 — เปิดแพลตฟอร์ม (400-500 KP หรือ 500 หุ้น)"),
        ("&#128640;", "Phase 1 · Q1-Q2 27 — 25 hotels + $STAY TGE M07.", "เฟส 1 · Q1-Q2 27 — 25 โรงแรม + $STAY TGE M07"),
        ("&#127757;", "Phase 5 · 31 — 10-20K hotels + $1B+ ARR.", "เฟส 5 · 31 — 10-20K โรงแรม + $1B+ ARR"),
    ],
    callout_en="&#11088; <strong>5 years.</strong> 5 phases. 10,000 hotels.",
    callout_th="&#11088; <strong>5 ปี</strong> 5 เฟส 10,000 โรงแรม",
    cta_en="One phase at a time.<br/>Each one compounds.",
    cta_th="ทีละเฟส<br/>ทบต้นต่อเนื่อง",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#128197;</div><small style="margin-top:4px;"><span class="en">5 phases · 5 years</span><span class="th">5 เฟส · 5 ปี</span></small>',
        bubbles=[
            ("b-top", "&#128295;", G_ORANGE, "Phase 0 · 2026", "เฟส 0 · 2026", "Tech + corp setup", "Tech + ตั้งบริษัท"),
            ("b-right", "&#127876;", G_GREEN, "X-Mas 26 launch", "X-Mas 26 เปิด", "Twin trigger met", "ตรงสองเงื่อนไข"),
            ("b-bottom", "&#127942;", G_PURPLE, "Phase 3 · 28", "เฟส 3 · 28", "500 hotels Thailand", "500 โรงแรมไทย"),
            ("b-left", "&#127757;", G_PINK, "Phase 5 · 31", "เฟส 5 · 31", "10-20K hotels global", "10-20K โรงแรมทั่วโลก"),
        ],
    ),
)


# ============================================================
# SLIDE 13 — YOUR ASK (pre-seed contact)
# ============================================================
SLIDE_13 = slide(
    num=13,
    eyebrow_en="Pre-seed open",
    eyebrow_th="Pre-seed เปิดรอบ",
    hl_en="Your Ask.",
    hl_th="ขั้นต่อไปของคุณ",
    lead_en="Pre-seed <strong>$250-500K</strong>. SAFE + $STAY warrant. $5M post-money cap. 20% discount. Targeting close <strong>Q4 2026</strong>.",
    lead_th="Pre-seed <strong>$250-500K</strong> SAFE + warrant $STAY เพดาน post-money $5M ส่วนลด 20% ปิดรอบ <strong>Q4 2026</strong>",
    bullets=[
        ("&#128221;", "SAFE + $STAY token warrant.", "SAFE + warrant โทเค็น $STAY"),
        ("&#128181;", "$5M post-money cap · 20% discount.", "เพดาน $5M post-money · ส่วนลด 20%"),
        ("&#9203;", "Close Q4 2026 · 1.0&times; warrant ratio.", "ปิด Q4 2026 · อัตรา warrant 1.0&times;"),
    ],
    callout_en="&#11088; <strong>contact@staylo.app</strong>",
    callout_th="&#11088; <strong>contact@staylo.app</strong>",
    cta_en="Pre-seed open.<br/>Close Q4 2026.",
    cta_th="Pre-seed เปิด<br/>ปิด Q4 2026",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#129309;</div><small style="margin-top:4px;"><span class="en">Pre-seed round open</span><span class="th">รอบ Pre-seed เปิด</span></small>',
        bubbles=[
            ("b-top", "&#128176;", G_ORANGE, "$250-500K", "$250-500K", "Pre-seed target", "เป้าหมาย Pre-seed"),
            ("b-right", "&#128221;", G_GREEN, "SAFE + warrant", "SAFE + warrant", "$STAY 1.0&times; ratio", "$STAY อัตรา 1.0&times;"),
            ("b-bottom", "&#127942;", G_PURPLE, "$5M cap", "เพดาน $5M", "Post-money · 20% disc", "Post-money · ส่วนลด 20%"),
            ("b-left", "&#9203;", G_PINK, "Q4 2026 close", "ปิด Q4 2026", "Targeting close", "ตั้งเป้าปิด"),
        ],
    ),
)


# ============================================================
# Apply all replacements
# ============================================================
def main():
    content = PITCH.read_text(encoding="utf-8")
    original_len = len(content)

    slides = {
        4: SLIDE_4,
        5: SLIDE_5,
        6: SLIDE_6,
        7: SLIDE_7,
        8: SLIDE_8,
        9: SLIDE_9,
        10: SLIDE_10,
        11: SLIDE_11,
        13: SLIDE_13,
    }

    for num, new_html in slides.items():
        # Match each slide by its data-slide attribute, replace whole <section>
        pattern = re.compile(
            r'<section[^>]*\bdata-slide="' + str(num) + r'"[^>]*>.*?</section>',
            re.DOTALL,
        )
        if not pattern.search(content):
            print(f"!! slide {num} not found, skipping")
            continue
        content = pattern.sub(new_html, content, count=1)
        print(f"OK slide {num} replaced")

    PITCH.write_text(content, encoding="utf-8")
    print(f"\nFile size: {original_len} -> {len(content)} bytes")


if __name__ == "__main__":
    main()
