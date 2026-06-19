"""
Refactor pitch-hotelier.html: cascade the editorial 'slide-reason' template
from pitch.html. Reuses the CSS + shared SVG defs + auto-injection script,
then converts slides 2-7 + 9 to the editorial template.
"""
import re
from pathlib import Path

PITCH = Path(r"C:\Users\David\Desktop\STAYLO-repo\public\pitch.html")
HOTELIER = Path(r"C:\Users\David\Desktop\STAYLO-repo\public\pitch-hotelier.html")


def slide(num, eyebrow_en, eyebrow_th, hl_en, hl_th, lead_en, lead_th,
          bullets, callout_en, callout_th, cta_en, cta_th, visual,
          total="9"):
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


G_ORANGE = "#FF6B00,#FF9F50"
G_PINK = "#FF1F70,#C026D3"
G_GREEN = "#10B981,#059669"
G_BTC = "#F7931A,#FF6B00"
G_RED = "#DC2626,#991B1B"
G_PURPLE = "#7E22CE,#5E2A78"

# ============================================================
# Pitch-hotelier slide mapping (hotelier-focused, not investor)
# ============================================================

# SLIDE 2 — YOUR FUTURE (PAIN -> reframed as cooperative future)
SLIDE_2 = slide(
    num=2,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Future.",
    hl_th="อนาคตของคุณ",
    lead_en="STAYLO is a cooperative. Hotels own the platform — and the platform protects hotels. Once you're in, you're in. <strong>Forever.</strong>",
    lead_th="STAYLO คือสหกรณ์ โรงแรมเป็นเจ้าของแพลตฟอร์ม — และแพลตฟอร์มปกป้องโรงแรม เมื่อคุณเข้าร่วม คุณอยู่<strong>ตลอดไป</strong>",
    bullets=[
        ("&#128737;", "You can't be delisted. Ever.", "ไม่มีวันถูกลบออกจากแพลตฟอร์ม"),
        ("&#128274;", "10% commission. Locked for life.", "ค่าคอมมิชชัน 10% ล็อกตลอดชีวิต"),
        ("&#129309;", "Cooperative wealth, not VC exit.", "ความมั่งคั่งร่วมกัน ไม่ใช่ทางออก VC"),
    ],
    callout_en="&#128154; Built to <strong>last generations.</strong>",
    callout_th="&#128154; สร้างเพื่อ<strong>คงอยู่หลายชั่วอายุคน</strong>",
    cta_en="Hoteliers own the platform.<br/>The platform protects hoteliers.",
    cta_th="โรงแรมเป็นเจ้าของแพลตฟอร์ม<br/>แพลตฟอร์มปกป้องโรงแรม",
    visual=circle(
        center='<img src="/STAYLO_logo.png" alt="STAYLO" style="width:180px;height:auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.08));" /><small style="margin-top:8px;"><span class="en">By hoteliers. For hoteliers.</span><span class="th">โดยโรงแรม เพื่อโรงแรม</span></small>',
        bubbles=[
            ("b-top", "&#128737;", G_ORANGE, "Can't be delisted", "ไม่ถูกลบออก", "Protected by statute.", "คุ้มครองตามกฎ"),
            ("b-right", "&#8383;", G_BTC, "Bitcoin Treasury", "คลัง Bitcoin", "20% of all capital.", "20% ของทุนทั้งหมด"),
            ("b-bottom", "&#128499;", G_PINK, "1 property = 1 vote", "1 อสังหา = 1 เสียง", "No buying votes.", "ไม่มีการซื้อสิทธิ์"),
            ("b-left", "&#128274;", G_GREEN, "10% commission", "คอมมิชชัน 10%", "Locked for life.", "ล็อกตลอดชีวิต"),
        ],
    ),
)

# SLIDE 3 — YOUR MARGIN
SLIDE_3 = slide(
    num=3,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Margin.",
    hl_th="มาร์จิ้นของคุณ",
    lead_en="OTAs take 22-25% of every booking. STAYLO takes 10% — and locks it <strong>for life</strong> by DAO constitution.",
    lead_th="OTA หัก 22-25% ของทุกการจอง STAYLO หัก 10% — <strong>ล็อกตลอดชีวิต</strong>โดยธรรมนูญ DAO",
    bullets=[
        ("&#128274;", "10% commission. Locked for life.", "ค่าคอมมิชชัน 10% ล็อกตลอดชีวิต"),
        ("&#127775;", "DAO constitution. 90% vote to change.", "ธรรมนูญ DAO ต้องโหวต 90% ถึงเปลี่ยนได้"),
        ("&#128176;", "+$30,660 / year vs Booking.com (10 rooms).", "+$30,660 ต่อปี เทียบ Booking.com (10 ห้อง)"),
    ],
    callout_en="&#11088; <strong>Keep 90 cents</strong> of every dollar.",
    callout_th="&#11088; <strong>เก็บ 90 สตางค์</strong> จากทุกบาท",
    cta_en="10% for life —<br/>by the people who book it.",
    cta_th="10% ตลอดชีวิต —<br/>โดยคนที่จองให้คุณ",
    visual='''
        <div class="reason-dial-wrap">
          <svg class="reason-dial" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="dialGradH3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF6B00"/><stop offset="50%" stop-color="#FF1F70"/><stop offset="100%" stop-color="#7E22CE"/></linearGradient></defs>
            <circle cx="110" cy="110" r="96" stroke="#F1F5F9" stroke-width="20" fill="none"/>
            <circle cx="110" cy="110" r="96" stroke="url(#dialGradH3)" stroke-width="20" fill="none" stroke-dasharray="603.2 670.2" stroke-dashoffset="167.5" stroke-linecap="round" transform="rotate(-90 110 110)"/>
          </svg>
          <div class="reason-dial-text">
            <div class="reason-dial-big">90%</div>
            <div class="reason-dial-small"><span class="en">yours</span><span class="th">ของคุณ</span></div>
          </div>
          <div class="reason-bubble b-top"><div class="reason-bubble-icon" style="background:linear-gradient(135deg,#FF6B00,#FF9F50);">&#128737;</div><strong><span class="en">Locked for life</span><span class="th">ล็อกตลอดชีวิต</span></strong><span class="en">DAO constitution.</span><span class="th">ธรรมนูญ DAO</span></div>
          <div class="reason-bubble b-right"><div class="reason-bubble-icon" style="background:linear-gradient(135deg,#10B981,#059669);">&#128176;</div><strong><span class="en">+$30,660 / year</span><span class="th">+$30,660 ต่อปี</span></strong><span class="en">10 rooms · 70% occ.</span><span class="th">10 ห้อง · ใช้พัก 70%</span></div>
          <div class="reason-bubble b-bottom"><div class="reason-bubble-icon" style="background:linear-gradient(135deg,#DC2626,#991B1B);">&#128201;</div><strong><span class="en">vs Booking 22%</span><span class="th">vs Booking 22%</span></strong><span class="en">Agoda 20% · Expedia 25%</span><span class="th">Agoda 20% · Expedia 25%</span></div>
          <div class="reason-bubble b-left"><div class="reason-bubble-icon" style="background:linear-gradient(135deg,#F7931A,#FF6B00);">&#8383;</div><strong><span class="en">12¢ back</span><span class="th">12¢ คืนทุกบาท</span></strong><span class="en">On every dollar booked.</span><span class="th">จากทุกการจอง</span></div>
        </div>
      ''',
)

# SLIDE 4 — YOUR STACK
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
            ("b-bottom", "&#128176;", G_GREEN, "Payslips", "เงินเดือน", "SSO · tax · service", "SSO · ภาษี · เซอร์วิส"),
            ("b-left", "&#128181;", G_PINK, "$0 / month", "$0 ต่อเดือน", "Free forever, included", "ฟรีตลอดชีพ รวมแล้ว"),
        ],
    ),
)

# SLIDE 5 — YOUR DAY (a day at your hotel with STAYLO Ship)
SLIDE_5 = slide(
    num=5,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Day.",
    hl_th="วันของคุณ",
    lead_en="A day at your hotel with STAYLO Ship: <strong>walk in, see everything, fix anything.</strong> Reservations, housekeeping, messages, payments — one screen.",
    lead_th="หนึ่งวันที่โรงแรมของคุณกับ STAYLO Ship: <strong>เดินเข้ามา เห็นทุกอย่าง แก้ได้ทุกอย่าง</strong> การจอง แม่บ้าน ข้อความ การจ่ายเงิน — หน้าจอเดียว",
    bullets=[
        ("&#127769;", "Walk in. One screen. See everything.", "เดินเข้า หน้าจอเดียว เห็นทุกอย่าง"),
        ("&#127968;", "Front desk · housekeeping · F&amp;B in sync.", "เคาน์เตอร์ · แม่บ้าน · F&amp;B ซิงค์กัน"),
        ("&#128241;", "From your phone, your tablet, the front desk.", "จากมือถือ แท็บเล็ต หรือเคาน์เตอร์"),
    ],
    callout_en="&#11088; <strong>One pocket.</strong> Whole hotel.",
    callout_th="&#11088; <strong>กระเป๋าเดียว</strong> ทั้งโรงแรม",
    cta_en="Less software.<br/>More hospitality.",
    cta_th="ซอฟต์แวร์น้อยลง<br/>การบริการมากขึ้น",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#128737;</div><small style="margin-top:4px;"><span class="en">Run your day · one screen</span><span class="th">วันของคุณ · หน้าจอเดียว</span></small>',
        bubbles=[
            ("b-top", "&#128197;", G_ORANGE, "Reservations", "การจอง", "Calendar live + sync", "ปฏิทิน + ซิงค์"),
            ("b-right", "&#128715;", G_GREEN, "Housekeeping", "แม่บ้าน", "Room status live", "สถานะห้องสด"),
            ("b-bottom", "&#127869;", G_PINK, "F&amp;B Pulse", "F&amp;B Pulse", "POS · tip pool · revenue", "POS · ทิป · รายได้"),
            ("b-left", "&#128172;", G_PURPLE, "Staff chat", "แชตทีมงาน", "Channels · DMs · tickets", "ห้อง · DM · ตั๋ว"),
        ],
    ),
)

# SLIDE 6 — YOUR TEAM
SLIDE_6 = slide(
    num=6,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Team.",
    hl_th="ทีมของคุณ",
    lead_en="The heart of your hotel. STAYLO Ship runs HR end-to-end: <strong>contracts, payroll, schedule, tip pool.</strong> Bilingual EN+TH, built for Thai labor law.",
    lead_th="หัวใจของโรงแรม STAYLO Ship จัดการ HR ครบวงจร: <strong>สัญญา เงินเดือน ตาราง พูลทิป</strong> สองภาษา EN+TH สร้างตามกฎหมายแรงงานไทย",
    bullets=[
        ("&#128221;", "Bilingual contracts (EN + TH).", "สัญญาสองภาษา (EN + TH)"),
        ("&#128176;", "Auto payslip · SSO · service charge.", "เงินเดือนอัตโนมัติ · SSO · เซอร์วิส"),
        ("&#127942;", "Tip Pool — fair, transparent, points × hours.", "พูลทิป — เป็นธรรม โปร่งใส แต้ม × ชั่วโมง"),
    ],
    callout_en="&#11088; <strong>Happy team.</strong> Happy guests.",
    callout_th="&#11088; <strong>ทีมมีความสุข</strong> แขกมีความสุข",
    cta_en="Pay them right.<br/>Keep them long.",
    cta_th="จ่ายให้ถูกต้อง<br/>เก็บไว้นาน",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#129489;&#8205;&#127859;</div><small style="margin-top:4px;"><span class="en">HR end-to-end</span><span class="th">HR ครบวงจร</span></small>',
        bubbles=[
            ("b-top", "&#128221;", G_ORANGE, "Contracts", "สัญญา", "EN + TH · auto", "EN + TH · อัตโนมัติ"),
            ("b-right", "&#128197;", G_GREEN, "Schedule", "ตาราง", "Drag-drop weekly", "ลากวางรายสัปดาห์"),
            ("b-bottom", "&#127942;", G_PINK, "Tip Pool", "พูลทิป", "Points × hours fair", "แต้ม × ชั่วโมง"),
            ("b-left", "&#128176;", G_PURPLE, "Payslips", "เงินเดือน", "Auto SSO · tax · OT", "อัตโนมัติ SSO · ภาษี · OT"),
        ],
    ),
)

# SLIDE 7 — YOUR GUESTS
SLIDE_7 = slide(
    num=7,
    eyebrow_en="Reason to join",
    eyebrow_th="เหตุผลในการเข้าร่วม",
    hl_en="Your Guests.",
    hl_th="แขกของคุณ",
    lead_en="Your best marketing. Every guest on STAYLO becomes an <strong>ambassador</strong> — they earn 2% BTC for life on every hotel they refer. <strong>Direct guest emails — yours.</strong>",
    lead_th="การตลาดที่ดีที่สุด แขกทุกคนบน STAYLO เป็น<strong>ทูตของคุณ</strong> — รับ 2% BTC ตลอดชีพจากโรงแรมที่แนะนำ <strong>อีเมลแขก — ของคุณ</strong>",
    bullets=[
        ("&#128231;", "Direct guest emails — yours forever.", "อีเมลแขก — ของคุณตลอดไป"),
        ("&#8383;", "2% BTC referral for life · guests &amp; hoteliers.", "2% BTC ตลอดชีพ · แขกและโรงแรม"),
        ("&#11088;", "Verified reviews · loyalty across the network.", "รีวิวยืนยัน · สมาชิกข้ามเครือข่าย"),
    ],
    callout_en="&#11088; <strong>Your guests, not their guests.</strong>",
    callout_th="&#11088; <strong>แขกของคุณ ไม่ใช่ของพวกเขา</strong>",
    cta_en="Direct relationship.<br/>Direct upside.",
    cta_th="ความสัมพันธ์ตรง<br/>ผลประโยชน์ตรง",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#128104;&#8205;&#129309;&#8205;&#128105;</div><small style="margin-top:4px;"><span class="en">Direct relationship</span><span class="th">ความสัมพันธ์ตรง</span></small>',
        bubbles=[
            ("b-top", "&#128231;", G_ORANGE, "Direct emails", "อีเมลตรง", "Yours, not Booking's", "ของคุณ ไม่ใช่ Booking"),
            ("b-right", "&#8383;", G_BTC, "2% BTC referral", "2% BTC แนะนำ", "For life · paid in Bitcoin", "ตลอดชีพ · จ่ายด้วย BTC"),
            ("b-bottom", "&#11088;", G_PINK, "Verified reviews", "รีวิวยืนยัน", "Verified guests only", "เฉพาะแขกที่ยืนยัน"),
            ("b-left", "&#127968;", G_GREEN, "Loyalty network", "สมาชิกข้ามเครือข่าย", "Earn at one. Spend at all.", "หาที่หนึ่ง ใช้ได้ทั้งหมด"),
        ],
    ),
)

# SLIDE 9 — YOUR FIRST STEP (Alpha shares · KP only)
SLIDE_9 = slide(
    num=9,
    eyebrow_en="Founding Partner round",
    eyebrow_th="รอบ Founding Partner",
    hl_en="Your First Step.",
    hl_th="ก้าวแรกของคุณ",
    lead_en="Become a Founding Partner. <strong>$1,000 / share</strong> · max 10 per hotel · Koh Phangan only. 3,000 shares total. Locks 10% commission for life.",
    lead_th="เป็น Founding Partner <strong>$1,000 / หุ้น</strong> · สูงสุด 10 หุ้นต่อโรงแรม · เฉพาะเกาะพะงัน 3,000 หุ้นรวม ล็อกคอมมิชชัน 10% ตลอดชีพ",
    bullets=[
        ("&#128176;", "$1,000 / share · Alpha cohort · KP only.", "$1,000 / หุ้น · Alpha · เฉพาะ KP"),
        ("&#128737;", "Max 10 per hotel (anti-concentration).", "สูงสุด 10/โรงแรม (กันกระจุก)"),
        ("&#128274;", "10% commission locked for life by DAO.", "คอมมิชชัน 10% ล็อกตลอดชีพโดย DAO"),
    ],
    callout_en="&#11088; <strong>contact@staylo.app</strong>",
    callout_th="&#11088; <strong>contact@staylo.app</strong>",
    cta_en="Founding Partner round open.<br/>Koh Phangan first.",
    cta_th="รอบ Founding Partner เปิด<br/>เกาะพะงันก่อน",
    visual=circle(
        center='<div style="font-size:84px; line-height:1;">&#127942;</div><small style="margin-top:4px;"><span class="en">Founding Partner — Alpha · KP</span><span class="th">Founding Partner — Alpha · KP</span></small>',
        bubbles=[
            ("b-top", "&#128176;", G_ORANGE, "$1,000 / share", "$1,000 / หุ้น", "Alpha price · locked", "ราคา Alpha · ล็อก"),
            ("b-right", "&#127968;", G_GREEN, "Max 10 / hotel", "สูงสุด 10/โรงแรม", "Anti-concentration", "กันกระจุก"),
            ("b-bottom", "&#127876;", G_PURPLE, "X-Mas 26 launch", "X-Mas 26 เปิดตัว", "400-500 KP OR 500 shares", "400-500 KP หรือ 500 หุ้น"),
            ("b-left", "&#128274;", G_PINK, "10% for life", "10% ตลอดชีพ", "Locked by DAO statute", "ล็อกโดยธรรมนูญ DAO"),
        ],
    ),
)


def extract_block(content, start_marker, end_marker_inclusive):
    """Extract a contiguous block between two markers (start to end inclusive)."""
    s = content.find(start_marker)
    if s == -1:
        raise ValueError(f"start marker not found: {start_marker[:40]}")
    e = content.find(end_marker_inclusive, s)
    if e == -1:
        raise ValueError(f"end marker not found: {end_marker_inclusive[:40]}")
    return content[s:e + len(end_marker_inclusive)]


def main():
    pitch = PITCH.read_text(encoding="utf-8")
    hotelier = HOTELIER.read_text(encoding="utf-8")
    original_len = len(hotelier)

    # 1) Extract slide-reason CSS block from pitch.html
    css_start = "/* ── REASON template (editorial slide style — 2026-06-18) ──"
    # End at the unique closing of .feature-logo small {} — use the most specific
    # marker that closes the whole REASON CSS block. The string "  opacity: 0.85;"
    # only occurs in .feature-logo small, so we anchor on the surrounding lines.
    css_end_marker = "  opacity: 0.85;\n  margin-top: 4px;\n}"
    reason_css = extract_block(pitch, css_start, css_end_marker)

    # 2) Extract shared SVG defs + templates + injection script from pitch.html
    shared_start = "<!-- ================================================================\n     SHARED ASSETS for slide-reason slides:"
    shared_end_marker = "  })();\n</script>"
    shared_block = extract_block(pitch, shared_start, shared_end_marker)

    # 3) Inject the CSS into pitch-hotelier.html's <style> block.
    #    Find an anchor inside the style block to inject just before it ends.
    css_anchor = "/* ── Slide: PAIN ── */"
    if css_anchor not in hotelier:
        # fallback: inject before the </style>
        hotelier = hotelier.replace("</style>", reason_css + "\n\n</style>", 1)
    else:
        hotelier = hotelier.replace(css_anchor, reason_css + "\n\n" + css_anchor, 1)
    print("CSS injected into pitch-hotelier.html")

    # 4) Inject shared SVG + templates + script just after <body class=...>
    body_match = re.search(r'<body[^>]*>', hotelier)
    if not body_match:
        raise RuntimeError("no <body> tag found in pitch-hotelier.html")
    body_end = body_match.end()
    hotelier = hotelier[:body_end] + "\n\n" + shared_block + "\n\n" + hotelier[body_end:]
    print("Shared SVG + templates + script injected after <body>")

    # 5) Replace slides 2-7 + 9 with editorial template
    slides_map = {
        2: SLIDE_2,
        3: SLIDE_3,
        4: SLIDE_4,
        5: SLIDE_5,
        6: SLIDE_6,
        7: SLIDE_7,
        9: SLIDE_9,
    }

    for num, new_html in slides_map.items():
        pattern = re.compile(
            r'<section[^>]*\bdata-slide="' + str(num) + r'"[^>]*>.*?</section>',
            re.DOTALL,
        )
        if not pattern.search(hotelier):
            print(f"!! slide {num} not found, skipping")
            continue
        hotelier = pattern.sub(new_html, hotelier, count=1)
        print(f"OK slide {num} replaced")

    HOTELIER.write_text(hotelier, encoding="utf-8")
    print(f"\nFile size: {original_len} -> {len(hotelier)} bytes")


if __name__ == "__main__":
    main()
