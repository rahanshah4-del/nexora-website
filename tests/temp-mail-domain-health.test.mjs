import assert from 'node:assert/strict'
import test from 'node:test'
import { checkMx, hasCloudflareMx, pickableDomains, pickDomain, refreshHealth, domainReport, recordMail } from '../workers/nexora-temp-mail/src/domainHealth.js'
import { mergeSettings } from '../workers/nexora-temp-mail/src/admin.js'

const D = ['mail.a.us', 'mail.b.online']
const mx = (data) => ({ type: 15, data })
const dns = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => body })

function fakeKv() {
  const store = new Map()
  return { store, get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => { store.set(k, v) } }
}

test('Cloudflare MX records are recognised', () => {
  assert.equal(hasCloudflareMx([mx('28 route3.mx.cloudflare.net.')]), true)
  assert.equal(hasCloudflareMx([mx('10 mail.other.com.')]), false)
  assert.equal(hasCloudflareMx(undefined), false)
})

test('checkMx: ok, missing records, unknown domain, resolver down', async () => {
  assert.equal((await checkMx('x.com', dns({ Status: 0, Answer: [mx('1 route1.mx.cloudflare.net.')] }))).ok, true)
  assert.equal((await checkMx('x.com', dns({ Status: 0 }))).ok, false)
  assert.match((await checkMx('x.com', dns({ Status: 3 }))).detail, /not found/)
  assert.equal((await checkMx('x.com', dns({}, false))).ok, null)
  assert.equal((await checkMx('x.com', async () => { throw new Error('boom') })).ok, null)
})

test('pickableDomains skips switched-off and failing domains, never ends up empty', () => {
  assert.deepEqual(pickableDomains(D, {}, {}), D)
  assert.deepEqual(pickableDomains(D, { disabledDomains: ['mail.a.us'] }, {}), ['mail.b.online'])
  assert.deepEqual(pickableDomains(D, {}, { 'mail.b.online': { ok: false } }), ['mail.a.us'])
  assert.deepEqual(pickableDomains(D, {}, { 'mail.a.us': { ok: null } }), D)
  // both failing: still hand out the enabled ones rather than nothing
  assert.deepEqual(pickableDomains(D, {}, { 'mail.a.us': { ok: false }, 'mail.b.online': { ok: false } }), D)
  assert.deepEqual(pickableDomains(D, { disabledDomains: D }, {}), D)
})

test('pickDomain rotates across the list', () => {
  assert.equal(pickDomain(D, () => 0), 'mail.a.us')
  assert.equal(pickDomain(D, () => 0.99), 'mail.b.online')
})

test('refreshHealth caches for 5 minutes and keeps the old verdict when a check is inconclusive', async () => {
  const env = { TEMP_MAIL: fakeKv() }
  let calls = 0
  const good = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ Answer: [mx('1 route1.mx.cloudflare.net.')] }) } }
  await refreshHealth(env, D, { fetchFn: good, now: 1000 })
  assert.equal(calls, 2)
  await refreshHealth(env, D, { fetchFn: good, now: 2000 })
  assert.equal(calls, 2)
  const down = async () => { throw new Error('offline') }
  const out = await refreshHealth(env, D, { fetchFn: down, now: 1000 + 6 * 60 * 1000 })
  assert.equal(out['mail.a.us'].ok, true)
})

test('domainReport flags a failing live domain, ignores a switched-off one', async () => {
  const env = { TEMP_MAIL: fakeKv() }
  const bad = dns({ Status: 0 })
  const r1 = await domainReport(env, D, { disabledDomains: [] }, { fetchFn: bad, now: 5000 })
  assert.equal(r1.allHealthy, false)
  assert.equal(r1.rotationCount, 2) // both failing -> fallback keeps them usable
  const r2 = await domainReport(env, D, { disabledDomains: D }, { fetchFn: bad, now: 5000 })
  assert.equal(r2.allHealthy, true)
})

test('recordMail keeps the last time and a per-day count', async () => {
  const env = { TEMP_MAIL: fakeKv() }
  await recordMail(env, 'mail.a.us', Date.parse('2026-11-03T10:00:00Z'))
  await recordMail(env, 'mail.a.us', Date.parse('2026-11-03T11:00:00Z'))
  const row = await env.TEMP_MAIL.get('domstat:mail.a.us')
  assert.equal(row.today, 2)
  assert.equal(row.total, 2)
})

test('settings accept only well-formed disabledDomains', () => {
  const s = mergeSettings({}, { disabledDomains: ['Mail.A.us', 'not a domain', 'mail.a.us'] })
  assert.deepEqual(s.disabledDomains, ['mail.a.us'])
})
