import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { buildChecks, runCheck } from '../workers/nexora-sentinel/src/checks.js'
import { applyResults, emptyState, needsPersist, overallStatus, OPEN_AFTER, REMIND_MS } from '../workers/nexora-sentinel/src/state.js'
import { remedyPlan, runRemedy } from '../workers/nexora-sentinel/src/remedies.js'
import { buildMime, composeIncidentMail, defang, sendAlert } from '../workers/nexora-sentinel/src/mail.js'
import { listErrors, normalizeReport, recordError, redact, resetErrorBuffers, takeMailSlot, ALERT_AT, MAIL_PER_DAY } from '../workers/nexora-sentinel/src/errors.js'
import { handleAdmin, handleReport, loadState, runCycle, scheduledRun } from '../workers/nexora-sentinel/src/index.js'
import { ADMIN_UIDS } from '../workers/nexora-sentinel/src/admin.js'
import { redactForReport } from '../src/lib/sentinelAdmin.js'

const res = (status, body, json = false) => ({ status, ok: status >= 200 && status < 300, body: null, text: async () => body, json: async () => (json ? body : JSON.parse(body)) })
const fail = (id) => ({ id, label: id, group: 'g', ok: false, error: 'HTTP 500', ms: 5 })
const good = (id) => ({ id, label: id, group: 'g', ok: true, ms: 5 })
// Minute 2 of an hour (self-alerts allowed) and minute 30 (self-alerts throttled).
const AT_MIN2 = Date.UTC(2026, 9, 24, 10, 2)
const AT_MIN30 = Date.UTC(2026, 9, 24, 10, 30)

function fakeKv({ failPut = false } = {}) {
  const m = new Map()
  const meta = new Map()
  const kv = {
    m, writes: 0, failPut,
    get: async (k) => m.get(k) ?? null,
    put: async (k, v, opts = {}) => {
      if (kv.failPut) throw new Error('KV put() limit exceeded for the day')
      kv.writes += 1
      m.set(k, v)
      if (opts.metadata) meta.set(k, opts.metadata)
    },
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: meta.get(name) })) }),
  }
  return kv
}

/** A healthy platform; `overrides` maps a URL fragment to a response factory. */
function platform(overrides = {}) {
  return async (url) => {
    for (const [frag, fn] of Object.entries(overrides)) if (String(url).includes(frag)) return fn(url)
    if (String(url).includes('purge_cache')) return { ok: true, status: 200 }
    if (url.includes('nexorasolution.us')) return res(200, '<div id="root">')
    if (url.includes('/api/domains')) return res(200, { domains: ['mail.nexorasolution.us'] }, true)
    if (url.includes('googleapis.com/service_accounts')) return res(200, { keys: [{}] }, true)
    if (url.includes('firestore')) return res(403, '')
    return res(200, { status: 'ok', ok: true }, true)
  }
}

beforeEach(() => resetErrorBuffers())

// ---------------------------------------------------------------- checks

test('page check passes only when the app shell is present', async () => {
  const check = buildChecks().find((c) => c.id === 'site_home')
  assert.equal((await runCheck(check, async () => res(200, '<html><div id="root"></div>'))).ok, true)
  assert.equal((await runCheck(check, async () => res(200, '<html>Error</html>'))).ok, false)
  assert.equal((await runCheck(check, async () => res(503, ''))).ok, false)
})

test('json checks read the right field for every worker, and a thrown fetch is a failed result', async () => {
  const checks = buildChecks()
  const byId = (id) => checks.find((c) => c.id === id)
  // payments and passkeys answer { ok: true }, not { status: 'ok' }
  assert.equal((await runCheck(byId('api_payments'), async () => res(200, { ok: true, service: 'nexora-payments-api' }, true))).ok, true)
  assert.equal((await runCheck(byId('api_passkeys'), async () => res(200, { ok: true }, true))).ok, true)
  assert.equal((await runCheck(byId('api_ai'), async () => res(200, { status: 'healthy' }, true))).ok, true)
  assert.equal((await runCheck(byId('api_email'), async () => res(200, { status: 'broken' }, true))).ok, false)
  const r = await runCheck(byId('api_email'), async () => { throw new Error('boom') })
  assert.equal(r.ok, false)
  assert.match(r.error, /boom/)
})

test('the temp-mail probe uses the side-effect-free endpoint (no fake visits, no KV writes there)', () => {
  const check = buildChecks().find((c) => c.id === 'api_tempmail')
  assert.match(check.url, /\/api\/domains$/)
})

test('firestore counts as up for 403 but not for 500', async () => {
  const check = buildChecks().find((c) => c.id === 'firestore')
  assert.equal((await runCheck(check, async () => res(403, ''))).ok, true)
  assert.equal((await runCheck(check, async () => res(500, ''))).ok, false)
})

// ---------------------------------------------------------------- incident logic

const run = (state, results, now) => applyResults(state, results, now)

test('one blip opens nothing; consecutive failures open one incident; reminders every 6h', () => {
  let out = run(emptyState(), [fail('a')], 1000)
  assert.equal(out.events.length, 0)
  out = run(out.state, [good('a')], 2000)
  assert.equal(out.state.checks.a.fails, 0)
  let state = out.state
  for (let i = 0; i < OPEN_AFTER - 1; i += 1) state = run(state, [fail('a')], 3000 + i).state
  out = run(state, [fail('a')], 4000)
  assert.deepEqual(out.events.map((e) => e.type), ['opened'])
  assert.equal(overallStatus(out.state), 'down')
  out = run(out.state, [fail('a')], 4500)
  assert.equal(out.events.length, 0, 'no duplicate mail while open')
  out = run(out.state, [fail('a')], 4000 + REMIND_MS - 1)
  assert.equal(out.events.length, 0, 'no reminder before 6h')
  out = run(out.state, [fail('a')], 4000 + REMIND_MS)
  assert.deepEqual(out.events.map((e) => e.type), ['reminder'])
})

test('recovery needs two good runs, so a flapping service does not email on every flip', () => {
  let s = emptyState()
  s = run(s, [fail('a')], 1).state
  s = run(s, [fail('a')], 2).state
  let out = run(s, [good('a')], 3)
  assert.equal(out.events.length, 0, 'one good run is not a recovery')
  assert.equal(overallStatus(out.state), 'down')
  out = run(out.state, [fail('a')], 4)
  assert.equal(out.events.length, 0, 'still the same incident, no new "opened" mail')
  out = run(out.state, [good('a')], 5)
  out = run(out.state, [good('a')], 6)
  assert.deepEqual(out.events.map((e) => e.type), ['resolved'])
  assert.equal(overallStatus(out.state), 'healthy')
})

test('a check that fails every other run is caught as flapping', () => {
  let s = emptyState()
  let opened = null
  for (let i = 0; i < 14; i += 1) {
    const out = run(s, [i % 2 ? good('a') : fail('a')], i + 1)
    s = out.state
    opened = opened || out.events.find((e) => e.type === 'opened')
  }
  assert.ok(opened, 'flapping opens an incident even without two failures in a row')
  assert.equal(opened.incident.flapping, true)
})

test('applyResults never mutates the previous state', () => {
  let s = emptyState()
  s = run(s, [fail('a')], 1).state
  s = run(s, [fail('a')], 2).state
  const frozen = JSON.stringify(s)
  run(s, [good('a')], 3)
  run(s, [fail('a')], 2 + REMIND_MS)
  assert.equal(JSON.stringify(s), frozen)
})

test('an old open incident survives pruning of resolved history and still resolves', () => {
  let s = emptyState()
  s = run(s, [fail('old'), good('x')], 1).state
  s = run(s, [fail('old'), good('x')], 2).state
  // 60 short incidents on another check push lots of newer history in front of it
  for (let i = 0; i < 60; i += 1) {
    const t = 10 + i * 10
    s = run(s, [fail('old'), fail('x')], t).state
    s = run(s, [fail('old'), fail('x')], t + 1).state
    s = run(s, [fail('old'), good('x')], t + 2).state
    s = run(s, [fail('old'), good('x')], t + 3).state
  }
  assert.ok(s.incidents.some((i) => i.checkId === 'old' && !i.resolvedAt), 'open incident kept')
  assert.ok(s.incidents.length <= 31)
  s = run(s, [good('old'), good('x')], 9000).state
  const out = run(s, [good('old'), good('x')], 9001)
  assert.ok(out.events.some((e) => e.type === 'resolved' && e.incident.checkId === 'old'))
  assert.equal(overallStatus(out.state), 'healthy')
})

test('a dangling incident id or a removed check cannot keep the status "down" forever', () => {
  const dangling = { ...emptyState(), checks: { a: { id: 'a', ok: false, fails: 5, history: [0], incidentId: 'gone' } }, incidents: [] }
  const out = run(dangling, [good('a')], 1)
  assert.equal(out.state.checks.a.incidentId, '')
  let s = emptyState()
  s = run(s, [fail('removed'), good('b')], 1).state
  s = run(s, [fail('removed'), good('b')], 2).state
  assert.equal(overallStatus(s), 'down')
  s = run(s, [good('b')], 3).state
  assert.equal(s.checks.removed, undefined)
  assert.equal(overallStatus(s), 'healthy')
  assert.ok(s.incidents.every((i) => i.resolvedAt))
})

test('needsPersist: quiet healthy runs skip the KV write, changes and heartbeats do not', () => {
  const s1 = run(emptyState(), [good('a')], 1000).state
  s1.lastPersistAt = 1000
  const quiet = run(s1, [good('a')], 1000 + 5 * 60000).state
  assert.equal(needsPersist(s1, quiet), false)
  const later = run(s1, [good('a')], 1000 + 15 * 60000).state
  assert.equal(needsPersist(s1, later), true, 'heartbeat')
  const changed = run(s1, [fail('a')], 1000 + 5 * 60000).state
  assert.equal(needsPersist(s1, changed), true)
})

// ---------------------------------------------------------------- remedies

test('remedies: pages only, need secrets, one purge per run and per 30 min, rebuild rate limited', () => {
  const page = { kind: 'page' }
  const env = { CF_API_TOKEN: 'x', CF_ZONE_ID: 'z' }
  assert.deepEqual(remedyPlan({ kind: 'json' }, 5, env, 1e9), [])
  assert.deepEqual(remedyPlan(page, 1, {}, 1e9), [])
  assert.deepEqual(remedyPlan(page, 1, env, 1e9), ['purge_cache'])
  assert.deepEqual(remedyPlan(page, 1, env, 1e9, { purgedThisRun: true }), [])
  assert.deepEqual(remedyPlan(page, 1, env, 1e9, { purgeAt: 1e9 - 60000 }), [])
  const full = { ...env, DEPLOY_HOOK: 'https://h' }
  assert.deepEqual(remedyPlan(page, 3, full, 1e9, { redeployAt: 1e9 - 1000 }), ['purge_cache'])
  assert.deepEqual(remedyPlan(page, 3, full, 1e9, {}), ['purge_cache', 'redeploy'])
  assert.deepEqual(remedyPlan(page, 3, { PAGES_DEPLOY_HOOK: 'https://h' }, 1e9, {}), ['redeploy'], 'old secret name still works')
})

test('runRemedy reports what happened instead of throwing', async () => {
  assert.match(await runRemedy('purge_cache', { CF_ZONE_ID: 'z', CF_API_TOKEN: 't' }, async () => ({ ok: true })), /Purged/)
  assert.match(await runRemedy('redeploy', { DEPLOY_HOOK: 'h' }, async () => { throw new Error('net') }), /errored/)
})

// ---------------------------------------------------------------- mail

test('alert mail is valid MIME, header-injection safe, CRLF-normalised and goes to the owner only', async () => {
  const raw = buildMime({ from: 'a@x.us', to: 'me@x.com\r\nBcc: evil@x.com', subject: 'Down 🚨\r\nX: y', text: 'line1\nline2\rline3', messageId: 'id1' })
  assert.ok(!/\r\nBcc:/.test(raw))
  assert.match(raw, /^Subject: =\?UTF-8\?B\?/m)
  assert.ok(!/\r(?!\n)/.test(raw), 'no lone CR')
  let sent
  const r = await sendAlert({ ALERT_TO: 'rahanshah4@gmail.com' }, 's', 't', async (m) => { sent = m })
  assert.equal(r.ok, true)
  assert.equal(sent.to, 'rahanshah4@gmail.com')
  assert.equal((await sendAlert({}, 's', 't')).ok, false)
  const mail = composeIncidentMail({ type: 'opened', incident: { label: 'Homepage', group: 'Website', openedAt: 0, lastError: 'HTTP 500' } }, ['Purged the Cloudflare cache'])
  assert.match(mail.text, /Purged the Cloudflare cache/)
  assert.equal(defang('see https://evil.example/x and www.evil.example'), 'see [link removed] and [link removed]')
})

// ---------------------------------------------------------------- browser errors

test('reports are redacted, noise is dropped, ids and numbers group together', async () => {
  assert.equal(redact('user a.b@c.com id 1234567 tok AbCdEfGhIjKlMnOpQrStUvWxYz'), 'user [email] id [number] tok [id]')
  assert.equal(redactForReport('mail a@b.co'), 'mail [email]')
  assert.equal(normalizeReport({ message: 'Script error.' }), null)
  assert.equal(normalizeReport({ message: 'ResizeObserver loop limit exceeded' }), null)
  assert.equal(normalizeReport({ message: '  ' }), null)
  const kv = fakeKv()
  const a = normalizeReport({ message: 'Cannot read x of undefined (chunk deadbeefcafe1234)', page: '/pricing?x=1' })
  const b = normalizeReport({ message: 'Cannot read x of undefined (chunk 0123abcd99887766)', page: '/pricing' })
  assert.equal(a.page, '/pricing')
  await recordError(kv, a, 'ip1', 1000)
  await recordError(kv, b, 'ip2', 200000)
  assert.equal([...kv.m.keys()].filter((k) => k.startsWith('err:')).length, 1)
})

test('reports are batched: a storm of one error costs one KV write per minute per isolate', async () => {
  const kv = fakeKv()
  const report = normalizeReport({ message: 'Boom', page: '/' })
  for (let i = 0; i < 500; i += 1) await recordError(kv, report, `ip${i % 7}`, 1000 + i * 10)
  assert.equal(kv.writes, 1)
  const { rec } = await recordError(kv, report, 'ip9', 1000 + 70000)
  assert.equal(kv.writes, 2)
  assert.equal(rec.count, 501, 'buffered reports are not lost')
})

test('random messages cannot flood KV with new keys', async () => {
  const kv = fakeKv()
  for (let i = 0; i < 200; i += 1) await recordError(kv, normalizeReport({ message: `random ${'x'.repeat(i % 50)}-${String.fromCharCode(97 + (i % 26))}${i}`, page: '/' }), 'ip', 1000)
  assert.ok(kv.writes <= 30, `writes ${kv.writes}`)
})

test('the owner is emailed only for an error many different visitors hit, and at most 3 times a day', async () => {
  const kv = fakeKv()
  const report = normalizeReport({ message: 'Boom', page: '/' })
  let t = 0
  let notified = 0
  for (let i = 0; i < ALERT_AT + 5; i += 1) {
    t += 61000
    if ((await recordError(kv, report, 'same-ip', t)).notify) notified += 1
  }
  assert.equal(notified, 0, 'one visitor (or one attacker) cannot trigger the email')
  for (const ip of ['ip-a', 'ip-b', 'ip-c']) {
    t += 61000
    if ((await recordError(kv, report, ip, t)).notify) notified += 1
  }
  assert.equal(notified, 1)
  const slots = []
  for (let i = 0; i < MAIL_PER_DAY + 2; i += 1) slots.push(await takeMailSlot(kv, AT_MIN2))
  assert.equal(slots.filter(Boolean).length, MAIL_PER_DAY)
  const listed = await listErrors(kv)
  assert.equal(listed[0].message, 'Boom')
  assert.equal(listed[0].reporters, 4)
})

const reportRequest = (body, origin = 'https://nexorasolution.us', extra = {}) => new Request('https://s.dev/api/report', {
  method: 'POST', headers: { origin, 'content-type': 'text/plain', 'cf-connecting-ip': '1.2.3.4', ...extra }, body,
})
const ENV_BASE = { ALLOWED_ORIGINS: 'https://nexorasolution.us,http://localhost:5173', ALERT_TO: 'rahanshah4@gmail.com' }

test('/api/report: live site only, size limited, text/plain JSON accepted', async () => {
  const env = { ...ENV_BASE, SENTINEL: fakeKv() }
  assert.equal((await handleReport(reportRequest('{"message":"x"}', 'http://localhost:5173'), env)).status, 403)
  assert.equal((await handleReport(reportRequest('{"message":"x"}', 'https://evil.example'), env)).status, 403)
  assert.equal((await handleReport(reportRequest(JSON.stringify({ message: 'x'.repeat(5000) })), env)).status, 413)
  assert.equal((await handleReport(reportRequest('not json'), env)).status, 400)
  assert.equal((await handleReport(reportRequest('{"message":"Real bug","page":"/x"}'), env)).status, 202)
  const broken = { ...env, SENTINEL: fakeKv({ failPut: true }) }
  assert.equal((await handleReport(reportRequest('{"message":"Other bug","page":"/y"}', 'https://nexorasolution.us', { 'cf-connecting-ip': '9.9.9.9' }), broken)).status, 202, 'storage trouble never errors the site')
})

// ---------------------------------------------------------------- full cycles

test('a full cycle: a page healed by cache purge, a dead API opens one incident and emails the owner once', async () => {
  const env = { ...ENV_BASE, SENTINEL: fakeKv(), CF_API_TOKEN: 't', CF_ZONE_ID: 'z' }
  const sent = []
  let purged = false
  const fetchFn = platform({
    purge_cache: () => { purged = true; return { ok: true, status: 200 } },
    'nexorasolution.us/pricing': () => (purged ? res(200, '<div id="root">') : res(500, '')),
    'nexora-email-api': () => res(500, ''),
  })
  const sender = async (m) => { sent.push(m) }
  let out = await runCycle(env, { fetchFn, sender, now: 1000 })
  assert.equal(out.state.checks.site_pricing.ok, true, 'healed by the purge')
  assert.equal(out.state.fixLog[0].recovered, true)
  assert.equal(sent.length, 0, 'one failure is not an incident')
  out = await runCycle(env, { fetchFn, sender, now: 2000 })
  assert.equal(sent.length, 1)
  assert.match(sent[0].raw, /Email API/)
  assert.equal(sent[0].to, 'rahanshah4@gmail.com')
  await runCycle(env, { fetchFn, sender, now: 3000 })
  await runCycle(env, { fetchFn, sender, now: 4000 })
  assert.equal(sent.length, 1, 'no repeat while it stays down, and the sent mail is not re-sent from the outbox')
  assert.equal((await loadState(env)).outbox.length, 0)
})

test('a failed alert email is retried on later runs and flagged until it goes out', async () => {
  const env = { ...ENV_BASE, SENTINEL: fakeKv() }
  const fetchFn = platform({ 'nexora-email-api': () => res(500, '') })
  let mailUp = false
  const sent = []
  const sender = async (m) => { if (!mailUp) throw new Error('destination not verified'); sent.push(m) }
  await runCycle(env, { fetchFn, sender, now: 1000 })
  const out = await runCycle(env, { fetchFn, sender, now: 2000 })
  assert.equal(out.state.lastMailError, 'destination not verified')
  const saved = await loadState(env)
  assert.equal(saved.outbox.length, 1)
  assert.equal(saved.incidents[0].mailed, false)
  mailUp = true
  await runCycle(env, { fetchFn, sender, now: 3000 })
  assert.equal(sent.length, 1, 'delivered on the retry')
  const after = await loadState(env)
  assert.equal(after.outbox.length, 0)
  assert.equal(after.lastMailError, '')
})

test('if the state cannot be saved, no incident mail goes out (it would repeat every run); one throttled self-alert instead', async () => {
  const kv = fakeKv()
  const env = { ...ENV_BASE, SENTINEL: kv }
  const fetchFn = platform({ 'nexora-email-api': () => res(500, '') })
  const sent = []
  const sender = async (m) => { sent.push(m) }
  await runCycle(env, { fetchFn, sender, now: AT_MIN30 })
  kv.failPut = true
  await runCycle(env, { fetchFn, sender, now: AT_MIN30 + 300000 })
  assert.equal(sent.length, 0, 'throttled outside the first 5 minutes of the hour')
  await runCycle(env, { fetchFn, sender, now: AT_MIN2 + 3600000 })
  assert.equal(sent.length, 1)
  assert.match(sent[0].raw, /monitoring system itself/)
  assert.match(sent[0].raw, /Email API/)
})

test('when every check fails at once (Sentinel-side network), no incidents open; one warning after 3 runs', async () => {
  const env = { ...ENV_BASE, SENTINEL: fakeKv() }
  const fetchFn = async () => { throw new Error('network down') }
  const sent = []
  for (let i = 0; i < 5; i += 1) await runCycle(env, { fetchFn, sender: async (m) => { sent.push(m) }, now: 1000 + i })
  const state = await loadState(env)
  assert.equal(state.incidents.length, 0)
  assert.equal(sent.length, 1)
  assert.match(sent[0].raw, /network problem on the monitoring side/)
})

test('healthy runs write KV only on the 15-minute heartbeat', async () => {
  const kv = fakeKv()
  const env = { ...ENV_BASE, SENTINEL: kv }
  for (let i = 0; i < 12; i += 1) await runCycle(env, { fetchFn: platform(), now: 1000 + i * 5 * 60000 })
  assert.ok(kv.writes <= 5, `writes ${kv.writes} for 12 runs`)
})

test('a corrupt state starts fresh; a crashing run never throws from the cron', async () => {
  const kv = fakeKv()
  kv.m.set('state', '{not json')
  const env = { ...ENV_BASE, SENTINEL: kv }
  assert.deepEqual((await loadState(env)).incidents, [])
  const broken = { ...ENV_BASE, SENTINEL: { get: async () => { throw new Error('KV down') } } }
  const sent = []
  const out = await scheduledRun(broken, { fetchFn: platform(), sender: async (m) => { sent.push(m) }, now: AT_MIN2 })
  assert.equal(out.crashed, true)
  assert.equal(sent.length, 1)
})

// ---------------------------------------------------------------- admin API

const PROJECT = 'nexora-business-suite'
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
const adminFetch = platform({ 'googleapis.com/service_accounts': () => res(200, { keys: [jwk] }, true) })
const adminReq = async (path, method, sub = ADMIN_UIDS[0]) => new Request(`https://s.dev${path}`, { method, headers: { authorization: `Bearer ${await token(sub)}`, origin: 'https://nexorasolution.us' } })

test('admin API: non-admins are refused; "check now" is refused within a minute of the last run', async () => {
  const env = { ...ENV_BASE, SENTINEL: fakeKv(), FIREBASE_PROJECT_ID: PROJECT }
  const opts = { fetchFn: adminFetch, sender: async () => {} }
  assert.equal((await handleAdmin(await adminReq('/api/admin/status', 'GET', 'SomeoneElse1234567890abcdefgh'), env, '/api/admin/status', opts)).status, 403)
  assert.equal((await handleAdmin(new Request('https://s.dev/api/admin/status'), env, '/api/admin/status', opts)).status, 401)
  const first = await handleAdmin(await adminReq('/api/admin/run', 'POST'), env, '/api/admin/run', { ...opts, now: 1_000_000 })
  assert.equal(first.status, 200)
  const second = await handleAdmin(await adminReq('/api/admin/run', 'POST'), env, '/api/admin/run', { ...opts, now: 1_030_000 })
  assert.equal(second.status, 429)
  const status = await (await handleAdmin(await adminReq('/api/admin/status', 'GET'), env, '/api/admin/status', opts)).json()
  assert.equal(status.overall, 'healthy')
  assert.equal(status.checks.length, buildChecks().length)
})
