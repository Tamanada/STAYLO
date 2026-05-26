#!/usr/bin/env node
/**
 * audit_i18n_raw_strings.cjs
 * -----------------------------------------------------------------------
 * The COMPANION audit to audit_i18n_fallbacks.cjs.
 *
 * Where the fallback-audit catches t('key', 'fallback') with missing
 * keys, THIS audit catches the WORSE bug: raw English strings dumped
 * straight into JSX with NO t() call at all. Example from Submit.jsx
 * before we i18n'd it:
 *
 *   <h2>Basic Information</h2>          ← no t(), invisible to fallback audit
 *
 * Strategy:
 *   - Walk every .jsx file under src/
 *   - For each `<Tag>TEXT</Tag>` pattern, extract TEXT
 *   - Heuristic: TEXT is "English" if
 *       · ≥ 4 characters
 *       · contains at least one alphabetic letter
 *       · starts with a capital letter OR contains a common English word
 *         (the, and, of, you, our, your, with, for, this, that, will, can,
 *          all, more, less, see, get, set, click, tap)
 *       · is NOT wrapped in {t(...)} (we check the surrounding chars)
 *       · is NOT a CSS class / style / number / single emoji
 *
 *   - Group findings by file + line, sorted by file finding count.
 *
 * Heuristic is intentionally loose: better to flag a false positive
 * (which a human dismisses in 2 seconds) than to miss a real one.
 *
 * Usage:
 *   node scripts/audit_i18n_raw_strings.cjs
 *
 * Writes a detailed JSON report to scripts/i18n_raw_strings_findings.json
 * + prints a summary to stdout.
 * -----------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [path.join(ROOT, 'src')];
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', 'i18n'];

// Common English signals — if a candidate contains any of these as a whole
// word, we treat it as English-likely. Tuned for hospitality/SaaS copy.
const ENGLISH_SIGNALS = new Set([
  'the','and','of','you','your','our','with','for','this','that','will','can',
  'all','more','less','see','get','set','from','have','has','book','room',
  'guest','stay','host','add','new','save','edit','delete','open','close',
  'sign','log','create','start','make','join','share','find','search','select',
  'price','night','date','time','name','email','phone','website','description',
  'amenity','feature','service','option','please','before','after','here',
  'now','today','tomorrow','yesterday','week','month','year','property',
  'booking','payment','check','need','any','some','what','how','why','when',
  'where','who','no','yes','tap','click',
]);

// Brand terms / known proper nouns — these MUST not trigger "English" flag.
// (Names, brand words, currency codes, technical identifiers.)
const SKIP_TOKENS = new Set([
  'STAYLO','Staylo','staylo','Booking.com','Agoda','Airbnb','Expedia',
  'TAT','DBD','LOI','PMS','OTA','PWA','DAO','DEX','SPL','TGE','FDV',
  'BTC','Bitcoin','Solana','Lightning','Stripe','Resend','Supabase',
  'Vercel','Raydium','Wall','Street','Wallet','Satoshi','Realms',
  'David','Deveaux','Barokat','Halal','Sasiwimol','Koh','Phangan',
  'Thailand','Thaïlande','Singapore','Singapour','France','APAC',
  'Founding','Partner','Ambassador','Founder','Investor','Hotelier',
  'WiFi','Wi-Fi','Google','Maps','GPS','URL','ID','VIP','THB','USD','EUR',
]);

const FILE_REGEX = /\.(jsx|tsx|js|ts)$/;

// Capture: tag-content patterns that look like "<Foo>Text here</Foo>"
// We also capture `>...<` pairs that span multiple tags (e.g. between a
// closing tag and the next opening one in the same JSX expression).
// The captured text MUST start with a capital letter (English convention)
// OR contain whitespace + a recognizable English word.
const PATTERNS = [
  // <Tag>Text</Tag> — text right after >, before <
  /(?<![{])>(\s*[A-Z][a-zA-Z0-9 ,.'\-?!&:;()/]{3,}?)\s*<(?!\/?\$)/g,
  // label="Text" / placeholder="Text" / title="Text" / aria-label="Text"
  /(label|placeholder|title|aria-label)\s*=\s*['"]([A-Z][a-zA-Z0-9 ,.'\-?!&:;()/]{3,})['"]/g,
];

function shouldSkipDir(name) {
  return EXCLUDE_DIRS.includes(name) || name.startsWith('.');
}

function listFiles(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!shouldSkipDir(ent.name)) listFiles(path.join(dir, ent.name), acc);
    } else if (ent.isFile() && FILE_REGEX.test(ent.name)) {
      acc.push(path.join(dir, ent.name));
    }
  }
  return acc;
}

function looksEnglish(text) {
  const trimmed = text.trim();
  if (trimmed.length < 4) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  // Tokenize, lowercase, strip punctuation
  const tokens = trimmed
    .replace(/[^a-zA-Z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.toLowerCase());
  if (tokens.length === 0) return false;
  // Strict: if EVERY token is a brand/skip token, it's NOT English text.
  const allSkip = tokens.every(t => SKIP_TOKENS.has(t) || /^[A-Z]+$/.test(t.toUpperCase()) && t.length <= 4);
  if (allSkip) return false;
  // If any token matches the English signal set → flag as English.
  for (const tok of tokens) {
    if (ENGLISH_SIGNALS.has(tok)) return true;
  }
  // Fallback: if the string starts with a capital letter and has at least
  // one space (= sentence-like), flag it. Tuned to catch UI labels like
  // "Order Refills" or "Verify your email first".
  if (/^[A-Z][a-z]/.test(trimmed) && /\s/.test(trimmed)) return true;
  return false;
}

function isWrappedInT(line, matchStart) {
  // Look backwards in the line: if we find "t(" between the previous `{` and
  // our match, it's wrapped. (Crude but works for the common JSX patterns.)
  const before = line.slice(0, matchStart);
  const lastOpenBrace = before.lastIndexOf('{');
  if (lastOpenBrace < 0) return false;
  const span = before.slice(lastOpenBrace);
  // The text we matched might be the FALLBACK in t('key', 'text') — those
  // are caught by audit_i18n_fallbacks.cjs, not us. Skip them.
  return /\bt\s*\(/.test(span);
}

function scanFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const findings = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip import lines, comments, lines with no JSX-ish content
    if (/^\s*(import|export|from|\/\/|\/\*|\*)/.test(line)) return;

    for (const re of PATTERNS) {
      // Reset regex state for each line (it's global)
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        // For both patterns, the captured group with the actual text is the
        // LAST one (group 1 for the >Text< pattern, group 2 for the attr pattern).
        const text = (m.length > 2 ? m[2] : m[1] || '').trim();
        if (!text) continue;
        if (!looksEnglish(text)) continue;
        if (isWrappedInT(line, m.index)) continue;

        findings.push({ line: lineNum, text, raw: line.trim().slice(0, 200) });
      }
    }
  });

  return { file: rel, findings };
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) listFiles(d, files);

  const all = [];
  for (const f of files) {
    const res = scanFile(f);
    if (res.findings.length) all.push(res);
  }

  all.sort((a, b) => b.findings.length - a.findings.length);

  const total = all.reduce((s, r) => s + r.findings.length, 0);
  const filesAffected = all.length;

  console.log('=== AUDIT i18n raw strings ===\n');
  console.log(`Files scanned : ${files.length}`);
  console.log(`Files flagged : ${filesAffected}`);
  console.log(`Total findings: ${total}\n`);

  console.log('Top files (by raw-string count):');
  for (const r of all.slice(0, 25)) {
    console.log(`  ${String(r.findings.length).padStart(4)}  ${r.file}`);
  }

  // Sample 5 findings from the top file so the user has a flavor of the bug
  if (all[0]) {
    console.log(`\nSample (first 5 from ${all[0].file}):`);
    for (const f of all[0].findings.slice(0, 5)) {
      console.log(`  L${f.line}  "${f.text}"`);
    }
  }

  const outPath = path.join(ROOT, 'scripts', 'i18n_raw_strings_findings.json');
  fs.writeFileSync(outPath, JSON.stringify({
    summary: { files_scanned: files.length, files_flagged: filesAffected, total },
    by_file: all,
  }, null, 2));
  console.log(`\nDetailed JSON written to: scripts/i18n_raw_strings_findings.json`);
}

main();
