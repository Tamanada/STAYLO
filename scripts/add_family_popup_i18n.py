"""
Add i18n keys for FamilyPopup component across all 14 locales.
Keys: family_popup.title, .body, .cta_join, .cta_later, .close
FR + TH hand-translated; other 11 locales get hand-crafted translations too.
"""
import json
from pathlib import Path

I18N_DIR = Path(r"C:\Users\David\Desktop\STAYLO-repo\src\i18n")

TRANSLATIONS = {
    "en": {
        "title": "Alone, it is impossible. Together, we are unstoppable.",
        "body": "Stop wasting your time to make your web site loading bookings, join the family!",
        "cta_join": "Join the family",
        "cta_later": "Maybe later",
        "close": "Close",
    },
    "fr": {
        "title": "Seul, c'est impossible. Ensemble, nous sommes imparables.",
        "body": "Arrête de perdre ton temps à faire charger les réservations sur ton site web, rejoins la famille !",
        "cta_join": "Rejoindre la famille",
        "cta_later": "Peut-être plus tard",
        "close": "Fermer",
    },
    "th": {
        "title": "คนเดียวไม่มีทาง แต่ร่วมกันเรายิ่งใหญ่ไม่มีขีดจำกัด",
        "body": "หยุดเสียเวลาทำเว็บไซต์รับจองเอง มาร่วมครอบครัวของเรา!",
        "cta_join": "เข้าร่วมครอบครัว",
        "cta_later": "ไว้ทีหลัง",
        "close": "ปิด",
    },
    "es": {
        "title": "Solo, es imposible. Juntos, somos imparables.",
        "body": "¡Deja de perder el tiempo cargando reservas en tu propia web, únete a la familia!",
        "cta_join": "Únete a la familia",
        "cta_later": "Quizás más tarde",
        "close": "Cerrar",
    },
    "de": {
        "title": "Allein ist es unmöglich. Zusammen sind wir unaufhaltsam.",
        "body": "Verschwende keine Zeit mehr mit Buchungen auf deiner eigenen Website — werde Teil der Familie!",
        "cta_join": "Der Familie beitreten",
        "cta_later": "Vielleicht später",
        "close": "Schließen",
    },
    "it": {
        "title": "Da solo, è impossibile. Insieme, siamo inarrestabili.",
        "body": "Smettila di perdere tempo con le prenotazioni sul tuo sito, unisciti alla famiglia!",
        "cta_join": "Unisciti alla famiglia",
        "cta_later": "Forse più tardi",
        "close": "Chiudi",
    },
    "pt": {
        "title": "Sozinho é impossível. Juntos somos imparáveis.",
        "body": "Pare de perder tempo carregando reservas no seu próprio site, junte-se à família!",
        "cta_join": "Junte-se à família",
        "cta_later": "Talvez mais tarde",
        "close": "Fechar",
    },
    "ru": {
        "title": "В одиночку невозможно. Вместе мы непобедимы.",
        "body": "Хватит тратить время на бронирования через ваш сайт — присоединяйтесь к семье!",
        "cta_join": "Присоединиться к семье",
        "cta_later": "Может быть, позже",
        "close": "Закрыть",
    },
    "ja": {
        "title": "一人では不可能。共に、私たちは止められない。",
        "body": "自分のサイトでの予約対応に時間を無駄にせず、ファミリーに参加しましょう!",
        "cta_join": "ファミリーに参加",
        "cta_later": "後で",
        "close": "閉じる",
    },
    "zh": {
        "title": "独自一人不可能。众志成城无可阻挡。",
        "body": "别再浪费时间处理自己网站上的预订了,加入我们大家庭吧!",
        "cta_join": "加入大家庭",
        "cta_later": "稍后再说",
        "close": "关闭",
    },
    "ar": {
        "title": "وحدنا مستحيل. معًا، لا يمكن إيقافنا.",
        "body": "توقف عن إضاعة وقتك في تحميل الحجوزات على موقعك، انضم إلى العائلة!",
        "cta_join": "انضم إلى العائلة",
        "cta_later": "ربما لاحقًا",
        "close": "إغلاق",
    },
    "hi": {
        "title": "अकेले, यह असंभव है। साथ में, हम अजेय हैं।",
        "body": "अपनी वेबसाइट पर बुकिंग लोड करने में समय बर्बाद करना बंद करें, परिवार में शामिल हों!",
        "cta_join": "परिवार में शामिल हों",
        "cta_later": "शायद बाद में",
        "close": "बंद करें",
    },
    "id": {
        "title": "Sendirian mustahil. Bersama, kita tak terbendung.",
        "body": "Berhenti buang waktu mengurus pemesanan di situs web Anda sendiri, gabung keluarga kami!",
        "cta_join": "Gabung keluarga",
        "cta_later": "Mungkin nanti",
        "close": "Tutup",
    },
    "my": {
        "title": "တစ်ဦးတည်း မဖြစ်နိုင်ပါ။ အတူတကွ ကျွန်ုပ်တို့ ရပ်တန့်၍မရပါ။",
        "body": "သင့်ကိုယ်ပိုင်ဝဘ်ဆိုက်တွင် ဘွတ်ကင်များစီစဉ်ရန် အချိန်ဖြုန်းရုန်းကန်နေတာ ရပ်လိုက်ပါ၊ မိသားစုတွင် ပါဝင်လိုက်ပါ!",
        "cta_join": "မိသားစုတွင် ပါဝင်ပါ",
        "cta_later": "နောက်မှ",
        "close": "ပိတ်ရန်",
    },
}


def upsert(data, ns, keys):
    """Insert/update a top-level namespace with the given key dict."""
    if ns not in data or not isinstance(data.get(ns), dict):
        data[ns] = {}
    changed = 0
    for k, v in keys.items():
        if data[ns].get(k) != v:
            data[ns][k] = v
            changed += 1
    return changed


def main():
    total = 0
    for code, keys in TRANSLATIONS.items():
        path = I18N_DIR / f"{code}.json"
        if not path.exists():
            print(f"!! {code}.json not found")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        n = upsert(data, "family_popup", keys)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"OK {code}.json  {n:>2} keys")
        total += n
    print(f"\n{total} total key changes across {len(TRANSLATIONS)} locales")


if __name__ == "__main__":
    main()
