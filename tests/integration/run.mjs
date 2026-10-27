// Integration test runner.
//   node tests/integration/run.mjs            -> both phases (mock, then btcpay)
//   node tests/integration/run.mjs mock       -> one phase
//
// Each phase: start the Stripe stub, restart the local edge runtime with that
// phase's env file (supabase functions serve), wait until it answers, run the
// node:test files with LIGHTNING_PROVIDER set to the phase name, stop serve.
// Needs `supabase start` to be up. Never touches a remote project.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { startStub } from './stripeStub.mjs'
import { localEnv, repoRoot } from './helpers.mjs'

const PHASES = {
  mock:   { envFile: 'tests/integration/env.mock' },
  btcpay: { envFile: 'tests/integration/env.btcpay' },
}
const wanted = process.argv.slice(2).filter(a => PHASES[a])
const phases = wanted.length ? wanted : Object.keys(PHASES)

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function waitForFunctions(apiUrl, timeoutMs = 180_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`${apiUrl}/functions/v1/checkout`, { method: 'OPTIONS' })
      if (res.status < 500) return
    } catch { /* not up yet */ }
    await sleep(1500)
  }
  throw new Error('edge runtime did not come up in time')
}

function killTree(child) {
  if (process.platform === 'win32') {
    return new Promise(r => spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', r))
  }
  child.kill('SIGTERM')
  return Promise.resolve()
}

function runTests(phase) {
  return new Promise(resolve => {
    // No shell: process.execPath may contain spaces (C:\Program Files\...),
    // and node resolves the glob itself.
    const child = spawn(process.execPath, ['--test', 'tests/integration/*.test.mjs'], {
      cwd: repoRoot, stdio: 'inherit',
      env: { ...process.env, LIGHTNING_PROVIDER: phase },
    })
    child.on('exit', code => resolve(code ?? 1))
  })
}

async function main() {
  const env = localEnv()
  const stub = await startStub(4242)
  let failures = 0
  for (const phase of phases) {
    console.log(`\n=== phase: ${phase} (${PHASES[phase].envFile}) ===`)
    const serve = spawn('supabase', ['functions', 'serve', '--env-file', PHASES[phase].envFile, '--no-verify-jwt'], {
      cwd: repoRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'],
    })
    serve.stdout.on('data', d => process.stdout.write(`[serve] ${d}`))
    serve.stderr.on('data', d => process.stdout.write(`[serve] ${d}`))
    try {
      await sleep(4000)
      await waitForFunctions(env.API_URL)
      const code = await runTests(phase)
      if (code !== 0) failures += 1
    } finally {
      await killTree(serve)
      await sleep(1000)
    }
  }
  stub.close()
  process.exit(failures ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
