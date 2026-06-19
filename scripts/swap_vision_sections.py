"""
Swap the v-bitcoin and v-invest sections in src/pages/Vision.jsx.
After swap: Investment Goes appears BEFORE Bitcoin at the Core (Alpha
section stays in between since it's between bitcoin and invest in the file).
"""
import re
from pathlib import Path

VISION = Path(r"C:\Users\David\Desktop\STAYLO-repo\src\pages\Vision.jsx")

# Bitcoin block: from "{/* Bitcoin Strategy */}" comment up to and including its </section>
BTC_START = "      {/* Bitcoin Strategy */}"
BTC_END = '      </section>\n\n      {/* Live Share Counter'

# Invest block: from "{/* Fund Allocation — Founders" comment up to and including its </section>
INV_START = "      {/* Fund Allocation — Founders"
INV_END = '      </section>\n\n      {/* Roadmap'


def extract(text, start_marker, end_anchor):
    """Extract from start_marker through the </section> right before end_anchor."""
    s = text.find(start_marker)
    if s == -1:
        raise RuntimeError(f"start not found: {start_marker[:40]}")
    e_anchor = text.find(end_anchor, s)
    if e_anchor == -1:
        raise RuntimeError(f"end anchor not found: {end_anchor[:40]}")
    # We want to include the </section>\n that's part of the block (before the next-section comment)
    # end_anchor starts with "      </section>\n\n      {/* ..."
    # The block ends after "</section>\n" — that's 16+1 = 17 chars in.
    block_end = e_anchor + len("      </section>\n")
    return text[s:block_end], s, block_end


def main():
    text = VISION.read_text(encoding="utf-8")

    btc_block, btc_s, btc_e = extract(text, BTC_START, BTC_END)
    inv_block, inv_s, inv_e = extract(text, INV_START, INV_END)

    # Sanity: btc must come before inv
    assert btc_s < inv_s, "btc should appear before inv in source"

    # Build new text: ...[before btc][inv_block]<middle>[btc_block]...[after inv]
    # The "<middle>" is what's between btc_end and inv_start (i.e., the Alpha section + comments)
    middle = text[btc_e:inv_s]

    new_text = (
        text[:btc_s]
        + inv_block
        + middle
        + btc_block
        + text[inv_e:]
    )

    VISION.write_text(new_text, encoding="utf-8")
    print(f"OK swapped — bitcoin block ({len(btc_block)} bytes) ↔ invest block ({len(inv_block)} bytes)")
    print(f"File size: {len(text)} -> {len(new_text)} bytes (delta should be ~0)")


if __name__ == "__main__":
    main()
