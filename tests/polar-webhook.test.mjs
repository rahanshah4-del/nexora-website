import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  buildPolarSubscription,
  createPolarCheckout,
  parseProductMap,
  planForProduct,
  polarApiBase,
  polarMinorToUnits,
  productForPlan,
  verifyPolarSignature,
} from '../workers/nexora-payments-api/src/polar.js'

const SECRET = 'polar_whs_test_secret'
const BODY = JSON.stringify({ type: 'subscription.created', data: { id: 'sub_1' } })
const ID = 'msg_123'
const NOW_S = 1_790_000_000
const sign = (body = BODY, secret = SECRET, id = ID, ts = NOW_S) => `v1,${createHmac('sha256', secret).update(`${id}.${ts}.${body}`).digest('base64')}`
const verify = (overrides = {}) => verifyPolarSignature({ secret: SECRET, id: ID, timestamp: String(NOW_S), signature: sign(), rawBody: BODY, nowSeconds: NOW_S, ...overrides })

test('valid signature is accepted, including among several signatures', async () => {
  assert.deepEqual(await verify(), { ok: true })
  assert.deepEqual(await verify({ signature: `v1,AAAA ${sign()}` }), { ok: true })
})

test('verification fails closed', async () => {
  assert.equal((await verify({ secret: '' })).reason, 'secret-not-configured')
  assert.equal((await verify({ signature: '' })).reason, 'headers-missing')
  assert.equal((await verify({ id: '' })).reason, 'headers-missing')
  assert.equal((await verify({ timestamp: 'abc' })).reason, 'timestamp-invalid')
  assert.equal((await verify({ nowSeconds: NOW_S + 3600 })).reason, 'timestamp-out-of-range')
  assert.equal((await verify({ signature: 'v1,AAAA' })).reason, 'signature-mismatch')
  assert.equal((await verify({ signature: sign().replace('v1,', 'v2,') })).reason, 'signature-mismatch')
  assert.equal((await verify({ rawBody: `${BODY} ` })).reason, 'signature-mismatch')
  assert.equal((await verify({ signature: sign(BODY, 'other-secret') })).reason, 'signature-mismatch')
})

const MAP = parseProductMap('{"p-bm":{"plan":"basic","cycle":"monthly"},"p-by":{"plan":"basic","cycle":"yearly"},"p-sm":{"plan":"standard","cycle":"monthly"}}')

test('product map: parsing is forgiving, lookups work both ways', () => {
  assert.deepEqual(parseProductMap('not json'), {})
  assert.deepEqual(parseProductMap(''), {})
  assert.deepEqual(planForProduct(MAP, 'p-by'), { plan: 'basic', cycle: 'yearly' })
  assert.equal(planForProduct(MAP, 'nope'), null)
  assert.equal(productForPlan(MAP, 'standard', 'monthly'), 'p-sm')
  assert.equal(productForPlan(MAP, 'standard', 'yearly'), '')
})

test('api base and amounts', () => {
  assert.equal(polarApiBase('sandbox'), 'https://sandbox-api.polar.sh/v1')
  assert.equal(polarApiBase('production'), 'https://api.polar.sh/v1')
  assert.equal(polarApiBase(''), 'https://api.polar.sh/v1')
  assert.equal(polarMinorToUnits(2100), 21)
  assert.equal(polarMinorToUnits('abc'), 0)
})

const NOW = '2026-10-25T12:00:00.000Z'
const sub = (extra) => ({ id: 'sub_77', product_id: 'p-sm', customer_id: 'cus_9', status: 'active', currency: 'usd', current_period_end: '2026-11-25T12:00:00.000Z', started_at: '2026-10-25T11:00:00.000Z', cancel_at_period_end: false, ...extra })

test('active subscription maps to the plan from the product', () => {
  const s = buildPolarSubscription(sub(), { productMap: MAP, now: NOW })
  assert.equal(s.plan, 'standard')
  assert.equal(s.planStatus, 'active')
  assert.equal(s.billingCycle, 'monthly')
  assert.equal(s.nextBillingDate, '2026-11-25T12:00:00.000Z')
  assert.equal(s.polarSubscriptionId, 'sub_77')
  assert.equal(s.paymentProvider, 'polar')
  assert.equal(s.isTrialActive, false)
})

test('trialing subscription grants paid access and does not reuse the free-trial flag', () => {
  const s = buildPolarSubscription(sub({ status: 'trialing', trial_end: '2026-11-25T12:00:00.000Z' }), { productMap: MAP, now: NOW })
  assert.equal(s.planStatus, 'active')
  assert.equal(s.subscriptionStatus, 'active')
  assert.equal(s.polarStatus, 'trialing')
  assert.equal(s.isTrialActive, false)
  assert.equal(s.polarTrialEndsAt, '2026-11-25T12:00:00.000Z')
})

test('trialing subscription without a period end falls back to the trial end for access dates', () => {
  const s = buildPolarSubscription(sub({ status: 'trialing', current_period_end: undefined, trial_end: '2026-11-25T12:00:00.000Z' }), { productMap: MAP, now: NOW })
  assert.equal(s.subscriptionExpiresAt, '2026-11-25T12:00:00.000Z')
  assert.equal(s.nextBillingDate, '2026-11-25T12:00:00.000Z')
})

test('cancel at period end keeps access but clears the next billing date', () => {
  const s = buildPolarSubscription(sub({ cancel_at_period_end: true }), { productMap: MAP, now: NOW })
  assert.equal(s.planStatus, 'canceled')
  assert.equal(s.nextBillingDate, '')
  assert.equal(s.subscriptionExpiresAt, '2026-11-25T12:00:00.000Z')
})

test('past due, revoked and unmapped products', () => {
  assert.equal(buildPolarSubscription(sub({ status: 'past_due' }), { productMap: MAP }).planStatus, 'past_due')
  assert.equal(buildPolarSubscription(sub({ status: 'revoked', ended_at: '2026-10-26T00:00:00.000Z' }), { productMap: MAP }).planStatus, 'expired')
  const fallback = buildPolarSubscription(sub({ product_id: 'unknown' }), { productMap: MAP, fallback: { plan: 'basic', cycle: 'yearly' } })
  assert.equal(fallback.plan, 'basic')
  assert.equal(fallback.billingCycle, 'yearly')
})

test('checkout creation posts the right payload and returns the url', async () => {
  let call
  const fetchImpl = async (url, init) => { call = { url, init }; return { ok: true, status: 201, json: async () => ({ url: 'https://buy.polar.sh/abc' }) } }
  const url = await createPolarCheckout({ accessToken: 'tok', server: 'sandbox', productId: 'p-bm', email: 'a@b.co', metadata: { plan: 'basic' }, successUrl: 'https://x/s', fetchImpl })
  assert.equal(url, 'https://buy.polar.sh/abc')
  assert.equal(call.url, 'https://sandbox-api.polar.sh/v1/checkouts/')
  assert.equal(call.init.headers.Authorization, 'Bearer tok')
  const body = JSON.parse(call.init.body)
  assert.deepEqual(body.products, ['p-bm'])
  assert.equal(body.customer_email, 'a@b.co')
  assert.equal(body.success_url, 'https://x/s')
})

test('checkout creation surfaces errors and requires config', async () => {
  await assert.rejects(() => createPolarCheckout({ accessToken: '', productId: 'p' }), /not configured/)
  const bad = async () => ({ ok: false, status: 422, json: async () => ({ detail: 'Bad product' }) })
  await assert.rejects(() => createPolarCheckout({ accessToken: 't', productId: 'p', fetchImpl: bad }), /Bad product/)
})

test('trialAlreadyUsed: signup trial or an earlier Polar subscription means no second trial', async () => {
  const { trialAlreadyUsed } = await import('../workers/nexora-payments-api/src/polar.js')
  assert.equal(trialAlreadyUsed({ trialEndsAt: '2026-10-01T00:00:00.000Z' }), true)
  assert.equal(trialAlreadyUsed({}, { subscriptionStatus: 'Free Trial' }), true)
  assert.equal(trialAlreadyUsed({ subscriptionStatus: 'expired' }), true)
  assert.equal(trialAlreadyUsed({ polarSubscriptionId: 'sub_1' }), true)
  assert.equal(trialAlreadyUsed({ email: 'a@b.com' }, null), false)
  assert.equal(trialAlreadyUsed(), false)
})

test('createPolarCheckout sends allow_trial:false only when the trial must be skipped', async () => {
  const { createPolarCheckout } = await import('../workers/nexora-payments-api/src/polar.js')
  const bodies = []
  const fetchImpl = async (_url, init) => { bodies.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ url: 'https://polar.sh/checkout/x' }) } }
  await createPolarCheckout({ accessToken: 't', productId: 'p', fetchImpl })
  await createPolarCheckout({ accessToken: 't', productId: 'p', allowTrial: false, fetchImpl })
  assert.equal('allow_trial' in bodies[0], false)
  assert.equal(bodies[1].allow_trial, false)
})

test('summarizePolarBilling: next payment, trial end, cancelled and saved card', async () => {
  const { summarizePolarBilling } = await import('../workers/nexora-payments-api/src/polar.js')
  const card = { id: 'pm_1', type: 'card', method_metadata: { brand: 'visa', last4: '4242', exp_month: 8, exp_year: 2030 } }
  const renewing = summarizePolarBilling({ status: 'active', current_period_end: '2026-12-01T00:00:00Z', amount: 700, currency: 'usd', recurring_interval: 'month' }, [card])
  assert.equal(renewing.nextPaymentDate, '2026-12-01T00:00:00Z')
  assert.equal(renewing.amount, 7)
  assert.equal(renewing.currency, 'USD')
  assert.deepEqual(renewing.card, { id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2030 })
  const cancelled = summarizePolarBilling({ status: 'active', cancel_at_period_end: true, current_period_end: '2026-12-01T00:00:00Z' }, [])
  assert.equal(cancelled.nextPaymentDate, '')
  assert.equal(cancelled.periodEnd, '2026-12-01T00:00:00Z')
  assert.equal(cancelled.card, null)
  const trial = summarizePolarBilling({ status: 'trialing', trial_end: '2026-11-28T00:00:00Z', current_period_end: '2026-11-28T00:00:00Z' }, [card])
  assert.equal(trial.trialing, true)
  assert.equal(trial.trialEnd, '2026-11-28T00:00:00Z')
})
