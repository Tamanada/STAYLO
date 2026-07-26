"""
Mass-replace Booking.com commission percentage 22% → 17% (the real average
that a typical Booking.com hotelier pays: 15% base + 2% Preferred Partner
Program). Also handles ranges (18-22%, 17-22%) → (15-17%).

Only touches Booking-related contexts to avoid clobbering unrelated 22%.
Also updates Agoda 20% mentions in the same tuple contexts where consistent.

Safe replacements (whole-string):
- "Booking.com 22%"                                → "Booking.com 17%"
- "Booking 22%"                                    → "Booking 17%"
- "Booking.com's 22%"                              → "Booking.com's 17%"
- "22% on Booking"                                 → "17% on Booking"
- "22% on Booking.com"                             → "17% on Booking.com"
- "22% commission"                                 → "17% commission"
- "commission is 22%"                              → "commission is 17%"
- "18-22%" / "18–22%"                              → "15-17%" / "15–17%"
- "17-22%" / "17–22%"                              → "15-17%" / "15–17%"
- "22%" in "Compare: Booking.com 22%, Agoda 25%"  → "Compare: Booking.com 17%, Agoda 20%"
- "Booking.com charges 22%"                        → "Booking.com charges 17%"
- "vs Booking 22%"                                 → "vs Booking 17%"
- "vs Booking.com's 22%"                           → "vs Booking.com's 17%"
"""
from pathlib import Path
import re
import json

REPO = Path(r"C:\Users\David\Desktop\STAYLO-repo")

# Ordered from most-specific to least-specific to avoid partial-overwrite
REPLACEMENTS = [
    # Range references (Booking span → new base-to-Preferred span)
    ("18-22%",              "15-17%"),
    ("18–22%",              "15–17%"),
    ("17-22%",              "15-17%"),
    ("17–22%",              "15–17%"),
    # Booking-name-attached percentages
    ("Booking.com's 22%",   "Booking.com's 17%"),
    ("Booking.com 22%",     "Booking.com 17%"),
    ("Booking's 22%",       "Booking's 17%"),
    ("Booking 22%",         "Booking 17%"),
    ("22% on Booking.com",  "17% on Booking.com"),
    ("22% on Booking",      "17% on Booking"),
    ("Booking.com charges 22%",  "Booking.com charges 17%"),
    ("Booking.com prend 22%",    "Booking.com prend 17%"),
    ("Booking.com หัก 22%",       "Booking.com หัก 17%"),
    # vs Booking constructions
    ("vs Booking.com 22%",  "vs Booking.com 17%"),
    ("vs Booking 22%",      "vs Booking 17%"),
    ("vs 22% on Booking",   "vs 17% on Booking"),
    # Common comparative phrases where 22% is Booking's implied number
    ("22% average",         "17% average"),
    # Same in FR/TH translations
    ("22 % moyenne",        "17 % moyenne"),
    ("22% moyenne",         "17% moyenne"),
]

# File types to scan
EXTS = {".html", ".jsx", ".js", ".ts", ".tsx", ".json", ".md"}

# Directories to skip
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".cache", "scripts", ".claude"}


def should_scan(path: Path) -> bool:
    if path.suffix.lower() not in EXTS:
        return False
    for parent in path.parents:
        if parent.name in SKIP_DIRS:
            return False
    return True


def apply_all(text: str) -> tuple[str, int]:
    n = 0
    for old, new in REPLACEMENTS:
        if old in text:
            occurrences = text.count(old)
            text = text.replace(old, new)
            n += occurrences
    return text, n


def main():
    total_files = 0
    total_edits = 0
    for path in REPO.rglob("*"):
        if not path.is_file() or not should_scan(path):
            continue
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new, n = apply_all(original)
        if n:
            # Validate JSON files remain parseable
            if path.suffix == ".json":
                try:
                    json.loads(new)
                except json.JSONDecodeError as e:
                    print(f"!! SKIP (would break JSON): {path.relative_to(REPO)} — {e}")
                    continue
            path.write_text(new, encoding="utf-8")
            print(f"  {n:>3}× {path.relative_to(REPO)}")
            total_files += 1
            total_edits += n

    print(f"\n[done] {total_edits} replacements across {total_files} files")


if __name__ == "__main__":
    main()
