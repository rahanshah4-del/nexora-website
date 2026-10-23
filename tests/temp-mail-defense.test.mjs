/** Bot defense: scoring, bans, tightening, monitor mode, allowlist, mail spray, admin view. */
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { handleEmail, handleRequest } from '../workers/nexora-temp-mail/src/index.js'
import { ADMIN_UIDS, mergeSettings, saveSettings } from '../workers/nexora-temp-mail/src/admin.js'
import { hashIp, maskIp, scoreSignals, verdictFor } from '../workers/nexora-temp-mail/src/defense.js'

const PROJECT = 'nexora-business-suite'
const ORIGIN = 'https://nexorasolution.us'
const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }
const b64 = (v) => Buffer.from(v).toString('base64url')
async function adminToken() {
  const h = b64(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const p = b64(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: ADMIN_UIDS[0], iat: now, exp: now + 3600 }))
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
    async list({ prefix }) { return { keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).map(([name, v]) => ({ name, metadata: v.metadata })), list_complete: true } },
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

const BROWSER = { 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36', 'accept-language': 'en-US', 'sec-fetch-site': 'cross-site', origin: ORIGIN }
const call = (path, { method = 'GET', body, ip = '5.5.5.5', headers = BROWSER, cf, auth } = {}) => {
  const r = new Request(`https://api.test${path}`, {
    method, headers: { 'cf-connecting-ip': ip, 'content-type': 'application/json', ...headers, ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (cf) r.cf = cf
  return r
}
const create = (env, opts) => handleRequest(call('/api/address', { method: 'POST', body: {}, ...opts }), env)
const visit = (env, ip) => handleRequest(call('/api/config', { ip }), env)

test('scoring: browsers are people, scripts are bots, datacenter without a visit is suspicious', async () => {
  const settings = mergeSettings({}, {})
  const browser = { ua: 'Mozilla/5.0 Chrome/130', lang: 'en', fetchMeta: 'cross-site', origin: ORIGIN, org: 'Jazz Telecom', asn: 1 }
  assert.equal(verdictFor(scoreSignals(browser, { visited: true, sinceVisitMs: 9000 }).score, settings), 'human')
  assert.equal(verdictFor(scoreSignals({ ua: 'curl/8.4', lang: '', fetchMeta: '', origin: '', org: '' }, {}).score, settings), 'bot')
  assert.equal(verdictFor(scoreSignals({ ua: 'Mozilla/5.0 HeadlessChrome/130', lang: 'en', fetchMeta: 'cross-site', origin: ORIGIN, org: '' }, { visited: true, sinceVisitMs: 9000 }).score, settings), 'suspicious')
  assert.equal(verdictFor(scoreSignals({ ...browser, org: 'Amazon.com, Inc.' }, {}).score, settings), 'suspicious')
  const reasons = scoreSignals({ ua: '', lang: '', fetchMeta: '', origin: '', org: 'Hetzner Online GmbH' }, {}).reasons
  assert.ok(['no_user_agent', 'datacenter_network', 'no_page_visit'].every((r) => reasons.includes(r)))
  assert.equal(maskIp('203.0.113.77'), '203.0.x.x')
  assert.equal((await hashIp('1.2.3.4', {})).length, 16)
})

test('a script is refused and banned; the ban sticks even if it then looks like a browser; unban works', async () => {
  const env = mkEnv()
  const res = await create(env, { headers: { 'user-agent': 'python-requests/2.31' }, ip: '9.9.9.9' })
  assert.equal(res.status, 403)
  assert.equal((await res.json()).error, 'blocked')
  const bans = [...env.TEMP_MAIL.store.keys()].filter((k) => k.startsWith('ban:'))
  assert.equal(bans.length, 1)
  await visit(env, '9.9.9.9')
  assert.equal((await create(env, { ip: '9.9.9.9' })).status, 403) // banned now, browser headers do not help
  const admin = await adminToken()
  const overview = await (await handleRequest(call('/api/admin/overview', { auth: admin, headers: {} }), env)).json()
  assert.equal(overview.defense.bans.length, 1)
  assert.equal(overview.defense.bans[0].ip, '9.9.x.x')
  assert.ok(overview.defense.recent.some((e) => e.v === 'bot' && e.r.includes('automation_user_agent')))
  const hash = bans[0].slice(4)
  assert.equal((await handleRequest(call(`/api/admin/ban/${hash}`, { method: 'DELETE', auth: admin, headers: {} }), env)).status, 200)
  assert.equal(env.TEMP_MAIL.store.has(`ban:${hash}`), false)
})

test('a normal browser that loaded the page can create an address', async () => {
  const env = mkEnv()
  await visit(env, '7.7.7.7')
  assert.equal((await create(env, { ip: '7.7.7.7' })).status, 201)
})

test('a suspicious visitor (datacenter, no page visit) gets much tighter limits', async () => {
  const env = mkEnv()
  const cf = { asn: 16509, asOrganization: 'Amazon.com, Inc.', country: 'US' }
  assert.equal((await create(env, { ip: '8.8.8.8', cf })).status, 201)
  assert.equal((await create(env, { ip: '8.8.8.8', cf })).status, 201)
  assert.equal((await create(env, { ip: '8.8.8.8', cf })).status, 429) // 2 per minute instead of 5
})

test('monitor mode records what it would do but lets the request through; allowlisted IPs skip scoring', async () => {
  const env = mkEnv()
  await saveSettings(env, { defenseMode: 'monitor' })
  assert.equal((await create({ ...env }, { headers: { 'user-agent': 'curl/8' }, ip: '6.6.6.6' })).status, 201)
  const events = [...env.TEMP_MAIL.store.entries()].filter(([k]) => k.startsWith('sec:evt:')).map(([, v]) => v.metadata)
  assert.ok(events.some((e) => e.x === 'monitor:block'))
  assert.equal([...env.TEMP_MAIL.store.keys()].some((k) => k.startsWith('ban:')), false)

  await saveSettings(env, { defenseMode: 'enforce', allowIps: ['4.4.4.4'] })
  assert.equal((await create({ ...env }, { headers: { 'user-agent': 'curl/8' }, ip: '4.4.4.4' })).status, 201)
  assert.equal((await create({ ...env }, { headers: { 'user-agent': 'curl/8' }, ip: '4.4.4.5' })).status, 403)
})

test('mail spray: one sender hitting many inboxes is blocked; big providers are not', async () => {
  const env = mkEnv()
  await saveSettings(env, { sprayLimit: 10 })
  const addresses = []
  for (let i = 0; i < 12; i += 1) {
    await visit(env, `3.3.3.${i}`)
    addresses.push((await (await create({ ...env }, { ip: `3.3.3.${i}` })).json()).address)
  }
  const mailFrom = (from, to) => {
    const raw = `From: S <${from}>\r\nTo: ${to}\r\nSubject: Buy\r\nContent-Type: text/plain\r\n\r\nhello\r\n`
    let reason = ''
    return { msg: { to, from, rawSize: raw.length, raw: new Response(raw).body, setReject: (m) => { reason = m } }, reason: () => reason }
  }
  const rejected = []
  for (const a of addresses) { const m = mailFrom('promo@spray.example', a); await handleEmail(m.msg, { ...env }); rejected.push(m.reason()) }
  assert.deepEqual(rejected.slice(0, 9), Array(9).fill(''))
  assert.equal(rejected[9], 'Sender blocked')
  assert.ok(env.TEMP_MAIL.store.has('bl:spray.example'))
  for (const a of addresses) { const m = mailFrom('news@gmail.com', a); await handleEmail(m.msg, { ...env }); assert.equal(m.reason(), '') }
})

test('defense settings are validated', () => {
  const s = mergeSettings({}, { defenseMode: 'nope', botThreshold: 10, suspiciousThreshold: 99, sprayLimit: 3, allowIps: ['1.2.3.4', '<script>', '2001:db8::1'] })
  assert.equal(s.defenseMode, 'enforce')
  assert.equal(s.botThreshold, 50)
  assert.ok(s.suspiciousThreshold < s.botThreshold)
  assert.equal(s.sprayLimit, 10)
  assert.deepEqual(s.allowIps, ['1.2.3.4', '2001:db8::1'])
})
