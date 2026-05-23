#!/usr/bin/env node
/**
 * consolidate_i18n_fallbacks.cjs
 * --------------------------------------------------------------------
 * Reads `scripts/i18n_audit_findings.json` (output of
 * audit_i18n_fallbacks.cjs) and merges every missing key into the
 * three i18n JSON bundles (en, fr, th).
 *
 * Strategy:
 *   - en.json receives the original inline EN fallback as the value.
 *     This consolidates the "definition by inline fallback" antipattern
 *     into proper i18n keys.
 *   - fr.json and th.json receive the same EN value as a placeholder
 *     marked with a leading "⟦TODO⟧ " prefix so they're easy to grep
 *     and replace with real translations later.
 *
 * Why placeholder in fr/th?
 *   Two options were considered:
 *     (a) Leave fr/th missing → i18next falls back to en.json, which
 *         falls back to the inline fallback. FR/TH users see EN. Same
 *         bug as today.
 *     (b) Insert EN value (no marker) → indistinguishable from a real
 *         translation. Translators can't tell which keys still need work.
 *     (c) Insert EN value with "⟦TODO⟧ " prefix → translators (humans
 *         or AI) can grep this marker and replace systematically. The
 *         marker is visible in FR/TH renders too, which is intentional:
 *         it makes pending translation work UNAVOIDABLE during review,
 *         instead of silently rendering EN where FR should be.
 *
 * Run: `node scripts/consolidate_i18n_fallbacks.cjs`
 *      (also exposed as `npm run i18n:consolidate` if added to package.json)
 *
 * Idempotent: re-running won't overwrite keys that already exist in a
 * given locale — only inserts truly missing entries.
 * --------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FINDINGS = path.join(ROOT, 'scripts', 'i18n_audit_findings.json');
const LOCALES = ['en', 'fr', 'th'];
const TODO_PREFIX = '⟦TODO⟧ ';     // visible marker in FR/TH renders

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function saveJson(p, obj) {
  // Preserve indentation = 2 spaces (matches existing files)
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

/** Insert a value at a dotted-path inside `bundle`, creating intermediate
 *  objects if needed. Returns true if a new value was inserted, false if
 *  the path already had a value (idempotent — never overwrite). */
function insertAtPath(bundle, dottedPath, value) {
  const parts = dottedPath.split('.');
  const leaf = parts.pop();
  let cur = bundle;
  for (const p of parts) {
    if (typeof cur[p] !== 'object' || cur[p] === null) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  if (leaf in cur) return false;     // already defined, leave alone
  cur[leaf] = value;
  return true;
}

function main() {
  if (!fs.existsSync(FINDINGS)) {
    console.error(`[consolidate] Findings file not found at ${FINDINGS}`);
    console.error(`[consolidate] Run \`node scripts/audit_i18n_fallbacks.cjs\` first.`);
    process.exit(1);
  }

  const findings = loadJson(FINDINGS);
  const byKey = findings.by_key || {};
  const keys = Object.keys(byKey);

  if (keys.length === 0) {
    console.log('[consolidate] No findings to process. All good.');
    return;
  }

  console.log(`[consolidate] ${keys.length} missing keys to merge into en/fr/th.\n`);

  const stats = { en: 0, fr: 0, th: 0, skipped: { en: 0, fr: 0, th: 0 } };

  for (const locale of LOCALES) {
    const p = path.join(ROOT, 'src', 'i18n', `${locale}.json`);
    const bundle = loadJson(p);
    for (const key of keys) {
      const meta = byKey[key];
      const enValue = meta.fb;
      const valueToInsert = (locale === 'en') ? enValue : TODO_PREFIX + enValue;
      const inserted = insertAtPath(bundle, key, valueToInsert);
      if (inserted) stats[locale]++; else stats.skipped[locale]++;
    }
    saveJson(p, bundle);
    console.log(`  ${locale}.json: +${stats[locale]} inserted, ${stats.skipped[locale]} skipped (already existed)`);
  }

  console.log(`\n[consolidate] Done. Run \`node scripts/sync-messenger-i18n.cjs\` to mirror to public/i18n/.`);
  console.log(`[consolidate] Grep \`${TODO_PREFIX}\` in fr.json / th.json to find translations needing review.`);
}

main();
