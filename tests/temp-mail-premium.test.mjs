import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { handleEmail, handleRequest } from '../workers/nexora-temp-mail/src/index.js'
import {
  PREMIUM_LIMITS, grantEntitlement, isPremiumActive, newPremiumSession, premiumSessionUntil, validForwardTarget,
} from '../workers/nexora-temp-mail/src/premium.js'

// ---- fakes -----------------------------------------------------------------

function fakeKv() {
  const store = new Map()
  return {
    store,
    async get(key, type) {
      const v = store.get(key)?.value
      if (v === undefined) return null
      if (type === 'json') return JSON.parse(v)
      if (type === 'arrayBuffer') return v instanceof ArrayBuffer ? v : new TextEncoder().encode(v).buffer
      return v
    },
    async put(key, value, opts) { store.set(key, { value, ttl: opts?.expirationTtl, metadata: opts?.metadata }) },
    async delete(key) { store.delete(key) },
    async list({ prefix }) { return { keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })) } },
  }
}

const env = (extra = {}) => ({
  TEMP_MAIL_DOMAINS: 'mail.nexorasolution.us',
  ALLOWED_ORIGINS: 'https://nexorasolution.us',
  MESSAGE_TTL_SECONDS: '3600',
  RESEND_API_KEY: 'test-key',
  TEMP_MAIL: fakeKv(),
  ...extra,
})

const BROWSER = { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'accept-language': 'en-US', 'sec-fetch-site': 'cross-site', origin: 'https://nexorasolution.us' }
const call = (path, { method = 'GET', body, token = '', ip = '2.2.2.2' } = {}) => new Request(`https://api.test${path}`, {
  method,
  headers: {
    ...BROWSER,
    'cf-connecting-ip': ip,
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: body === undefined ? undefined : JSON.stringify(body),
})
const mail = (to, raw, extra = {}) => ({ to, from: 'sender@example.com', rawSize: raw.length, raw: new Response(raw).body, setReject: () => {}, ...extra })
const rfc = (to, subject, body) => `From: Sender <s@example.com>\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain\r\n\r\n${body}\r\n`

// A real RS256 key pair: the Worker verifies Firebase tokens against "Google's" keys, which we serve from this fake.
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function tokenFor(uid, email = 'owner@example.com') {
  const h = b64({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })
  const p = b64({ aud: 'nexora-business-suite', iss: 'https://securetoken.google.com/nexora-business-suite', sub: uid, email, exp: Math.floor(Date.now() / 1000) + 3600 })
  return `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url')}`
}

const realFetch = globalThis.fetch
let sentMail = []
before(() => {
  globalThis.fetch = async (url, init) => {
    const href = String(url)
    if (href.includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    if (href.startsWith('https://api.resend.com/emails')) { sentMail.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }
    throw new Error(`unexpected fetch ${href}`)
  }
})
after(() => { globalThis.fetch = realFetch })

async function premiumEnv(uid = 'user_premium_1', extra = {}) {
  const e = env(extra)
  await e.TEMP_MAIL.put('cfg:settings', JSON.stringify({ premiumEnabled: true }))
  const ent = grantEntitlement({ days: 30, email: 'owner@example.com' })
  await e.TEMP_MAIL.put(`pm:${uid}`, JSON.stringify(ent))
  return { e, uid, token: tokenFor(uid), ent }
}

// ---- pure helpers ----------------------------------------------------------

test('isPremiumActive: needs a live period and a status that is not ended or revoked', () => {
  const now = Date.now()
  assert.equal(isPremiumActive(null), false)
  assert.equal(isPremiumActive({ status: 'active', expiresAt: now + 1000 }), true)
  assert.equal(isPremiumActive({ status: 'canceled', expiresAt: now + 1000 }), true) // paid until the period ends
  assert.equal(isPremiumActive({ status: 'canceled', expiresAt: now - 1000 }), false)
  assert.equal(isPremiumActive({ status: 'revoked', expiresAt: now + 1e9 }), false)
  assert.equal(isPremiumActive({ status: 'expired', expiresAt: now + 1e9 }), false)
})

test('a premium session lives to the end of the paid period plus grace, and never past the hard cap', () => {
  const now = 1_700_000_000_000
  const s = newPremiumSession({ expiresAt: now + 30 * 86400_000 }, 'u1', now)
  assert.equal(s.expiresAt, now + (30 * 86400 + PREMIUM_LIMITS.graceSeconds) * 1000)
  assert.equal(s.hardExpiresAt, s.expiresAt)
  assert.equal(s.premium, true)
  assert.equal(s.owner, 'u1')
  assert.equal(premiumSessionUntil({ expiresAt: now + 9999 * 86400_000 }, now), now + PREMIUM_LIMITS.maxLifetimeSeconds * 1000)
})

test('forwarding destinations: real mailboxes only, never our own temp domain', () => {
  const d = ['mail.nexorasolution.us']
  assert.equal(validForwardTarget('Me@Example.com', d).to, 'me@example.com')
  assert.equal(validForwardTarget('nope', d).ok, false)
  assert.equal(validForwardTarget('x@mail.nexorasolution.us', d).reason, 'own_domain')
  assert.equal(validForwardTarget('a b@example.com', d).ok, false)
})

// ---- API -------------------------------------------------------------------

test('config reports Premium as off until the Control Centre switches it on', async () => {
  const e = env()
  const off = await (await handleRequest(call('/api/config'), e)).json()
  assert.equal(off.premium.enabled, false)
  await e.TEMP_MAIL.put('cfg:settings', JSON.stringify({ premiumEnabled: true }))
  const e2 = { ...e }
  const on = await (await handleRequest(call('/api/config'), e2)).json()
  assert.equal(on.premium.enabled, true)
  assert.equal(on.premium.monthlyPrice, '3.99')
  assert.equal(on.premium.yearlyPrice, '29')
})

test('signed in without a plan still gets a normal, free address', async () => {
  const e = env()
  await e.TEMP_MAIL.put('cfg:settings', JSON.stringify({ premiumEnabled: true }))
  const res = await handleRequest(call('/api/address', { method: 'POST', body: {}, token: tokenFor('free_user_1') }), e)
  const body = await res.json()
  assert.equal(res.status, 201)
  assert.equal(body.premium, false)
  assert.equal(body.expiresInSeconds, 3600)
})

test('an active plan gets a long-lived owned address, even with Premium switched off a plan is not honoured', async () => {
  const { e, token, uid } = await premiumEnv()
  const res = await handleRequest(call('/api/address', { method: 'POST', body: { local: 'my.shop' }, token }), e)
  const body = await res.json()
  assert.equal(res.status, 201)
  assert.equal(body.address, 'my.shop@mail.nexorasolution.us')
  assert.equal(body.premium, true)
  assert.equal(body.canExtend, false)
  assert.ok(body.expiresInSeconds > 30 * 86400)
  assert.deepEqual((await e.TEMP_MAIL.get(`u:${uid}`, 'json')).map((a) => a.address), ['my.shop@mail.nexorasolution.us'])

  // the same plan is ignored while the switch is off
  await e.TEMP_MAIL.put('cfg:settings', JSON.stringify({ premiumEnabled: false }))
  const e2 = { ...e }
  const off = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token, ip: '3.3.3.3' }), e2)).json()
  assert.equal(off.premium, false)
})

test('the address limit is enforced', async () => {
  const { e, token, uid } = await premiumEnv('user_premium_limit')
  const owned = []
  for (let i = 0; i < PREMIUM_LIMITS.maxAddresses; i += 1) {
    const address = `seed${i}abc@mail.nexorasolution.us`
    owned.push({ address, createdAt: Date.now() })
    await e.TEMP_MAIL.put(`a:${address}`, JSON.stringify(newPremiumSession({ expiresAt: Date.now() + 86400_000 }, uid)))
  }
  await e.TEMP_MAIL.put(`u:${uid}`, JSON.stringify(owned))
  const res = await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'address_limit')
})

test('/api/me: needs sign-in, shows the plan and renews addresses when the plan renews', async () => {
  const { e, token, uid } = await premiumEnv('user_premium_me')
  assert.equal((await handleRequest(call('/api/me'), e)).status, 401)

  const created = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()
  const first = await (await handleRequest(call('/api/me', { token }), e)).json()
  assert.equal(first.premium.active, true)
  assert.equal(first.addresses.length, 1)
  const before = Date.parse(first.addresses[0].expiresAt)

  // the plan renews for another 30 days: the next visit pushes the address out with it
  const ent = await e.TEMP_MAIL.get(`pm:${uid}`, 'json')
  await e.TEMP_MAIL.put(`pm:${uid}`, JSON.stringify({ ...ent, expiresAt: ent.expiresAt + 30 * 86400_000 }))
  const second = await (await handleRequest(call('/api/me', { token }), e)).json()
  assert.ok(Date.parse(second.addresses[0].expiresAt) - before >= 29 * 86400_000)
  assert.equal(second.addresses[0].address, created.address)
})

test('a lapsed plan is not renewed and cannot create premium addresses', async () => {
  const { e, token, uid } = await premiumEnv('user_premium_lapse')
  await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)
  await e.TEMP_MAIL.put(`pm:${uid}`, JSON.stringify({ status: 'expired', expiresAt: Date.now() - 1000 }))
  const me = await (await handleRequest(call('/api/me', { token }), e)).json()
  assert.equal(me.premium.active, false)
  const res = await handleRequest(call('/api/address', { method: 'POST', body: {}, token, ip: '4.4.4.4' }), e)
  assert.equal((await res.json()).premium, false)
})

test('premium addresses accept bigger mail than free ones', async () => {
  const { e, token } = await premiumEnv('user_premium_big')
  const { address } = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()
  let reason = null
  const big = rfc(address, 'Big', 'x'.repeat(4 * 1024 * 1024))
  await handleEmail(mail(address, big, { setReject: (m) => { reason = m } }), e)
  assert.equal(reason, null)
  const list = await (await handleRequest(call(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
  assert.equal(list.messages.length, 1)

  const free = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, ip: '5.5.5.5' }), e)).json()
  let freeReason = null
  await handleEmail(mail(free.address, big, { setReject: (m) => { freeReason = m } }), e)
  assert.equal(freeReason, 'Message too large')
})

test('forwarding: code to the destination, wrong code refused, right code forwards new mail as plain text', async () => {
  sentMail = []
  const { e, token, uid } = await premiumEnv('user_premium_fwd')
  const { address } = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()

  const start = await handleRequest(call('/api/forward', { method: 'POST', body: { address, to: 'Real@Example.com' }, token }), e)
  assert.equal(start.status, 200)
  assert.equal(sentMail.length, 1)
  assert.deepEqual(sentMail[0].to, ['real@example.com'])
  const code = /Your code is (\d{6})/.exec(sentMail[0].text)[1]

  const wrong = await handleRequest(call('/api/forward/verify', { method: 'POST', body: { address, code: code === '000000' ? '111111' : '000000' }, token }), e)
  assert.equal(wrong.status, 400)
  const right = await handleRequest(call('/api/forward/verify', { method: 'POST', body: { address, code }, token }), e)
  assert.equal(right.status, 200)
  assert.equal((await e.TEMP_MAIL.get(`fw:${address}`, 'json')).to, 'real@example.com')

  sentMail = []
  const ctx = { waitUntil: (p) => p }
  await handleEmail(mail(address, rfc(address, 'Your invoice', 'Pay now <b>please</b>')), e, ctx)
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(sentMail.length, 1)
  assert.deepEqual(sentMail[0].to, ['real@example.com'])
  assert.match(sentMail[0].subject, /^\[Temp Mail\] Your invoice/)
  assert.equal(sentMail[0].html, undefined) // never relays HTML
  assert.equal(sentMail[0].reply_to, 's@example.com')

  // an ended plan stops forwarding
  await e.TEMP_MAIL.put(`pm:${uid}`, JSON.stringify({ status: 'expired', expiresAt: Date.now() - 1000 }))
  sentMail = []
  await handleEmail(mail(address, rfc(address, 'Second', 'again')), e, ctx)
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(sentMail.length, 0)
})

test('forwarding: refuses own temp domain, other people\'s addresses and anonymous callers', async () => {
  const { e, token } = await premiumEnv('user_premium_fwd2')
  const { address } = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()
  const own = await handleRequest(call('/api/forward', { method: 'POST', body: { address, to: 'x@mail.nexorasolution.us' }, token }), e)
  assert.equal(own.status, 400)
  const anon = await handleRequest(call('/api/forward', { method: 'POST', body: { address, to: 'a@example.com' } }), e)
  assert.equal(anon.status, 401)
  const other = await premiumEnv('someone_else_1')
  const stolen = await handleRequest(call('/api/forward', { method: 'POST', body: { address, to: 'a@example.com' }, token: other.token }), e)
  assert.ok([403, 404].includes(stolen.status))
})

test('forwarding code: five wrong tries burn it', async () => {
  const { e, token } = await premiumEnv('user_premium_fwd3')
  const { address } = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()
  await handleRequest(call('/api/forward', { method: 'POST', body: { address, to: 'a@example.com' }, token }), e)
  for (let i = 0; i < PREMIUM_LIMITS.forwardCodesPerHour; i += 1) {
    await handleRequest(call('/api/forward/verify', { method: 'POST', body: { address, code: '999999' }, token }), e)
  }
  const res = await handleRequest(call('/api/forward/verify', { method: 'POST', body: { address, code: '999999' }, token }), e)
  assert.ok([404, 429].includes(res.status))
})

test('owner can delete an address; deleting wipes its forwarding too', async () => {
  const { e, token, uid } = await premiumEnv('user_premium_del')
  const { address } = await (await handleRequest(call('/api/address', { method: 'POST', body: {}, token }), e)).json()
  await e.TEMP_MAIL.put(`fw:${address}`, JSON.stringify({ to: 'a@example.com' }))
  const res = await handleRequest(call(`/api/me/address/${encodeURIComponent(address)}`, { method: 'DELETE', token }), e)
  assert.equal(res.status, 200)
  assert.equal(await e.TEMP_MAIL.get(`a:${address}`), null)
  assert.equal(await e.TEMP_MAIL.get(`fw:${address}`), null)
  assert.deepEqual(await e.TEMP_MAIL.get(`u:${uid}`, 'json'), [])
})

test('admin can grant and revoke Premium by uid; others cannot', async () => {
  const e = env()
  const admin = tokenFor('oR66tNaNw5Z5kXYdTa2Egco9Uv22', 'admin@example.com')
  const denied = await handleRequest(call('/api/admin/premium', { method: 'PUT', body: { uid: 'target_user_1', days: 7 }, token: tokenFor('random_user_1') }), e)
  assert.equal(denied.status, 403)
  const granted = await handleRequest(call('/api/admin/premium', { method: 'PUT', body: { uid: 'target_user_1', days: 7 }, token: admin }), e)
  assert.equal(granted.status, 200)
  const ent = await e.TEMP_MAIL.get('pm:target_user_1', 'json')
  assert.equal(ent.source, 'admin')
  assert.equal(isPremiumActive(ent), true)
  const overview = await (await handleRequest(call('/api/admin/overview', { token: admin }), e)).json()
  assert.equal(overview.premium.active, 1)
  await handleRequest(call('/api/admin/premium/target_user_1', { method: 'DELETE', token: admin }), e)
  assert.equal(isPremiumActive(await e.TEMP_MAIL.get('pm:target_user_1', 'json')), false)
})
