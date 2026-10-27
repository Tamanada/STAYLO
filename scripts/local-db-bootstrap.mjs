// Build the LOCAL test database from the repo: supabase_schema.sql (the base
// schema that predates the migrations folder) + every file in
// supabase/migrations in file-name order, one transaction per file.
//
// Why not `supabase migration up`? Two things in the repo do not replay as-is:
//   - supabase_schema.sql already creates policies that 20260301 re-creates;
//   - 20260813000001a_... is skipped by the CLI (its name is off-pattern) but
//     was applied in production by hand, and later migrations depend on it.
// Local compensations are listed in LOCAL_FIXES, applied before the migration
// they unblock. They are local-only: production already has these objects.
//
// Usage:  node scripts/local-db-bootstrap.mjs            (needs `supabase start`)
// Safety: refuses any DB_URL that is not 127.0.0.1 / localhost.
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTAINER = process.env.STAYLO_DB_CONTAINER ?? 'supabase_db_staylo'

// SQL run right before the named migration (or before all when key = '*').
const LOCAL_FIXES = {
  '20260301000000_security_fixes.sql': [
    // created by supabase_schema.sql, re-created (same name) by this migration
    'DROP POLICY IF EXISTS "Users can read own profile" ON public.users;',
    'DROP POLICY IF EXISTS "Users can read own shares" ON public.shares;',
    'DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;',
  ],
}

// Migrations present in the repo but NEVER applied in production (verified
// 2026-10-27 on the linked project, read-only: no user_profiles, no
// staylo_points, no award_staylo_points, booking_guests without the bridge
// columns). The local database mirrors production, so they are skipped.
// Recorded as a drift finding in guardian/reports.
const NOT_IN_PRODUCTION = new Set([
  '20260602000000_checkin_v2_and_engagement.sql',
  '20260603000000_checkin_v2_bridge.sql',
  '20260604010000_voucher_auto_issue.sql',   // no issue_vouchers_for_booking() and no trigger in production
])

// Text replacements applied to a migration before it runs, where production
// holds a different definition than the repo file (verified on pg_policies).
const LOCAL_PATCHES = {
  '20260604000000_guest_vouchers_v1.sql': [[
    // Production policy "Guest reads own vouchers" has only the bookings
    // clause; the roommate clause needs booking_guests.user_id, which does
    // not exist in production (20260603 never applied).
    /\s+OR\s+-- Roommates with a STAYLO account can also see the booking's vouchers\.\s+EXISTS \(\s+SELECT 1 FROM public\.booking_guests bg\s+WHERE bg\.booking_id = guest_vouchers\.booking_id\s+AND bg\.user_id = auth\.uid\(\)\s+\)/,
    '',
  ]],
}

function dbUrl() {
  const out = execSync('supabase status -o env', { cwd: root, encoding: 'utf8' })
  const m = out.match(/^DB_URL="?([^"\r\n]+)"?/m)
  if (!m) throw new Error('DB_URL not found in `supabase status -o env`')
  if (!/@(127\.0\.0\.1|localhost):/.test(m[1])) throw new Error(`Refusing non-local DB_URL ${m[1]}`)
  return m[1]
}

function psql(sql, { file = false } = {}) {
  const args = ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q']
  if (file) args.push('-1')
  const r = spawnSync('docker', args, { input: sql, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
  return r.stdout
}

function applied() {
  const out = psql(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);
COPY (SELECT version FROM supabase_migrations.schema_migrations) TO STDOUT;`)
  return new Set(out.split(/\r?\n/).filter(Boolean))
}

function main() {
  dbUrl()  // local check
  const done = applied()

  const hasBase = psql(`COPY (SELECT to_regclass('public.properties') IS NOT NULL) TO STDOUT;`).trim() === 't'
  if (!hasBase) {
    console.log('applying supabase_schema.sql (base schema)')
    psql(fs.readFileSync(path.join(root, 'supabase_schema.sql'), 'utf8'), { file: true })
  } else {
    console.log('base schema already present')
  }

  const dir = path.join(root, 'supabase', 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  let count = 0
  for (const f of files) {
    const version = f.split('_')[0]
    if (done.has(version)) continue
    if (NOT_IN_PRODUCTION.has(f)) { console.log(`skipping ${f} (not applied in production)`); continue }
    for (const fix of LOCAL_FIXES[f] ?? []) {
      console.log(`  local fix before ${f}: ${fix}`)
      psql(fix)
    }
    process.stdout.write(`applying ${f} ... `)
    try {
      let sql = fs.readFileSync(path.join(dir, f), 'utf8')
      for (const [from, to] of LOCAL_PATCHES[f] ?? []) {
        if (!from.test(sql)) throw new Error(`local patch for ${f} no longer matches`)
        sql = sql.replace(from, to)
        console.log(`
  local patch applied to ${f}`)
      }
      psql(sql, { file: true })
    } catch (err) {
      console.log('FAILED')
      console.error(String(err.message).split('\n').slice(0, 12).join('\n'))
      process.exit(1)
    }
    psql(`INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${f.replace(/'/g, "''")}') ON CONFLICT DO NOTHING;`)
    console.log('ok')
    count += 1
  }
  console.log(`done: ${count} migration(s) applied, ${files.length} in repo`)
}

main()
