import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  buildLemonSqueezySubscription,
  createLemonSqueezyCheckout,
  lemonMinorToUnits,
  parseVariantMap,
  planForVariant,
  variantForPlan,
  verifyLemonSqueezySignature,
} from '../workers/nexora-payments-api/src/lemonSqueezy.js'

const SECRET = 'lsq_whsec_test_secret'
const BODY = JSON.stringify({ meta: { event_name: 'subscription_created' }, data: { id: '1' } })
const sign = (body = BODY, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex')
const verify = (overrides = {}) => verifyLemonSqueezySignature({ secret: SECRET, header: sign(), rawBody: BODY, ...overrides })

test('valid signature is accepted, case-insensitively', async () => {
  assert.deepEqual(await verify(), { ok: true })
  assert.deepEqual(await verify({ header: sign().toUpperCase() }), { ok: true })
})

test('verification fails closed', async () => {
  assert.equal((await verify({ secret: '' })).reason, 'secret-not-configured')
  assert.equal((await verify({ header: '' })).reason, 'signature-missing')
  assert.equal((await verify({ header: 'not-hex' })).reason, 'signature-malformed')
  assert.equal((await verify({ header: '0'.repeat(64) })).reason, 'signature-mismatch')
  assert.equal((await verify({ rawBody: `${BODY} ` })).reason, 'signature-mismatch')
  assert.equal((await verify({ header: sign(BODY, 'other-secret') })).reason, 'signature-mismatch')
})

const MAP = parseVariantMap('{"111":{"plan":"basic","cycle":"monthly"},"222":{"plan":"basic","cycle":"yearly"},"333":{"plan":"standard","cycle":"monthly"}}')

test('variant map: parsing is forgiving, lookups work both ways', () => {
  assert.deepEqual(parseVariantMap('not json'), {})
  assert.deepEqual(parseVariantMap(''), {})
  assert.deepEqual(planForVariant(MAP, 222), { plan: 'basic', cycle: 'yearly' })
  assert.equal(planForVariant(MAP, 999), null)
  assert.equal(variantForPlan(MAP, 'standard', 'monthly'), '333')
  assert.equal(variantForPlan(MAP, 'standard', 'yearly'), '')
})

test('amounts convert from cents', () => {
  assert.equal(lemonMinorToUnits(1999), 19.99)
  assert.equal(lemonMinorToUnits('abc'), 0)
})

const NOW = '2026-10-14T12:00:00.000Z'
const resource = (attributes) => ({ id: '77', attributes: { variant_id: 333, customer_id: 9, status: 'active', renews_at: '2026-11-14T12:00:00.000Z', created_at: '2026-10-14T11:00:00.000Z', ...attributes } })

test('active subscription maps to the plan from the variant', () => {
  const sub = buildLemonSqueezySubscription(resource({}), { variantMap: MAP, now: NOW })
  assert.equal(sub.plan, 'standard')
  assert.equal(sub.planStatus, 'active')
  assert.equal(sub.billingCycle, 'monthly')
  assert.equal(sub.nextBillingDate, '2026-11-14T12:00:00.000Z')
  assert.equal(sub.lemonSqueezySubscriptionId, '77')
  assert.equal(sub.isTrialActive, false)
})

test('trial, cancelled, expired, paused and past due statuses', () => {
  const trial = buildLemonSqueezySubscription(resource({ status: 'on_trial', trial_ends_at: '2026-10-21T00:00:00.000Z' }), { variantMap: MAP, now: NOW })
  assert.equal(trial.planStatus, 'active')
  assert.equal(trial.isTrialActive, true)
  assert.equal(trial.trialEndDate, '2026-10-21T00:00:00.000Z')

  const cancelled = buildLemonSqueezySubscription(resource({ status: 'cancelled', cancelled: true, ends_at: '2026-11-01T00:00:00.000Z' }), { variantMap: MAP, now: NOW })
  assert.equal(cancelled.planStatus, 'canceled')
  assert.equal(cancelled.subscriptionExpiresAt, '2026-11-01T00:00:00.000Z')
  assert.equal(cancelled.nextBillingDate, '')

  assert.equal(buildLemonSqueezySubscription(resource({ status: 'expired' }), { variantMap: MAP, now: NOW }).planStatus, 'expired')
  assert.equal(buildLemonSqueezySubscription(resource({ status: 'paused' }), { variantMap: MAP, now: NOW }).planStatus, 'paused')
  assert.equal(buildLemonSqueezySubscription(resource({ status: 'past_due' }), { variantMap: MAP, now: NOW }).planStatus, 'past_due')
})

test('unmapped variant falls back to checkout custom data, then to basic', () => {
  const viaCustom = buildLemonSqueezySubscription(resource({ variant_id: 999 }), { variantMap: MAP, fallback: { plan: 'standard', cycle: 'yearly' }, now: NOW })
  assert.equal(viaCustom.plan, 'standard')
  assert.equal(viaCustom.billingCycle, 'yearly')
  const none = buildLemonSqueezySubscription(resource({ variant_id: 999 }), { variantMap: MAP, now: NOW })
  assert.equal(none.plan, 'basic')
})

test('checkout request is built for the variant and returns the hosted url', async () => {
  let captured
  const fetchImpl = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) }
    return { ok: true, status: 201, json: async () => ({ data: { attributes: { url: 'https://nexorasolution.lemonsqueezy.com/checkout/custom/abc' } } }) }
  }
  const url = await createLemonSqueezyCheckout({
    apiKey: 'key', storeId: '5', variantId: '333', email: 'a@b.com', customData: { workspace_id: 'w1', plan: 'standard' }, testMode: true, fetchImpl,
  })
  assert.equal(url, 'https://nexorasolution.lemonsqueezy.com/checkout/custom/abc')
  assert.equal(captured.url, 'https://api.lemonsqueezy.com/v1/checkouts')
  assert.equal(captured.init.headers.Authorization, 'Bearer key')
  assert.equal(captured.body.data.relationships.variant.data.id, '333')
  assert.equal(captured.body.data.relationships.store.data.id, '5')
  assert.equal(captured.body.data.attributes.test_mode, true)
  assert.equal(captured.body.data.attributes.checkout_data.custom.workspace_id, 'w1')
})

test('checkout fails clearly when unconfigured or when the API errors', async () => {
  await assert.rejects(() => createLemonSqueezyCheckout({ apiKey: '', storeId: '5', variantId: '1' }), /not configured/)
  const failing = async () => ({ ok: false, status: 422, json: async () => ({ errors: [{ detail: 'Bad variant' }] }) })
  await assert.rejects(() => createLemonSqueezyCheckout({ apiKey: 'k', storeId: '5', variantId: '1', fetchImpl: failing }), /Bad variant/)
})
