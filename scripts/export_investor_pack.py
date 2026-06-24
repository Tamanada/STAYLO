"""
Export the complete investor pack to a desktop folder as a self-contained
offline bundle. Converts absolute paths (/STAYLO_logo.png) to relative
paths so the HTML files open correctly via file:// or USB key sharing.
"""
import re
import shutil
from pathlib import Path

REPO = Path(r"C:\Users\David\Desktop\STAYLO-repo")
DEST = Path(r"C:\Users\David\Desktop\INVESTORS docs OFFICIAL JUNE 2026")

# Investor docs (8 files in investors/) + 3 pitch decks
INVESTOR_DOCS = [
    "investors/index.html",
    "investors/one-pager.html",
    "investors/executive-summary.html",
    "investors/whitepaper.html",
    "investors/term-sheet.html",
    "investors/cap-table.html",
    "investors/projection-36m.html",
    "investors/dossier-strategique.html",
    "investors/valuation-rationale.html",
]
PITCH_DECKS = [
    "pitch.html",
    "pitch-hotelier.html",
    "pitch-crypto.html",
]

# Assets referenced by the HTML files
ASSETS = [
    "STAYLO_logo.png",
    "SHIP_LOGO.png",
    "bannerSTAYLO.png",
    "bitcoin-logo.svg",
    "staylo-kp-emblem.svg",
    "favicon.svg",
]


def fix_paths(html_text, depth=0):
    """Convert absolute /asset.ext paths to relative paths.
    depth=0 means file is at root of dest (just the filename).
    depth=1 means file is one folder deep (e.g. investors/) so ../asset.
    """
    prefix = "../" * depth
    # Match /something.ext (no leading dots, no nested folder beyond root assets)
    # Also handle url-encoded spaces just in case.
    replacements = [
        ('src="/STAYLO_logo.png"', f'src="{prefix}STAYLO_logo.png"'),
        ('src="/SHIP_LOGO.png"', f'src="{prefix}SHIP_LOGO.png"'),
        ('src="/bannerSTAYLO.png"', f'src="{prefix}bannerSTAYLO.png"'),
        ('src="/bitcoin-logo.svg"', f'src="{prefix}bitcoin-logo.svg"'),
        ('src="/staylo-kp-emblem.svg"', f'src="{prefix}staylo-kp-emblem.svg"'),
        ('href="/favicon.svg"', f'href="{prefix}favicon.svg"'),
        # i18n bundles & other paths kept as-is (most docs are self-contained)
    ]
    for old, new in replacements:
        html_text = html_text.replace(old, new)
    return html_text


def main():
    # Wipe & recreate the destination folder
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    # Create investors subfolder
    (DEST / "investors").mkdir()

    # Copy and fix-paths the investor docs (in investors/ subfolder — depth 1)
    for rel in INVESTOR_DOCS:
        src = REPO / "public" / rel
        if not src.exists():
            print(f"!! missing: {rel}")
            continue
        html = src.read_text(encoding="utf-8")
        html = fix_paths(html, depth=1)
        out = DEST / rel
        out.write_text(html, encoding="utf-8")
        print(f"OK  {rel}")

    # Copy and fix-paths the pitch decks (at root — depth 0)
    for rel in PITCH_DECKS:
        src = REPO / "public" / rel
        if not src.exists():
            print(f"!! missing: {rel}")
            continue
        html = src.read_text(encoding="utf-8")
        html = fix_paths(html, depth=0)
        out = DEST / rel
        out.write_text(html, encoding="utf-8")
        print(f"OK  {rel}")

    # Copy assets at the root of the dest folder
    for asset in ASSETS:
        src = REPO / "public" / asset
        if not src.exists():
            print(f"-- skip asset (not found): {asset}")
            continue
        shutil.copy2(src, DEST / asset)
        print(f"OK  asset: {asset}")

    # Write a README
    readme = """STAYLO — Official Investor Pack — June 2026
==================================================

Tag: pre-seed round · $250K-$500K · $5M post-money cap · close Q4 2026
Source of truth: github.com/Tamanada/STAYLO (commit pinned at export time)
Tagline: "Built with hoteliers, for hoteliers."

CONTENT
-------

PITCH DECKS (at folder root — 1280x720 slides, navigate with arrow keys)
- pitch.html             : main investor deck (14 slides, editorial)
- pitch-hotelier.html    : hotelier-facing deck (10 slides)
- pitch-crypto.html      : Bitcoin-native pre-seed angle (12 slides)

INVESTOR DOCS (in /investors/ — A4 portrait or landscape, browser-printable)
- index.html             : data room landing (8-tile navigator)
- one-pager.html         : 1-page brief · first-touch
- executive-summary.html : 1-page dense · for investment committees
- whitepaper.html        : 2 pages · $STAY token mechanics, halving, governance
- term-sheet.html        : 1 page · non-binding pre-seed terms
- cap-table.html         : A4 landscape · 500K shares / 4 cat + commission split + $STAY TGE
- projection-36m.html    : A4 landscape · Q3 2026 -> Q2 2029 financial trajectory
- dossier-strategique.html : 2 pages · vision, GTM, moat, risk, team
- valuation-rationale.html : 2 pages · multi-method defense of $5M cap

ASSETS (logos & banners — referenced by the HTMLs)
- STAYLO_logo.png        : primary brand wordmark tile
- SHIP_LOGO.png          : STAYLO Ship (hotelier OS) logo
- bannerSTAYLO.png       : worldwide network banner (final slide of decks)

HOW TO PRINT TO PDF
-------------------
Open any HTML in Chrome/Edge -> Ctrl+P -> "Save as PDF" -> Layout:
- Portrait for A4 docs (default)
- Landscape for cap-table, projection-36m, and pitch one-pager landscape variants
Set margins to "None" and check "Background graphics" for the dark KPI strips
to render correctly.

For pitch decks (slide format 1280x720): print landscape, no margins, hide
headers/footers.

HOW TO SHARE
------------
- Live URLs: https://www.staylo.app/investors/<filename>.html
- Or zip this folder and share via Drive / email — all references are local

CONTACT
-------
David Deveaux · Founder · President a vie
david@staylo.app · staylo.app · Koh Phangan, Thailand

Confidential. Not an offer to sell securities.
Consult legal counsel before investing.
"""
    (DEST / "README.txt").write_text(readme, encoding="utf-8")
    print("OK  README.txt")

    print(f"\n[done] Exported to: {DEST}")
    print(f"       {len(INVESTOR_DOCS)} investor docs + {len(PITCH_DECKS)} pitch decks + {len(ASSETS)} assets + README")


if __name__ == "__main__":
    main()
