/** GeoLint access control: visitor allowance display and Control Centre helpers. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { allowanceOptions, defaultAllowance, initialSiteState, reduceSiteEvent, timeUntil } from '../src/lib/geolintSite.js'
import { BLOCK_DURATIONS, blockPayload, clientBadge, grantPayload, isIpAddress, parseHosts, usedPercent } from '../src/lib/geolintAccess.js'
import { publicAuditErrorMessage, quotaExceededMessage } from '../src/lib/geolint.js'

const LIMITS = [100, 250, 500, 1000]

test('the stream stores the allowance event', () => {
  const s = reduceSiteEvent(initialSiteState(), { type: 'quota', requested: 500, granted: 120, limit: 500, used: 500, remaining: 0, resetAt: '2026-10-15T08:00:00Z', unlimited: false })
  assert.deepEqual(s.quota, { requested: 500, granted: 120, limit: 500, remaining: 0, resetAt: '2026-10-15T08:00:00Z', unlimited: false })
})

test('page-limit choices never offer more than what is left', () => {
  assert.deepEqual(allowanceOptions({ remaining: 500, unlimited: false }, LIMITS).map((o) => o.value), [100, 250, 500])
  assert.deepEqual(allowanceOptions({ remaining: 320, unlimited: false }, LIMITS).map((o) => o.value), [100, 250, 320])
  assert.deepEqual(allowanceOptions({ remaining: 40, unlimited: false }, LIMITS).map((o) => o.value), [40])
  assert.deepEqual(allowanceOptions({ remaining: 0, unlimited: false }, LIMITS), [])
  assert.deepEqual(allowanceOptions({ remaining: 0, unlimited: true }, LIMITS).map((o) => o.value), LIMITS)
  assert.deepEqual(allowanceOptions(null, LIMITS).map((o) => o.value), LIMITS)
  assert.match(allowanceOptions({ remaining: 320, unlimited: false }, LIMITS).at(-1).label, /all that is left/)
})

test('the preselected limit is 500 when it fits, else the biggest that does', () => {
  assert.equal(defaultAllowance(allowanceOptions({ remaining: 500, unlimited: false }, LIMITS)), 500)
  assert.equal(defaultAllowance(allowanceOptions({ remaining: 320, unlimited: false }, LIMITS)), 320)
  assert.equal(defaultAllowance(allowanceOptions({ remaining: 40, unlimited: false }, LIMITS)), 40)
  assert.equal(defaultAllowance([]), 0)
})

test('time until reset reads naturally', () => {
  const now = Date.parse('2026-10-14T08:00:00Z')
  assert.equal(timeUntil('2026-10-14T13:12:00Z', now), '5 h 12 min')
  assert.equal(timeUntil('2026-10-14T08:42:00Z', now), '42 min')
  assert.equal(timeUntil('2026-10-14T08:00:20Z', now), 'under a minute')
  assert.equal(timeUntil('nonsense', now), '')
})

test('visitor messages for refusals', () => {
  assert.match(quotaExceededMessage({ limit: 500, resetAt: '2026-10-15T08:00:00Z' }), /all 500 pages.*full again on/)
  assert.match(publicAuditErrorMessage(429, 'QUOTA_EXCEEDED', '', { limit: 500 }), /come back in 24 hours/)
  assert.match(publicAuditErrorMessage(403, 'BLOCKED', 'Access from your network has been blocked: abuse.'), /blocked: abuse/)
  assert.match(publicAuditErrorMessage(403, 'HOST_BLOCKED'), /cannot be audited/)
  assert.match(publicAuditErrorMessage(503, 'DISABLED'), /switched off/)
  assert.match(publicAuditErrorMessage(429, 'Too Many Requests'), /Wait a minute/)
})

test('blocked websites are cleaned, de-duplicated and bad lines reported', () => {
  const r = parseHosts('https://Bad.example.com/x\nbad.example.com, other.org\nnot a host\n\nlocalhost')
  assert.deepEqual(r.hosts, ['bad.example.com', 'other.org'])
  assert.deepEqual(r.invalid, ['not a host', 'localhost'])
})

test('IP addresses are checked before an admin can act on them', () => {
  for (const ok of ['203.0.113.7', '2001:db8::1', '::1', ' 10.0.0.1 ']) assert.equal(isIpAddress(ok), true, ok)
  for (const bad of ['', '999.1.1.1', '1.2.3', 'example.com', '1::2::3', 'abc']) assert.equal(isIpAddress(bad), false, bad)
})

test('block and grant payloads are validated like the server does', () => {
  assert.ok(blockPayload('ab', 24).error)
  assert.deepEqual(blockPayload(' scraping ', 24).extra, { reason: 'scraping', hours: 24 })
  assert.deepEqual(blockPayload('scraping', 0).extra, { reason: 'scraping' })
  assert.ok(grantPayload('0').error)
  assert.ok(grantPayload('abc').error)
  assert.ok(grantPayload(200000).error)
  assert.deepEqual(grantPayload('250.7').extra, { pages: 250 })
  assert.equal(BLOCK_DURATIONS.at(-1).hours, 0)
})

test('client rows show the state an admin cares about', () => {
  const base = { blocked: false, exempt: false, remaining: 100, used: 400, limit: 500, resetAt: '2026-10-15T08:00:00Z', blockedUntil: null }
  assert.equal(clientBadge({ ...base, blocked: true }).tone, 'rose')
  assert.equal(clientBadge({ ...base, exempt: true }).text, 'No limit')
  assert.equal(clientBadge({ ...base, remaining: 0 }).tone, 'amber')
  assert.equal(clientBadge(base).text, 'Active')
  assert.equal(clientBadge({ ...base, used: 0 }).text, 'Idle')
  assert.equal(usedPercent(base), 80)
  assert.equal(usedPercent({ used: 900, limit: 500 }), 100)
  assert.equal(usedPercent({ used: 1, limit: 0 }), 0)
})
