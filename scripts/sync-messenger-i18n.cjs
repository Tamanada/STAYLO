#!/usr/bin/env node
/**
 * sync-messenger-i18n.cjs
 * --------------------------------------------------------------------
 * Mirrors the i18n JSON bundles from src/i18n/*.json (the canonical
 * source used by staylo.app via i18next's static `import()`) into
 * public/i18n/*.json (so the messenger, served as a static asset under
 * /messenger.html, can fetch them at runtime).
 *
 * Why this exists:
 *   - staylo.app (React) imports each language JSON statically, so the
 *     i18n bundles get baked into the JS chunks at build time. They are
 *     NOT accessible via fetch at runtime in production.
 *   - The messenger is a single-file HTML app that fetches its language
 *     bundles at runtime (`fetch('/i18n/{lang}.json')`).
 *   - We keep src/i18n/ as the single source of truth and copy into
 *     public/i18n/ on every build. Public is served verbatim by Vercel.
 *
 * Wired as `prebuild` in package.json so `npm run build` always re-syncs.
 * Run manually with: `node scripts/sync-messenger-i18n.cjs`
 * --------------------------------------------------------------------
 */
const fs   = require('fs');
const path = require('path');

const SRC_DIR  = path.join(__dirname, '..', 'src', 'i18n');
const DEST_DIR = path.join(__dirname, '..', 'public', 'i18n');

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[sync-messenger-i18n] Source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('[sync-messenger-i18n] No JSON files in src/i18n.');
    process.exit(1);
  }

  let copied = 0;
  let skipped = 0;
  for (const file of files) {
    const src  = path.join(SRC_DIR,  file);
    const dest = path.join(DEST_DIR, file);
    const srcBuf  = fs.readFileSync(src);
    let destBuf = null;
    try { destBuf = fs.readFileSync(dest); } catch { /* dest absent */ }

    // Skip the copy if dest already exists AND is byte-identical — keeps
    // mtimes stable so unrelated tools (file watchers, CI cache busters)
    // don't trigger on a no-op sync.
    if (destBuf && destBuf.equals(srcBuf)) {
      skipped++;
      continue;
    }
    fs.writeFileSync(dest, srcBuf);
    copied++;
  }

  console.log(
    `[sync-messenger-i18n] ${copied} file${copied === 1 ? '' : 's'} copied` +
    (skipped > 0 ? `, ${skipped} unchanged` : '') +
    ` (src/i18n → public/i18n).`
  );
}

main();
