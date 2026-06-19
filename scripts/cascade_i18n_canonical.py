"""
Cascade the canonical-locked i18n keys across all 14 locales.
Removes obsolete keys (gov_sunset_val, gov_founder_seats, old tok_*) and
adds the new canonical keys (gov_founder_seat, gov_fp_protection, new tok_*).

Source of truth: src/i18n/en.json (already updated).
FR + TH get hand-translated values; the other 11 locales get English
fallback (i18next will display English when no translation exists, which
is the explicit behavior we want here for canonical-locked figures).
"""
import json
from pathlib import Path

I18N_DIR = Path(r"C:\Users\David\Desktop\STAYLO-repo\src\i18n")

# Keys removed from `vision` namespace
OBSOLETE_VISION_KEYS = [
    "tok_platform_pool",
    "tok_platform_pool_desc",
    "tok_reserve",
    "tok_reserve_desc",
    "tok_ambassador",
    "tok_ambassador_desc",
    "tok_dex",
    "tok_dex_desc",
    "gov_founder_seats",
    "gov_founder_seats_val",
    "gov_sunset",
    "gov_sunset_val",
]

# Canonical English keys (source of truth)
NEW_VISION_EN = {
    "tok_fp_pool": "Founding Partner allocation at TGE",
    "tok_fp_pool_desc": "One-shot distribution to Alpha FP hotelier shareholders at TGE",
    "tok_treasury": "Treasury & Ops Runway",
    "tok_treasury_desc": "4-year ops runway, BD, partnerships, regulatory",
    "tok_liquidity": "Liquidity & Market Making",
    "tok_liquidity_desc": "Raydium initial liquidity + ongoing market making",
    "tok_team": "Team & Advisors",
    "tok_team_desc": "4-year vest, 12m cliff + 36m linear · David 10M",
    "tok_preseed": "Pre-Seed Warrants",
    "tok_preseed_desc": "1.0× warrant ratio · bridge incentive · Q4 2026 close",
    "tok_engagement": "Engagement Pool",
    "tok_engagement_desc": "Hoteliers + guests earn via action grid · halving every 4 years",
    "tok_total_note": "Fixed FOREVER · Bitcoin-style halving every 4 years on all emissions · No new minting (90% supermajority required)",
    "gov_founder_seat": "⭐ Founder Seat",
    "gov_founder_seat_val": "<strong>David Deveaux only · LOCKED non-dilutable</strong> · 50,000 shares + 10M $STAY (12m cliff + 36m vest) · President à vie · véto on commission / dissolution / mission",
    "gov_fp_protection": "🛡️ FP protection",
    "gov_fp_protection_val": "<strong>Founding Partners cannot be delisted from the platform.</strong> Ever. Protection written into statutes — vs OTAs which can delist at will.",
    "urgency_title": "🎄 X-Mas 2026 launch. 400-500 KP hoteliers OR 500 shares. Do the math.",
    "capital_note": "Acquisitions = signing 400-500 KP hoteliers OR 500 Alpha shares → 🎄 X-Mas 2026 platform launch. Commission = 10% revenue per booking (separate).",
    "share_sale_subtitle": "Phase Alpha — Founding Partners only · Koh Phangan first · Limited to 3,000 shares · 🎄 X-Mas 2026 launch trigger.",
}

# French translations
NEW_VISION_FR = {
    "tok_fp_pool": "Allocation Founding Partners au TGE",
    "tok_fp_pool_desc": "Distribution unique aux hôteliers actionnaires Alpha FP au TGE",
    "tok_treasury": "Trésorerie & Opérations",
    "tok_treasury_desc": "Runway opérationnel 4 ans, BD, partenariats, réglementaire",
    "tok_liquidity": "Liquidité & Market Making",
    "tok_liquidity_desc": "Liquidité initiale Raydium + market making continu",
    "tok_team": "Équipe & Conseillers",
    "tok_team_desc": "Vesting 4 ans, cliff 12m + linéaire 36m · David 10M",
    "tok_preseed": "Warrants Pre-Seed",
    "tok_preseed_desc": "Ratio warrant 1.0× · incitation bridge · clôture Q4 2026",
    "tok_engagement": "Pool d'Engagement",
    "tok_engagement_desc": "Hôteliers + voyageurs gagnent via grille d'actions · halving tous les 4 ans",
    "tok_total_note": "Fixe POUR TOUJOURS · Halving Bitcoin-style tous les 4 ans sur toutes les émissions · Pas de nouveau mint (supermajorité 90% requise)",
    "gov_founder_seat": "⭐ Siège Fondateur",
    "gov_founder_seat_val": "<strong>David Deveaux uniquement · BLOQUÉ non-dilutable</strong> · 50 000 parts + 10M $STAY (cliff 12m + vest 36m) · Président à vie · véto sur commission / dissolution / mission",
    "gov_fp_protection": "🛡️ Protection FP",
    "gov_fp_protection_val": "<strong>Les Founding Partners ne peuvent pas être délistés de la plateforme.</strong> Jamais. Protection inscrite dans les statuts — vs les OTAs qui peuvent délister à volonté.",
    "urgency_title": "🎄 Lancement X-Mas 2026. 400-500 hôteliers KP OU 500 parts. Faites le calcul.",
    "capital_note": "Acquisitions = signer 400-500 hôteliers KP OU 500 parts Alpha → 🎄 lancement plateforme X-Mas 2026. Commission = 10% du revenu par réservation (séparé).",
    "share_sale_subtitle": "Phase Alpha — Founding Partners uniquement · Koh Phangan en premier · Limité à 3 000 parts · 🎄 déclencheur lancement X-Mas 2026.",
}

# Thai translations
NEW_VISION_TH = {
    "tok_fp_pool": "การจัดสรร Founding Partner ที่ TGE",
    "tok_fp_pool_desc": "การกระจายครั้งเดียวให้ผู้ถือหุ้นโรงแรม Alpha FP ที่ TGE",
    "tok_treasury": "คลังและการดำเนินงาน",
    "tok_treasury_desc": "Runway 4 ปี · BD · พาร์ทเนอร์ · กฎหมาย",
    "tok_liquidity": "สภาพคล่องและ Market Making",
    "tok_liquidity_desc": "สภาพคล่อง Raydium เริ่มต้น + market making ต่อเนื่อง",
    "tok_team": "ทีมและที่ปรึกษา",
    "tok_team_desc": "Vesting 4 ปี · cliff 12m + linear 36m · David 10M",
    "tok_preseed": "Warrants Pre-Seed",
    "tok_preseed_desc": "อัตรา warrant 1.0× · แรงจูงใจ bridge · ปิด Q4 2026",
    "tok_engagement": "พูลการมีส่วนร่วม",
    "tok_engagement_desc": "โรงแรม + แขก รับ $STAY ผ่านตารางกิจกรรม · ลดครึ่งทุก 4 ปี",
    "tok_total_note": "คงที่ตลอดไป · Halving แบบ Bitcoin ทุก 4 ปีบนการปล่อยทั้งหมด · ไม่มีการสร้างใหม่ (ต้องโหวต 90%)",
    "gov_founder_seat": "⭐ Founder Seat",
    "gov_founder_seat_val": "<strong>เฉพาะ David Deveaux · ล็อก ไม่เจือจาง</strong> · 50,000 หุ้น + 10M $STAY (cliff 12m + vest 36m) · ประธานตลอดชีวิต · วีโต้เรื่องคอมมิชชัน / ยุบ / พันธกิจ",
    "gov_fp_protection": "🛡️ การคุ้มครอง FP",
    "gov_fp_protection_val": "<strong>Founding Partners ไม่สามารถถูกลบออกจากแพลตฟอร์มได้</strong> ไม่มีวัน คุ้มครองตามกฎ — เทียบกับ OTA ที่ลบได้ตามใจ",
    "urgency_title": "🎄 เปิดตัว X-Mas 2026 · 400-500 โรงแรม KP หรือ 500 หุ้น · คิดเลขดู",
    "capital_note": "การซื้อกิจการ = เซ็น 400-500 โรงแรม KP หรือ ขายหุ้น Alpha 500 หุ้น → 🎄 เปิดแพลตฟอร์ม X-Mas 2026 · ค่าคอมมิชชัน = 10% ของรายได้ต่อการจอง (แยกต่างหาก)",
    "share_sale_subtitle": "Phase Alpha — เฉพาะ Founding Partners · เกาะพะงันก่อน · จำกัด 3,000 หุ้น · 🎄 เปิดตัว X-Mas 2026",
}

LOCALES = ["fr", "th", "zh", "de", "es", "ja", "ru", "it", "pt", "ar", "hi", "id", "my"]
TRANSLATIONS = {"fr": NEW_VISION_FR, "th": NEW_VISION_TH}


def update_locale(code):
    """Update a single locale file: remove obsolete keys, add new canonical ones."""
    path = I18N_DIR / f"{code}.json"
    if not path.exists():
        print(f"!! {code}.json not found, skipping")
        return 0

    data = json.loads(path.read_text(encoding="utf-8"))
    vision = data.get("vision")
    if vision is None:
        print(f"!! {code}.json has no 'vision' namespace, skipping")
        return 0

    changes = 0

    # Remove obsolete keys
    for key in OBSOLETE_VISION_KEYS:
        if key in vision:
            del vision[key]
            changes += 1

    # Determine which canonical map to use (FR/TH have translations, others fall back to EN)
    new_keys = TRANSLATIONS.get(code, NEW_VISION_EN)

    # Add new canonical keys
    for key, value in new_keys.items():
        if vision.get(key) != value:
            vision[key] = value
            changes += 1

    # Write back with 2-space indent (matches existing format)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changes


def main():
    total_changes = 0
    for code in LOCALES:
        n = update_locale(code)
        print(f"OK {code}.json — {n:>3} key changes")
        total_changes += n
    print(f"\n{total_changes} total key changes across {len(LOCALES)} locales")


if __name__ == "__main__":
    main()
