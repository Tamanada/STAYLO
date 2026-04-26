"""
STAYLO — Generate one-page pitch PDFs for hotelier outreach (Koh Phangan).
Multi-language: FR, EN, TH.

Run:  python generate_pitch_pdf.py           # generates all 3 PDFs
      python generate_pitch_pdf.py fr        # generates only French

Output files (next to this script):
    STAYLO_Pitch_Hotelier_FR.pdf
    STAYLO_Pitch_Hotelier_EN.pdf
    STAYLO_Pitch_Hotelier_TH.pdf
"""
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Brand palette ────────────────────────────────────────
ORANGE = HexColor('#FF6B00')
PINK   = HexColor('#FF3CB4')
TEAL   = HexColor('#00B894')
PURPLE = HexColor('#6C5CE7')
NAVY   = HexColor('#2D3436')
CREAM  = HexColor('#FFFDF8')
GRAY   = HexColor('#636E72')
LIGHT  = HexColor('#F5F3EE')
GRAY_SOFT = HexColor('#B2BEC3')
WHITE  = white

PAGE_W, PAGE_H = A4  # 595 x 842 pt

# ── Register Thai fonts ──────────────────────────────────
# Leelawadee is a Thai-capable font bundled with Windows
WIN_FONTS = r'C:\Windows\Fonts'
try:
    pdfmetrics.registerFont(TTFont('Leelawadee',     os.path.join(WIN_FONTS, 'leelawad.ttf')))
    pdfmetrics.registerFont(TTFont('LeelawadeeBold', os.path.join(WIN_FONTS, 'leelawdb.ttf')))
    THAI_OK = True
except Exception as e:
    print(f"[warn] Thai fonts not registered: {e}")
    THAI_OK = False

# ═══════════════════════════════════════════════════════════════
# Language content
# ═══════════════════════════════════════════════════════════════
LANGS = {
    'fr': {
        'font_regular': 'Helvetica',
        'font_bold':    'Helvetica-Bold',
        'font_italic':  'Helvetica-Oblique',
        'tagline':      'La plateforme de réservation qui respecte les hôteliers',
        'badge':        'KOH PHANGAN 2026',
        'hero_title':   '3 raisons de rejoindre STAYLO',
        'cards': [
            {'big': '10%',  'title': 'COMMISSION',  'desc': 'vs 17-25% chez\nBooking et Agoda.\nContractuel.'},
            {'big': '1h',   'title': 'PAIEMENT',    'desc': 'Après le check-out\nde votre guest.\nPas 45 jours.'},
            {'big': '100%', 'title': 'DATA CLIENT', 'desc': 'Email, téléphone,\nprénom — directs.\nPas de proxy.'},
        ],
        'compare_title': 'Le vrai comparatif',
        'compare_headers': ['Plateforme', 'Commission', "Paiement à l'hôtel"],
        'compare_rows': [
            ('Agoda / Expedia', '17-22%',  'T+30 à T+45 après check-out'),
            ('Booking.com',     '15-22%',  'Facture mensuelle (T+30)'),
            ('Airbnb',          '3% host', 'T+1 après check-in'),
            ('STAYLO',          '10% max', 'T+1h après check-out'),
        ],
        'bonus_title': 'Et en bonus, inclus gratuitement',
        'bonus': [
            ('PMS inclus',           "Front desk, housekeeping,\nrapports d'occupation"),
            ('Moteur de réservation','0% sur votre propre site web'),
            ('Channel Manager',      'Sync gratuit avec Booking,\nAirbnb, Agoda, Expedia...'),
            ('14 langues',           'FR, EN, TH, JP, DE, ES, RU,\nZH, HI, PT, ID, MY, IT, AR'),
            ('Aucun engagement',     'Pas de contrat de lock-in.\nPas de price parity.'),
        ],
        'flow_title': 'Comment ça marche',
        'flow': [
            ('1', 'Guest réserve\net paie STAYLO'),
            ('2', 'Fonds bloqués\nen séquestre'),
            ('3', 'Check-out +\nquestionnaire\n(30 sec)'),
            ('4', "90% versé\nà l'hôtelier\ndans l'heure"),
        ],
        'cta_title':    'Inscrivez votre hôtel en 15 minutes',
        'cta_subtitle': 'Les premiers hôtels de Koh Phangan sont mis en avant — gratuitement, sans exclusivité.',
        'cta_url':      'staylo.app/submit',
        'footer':       'STAYLO — Fair hospitality. Hoteliers set the prices.',
    },
    'en': {
        'font_regular': 'Helvetica',
        'font_bold':    'Helvetica-Bold',
        'font_italic':  'Helvetica-Oblique',
        'tagline':      'The booking platform that respects hoteliers',
        'badge':        'KOH PHANGAN 2026',
        'hero_title':   '3 reasons to join STAYLO',
        'cards': [
            {'big': '10%',  'title': 'COMMISSION', 'desc': 'vs 17-25% on\nBooking and Agoda.\nContractual.'},
            {'big': '1h',   'title': 'PAYOUT',     'desc': 'After your guest\nchecks out.\nNot 45 days.'},
            {'big': '100%', 'title': 'GUEST DATA', 'desc': 'Email, phone,\nname — direct.\nNo proxy.'},
        ],
        'compare_title': 'The real comparison',
        'compare_headers': ['Platform', 'Commission', 'Payment to hotel'],
        'compare_rows': [
            ('Agoda / Expedia', '17-22%',  'T+30 to T+45 after check-out'),
            ('Booking.com',     '15-22%',  'Monthly invoice (T+30)'),
            ('Airbnb',          '3% host', 'T+1 after check-in'),
            ('STAYLO',          '10% max', 'T+1h after check-out'),
        ],
        'bonus_title': 'And included for free',
        'bonus': [
            ('PMS included',    'Front desk, housekeeping,\noccupancy reports'),
            ('Booking engine',  '0% on your own website'),
            ('Channel Manager', 'Free 2-way sync with Booking,\nAirbnb, Agoda, Expedia...'),
            ('14 languages',    'EN, FR, TH, JP, DE, ES, RU,\nZH, HI, PT, ID, MY, IT, AR'),
            ('No commitment',   'No lock-in contract.\nNo price parity.'),
        ],
        'flow_title': 'How it works',
        'flow': [
            ('1', 'Guest books\nand pays STAYLO'),
            ('2', 'Funds held\nin escrow'),
            ('3', 'Check-out +\nquick survey\n(30 sec)'),
            ('4', '90% paid\nto the hotel\nwithin 1 hour'),
        ],
        'cta_title':    'Register your hotel in 15 minutes',
        'cta_subtitle': 'The first hotels of Koh Phangan get featured — free, no exclusivity.',
        'cta_url':      'staylo.app/submit',
        'footer':       'STAYLO — Fair hospitality. Hoteliers set the prices.',
    },
    'th': {
        'font_regular': 'Leelawadee',
        'font_bold':    'LeelawadeeBold',
        'font_italic':  'Leelawadee',
        'tagline':      'แพลตฟอร์มการจองที่เคารพเจ้าของโรงแรม',
        'badge':        'เกาะพะงัน 2026',
        'hero_title':   '3 เหตุผลที่ควรร่วมกับ STAYLO',
        'cards': [
            {'big': '10%',  'title': 'ค่าคอมมิชชั่น', 'desc': 'เทียบกับ 17-25%\nของ Booking และ Agoda\nตามสัญญา'},
            {'big': '1 ชม.', 'title': 'การจ่ายเงิน',   'desc': 'หลังแขกเช็คเอาท์\nไม่ต้องรอ 45 วัน'},
            {'big': '100%', 'title': 'ข้อมูลลูกค้า',   'desc': 'อีเมล โทรศัพท์ ชื่อ\nโดยตรง ไม่ผ่านตัวกลาง'},
        ],
        'compare_title': 'เปรียบเทียบจริง',
        'compare_headers': ['แพลตฟอร์ม', 'ค่าคอมฯ', 'จ่ายให้โรงแรม'],
        'compare_rows': [
            ('Agoda / Expedia', '17-22%',  'T+30 ถึง T+45 หลังเช็คเอาท์'),
            ('Booking.com',     '15-22%',  'ใบแจ้งหนี้รายเดือน (T+30)'),
            ('Airbnb',          '3% host', 'T+1 หลังเช็คอิน'),
            ('STAYLO',          '10% max', 'T+1 ชม. หลังเช็คเอาท์'),
        ],
        'bonus_title': 'และโบนัสฟรี',
        'bonus': [
            ('ระบบ PMS ครบครัน',   'Front desk แม่บ้าน\nรายงานการเข้าพัก'),
            ('เครื่องมือจองออนไลน์', '0% บนเว็บไซต์ของคุณ'),
            ('Channel Manager',    'ซิงก์ฟรีกับ Booking, Airbnb,\nAgoda, Expedia...'),
            ('14 ภาษา',            'TH, EN, FR, JP, DE, ES, RU,\nZH, HI, PT, ID, MY, IT, AR'),
            ('ไม่มีสัญญาผูกมัด',    'ไม่มีล็อค-อิน\nไม่มี price parity'),
        ],
        'flow_title': 'ขั้นตอนการทำงาน',
        'flow': [
            ('1', 'แขกจอง\nและจ่าย STAYLO'),
            ('2', 'เงินถูกเก็บ\nในบัญชี escrow'),
            ('3', 'เช็คเอาท์ +\nแบบสอบถาม\n(30 วินาที)'),
            ('4', '90% โอนให้\nโรงแรม\nภายใน 1 ชม.'),
        ],
        'cta_title':    'ลงทะเบียนโรงแรมของคุณใน 15 นาที',
        'cta_subtitle': 'โรงแรมแรก ๆ ของเกาะพะงันได้รับการโปรโมต — ฟรี ไม่ผูกขาด',
        'cta_url':      'staylo.app/submit',
        'footer':       'STAYLO — การบริการที่เป็นธรรม เจ้าของโรงแรมกำหนดราคา',
    },
}

# ═══════════════════════════════════════════════════════════════
# Drawing helpers
# ═══════════════════════════════════════════════════════════════
def rect(c, x, y, w, h, fill=None, stroke=None, radius=0):
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
    if radius > 0:
        c.roundRect(x, y, w, h, radius, fill=1 if fill else 0, stroke=1 if stroke else 0)
    else:
        c.rect(x, y, w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)

def text(c, x, y, s, font='Helvetica', size=10, color=NAVY, align='left'):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == 'center':
        c.drawCentredString(x, y, s)
    elif align == 'right':
        c.drawRightString(x, y, s)
    else:
        c.drawString(x, y, s)

def hline(c, x1, y1, x2, y2, color=NAVY, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)

# ═══════════════════════════════════════════════════════════════
# Build one PDF for a given language
# ═══════════════════════════════════════════════════════════════
def build(lang, output_path):
    if lang == 'th' and not THAI_OK:
        raise RuntimeError("Thai fonts not available on this system")
    L = LANGS[lang]
    F_REG = L['font_regular']
    F_BLD = L['font_bold']
    F_ITL = L['font_italic']

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"STAYLO — Hotelier Pitch ({lang.upper()})")
    c.setAuthor("STAYLO")
    c.setSubject("Hotelier one-pager for Koh Phangan launch")

    # Background
    rect(c, 0, 0, PAGE_W, PAGE_H, fill=CREAM)

    # ─── 1. HEADER ──────────────────────────────────────
    header_h = 90
    rect(c, 0, PAGE_H - header_h, PAGE_W, header_h, fill=NAVY)
    rect(c, 0, PAGE_H - header_h - 4, PAGE_W, 4, fill=ORANGE)

    # Logo "stay lo"
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(WHITE)
    c.drawString(40, PAGE_H - 50, "stay")
    logo_stay_w = c.stringWidth("stay", 'Helvetica-Bold', 36)
    c.setFillColor(ORANGE)
    c.drawString(40 + logo_stay_w + 2, PAGE_H - 50, "lo")

    # Tagline
    text(c, 40, PAGE_H - 70, L['tagline'], font=F_REG, size=11, color=WHITE)

    # Right badge
    badge_w = 140
    badge_x = PAGE_W - 40 - badge_w
    badge_y = PAGE_H - 60
    rect(c, badge_x, badge_y, badge_w, 28, fill=ORANGE, radius=14)
    text(c, badge_x + badge_w/2, badge_y + 10, L['badge'],
         font=F_BLD, size=10, color=WHITE, align='center')

    # ─── 2. HERO — 3 cards ──────────────────────────────
    hero_y = PAGE_H - header_h - 20
    text(c, PAGE_W/2, hero_y - 5, L['hero_title'],
         font=F_BLD, size=14, color=NAVY, align='center')

    card_y = hero_y - 150
    card_h = 130
    card_w = (PAGE_W - 80 - 20) / 3
    card_colors = [ORANGE, TEAL, PINK]

    for i, card in enumerate(L['cards']):
        cx = 40 + i * (card_w + 10)
        color = card_colors[i]
        rect(c, cx, card_y, card_w, card_h, fill=WHITE, radius=10)
        rect(c, cx, card_y + card_h - 8, card_w, 8, fill=color)
        # Big number
        text(c, cx + card_w/2, card_y + card_h - 45, card['big'],
             font=F_BLD, size=38, color=color, align='center')
        # Title
        text(c, cx + card_w/2, card_y + card_h - 68, card['title'],
             font=F_BLD, size=11, color=NAVY, align='center')
        # Desc
        for j, dline in enumerate(card['desc'].split('\n')):
            text(c, cx + card_w/2, card_y + card_h - 90 - j*12, dline,
                 font=F_REG, size=9, color=GRAY, align='center')

    # ─── 3. COMPARISON TABLE ────────────────────────────
    table_top_y = card_y - 30
    text(c, 40, table_top_y, L['compare_title'],
         font=F_BLD, size=13, color=NAVY)
    hline(c, 40, table_top_y - 5, 180, table_top_y - 5, color=ORANGE, width=2)

    headers = L['compare_headers']
    all_rows = [(headers, True, False)] + [(r, False, r[0] == 'STAYLO') for r in L['compare_rows']]

    row_h = 22
    col_w = [150, 90, 260]
    table_x = 40
    table_y = table_top_y - 20

    for i, (row, is_header, is_staylo) in enumerate(all_rows):
        y = table_y - i * row_h
        if is_header:
            rect(c, table_x, y - row_h + 6, sum(col_w), row_h, fill=NAVY)
            txt_color = WHITE
            font = F_BLD
        elif is_staylo:
            rect(c, table_x, y - row_h + 6, sum(col_w), row_h, fill=ORANGE)
            txt_color = WHITE
            font = F_BLD
        else:
            rect(c, table_x, y - row_h + 6, sum(col_w), row_h, fill=WHITE)
            rect(c, table_x, y - row_h + 6, sum(col_w), row_h, stroke=LIGHT)
            txt_color = NAVY
            font = F_REG

        text(c, table_x + 10, y - 8, row[0], font=font, size=9, color=txt_color)
        text(c, table_x + col_w[0] + 10, y - 8, row[1], font=font, size=9, color=txt_color)
        text(c, table_x + col_w[0] + col_w[1] + 10, y - 8, row[2], font=font, size=9, color=txt_color)

    # ─── 4. BONUS FEATURES ──────────────────────────────
    bonus_top_y = table_y - len(all_rows) * row_h - 20
    text(c, 40, bonus_top_y, L['bonus_title'],
         font=F_BLD, size=13, color=NAVY)
    hline(c, 40, bonus_top_y - 5, 260, bonus_top_y - 5, color=TEAL, width=2)

    feat_y = bonus_top_y - 30
    n = len(L['bonus'])
    gap = 8
    feat_w = (PAGE_W - 80 - (n - 1) * gap) / n

    for i, (title_txt, desc) in enumerate(L['bonus']):
        fx = 40 + i * (feat_w + gap)
        c.setFillColor(TEAL)
        c.circle(fx + 8, feat_y + 5, 5, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(fx + 8, feat_y + 3, "OK")
        text(c, fx + 20, feat_y + 3, title_txt, font=F_BLD, size=10, color=NAVY)
        for j, dline in enumerate(desc.split('\n')):
            text(c, fx + 20, feat_y - 12 - j*11, dline, font=F_REG, size=8, color=GRAY)

    # ─── 5. FLOW DIAGRAM ────────────────────────────────
    flow_top_y = feat_y - 60
    text(c, 40, flow_top_y, L['flow_title'],
         font=F_BLD, size=13, color=NAVY)
    hline(c, 40, flow_top_y - 5, 160, flow_top_y - 5, color=PINK, width=2)

    flow_y = flow_top_y - 50
    step_colors = [PINK, PURPLE, TEAL, ORANGE]
    step_w = (PAGE_W - 80 - 30) / 4

    for i, (num, label) in enumerate(L['flow']):
        sx = 40 + i * (step_w + 10)
        color = step_colors[i]
        c.setFillColor(color)
        c.circle(sx + 15, flow_y + 5, 12, fill=1, stroke=0)
        text(c, sx + 15, flow_y + 1, num, font=F_BLD, size=12, color=WHITE, align='center')
        for j, dline in enumerate(label.split('\n')):
            text(c, sx + 33, flow_y + 8 - j*10, dline, font=F_REG, size=8, color=NAVY)
        if i < len(L['flow']) - 1:
            arrow_x = sx + step_w - 5
            c.setFillColor(GRAY)
            c.setFont('Helvetica-Bold', 14)
            c.drawString(arrow_x, flow_y - 1, "->")

    # ─── 6. CTA FOOTER ──────────────────────────────────
    footer_h = 100
    rect(c, 0, 0, PAGE_W, footer_h, fill=NAVY)
    rect(c, 0, footer_h, PAGE_W, 4, fill=ORANGE)

    text(c, PAGE_W/2, footer_h - 28, L['cta_title'],
         font=F_BLD, size=16, color=WHITE, align='center')
    text(c, PAGE_W/2, footer_h - 48, L['cta_subtitle'],
         font=F_REG, size=10, color=GRAY_SOFT, align='center')

    btn_w = 200
    btn_h = 32
    btn_x = (PAGE_W - btn_w) / 2
    btn_y = footer_h - 92
    rect(c, btn_x, btn_y, btn_w, btn_h, fill=ORANGE, radius=16)
    text(c, PAGE_W/2, btn_y + 11, L['cta_url'],
         font=F_BLD, size=13, color=WHITE, align='center')

    text(c, PAGE_W/2, 10, L['footer'],
         font=F_ITL, size=7, color=GRAY_SOFT, align='center')

    c.showPage()
    c.save()
    return output_path

# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    langs = sys.argv[1:] or list(LANGS.keys())
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for lg in langs:
        if lg not in LANGS:
            print(f"[skip] unknown lang: {lg}")
            continue
        out = os.path.join(base_dir, f'STAYLO_Pitch_Hotelier_{lg.upper()}.pdf')
        build(lg, out)
        print(f"[ok] {lg.upper()}: {out}")
