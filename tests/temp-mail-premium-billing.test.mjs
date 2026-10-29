import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, generateKeyPairSync, sign } from 'node:crypto'
import worker from '../workers/nexora-payments-api/src/index.js'
import {
  buildTempMailEntitlement, isTempMailEvent, parseTempMailProducts, revokedTempMailEntitlement, tempMailCycleFor,
  tempMailEntitlementActive, tempMailProductFor, tempMailUid,
} from '../workers/nexora-payments-api/src/tempMailPremium.js'
import { isPremiumActive } from '../workers/nexora-temp-mail/src/premium.js'

const PRODUCTS = parseTempMailProducts('{"p-month":{"cycle":"monthly"},"p-year":{"cycle":"yearly"}}')
const NOW = Date.parse('2026-10-29T10:00:00Z')
const sub = (extra = {}) => ({
  id: 'sub_1', product_id: 'p-month', customer_id: 'cus_1', status: 'active', cancel_at_period_end: false,
  current_period_end: '2026-11-29T10:00:00Z', customer: { email: 'Buyer@Example.com' }, metadata: { product: 'tempmail', uid: 'firebase_uid_1' }, ...extra,
})

test('products: forgiving parser and lookups', () => {
  assert.deepEqual(parseTempMailProducts('not json'), {})
  assert.deepEqual(parseTempMailProducts(''), {})
  assert.equal(tempMailProductFor(PRODUCTS, 'yearly'), 'p-year')
  assert.equal(tempMailProductFor(PRODUCTS, 'monthly'), 'p-month')
  assert.equal(tempMailProductFor({}, 'monthly'), '')
  assert.equal(tempMailCycleFor(PRODUCTS, 'p-year'), 'yearly')
  assert.equal(tempMailCycleFor(PRODUCTS, 'unknown', { cycle: 'yearly' }), 'yearly')
})

test('isTempMailEvent: by product id or by checkout metadata, never for workspace plans', () => {
  assert.equal(isTempMailEvent(PRODUCTS, { product_id: 'p-month' }), true)
  assert.equal(isTempMailEvent(PRODUCTS, { product: { id: 'p-year' } }), true)
  assert.equal(isTempMailEvent({}, { metadata: { product: 'tempmail' } }), true)
  assert.equal(isTempMailEvent(PRODUCTS, { product_id: 'p-basic', metadata: { workspace_id: 'w1' } }), false)
})

test('uid: only well-formed Firebase uids are accepted', () => {
  assert.equal(tempMailUid({ metadata: { uid: 'firebase_uid_1' } }), 'firebase_uid_1')
  assert.equal(tempMailUid({ metadata: { uid: '../x' } }), '')
  assert.equal(tempMailUid({ metadata: {} }), '')
  assert.equal(tempMailUid({}), '')
})

test('entitlement from a subscription: active, cancelling, past due, ended, revoked', () => {
  const active = buildTempMailEntitlement(sub(), { cycle: 'monthly', now: NOW })
  assert.equal(active.status, 'active')
  assert.equal(active.expiresAt, Date.parse('2026-11-29T10:00:00Z'))
  assert.equal(active.email, 'buyer@example.com')
  assert.equal(active.customerId, 'cus_1')
  assert.equal(active.source, 'polar')

  // cancelled by the customer: still paid until the period ends
  const cancelling = buildTempMailEntitlement(sub({ cancel_at_period_end: true }), { now: NOW })
  assert.equal(cancelling.status, 'canceled')
  assert.equal(isPremiumActive(cancelling, NOW), true)
  assert.equal(isPremiumActive(cancelling, Date.parse('2026-11-30T00:00:00Z')), false)

  const pastDue = buildTempMailEntitlement(sub({ status: 'past_due' }), { now: NOW })
  assert.equal(pastDue.status, 'past_due')
  assert.equal(pastDue.expiresAt, Date.parse('2026-11-29T10:00:00Z'))

  const ended = buildTempMailEntitlement(sub({ status: 'canceled', ends_at: '2026-10-01T00:00:00Z' }), { now: NOW })
  assert.equal(isPremiumActive(ended, NOW), false)

  const revoked = buildTempMailEntitlement(sub({ status: 'revoked' }), { now: NOW })
  assert.equal(revoked.status, 'revoked')
  assert.equal(isPremiumActive(revoked, NOW), false)

  assert.equal(buildTempMailEntitlement(sub({ status: 'incomplete' }), { now: NOW }).status, 'expired')
  assert.equal(buildTempMailEntitlement(sub({ current_period_end: '' }), { now: NOW }).expiresAt, NOW + 32 * 86_400_000)
})

test('both workers agree on what "active" means', () => {
  for (const ent of [null, { status: 'active', expiresAt: NOW + 1 }, { status: 'canceled', expiresAt: NOW + 1 }, { status: 'canceled', expiresAt: NOW - 1 }, { status: 'revoked', expiresAt: NOW + 1e9 }, { status: 'expired', expiresAt: NOW + 1e9 }]) {
    assert.equal(tempMailEntitlementActive(ent, NOW), isPremiumActive(ent, NOW), JSON.stringify(ent))
  }
  assert.equal(revokedTempMailEntitlement({ customerId: 'cus_1' }, NOW).customerId, 'cus_1')
})

// ---- the real Worker, end to end -------------------------------------------

function fakeKv() {
  const store = new Map()
  return {
    store,
    async get(key, type) { const v = store.get(key); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v },
    async put(key, value) { store.set(key, value) },
    async delete(key) { store.delete(key) },
  }
}

const SECRET = 'whsec_test'
const env = (extra = {}) => ({
  FIREBASE_PROJECT_ID: 'nexora-business-suite',
  APP_BASE_URL: 'https://nexorasolution.us',
  ALLOWED_ORIGINS: 'https://nexorasolution.us',
  POLAR_WEBHOOK_SECRET: SECRET,
  POLAR_ACCESS_TOKEN: 'polar_token',
  POLAR_TEMPMAIL_PRODUCTS: '{"p-month":{"cycle":"monthly"},"p-year":{"cycle":"yearly"}}',
  TEMP_MAIL: fakeKv(),
  ...extra,
})

function webhook(body, e) {
  const raw = JSON.stringify(body)
  const id = 'msg_1'
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = `v1,${createHmac('sha256', SECRET).update(`${id}.${ts}.${raw}`).digest('base64')}`
  return worker.fetch(new Request('https://pay.test/webhooks/polar', { method: 'POST', headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sig }, body: raw }), e)
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function tokenFor(uid, email = 'buyer@example.com') {
  const h = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT' })
  const p = b64({ aud: 'nexora-business-suite', iss: 'https://securetoken.google.com/nexora-business-suite', sub: uid, email, iat: Math.floor(Date.now() / 1000) - 5, exp: Math.floor(Date.now() / 1000) + 3600 })
  return `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url')}`
}

const realFetch = globalThis.fetch
let polarCalls = []
before(() => {
  globalThis.fetch = async (url, init) => {
    const href = String(url)
    if (href.includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=3600' } })
    if (href.endsWith('/checkouts/')) { polarCalls.push({ href, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ url: 'https://polar.test/checkout/abc' }), { status: 201 }) }
    if (href.endsWith('/customer-sessions/')) { polarCalls.push({ href, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ token: 't', customer_portal_url: 'https://polar.test/portal/xyz' }), { status: 201 }) }
    throw new Error(`unexpected fetch ${href}`)
  }
})
after(() => { globalThis.fetch = realFetch })

const authed = (path, token, body = {}) => new Request(`https://pay.test${path}`, { method: 'POST', headers: { Origin: 'https://nexorasolution.us', Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })

test('webhook: a Premium subscription writes the entitlement and never touches workspaces', async () => {
  const e = env()
  const res = await webhook({ type: 'subscription.created', data: sub() }, e)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).product, 'tempmail')
  const ent = JSON.parse(e.TEMP_MAIL.store.get('pm:firebase_uid_1'))
  assert.equal(ent.status, 'active')
  assert.equal(ent.cycle, 'monthly')
  assert.equal(isPremiumActive(ent), true)
})

test('webhook: cancel keeps access to the period end; revoke and refund end it', async () => {
  const e = env()
  await webhook({ type: 'subscription.created', data: sub({ current_period_end: new Date(Date.now() + 20 * 86400_000).toISOString() }) }, e)
  await webhook({ type: 'subscription.canceled', data: sub({ status: 'active', cancel_at_period_end: true, current_period_end: new Date(Date.now() + 20 * 86400_000).toISOString() }) }, e)
  let ent = JSON.parse(e.TEMP_MAIL.store.get('pm:firebase_uid_1'))
  assert.equal(ent.status, 'canceled')
  assert.equal(isPremiumActive(ent), true)

  await webhook({ type: 'order.refunded', data: { id: 'ord_1', product_id: 'p-month', metadata: { product: 'tempmail', uid: 'firebase_uid_1' } } }, e)
  ent = JSON.parse(e.TEMP_MAIL.store.get('pm:firebase_uid_1'))
  assert.equal(ent.status, 'revoked')
  assert.equal(ent.customerId, 'cus_1') // billing details survive a revoke
  assert.equal(isPremiumActive(ent), false)
})

test('webhook: a missing uid is logged and ignored, a bad signature is rejected, order.paid is a no-op', async () => {
  const e = env()
  assert.equal((await webhook({ type: 'subscription.created', data: sub({ metadata: { product: 'tempmail' } }) }, e)).status, 200)
  assert.equal(e.TEMP_MAIL.store.size, 0)
  await webhook({ type: 'order.paid', data: { id: 'ord_2', product_id: 'p-month', metadata: { product: 'tempmail', uid: 'firebase_uid_1' } } }, e)
  assert.equal(e.TEMP_MAIL.store.size, 0)
  const bad = await worker.fetch(new Request('https://pay.test/webhooks/polar', { method: 'POST', headers: { 'webhook-id': 'x', 'webhook-timestamp': String(Math.floor(Date.now() / 1000)), 'webhook-signature': 'v1,AAAA' }, body: '{}' }), e)
  assert.equal(bad.status, 401)
})

test('webhook: without the KV binding the event fails loudly so Polar retries', async () => {
  const e = env({ TEMP_MAIL: undefined })
  assert.equal((await webhook({ type: 'subscription.created', data: sub() }, e)).status, 500)
})

test('checkout: needs sign-in, and says "not available yet" until the products are set', async () => {
  const e = env()
  const noAuth = await worker.fetch(authed('/api/polar/tempmail/checkout', 'garbage'), e)
  assert.equal(noAuth.status, 401)
  const off = await worker.fetch(authed('/api/polar/tempmail/checkout', tokenFor('firebase_uid_1'), { cycle: 'monthly' }), env({ POLAR_TEMPMAIL_PRODUCTS: '{}' }))
  assert.equal(off.status, 503)
})

test('checkout: a Polar checkout with the uid in metadata, the right product and no trial', async () => {
  polarCalls = []
  const e = env()
  const res = await worker.fetch(authed('/api/polar/tempmail/checkout', tokenFor('firebase_uid_1'), { cycle: 'yearly' }), e)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).url, 'https://polar.test/checkout/abc')
  const body = polarCalls[0].body
  assert.deepEqual(body.products, ['p-year'])
  assert.deepEqual(body.metadata, { product: 'tempmail', uid: 'firebase_uid_1', cycle: 'yearly' })
  assert.equal(body.allow_trial, false)
  assert.equal(body.customer_email, 'buyer@example.com')
  assert.match(body.success_url, /\/tools\/temp-mail\/\?premium=success$/)
})

test('checkout: someone who already has an active plan is not charged twice', async () => {
  const e = env()
  await webhook({ type: 'subscription.created', data: sub() }, e)
  const res = await worker.fetch(authed('/api/polar/tempmail/checkout', tokenFor('firebase_uid_1'), { cycle: 'monthly' }), e)
  assert.equal(res.status, 409)
})

test('checkout: refuses callers from other origins', async () => {
  const req = new Request('https://pay.test/api/polar/tempmail/checkout', { method: 'POST', headers: { Origin: 'https://evil.example', Authorization: `Bearer ${tokenFor('firebase_uid_1')}` }, body: '{}' })
  assert.equal((await worker.fetch(req, env())).status, 403)
})

test('portal: only for someone with a subscription', async () => {
  polarCalls = []
  const e = env()
  const none = await worker.fetch(authed('/api/polar/tempmail/portal', tokenFor('firebase_uid_1')), e)
  assert.equal(none.status, 404)
  await webhook({ type: 'subscription.created', data: sub() }, e)
  const res = await worker.fetch(authed('/api/polar/tempmail/portal', tokenFor('firebase_uid_1')), e)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).portalUrl, 'https://polar.test/portal/xyz')
  assert.equal(polarCalls[0].body.customer_id, 'cus_1')
})
