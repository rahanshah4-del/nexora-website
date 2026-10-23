import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildChecks, runCheck } from '../workers/nexora-sentinel/src/checks.js'
import { applyResults, emptyState, overallStatus, OPEN_AFTER, REMIND_MS } from '../workers/nexora-sentinel/src/state.js'
import { remedyPlan, runRemedy } from '../workers/nexora-sentinel/src/remedies.js'
import { buildMime, composeIncidentMail, sendAlert } from '../workers/nexora-sentinel/src/mail.js'
import { normalizeReport, recordError } from '../workers/nexora-sentinel/src/errors.js'
import { runCycle } from '../workers/nexora-sentinel/src/index.js'

const res = (status, body, json = false) => ({ status, ok: status >= 200 && status < 300, text: async () => body, json: async () => (json ? body : JSON.parse(body)) })
const fail = (id) => ({ id, label: id, group: 'g', ok: false, error: 'HTTP 500', ms: 5 })
const good = (id) => ({ id, label: id, group: 'g', ok: true, ms: 5 })

function fakeKv() {
  const m = new Map()
  return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v) }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }) }
}

test('page check passes only when the app shell is present', async () => {
  const check = buildChecks().find((c) => c.id === 'site_home')
  assert.equal((await runCheck(check, async () => res(200, '<html><div id="root"></div>'))).ok, true)
  assert.equal((await runCheck(check, async () => res(200, '<html>Error</html>'))).ok, false)
  assert.equal((await runCheck(check, async () => res(503, ''))).ok, false)
})

test('json checks read the field, and a thrown fetch is a failed result', async () => {
  const check = buildChecks().find((c) => c.id === 'api_email')
  assert.equal((await runCheck(check, async () => res(200, { status: 'ok' }, true))).ok, true)
  assert.equal((await runCheck(check, async () => res(200, { status: 'broken' }, true))).ok, false)
  const r = await runCheck(check, async () => { throw new Error('boom') })
  assert.equal(r.ok, false)
  assert.match(r.error, /boom/)
})

test('firestore counts as up for 403 but not for 500', async () => {
  const check = buildChecks().find((c) => c.id === 'firestore')
  assert.equal((await runCheck(check, async () => res(403, ''))).ok, true)
  assert.equal((await runCheck(check, async () => res(500, ''))).ok, false)
})

test('one blip opens nothing; consecutive failures open one incident, then recovery closes it', () => {
  let state = emptyState()
  let out = applyResults(state, [fail('a')], 1000)
  assert.equal(out.events.length, 0)
  state = out.state
  out = applyResults(state, [good('a')], 2000)
  assert.equal(out.state.checks.a.fails, 0)
  state = out.state
  for (let i = 0; i < OPEN_AFTER - 1; i += 1) state = applyResults(state, [fail('a')], 3000 + i).state
  out = applyResults(state, [fail('a')], 4000)
  assert.deepEqual(out.events.map((e) => e.type), ['opened'])
  assert.equal(overallStatus(out.state), 'down')
  out = applyResults(out.state, [fail('a')], 4500)
  assert.equal(out.events.length, 0, 'no duplicate mail while open')
  out = applyResults(out.state, [fail('a')], 4500 + REMIND_MS)
  assert.deepEqual(out.events.map((e) => e.type), ['reminder'])
  out = applyResults(out.state, [good('a')], 9e9)
  assert.deepEqual(out.events.map((e) => e.type), ['resolved'])
  assert.equal(overallStatus(out.state), 'healthy')
})

test('remedies only run for pages, only with their secrets, and redeploy is rate limited', () => {
  const page = { kind: 'page' }
  assert.deepEqual(remedyPlan({ kind: 'json' }, 5, { CF_API_TOKEN: 'x', CF_ZONE_ID: 'z' }, 1e9), [])
  assert.deepEqual(remedyPlan(page, 1, {}, 1e9), [])
  assert.deepEqual(remedyPlan(page, 1, { CF_API_TOKEN: 'x', CF_ZONE_ID: 'z' }, 1e9), ['purge_cache'])
  const env = { CF_API_TOKEN: 'x', CF_ZONE_ID: 'z', PAGES_DEPLOY_HOOK: 'https://h' }
  assert.deepEqual(remedyPlan(page, 3, env, 1e9, 1e9 - 1000), ['purge_cache'])
  assert.deepEqual(remedyPlan(page, 3, env, 1e9, 0), ['purge_cache', 'redeploy'])
})

test('runRemedy reports what happened instead of throwing', async () => {
  assert.match(await runRemedy('purge_cache', { CF_ZONE_ID: 'z', CF_API_TOKEN: 't' }, async () => ({ ok: true })), /Purged/)
  assert.match(await runRemedy('redeploy', { PAGES_DEPLOY_HOOK: 'h' }, async () => { throw new Error('net') }), /errored/)
})

test('alert mail is valid MIME, header-injection safe, and goes to the owner only', async () => {
  const raw = buildMime({ from: 'a@x.us', to: 'me@x.com\r\nBcc: evil@x.com', subject: 'Down 🚨\r\nX: y', text: 'line1\nline2', messageId: 'id1' })
  assert.ok(!/\r\nBcc:/.test(raw))
  assert.match(raw, /^Subject: =\?UTF-8\?B\?/m)
  let sent
  const r = await sendAlert({ ALERT_TO: 'rahanshah4@gmail.com' }, 's', 't', async (m) => { sent = m })
  assert.equal(r.ok, true)
  assert.equal(sent.to, 'rahanshah4@gmail.com')
  assert.equal((await sendAlert({}, 's', 't')).ok, false)
  const mail = composeIncidentMail({ type: 'opened', incident: { label: 'Homepage', group: 'Website', openedAt: 0, lastError: 'HTTP 500' } }, ['Purged the Cloudflare cache'])
  assert.match(mail.text, /Purged the Cloudflare cache/)
})

test('browser errors group together and alert once at the threshold', async () => {
  const kv = fakeKv()
  const report = normalizeReport({ message: 'Cannot read x of undefined at 123', page: '/pricing?x=1', kind: 'error' })
  assert.equal(report.page, '/pricing')
  let notified = 0
  for (let i = 0; i < 12; i += 1) {
    const r = await recordError(kv, { ...report, message: `Cannot read x of undefined at ${i * 7}` })
    if (r.notify) notified += 1
  }
  assert.equal(notified, 1)
  assert.equal(kv.m.size, 1)
  assert.equal(normalizeReport({ message: '  ' }), null)
})

test('a full cycle: failing page is healed by cache purge, a dead API opens an incident and emails the owner', async () => {
  const env = { SENTINEL: fakeKv(), CF_API_TOKEN: 't', CF_ZONE_ID: 'z', ALERT_TO: 'rahanshah4@gmail.com' }
  const sent = []
  let purged = false
  const fetchFn = async (url, init) => {
    if (String(url).includes('purge_cache')) { purged = true; return { ok: true, status: 200 } }
    if (url.includes('nexorasolution.us/pricing')) return purged ? res(200, '<div id="root">') : res(500, '')
    if (url.includes('nexora-email-api')) return res(500, '')
    if (url.includes('nexorasolution.us')) return res(200, '<div id="root">')
    if (url.includes('/api/config')) return res(200, { domains: ['mail.nexorasolution.us'] }, true)
    if (url.includes('googleapis.com/service_accounts')) return res(200, { keys: [{}] }, true)
    if (url.includes('firestore')) return res(403, '')
    return res(200, { status: 'ok', ok: true }, true)
  }
  const sender = async (m) => { sent.push(m) }
  let out = await runCycle(env, { fetchFn, sender, now: 1000 })
  assert.equal(out.state.checks.site_pricing.ok, true, 'healed by the purge')
  assert.equal(out.state.fixLog[0].recovered, true)
  assert.equal(sent.length, 0, 'one failure is not an incident')
  out = await runCycle(env, { fetchFn, sender, now: 2000 })
  assert.equal(sent.length, 1)
  assert.match(sent[0].raw, /Email API/)
  assert.equal(sent[0].to, 'rahanshah4@gmail.com')
  out = await runCycle(env, { fetchFn, sender, now: 3000 })
  assert.equal(sent.length, 1, 'no spam while it stays down')
})
