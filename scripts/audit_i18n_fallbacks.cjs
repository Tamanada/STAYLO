#!/usr/bin/env node
/**
 * audit_i18n_fallbacks.cjs
 * -----------------------------------------------------------------------
 * Scans all `t('namespace.key', 'fallback text')` calls across the source
 * and reports which keys are missing in en/fr/th — the situations where
 * a user in FR or TH will see the hardcoded English fallback string
 * instead of a real translation.
 *
 * Categories:
 *   CAT-A : key missing in FR AND TH
 *   CAT-B : key missing in FR only
 *   CAT-C : key missing in TH only
 *   CAT-D : key missing in EN too (defined nowhere — likely dev oversight)
 *
 * Usage:
 *   node scripts/audit_i18n_fallbacks.cjs
 *
 * Writes a detailed JSON report to scripts/i18n_audit_findings.json and
 * prints a summary to stdout.
 * -----------------------------------------------------------------------
 */
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIRS   = [path.join(ROOT, 'src')];
const EXTRA_FILES = [path.join(ROOT, 'public', 'messenger.html')];

const I18N_DIR = path.join(ROOT, 'src', 'i18n');
const LANGS = ['en', 'fr', 'th'];

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasKey(tree, dotted) {
  const parts = dotted.split('.');
  let cur = tree;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur) && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return false;
    }
  }
  return typeof cur === 'string';
}

// Regex variants — try the simpler ones first
// 1) t('ns.key', 'fallback' …)
const RE_T_STR = /(?<![A-Za-z_$.])t\(\s*['"]([^'"\n]+)['"]\s*,\s*(['"])((?:[^\\]|\\.)*?)\2/gs;
// 2) t('key', { defaultValue: 'fallback' }) or t('key', { default: 'fallback' })
const RE_T_OBJ = /(?<![A-Za-z_$.])t\(\s*['"]([^'"\n]+)['"]\s*,\s*\{[^}]*?default(?:Value)?\s*:\s*(['"])((?:[^\\]|\\.)*?)\2/gs;

function* walkFiles() {
  function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        yield* walk(full);
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        yield full;
      }
    }
  }
  for (const root of SRC_DIRS) if (fs.existsSync(root)) yield* walk(root);
  for (const f of EXTRA_FILES) if (fs.existsSync(f)) yield f;
}

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const out = [];
  for (const rx of [RE_T_STR, RE_T_OBJ]) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(text)) !== null) {
      const key = m[1];
      const fb  = m[3];
      out.push({ key, fb, line: lineOf(text, m.index) });
    }
  }
  return out;
}

function isMeaningful(s) {
  if (!s) return false;
  if (s.length < 4) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  return true;
}

function main() {
  const json = {};
  for (const lang of LANGS) {
    json[lang] = loadJson(path.join(I18N_DIR, `${lang}.json`));
  }

  const occurrences = [];
  let totalCalls = 0;
  const perFileCount = {};

  for (const fp of walkFiles()) {
    const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    const matches = scanFile(fp);
    for (const { key, fb, line } of matches) {
      totalCalls++;
      if (!isMeaningful(fb)) continue;
      const inEn = hasKey(json.en, key);
      const inFr = hasKey(json.fr, key);
      const inTh = hasKey(json.th, key);
      if (inEn && inFr && inTh) continue;
      let cat;
      if (!inEn) cat = 'D';
      else if (!inFr && !inTh) cat = 'A';
      else if (!inFr) cat = 'B';
      else cat = 'C';
      occurrences.push({ file: rel, line, key, fb, cat, inEn, inFr, inTh });
      perFileCount[rel] = (perFileCount[rel] || 0) + 1;
    }
  }

  // Dedup by key
  const byKey = new Map();
  for (const o of occurrences) {
    if (!byKey.has(o.key)) byKey.set(o.key, { cat: o.cat, fb: o.fb, locations: [] });
    byKey.get(o.key).locations.push(`${o.file}:${o.line}`);
  }
  const cats = { A: [], B: [], C: [], D: [] };
  for (const [k, v] of byKey) cats[v.cat].push(k);

  console.log('=== AUDIT i18n fallback ===\n');
  console.log(`Total t() calls scanned:        ${totalCalls}`);
  console.log(`Findings (occurrences):         ${occurrences.length}`);
  console.log(`Unique buggy keys:              ${byKey.size}\n`);
  for (const c of ['A', 'B', 'C', 'D']) console.log(`CAT-${c}: ${cats[c].length} unique keys`);
  console.log();
  console.log('Top files by finding count:');
  Object.entries(perFileCount).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([f, n]) => {
    console.log(`  ${String(n).padStart(4)}  ${f}`);
  });

  // Write detail
  const out = path.join(__dirname, 'i18n_audit_findings.json');
  const report = {
    summary: {
      total_calls: totalCalls,
      occurrence_findings: occurrences.length,
      unique_buggy_keys: byKey.size,
      cat_A: cats.A.length, cat_B: cats.B.length, cat_C: cats.C.length, cat_D: cats.D.length,
    },
    by_key: {},
    per_file: Object.fromEntries(Object.entries(perFileCount).sort((a, b) => b[1] - a[1])),
  };
  for (const [k, v] of byKey) report.by_key[k] = v;
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nDetailed findings written to: ${path.relative(ROOT, out)}`);
}

main();
