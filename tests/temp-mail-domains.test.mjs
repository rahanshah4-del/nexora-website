import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { handleRequest } from '../workers/nexora-temp-mail/src/index.js'
import { grantEntitlement } from '../workers/nexora-temp-mail/src/premium.js'
import { normalizeDomain, verifyWebhook } from '../workers/nexora-temp-mail/src/customdomain.js'
import { createHmac } from 'node:crypto'

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
let resendCalls = []
let domainStatus = 'not_started'
before(() => {
  globalThis.fetch = async (url, init) => {
    const href = String(url)
    if (href.includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    if (href === 'https://api.resend.com/emails') { sentMail.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }
    if (href === 'https://api.resend.com/domains' && init.method === 'POST') {
      resendCalls.push(['create', JSON.parse(init.body)])
      return new Response(JSON.stringify({ id: 'dom_1', name: JSON.parse(init.body).name, status: 'not_started', records: [
        { record: 'Receiving', name: JSON.parse(init.body).name, type: 'MX', value: 'inbound-smtp.us-east-1.amazonaws.com', priority: 10, status: 'not_started' },
        { record: 'DKIM', name: 'resend._domainkey', type: 'TXT', value: 'p=abc', status: 'not_started' },
      ] }))
    }
    if (href === 'https://api.resend.com/domains/dom_1/verify') { resendCalls.push(['verify']); return new Response('{}') }
    if (href === 'https://api.resend.com/domains/dom_1' && (!init.method || init.method === 'GET')) {
      return new Response(JSON.stringify({ id: 'dom_1', status: domainStatus, records: [{ record: 'Receiving', name: 'x', type: 'MX', value: 'v', priority: 10, status: domainStatus }] }))
    }
    if (href === 'https://api.resend.com/domains/dom_1' && init.method === 'DELETE') { resendCalls.push(['delete']); return new Response('{}') }
    if (href === 'https://api.resend.com/emails/receiving/em_1') return new Response(JSON.stringify({ from: 'Alice <alice@example.org>', to: ['hello@client.example'], subject: 'Hi there', text: 'Body text', html: '<p>Body text</p>', attachments: [{ id: 'a' }] }))
    throw new Error(`unexpected fetch ${href}`)
  }
})
after(() => { globalThis.fetch = realFetch })


const SECRET = `whsec_${Buffer.from('webhook-secret-bytes').toString('base64')}`
async function premiumEnv(uid, extra = {}) {
  const e = env({ RESEND_WEBHOOK_SECRET: SECRET, ...extra })
  await e.TEMP_MAIL.put('cfg:settings', JSON.stringify({ premiumEnabled: true }))
  await e.TEMP_MAIL.put(`pm:${uid}`, JSON.stringify(grantEntitlement({ days: 30, email: 'owner@example.com' })))
  return { e, uid, token: tokenFor(uid) }
}
function signedHook(payload, { id = 'msg_1', ts = Math.floor(Date.now() / 1000), secret = SECRET } = {}) {
  const body = JSON.stringify(payload)
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')
  return new Request('https://api.test/api/resend/inbound', { method: 'POST', headers: { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` }, body })
}

test('normalizeDomain: accepts domains, URLs and emails; refuses free mail and our own domains', () => {
  assert.equal(normalizeDomain('https://Client.Example/path').domain, 'client.example')
  assert.equal(normalizeDomain('me@mail.client.example').domain, 'mail.client.example')
  assert.equal(normalizeDomain('gmail.com').reason, 'domain_not_allowed')
  assert.equal(normalizeDomain('x.nexorasolution.us').reason, 'domain_not_allowed')
  assert.equal(normalizeDomain('not a domain').reason, 'invalid_domain')
  assert.equal(normalizeDomain('localhost').reason, 'invalid_domain')
})

test('verifyWebhook: right signature passes; wrong secret, tampered body and old timestamp fail', async () => {
  const req = signedHook({ a: 1 })
  const body = await req.clone().text()
  assert.equal(await verifyWebhook(SECRET, req.headers, body), true)
  assert.equal(await verifyWebhook(`whsec_${Buffer.from('other').toString('base64')}`, req.headers, body), false)
  assert.equal(await verifyWebhook(SECRET, req.headers, `${body} `), false)
  const old = signedHook({ a: 1 }, { ts: Math.floor(Date.now() / 1000) - 3600 })
  assert.equal(await verifyWebhook(SECRET, old.headers, await old.clone().text()), false)
})

test('custom domain: add, show DNS records, verify, set forwarding, then inbound mail is forwarded', async () => {
  sentMail = []; resendCalls = []; domainStatus = 'not_started'
  const { e, token } = await premiumEnv('user_domain_1')
  assert.equal((await handleRequest(call('/api/me/domains'), e)).status, 401)
  assert.equal((await handleRequest(call('/api/me/domains', { method: 'POST', body: { domain: 'client.example' }, token: tokenFor('nobody') }), e)).status, 403)

  const added = await handleRequest(call('/api/me/domains', { method: 'POST', body: { domain: 'Client.Example' }, token }), e)
  assert.equal(added.status, 201)
  const row = (await added.json()).domain
  assert.equal(row.domain, 'client.example')
  assert.equal(row.status, 'pending')
  assert.deepEqual(row.records.map((r) => r.type), ['MX']) // only what receiving needs
  assert.deepEqual(resendCalls[0][1].capabilities, { sending: 'disabled', receiving: 'enabled' })
  // somebody else cannot claim the same domain
  await e.TEMP_MAIL.put('pm:user_domain_2', JSON.stringify(grantEntitlement({ days: 30, email: 'two@example.com' })))
  assert.equal((await handleRequest(call('/api/me/domains', { method: 'POST', body: { domain: 'client.example' }, token: tokenFor('user_domain_2'), ip: '7.7.7.7' }), e)).status, 409)

  // forwarding cannot start before the domain is verified
  assert.equal((await handleRequest(call('/api/me/domains/client.example/forward', { method: 'POST', body: { to: 'me@gmail.com' }, token }), e)).status, 409)
  assert.equal((await (await handleRequest(call('/api/me/domains/client.example/verify', { method: 'POST', token }), e)).json()).domain.status, 'pending')
  domainStatus = 'verified'
  assert.equal((await (await handleRequest(call('/api/me/domains/client.example/verify', { method: 'POST', token }), e)).json()).domain.status, 'verified')

  // code to the destination, wrong code refused, right code turns forwarding on
  assert.equal((await handleRequest(call('/api/me/domains/client.example/forward', { method: 'POST', body: { to: 'me@gmail.com' }, token }), e)).status, 200)
  const code = sentMail.at(-1).subject.split(' ')[0]
  assert.equal((await handleRequest(call('/api/me/domains/client.example/forward/verify', { method: 'POST', body: { code: '000000' === code ? '111111' : '000000' }, token }), e)).status, 400)
  const ok = await handleRequest(call('/api/me/domains/client.example/forward/verify', { method: 'POST', body: { code }, token }), e)
  assert.equal((await ok.json()).domain.forwardTo, 'me@gmail.com')

  // a signed webhook forwards the mail; a bad signature does not
  const hook = { type: 'email.received', data: { email_id: 'em_1', to: ['Hello <hello@client.example>'], from: 'alice@example.org' } }
  sentMail = []
  const bad = new Request('https://api.test/api/resend/inbound', { method: 'POST', headers: { 'svix-id': 'x', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,nope' }, body: JSON.stringify(hook) })
  assert.equal((await handleRequest(bad, e)).status, 401)
  assert.equal(sentMail.length, 0)
  const res = await handleRequest(signedHook(hook), e)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).forwarded, 1)
  assert.equal(sentMail[0].to[0], 'me@gmail.com')
  assert.match(sentMail[0].subject, /Hi there/)
  assert.match(sentMail[0].text, /Body text/)
  assert.equal(sentMail[0].reply_to, 'alice@example.org')

  // mail for a domain nobody owns is ignored
  sentMail = []
  const stray = await handleRequest(signedHook({ type: 'email.received', data: { email_id: 'em_1', to: ['x@unknown.example'] } }), e)
  assert.equal((await stray.json()).forwarded, 0)
  assert.equal(sentMail.length, 0)

  // removing the domain stops forwarding
  assert.equal((await handleRequest(call('/api/me/domains/client.example', { method: 'DELETE', token }), e)).status, 200)
  assert.equal((await (await handleRequest(call('/api/me/domains', { token }), e)).json()).domains.length, 0)
  assert.equal((await (await handleRequest(signedHook(hook, { id: 'msg_2' }), e)).json()).forwarded, 0)
})
