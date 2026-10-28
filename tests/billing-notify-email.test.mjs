import test from 'node:test'
import assert from 'node:assert/strict'
import { formatEmailDate, formatEmailMoney, planLabel, sendBillingEmail } from '../workers/nexora-payments-api/src/notifyEmail.js'

const KEY = 'k'.repeat(40)

test('sends with the internal key and a lower-cased recipient', async () => {
  let seen
  const fetchImpl = async (url, init) => { seen = { url, init }; return { ok: true, status: 200 } }
  const res = await sendBillingEmail({ INTERNAL_EMAIL_KEY: KEY }, { to: ' Owner@Example.com ', type: 'refund_issued', data: { amount: 'USD 5.00' } }, fetchImpl)
  assert.equal(res.ok, true)
  assert.equal(seen.init.headers['X-Nexora-Internal-Key'], KEY)
  assert.deepEqual(JSON.parse(seen.init.body), { to: 'owner@example.com', type: 'refund_issued', data: { amount: 'USD 5.00' } })
})

test('prefers BILLING_EMAIL_KEY over INTERNAL_EMAIL_KEY', async () => {
  let header
  const fetchImpl = async (url, init) => { header = init.headers['X-Nexora-Internal-Key']; return { ok: true, status: 200 } }
  await sendBillingEmail({ INTERNAL_EMAIL_KEY: KEY, BILLING_EMAIL_KEY: 'z'.repeat(40) }, { to: 'a@b.com', type: 'x' }, fetchImpl)
  assert.equal(header, 'z'.repeat(40))
})

test('does nothing without a configured key, recipient or type, and never throws', async () => {
  const fetchImpl = async () => { throw new Error('must not be called') }
  assert.equal((await sendBillingEmail({}, { to: 'a@b.com', type: 'x' }, fetchImpl)).skipped, true)
  assert.equal((await sendBillingEmail({ INTERNAL_EMAIL_KEY: 'short' }, { to: 'a@b.com', type: 'x' }, fetchImpl)).skipped, true)
  assert.equal((await sendBillingEmail({ INTERNAL_EMAIL_KEY: KEY }, { to: '', type: 'x' }, fetchImpl)).skipped, true)
  const boom = await sendBillingEmail({ INTERNAL_EMAIL_KEY: KEY }, { to: 'a@b.com', type: 'x' }, async () => { throw new Error('network') })
  assert.equal(boom.ok, false)
})

test('formatters', () => {
  assert.equal(formatEmailMoney(49, 'usd'), 'USD 49.00')
  assert.equal(formatEmailMoney(0), '')
  assert.equal(planLabel('growth'), 'Growth')
  assert.equal(planLabel(''), '')
  assert.equal(formatEmailDate('2026-11-30T10:00:00Z'), '30 Nov 2026')
  assert.equal(formatEmailDate(''), '')
})
