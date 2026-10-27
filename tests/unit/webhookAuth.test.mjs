// Signature checks of supabase/functions/_shared/webhookAuth.ts (pure, Web Crypto).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  verifyProviderWebhook, hmacSha256Hex, timingSafeEqual, secretEnvName,
} from '../../supabase/functions/_shared/webhookAuth.ts'

const headers = (map = {}) => ({ get: (k) => map[k] ?? map[k.toLowerCase()] ?? null })

test('btcpay: accepts a correct HMAC of the raw body, rejects a wrong one, a missing header and a missing secret', async () => {
  const secret = 'whsec_test_only'
  const rawBody = JSON.stringify({ id: 'inv_123', type: 'InvoiceSettled' })
  const sig = 'sha256=' + await hmacSha256Hex(secret, rawBody)
  const body = JSON.parse(rawBody)

  assert.deepEqual(await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({ 'BTCPay-Sig': sig }), secret }), { ok: true })
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({ 'btcpay-sig': sig }), secret })).ok, true)
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody: rawBody + ' ', body, headers: headers({ 'BTCPay-Sig': sig }), secret })).ok, false)
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({ 'BTCPay-Sig': 'sha256=deadbeef' }), secret })).ok, false)
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({}), secret })).reason, 'missing_signature')
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({ 'BTCPay-Sig': sig }), secret: '' })).reason, 'secret_not_configured')
  assert.equal((await verifyProviderWebhook({ provider: 'btcpay', rawBody, body, headers: headers({ 'BTCPay-Sig': 'md5=abc' }), secret })).reason, 'malformed_signature')
})

test('opennode: hashed_order must be HMAC(api key, charge id)', async () => {
  const secret = 'opennode_key_test_only'
  const good = { id: 'ch_42', status: 'paid', hashed_order: await hmacSha256Hex(secret, 'ch_42') }
  const rawBody = JSON.stringify(good)
  assert.equal((await verifyProviderWebhook({ provider: 'opennode', rawBody, body: good, headers: headers(), secret })).ok, true)
  const forged = { ...good, id: 'ch_43' }
  assert.equal((await verifyProviderWebhook({ provider: 'opennode', rawBody, body: forged, headers: headers(), secret })).ok, false)
  const unsigned = { id: 'ch_42', status: 'paid' }
  assert.equal((await verifyProviderWebhook({ provider: 'opennode', rawBody, body: unsigned, headers: headers(), secret })).reason, 'missing_signature')
})

test('unknown or mock provider is never accepted, even with a secret', async () => {
  for (const provider of ['mock', 'strike', '', 'anything']) {
    const res = await verifyProviderWebhook({ provider, rawBody: '{}', body: {}, headers: headers(), secret: 'x' })
    assert.equal(res.ok, false, provider)
  }
  assert.equal(secretEnvName('btcpay'), 'BTCPAY_WEBHOOK_SECRET')
  assert.equal(secretEnvName('opennode'), 'OPENNODE_API_KEY')
  assert.equal(secretEnvName('mock'), null)
})

test('timingSafeEqual compares whole strings', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true)
  assert.equal(timingSafeEqual('abc', 'abd'), false)
  assert.equal(timingSafeEqual('abc', 'abcd'), false)
  assert.equal(timingSafeEqual('', ''), true)
  assert.equal(timingSafeEqual('a', ''), false)
})
