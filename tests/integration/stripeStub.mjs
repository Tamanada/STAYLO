// Minimal Stripe API stand-in for integration tests. Records every request so
// a test can assert what the Edge Function would have sent to Stripe
// (unit_amount, metadata) without any network call or real key.
//
// The Edge Functions reach it through STRIPE_API_BASE (see _shared/stripe.ts),
// set to http://host.docker.internal:4242/v1 in tests/integration/env.*.
import http from 'node:http'

function setDeep(obj, key, value) {
  // "a[b][0][c]" -> obj.a.b[0].c
  const parts = key.replace(/\]/g, '').split('[')
  let cur = obj
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (i === parts.length - 1) { cur[p] = value; return }
    if (cur[p] === undefined) cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {}
    cur = cur[p]
  }
}

export function parseForm(text) {
  const out = {}
  for (const [k, v] of new URLSearchParams(text)) setDeep(out, k, v)
  return out
}

export function startStub(port = 4242) {
  const calls = []
  let n = 0
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', c => { raw += c })
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      if (req.url === '/__calls' && req.method === 'GET') return send(200, calls)
      if (req.url === '/__calls' && req.method === 'DELETE') { calls.length = 0; return send(200, { ok: true }) }

      const body = raw ? parseForm(raw) : {}
      calls.push({
        method: req.method, path: req.url, body,
        authorization: req.headers.authorization ? 'present' : 'missing',
        idempotencyKey: req.headers['idempotency-key'] ?? null,
      })

      // Payment intent lookup, delayed so that concurrent release-escrow runs
      // overlap on the Stripe step (that is where the race in finding #4 lives).
      const pi = req.url.match(/^\/v1\/payment_intents\/([^/?]+)$/)
      if (req.method === 'GET' && pi) {
        setTimeout(() => send(200, { id: pi[1], status: 'succeeded', latest_charge: `ch_stub_${pi[1]}` }), 400)
        return
      }

      if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
        n += 1
        const id = `cs_test_stub_${n}`
        return send(200, { id, url: `https://checkout.stripe.test/${id}`, payment_intent: null, metadata: body.metadata ?? {} })
      }
      if (req.method === 'POST' && req.url === '/v1/transfers') {
        n += 1
        return send(200, { id: `tr_test_stub_${n}`, amount: Number(body.amount), currency: body.currency, destination: body.destination })
      }
      return send(200, { id: 'stub', object: 'unknown' })
    })
  })
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '0.0.0.0', () => resolve(server))
  })
}

if (process.argv[1] && process.argv[1].endsWith('stripeStub.mjs')) {
  startStub(Number(process.env.STUB_PORT ?? 4242)).then(() => console.log('stripe stub listening on 4242'))
}
