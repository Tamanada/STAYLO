"""
Global 22% → 17% replacement in ALL i18n locale files (both src/i18n and
public/i18n). Every 22% in i18n files is a Booking.com commission reference —
safe to blanket-replace. Also updates any remaining site-wide 22% mentions
in the OTHER (previously-missed) contexts like "Stop paying 22% to Booking".
"""
import json
from pathlib import Path
import re

REPO = Path(r"C:\Users\David\Desktop\STAYLO-repo")

I18N_DIRS = [REPO / "src" / "i18n", REPO / "public" / "i18n"]

# Site-wide files (outside i18n) that may still have "22%" — grep-listed
# after the first pass. Also cover ranges 22 in Booking context.
EXTRA_FILES = [
    REPO / "index.html",
    REPO / "src" / "pages" / "Vision.jsx",
    REPO / "src" / "pages" / "LOI.jsx",
    REPO / "src" / "pages" / "AmbassadorGuide.jsx",
    REPO / "src" / "components" / "SEO.jsx",
    REPO / "src" / "components" / "sections" / "CompareTable.jsx",
    REPO / "src" / "pages" / "dashboard" / "PMSReports.jsx",
    REPO / "public" / "pitch.html",
    REPO / "public" / "pitch-hotelier.html",
    REPO / "public" / "pitch-crypto.html",
    REPO / "public" / "investors" / "one-pager.html",
    REPO / "public" / "investors" / "dossier-strategique.html",
    REPO / "BRAND_GLOSSARY.md",
    REPO / "CLAUDE.md",
]


def blanket_replace_i18n(path):
    """Blanket-replace every '22%' → '17%' in an i18n JSON."""
    if not path.exists():
        return 0
    original = path.read_text(encoding="utf-8")
    # count occurrences of "22%" (also handles Unicode variants nearby)
    n = original.count("22%")
    if n == 0:
        return 0
    new = original.replace("22%", "17%")
    # Also handle percent-with-space variants (French style)
    new = new.replace("22 %", "17 %")
    # Also 17-22, 18-22 ranges
    new = new.replace("18-22", "15-17").replace("18–22", "15–17")
    new = new.replace("17-22", "15-17").replace("17–22", "15–17")
    # Validate JSON
    try:
        json.loads(new)
    except json.JSONDecodeError as e:
        print(f"!! JSON break — skipping {path.name}: {e}")
        return 0
    delta = original.count("22%") + original.count("22 %") + original.count("18-22") + original.count("18–22") + original.count("17-22") + original.count("17–22")
    path.write_text(new, encoding="utf-8")
    return delta


def targeted_replace_file(path):
    """Targeted replace: only clear Booking-related contexts (avoid random 22%)."""
    if not path.exists():
        return 0
    text = path.read_text(encoding="utf-8")
    original = text
    # All the residual patterns from grep
    patterns = [
        # Hero-line variants across languages
        ("Stop paying 22% to Booking.com",     "Stop paying 17% to Booking.com"),
        ("Deja de pagar el 22% a Booking.com", "Deja de pagar el 17% a Booking.com"),
        ("Hören Sie auf, 22% an Booking.com",  "Hören Sie auf, 17% an Booking.com"),
        ("Smetti di pagare il 22% a Booking.com", "Smetti di pagare il 17% a Booking.com"),
        ("Berhenti bayar 22% ke Booking.com",  "Berhenti bayar 17% ke Booking.com"),
        # Also patterns that could remain
        ("22% OTA commission",                 "17% OTA commission"),
        ("22% de OTA",                         "17% de OTA"),
        ("22% commission OTA",                 "17% commission OTA"),
        ("average 22%",                        "average 17%"),
        ("moyenne de 22%",                     "moyenne de 17%"),
        # Comparison sentences that had 22%
        ("10% instead of 22%",                 "10% instead of 17%"),
        ("10% au lieu de 22%",                 "10% au lieu de 17%"),
        ("10% en vez del 22%",                 "10% en vez del 17%"),
        # Ranges
        ("17-22%",                             "15-17%"),
        ("17–22%",                             "15–17%"),
        ("18-22%",                             "15-17%"),
        ("18–22%",                             "15–17%"),
        # Standalone Booking.com N% patterns
        ("Booking.com 22%",                    "Booking.com 17%"),
        ("Booking 22%",                        "Booking 17%"),
    ]
    for old, new in patterns:
        if old in text:
            text = text.replace(old, new)
    # Validate JSON if it's a JSON file
    if path.suffix == ".json":
        try:
            json.loads(text)
        except json.JSONDecodeError:
            return 0
    if text != original:
        path.write_text(text, encoding="utf-8")
        return sum(original.count(o) for o, _ in patterns)
    return 0


def main():
    total = 0
    # Step 1: blanket i18n
    for d in I18N_DIRS:
        for p in sorted(d.glob("*.json")):
            n = blanket_replace_i18n(p)
            if n:
                print(f"  {n:>3}× {p.relative_to(REPO)}")
                total += n
    # Step 2: targeted extra files
    for p in EXTRA_FILES:
        n = targeted_replace_file(p)
        if n:
            print(f"  {n:>3}× {p.relative_to(REPO)}")
            total += n
    print(f"\n[done] {total} total replacements")


if __name__ == "__main__":
    main()
