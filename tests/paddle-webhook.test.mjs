import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  paddleMinorToUnits,
  paddleTransactionTotal,
  parsePaddleSignature,
  timingSafeEqualHex,
  verifyPaddleSignature,
} from '../workers/nexora-payments-api/src/paddleWebhook.js'

const SECRET = 'pdl_ntfset_test_secret'
const BODY = JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_1' } })
const NOW = Date.UTC(2026, 8, 25, 12, 0, 0)
const nowSeconds = Math.floor(NOW / 1000)
const sign = (ts, body = BODY, secret = SECRET) => createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex')
const header = (ts, h1 = sign(ts)) => `ts=${ts};h1=${h1}`
const verify = (overrides = {}) => verifyPaddleSignature({ secret: SECRET, header: header(nowSeconds), rawBody: BODY, now: NOW, ...overrides })

test('valid signature is accepted', async () => {
  assert.deepEqual(await verify(), { ok: true })
  // Secret rotation: any matching h1 passes.
  assert.deepEqual(await verify({ header: `ts=${nowSeconds};h1=${'0'.repeat(64)};h1=${sign(nowSeconds)}` }), { ok: true })
})

test('missing secret rejects (fail closed)', async () => {
  assert.deepEqual(await verify({ secret: '' }), { ok: false, reason: 'secret-not-configured' })
  assert.deepEqual(await verify({ secret: undefined }), { ok: false, reason: 'secret-not-configured' })
})

test('missing or malformed header rejects', async () => {
  assert.equal((await verify({ header: '' })).reason, 'signature-missing')
  assert.equal((await verify({ header: undefined })).reason, 'signature-missing')
  for (const bad of ['garbage', `ts=${nowSeconds}`, 'h1=abc', `ts=abc;h1=${sign(nowSeconds)}`, `ts=${nowSeconds};h1=xyz`, `ts=${nowSeconds};h1=${sign(nowSeconds)};junk`]) {
    assert.equal((await verify({ header: bad })).reason, 'signature-malformed', bad)
  }
})

test('bad signature rejects', async () => {
  assert.equal((await verify({ header: header(nowSeconds, sign(nowSeconds, BODY, 'other-secret')) })).reason, 'signature-mismatch')
  assert.equal((await verify({ rawBody: `${BODY} ` })).reason, 'signature-mismatch')
})

test('stale or future timestamp rejects', async () => {
  assert.equal((await verify({ header: header(nowSeconds - 301) })).reason, 'timestamp-stale')
  assert.deepEqual(await verify({ header: header(nowSeconds - 299) }), { ok: true })
  assert.equal((await verify({ header: header(nowSeconds + 61) })).reason, 'timestamp-future')
  assert.deepEqual(await verify({ header: header(nowSeconds + 59) }), { ok: true })
})

test('header parsing and constant-time compare', () => {
  assert.deepEqual(parsePaddleSignature(`ts=123;h1=${'A'.repeat(64)}`), { ts: 123, h1: ['a'.repeat(64)] })
  assert.equal(timingSafeEqualHex('abcd', 'abcd'), true)
  assert.equal(timingSafeEqualHex('abcd', 'abce'), false)
  assert.equal(timingSafeEqualHex('abcd', 'abc'), false)
})

test('cents conversion and totals from data.details.totals', () => {
  assert.equal(paddleMinorToUnits('719', 'USD'), 7.19)
  assert.equal(paddleMinorToUnits('2000', 'EUR'), 20)
  assert.equal(paddleMinorToUnits('500', 'JPY'), 500)
  assert.equal(paddleMinorToUnits('abc', 'USD'), 0)
  assert.deepEqual(paddleTransactionTotal({ currency_code: 'usd', details: { totals: { subtotal: '600', tax: '119', total: '719' } } }), { amount: 7.19, currency: 'USD' })
  assert.deepEqual(paddleTransactionTotal({ currency_code: 'USD' }), { amount: 0, currency: 'USD' })
})

test('handler verifies before parsing or writing', () => {
  const source = readFileSync(new URL('../workers/nexora-payments-api/src/index.js', import.meta.url), 'utf8')
  const start = source.indexOf('async function handlePaddleWebhook(')
  const body = source.slice(start, source.indexOf('\n}\n', start))
  const verifyAt = body.indexOf('verifyPaddleSignature(')
  assert.ok(verifyAt > 0)
  assert.ok(verifyAt < body.indexOf('JSON.parse(rawBody)'))
  assert.ok(verifyAt < body.indexOf('getPaymentServiceToken('))
  assert.doesNotMatch(body, /if \(env\.PADDLE_WEBHOOK_SECRET\)/)
  assert.doesNotMatch(body, /recurring_transaction_details/)
})
