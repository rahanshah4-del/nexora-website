/** Control Centre side of the temp-mail Worker: admin auth, runtime settings, daily stats. */
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { handleEmail, handleRequest } from '../workers/nexora-temp-mail/src/index.js'
import { ADMIN_UIDS, mergeSettings } from '../workers/nexora-temp-mail/src/admin.js'

const PROJECT = 'nexora-business-suite'
const ORIGIN = 'https://nexorasolution.us'
const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }
const b64 = (v) => Buffer.from(v).toString('base64url')
async function token(sub) {
  const h = b64(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const p = b64(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub, iat: now, exp: now + 3600 }))
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64(new Uint8Array(sig))}`
}

function fakeKv() {
  const store = new Map()
  return {
    store,
    async get(key, type) { const v = store.get(key)?.value; if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v },
    async put(key, value, opts) { store.set(key, { value, ttl: opts?.expirationTtl, metadata: opts?.metadata }) },
    async delete(key) { store.delete(key) },
    async list({ prefix }) { return { keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })), list_complete: true } },
  }
}
const mkEnv = () => ({ TEMP_MAIL_DOMAINS: 'mail.nexorasolution.us', ALLOWED_ORIGINS: ORIGIN, MESSAGE_TTL_SECONDS: '3600', TEMP_MAIL: fakeKv() })

let realFetch
beforeEach(() => {
  realFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    throw new Error(`unexpected fetch ${url}`)
  }
})
afterEach(() => { globalThis.fetch = realFetch })

const api = (path, { method = 'GET', body, auth, ip = '1.1.1.1' } = {}) => new Request(`https://api.test${path}`, {
  method,
  headers: { origin: ORIGIN, 'cf-connecting-ip': ip, 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
})
const rfc = (to) => `From: S <s@example.com>\r\nTo: ${to}\r\nSubject: Code\r\nContent-Type: text/plain\r\n\r\nYour code is 482913\r\n`
const mail = (to, extra = {}) => { const raw = rfc(to); return { to, from: 's@example.com', rawSize: raw.length, raw: new Response(raw).body, setReject: () => {}, ...extra } }

test('admin endpoints need a valid Firebase token from an admin UID', async () => {
  const env = mkEnv()
  assert.equal((await handleRequest(api('/api/admin/overview'), env)).status, 401)
  assert.equal((await handleRequest(api('/api/admin/overview', { auth: 'junk.token.here' }), env)).status, 401)
  assert.equal((await handleRequest(api('/api/admin/overview', { auth: await token('not-an-admin') }), env)).status, 403)
  assert.equal((await handleRequest(api('/api/admin/overview', { auth: await token(ADMIN_UIDS[0]) }), env)).status, 200)
  assert.equal((await handleRequest(api('/api/admin/settings', { method: 'PUT', body: { creationEnabled: false } }), env)).status, 401)
})

test('settings are validated and merged', () => {
  const s = mergeSettings({}, { createPerMinute: 9999, maxExtensions: -4, notice: '<b>Hi</b>', blockedDomains: ['Spam.Example.com', 'not a domain', '@bad.io'], creationEnabled: 'yes', extra: 1 })
  assert.equal(s.createPerMinute, 60)
  assert.equal(s.maxExtensions, 0)
  assert.equal(s.notice, 'bHi/b')
  assert.deepEqual(s.blockedDomains, ['spam.example.com', 'bad.io'])
  assert.equal(s.creationEnabled, true)
  assert.equal('extra' in s, false)
})

test('kill switches and blocklist change behaviour at once; stats are counted', async () => {
  const env = mkEnv()
  const admin = await token(ADMIN_UIDS[0])
  const put = (body) => handleRequest(api('/api/admin/settings', { method: 'PUT', auth: admin, body }), env)

  const created = await (await handleRequest(api('/api/address', { method: 'POST', body: {} }), env)).json()
  assert.ok(created.address)
  await handleRequest(api('/api/config'), env)
  await handleEmail(mail(created.address), env)

  // custom names off
  await put({ customAddressEnabled: false })
  env.TEMP_MAIL.store.delete('cfg:settings:cache')
  const custom = await handleRequest(api('/api/address', { method: 'POST', body: { local: 'myname01' }, ip: '2.2.2.2' }), env)
  // the 10 s settings cache is per env object; a fresh env sharing the same KV sees the change immediately
  const env2 = { ...env }
  assert.equal((await handleRequest(api('/api/address', { method: 'POST', body: { local: 'myname01' }, ip: '3.3.3.3' }), env2)).status, 403)
  assert.ok([201, 403].includes(custom.status))

  // creation off
  await put({ customAddressEnabled: true, creationEnabled: false })
  assert.equal((await handleRequest(api('/api/address', { method: 'POST', body: {}, ip: '4.4.4.4' }), { ...env })).status, 503)
  assert.equal((await (await handleRequest(api('/api/config'), { ...env })).json()).creationEnabled, false)

  // receiving off rejects, blocklist rejects
  await put({ creationEnabled: true, receivingEnabled: false })
  let reason = ''
  await handleEmail(mail(created.address, { setReject: (m) => { reason = m } }), { ...env })
  assert.equal(reason, 'Temporarily unavailable')
  await put({ receivingEnabled: true, blockedDomains: ['example.com'] })
  reason = ''
  await handleEmail(mail(created.address, { setReject: (m) => { reason = m } }), { ...env })
  assert.equal(reason, 'Sender blocked')

  const overview = await (await handleRequest(api('/api/admin/overview', { auth: admin }), { ...env })).json()
  const today = overview.days.at(-1)
  assert.equal(overview.days.length, 30)
  assert.ok(today.created >= 1 && today.visits >= 1 && today.mail_received === 1 && today.codes_found === 1 && today.mail_blocked_sender === 1)
  assert.equal(overview.activeAddresses >= 1, true)
  assert.deepEqual(overview.settings.blockedDomains, ['example.com'])
  assert.equal(overview.system.captchaEnforced, false)
})
