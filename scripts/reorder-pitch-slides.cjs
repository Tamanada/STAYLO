#!/usr/bin/env node
/**
 * One-shot script to reorder the slides in pitch.html.
 *
 * Hotelier-first refactor — move investment-heavy slides AFTER the
 * hotelier-value slides. Sasiwimol is a hotelier first; the deck
 * should match her mental order.
 *
 * Mapping (new position → old data-slide number):
 *   new 1  ← old 1  (Cover · already rewritten in place)
 *   new 2  ← old 2  (Pain — OTA fees)
 *   new 3  ← old 5  (10% commission locked — savings)
 *   new 4  ← old 6  (STAYLO Ship — free operational tools)
 *   new 5  ← old 4  (1=1 vote — your protection)
 *   new 6  ← old 3  (Built with hoteliers — the shift)
 *   new 7  ← old 10 (Threshold 500 + Full Moon + flywheel)
 *   new 8  ← old 7  (Alpha share $1,000)
 *   new 9  ← old 8  (Cap table)
 *   new 10 ← old 9  ($STAY token)
 *   new 11 ← old 11 (Phase Roadmap)
 *   new 12 ← old 12 (Close)
 *   new 13 ← old 13 (QR contact)
 *
 * The script:
 *   1. Reads pitch.html
 *   2. Splits it into [header] + [13 sections] + [footer]
 *   3. Reorders the sections per the mapping above
 *   4. Rewrites data-slide="N" and slide-num "N / 13" in each
 *   5. Writes the file back atomically (.tmp + rename)
 *
 * Run from repo root: node scripts/reorder-pitch-slides.cjs
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'public', 'pitch.html');
const NEW_ORDER = [1, 2, 5, 6, 4, 3, 10, 7, 8, 9, 11, 12, 13];

function main() {
  const src = fs.readFileSync(FILE, 'utf8');

  // Find each <section class="slide..."> ... </section> block.
  // Use a state-machine since regex can't handle nested-section-like patterns reliably.
  const sections = [];
  const startRe = /<section class="slide[^"]*" data-slide="(\d+)">/g;
  let m;
  while ((m = startRe.exec(src)) !== null) {
    const start = m.index;
    const num = parseInt(m[1], 10);
    // Find the matching </section> by counting <section open/close tags from this point.
    let depth = 1;
    let pos = startRe.lastIndex;
    const openRe = /<section\b/g;
    const closeRe = /<\/section>/g;
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    while (depth > 0) {
      const o = openRe.exec(src);
      const c = closeRe.exec(src);
      if (!c) throw new Error('Unbalanced <section> for slide ' + num);
      if (o && o.index < c.index) {
        depth++;
        closeRe.lastIndex = o.index + 1;
      } else {
        depth--;
        pos = c.index + '</section>'.length;
        openRe.lastIndex = pos;
        closeRe.lastIndex = pos;
      }
    }
    sections.push({ num, start, end: pos, text: src.slice(start, pos) });
    startRe.lastIndex = pos;
  }

  if (sections.length !== 13) {
    throw new Error(`Expected 13 sections, found ${sections.length}`);
  }
  // Sanity: sections numbered 1..13 exactly once
  const seen = new Set(sections.map(s => s.num));
  for (let i = 1; i <= 13; i++) {
    if (!seen.has(i)) throw new Error('Missing slide ' + i);
  }

  // Header = everything before sections[0].start
  const header = src.slice(0, sections[0].start);
  // Footer = everything after sections[12].end (last section in DOM order)
  const lastEnd = Math.max(...sections.map(s => s.end));
  const footer = src.slice(lastEnd);

  // Build the new ordered list of sections, renumbering data-slide and slide-num.
  const byNum = Object.fromEntries(sections.map(s => [s.num, s]));
  const reordered = NEW_ORDER.map((oldNum, idx) => {
    const newNum = idx + 1;
    let t = byNum[oldNum].text;
    // 1) data-slide attribute
    t = t.replace(/data-slide="\d+"/, `data-slide="${newNum}"`);
    // 2) slide-num divs — handle both styled and unstyled variants
    t = t.replace(
      /(<div class="slide-num"[^>]*>)\s*\d+\s*\/\s*\d+\s*(<\/div>)/g,
      `$1${newNum} / 13$2`
    );
    return t;
  });

  // Stitch the sections back with appropriate separators.
  // The original file uses blank-line + HTML comment + blank-line between sections.
  // We preserve a simple "\n\n" separator and rebuild minimal comments above each.
  const SECTION_TITLES = [
    'COVER — Stop paying 18% to Booking',
    'PAIN — OTA commission bleed',
    '10% COMMISSION LOCKED — your savings',
    'STAYLO SHIP — free operational toolkit',
    '1 PROPERTY = 1 VOTE — your protection',
    'THE SHIFT — built with hoteliers, owned by hoteliers',
    'THRESHOLD 500 — launch + ambassador flywheel',
    'ALPHA SHARE $1,000 — how you join',
    'CAP TABLE — where you sit',
    '$STAY TOKEN — long-term reward',
    'PHASE ROADMAP — what comes after hotels',
    'THE ASK / CLOSE',
    'QR / CONTACT',
  ];

  const stitched = reordered
    .map((s, i) => {
      const banner =
        '<!-- ================================================================\n' +
        `     SLIDE ${i + 1} — ${SECTION_TITLES[i]}\n` +
        '     ================================================================ -->';
      return banner + '\n' + s;
    })
    .join('\n\n');

  const out = header + stitched + footer;

  // Atomic write
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, out, 'utf8');
  fs.renameSync(tmp, FILE);

  // Quick verification
  const verify = fs.readFileSync(FILE, 'utf8');
  const slides = [...verify.matchAll(/data-slide="(\d+)"/g)].map(x => parseInt(x[1]));
  console.log('After reorder, data-slide sequence:', slides.join(','));
  if (slides.join(',') !== '1,2,3,4,5,6,7,8,9,10,11,12,13') {
    throw new Error('Verification FAILED — data-slide sequence is not 1..13');
  }
  console.log('✓ pitch.html reordered hotelier-first');
}

main();
