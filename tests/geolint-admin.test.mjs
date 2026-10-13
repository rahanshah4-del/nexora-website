/**
 * GeoLint admin client helpers — display helpers and error mapping.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  appendAudits,
  geolintErrorMessage,
  moduleLabel,
  scoreLabel,
  scoreTone,
  shortUrl,
} from '../src/lib/geolint.js'

test('scoreTone bands a 0-100 score', () => {
  assert.equal(scoreTone(92), 'emerald')
  assert.equal(scoreTone(80), 'emerald')
  assert.equal(scoreTone(60), 'amber')
  assert.equal(scoreTone(49.9), 'rose')
  assert.equal(scoreTone(undefined), 'slate')
  assert.equal(scoreTone('x'), 'slate')
})

test('scoreLabel shows earned over the points that could be evaluated', () => {
  assert.equal(scoreLabel(75.94, 100), '75.9 / 100')
  assert.equal(scoreLabel(60, 80), '60 / 80')
  assert.equal(scoreLabel(null, 100), '0 / 100')
  assert.equal(scoreLabel(undefined, undefined), '—')
})

test('moduleLabel maps known modules and passes unknown ones through', () => {
  assert.equal(moduleLabel('bluf'), 'BLUF Structure')
  assert.equal(moduleLabel('somethingNew'), 'somethingNew')
})

test('appendAudits keeps order and drops repeated ids', () => {
  const merged = appendAudits([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }, null])
  assert.deepEqual(merged.map((row) => row.id), ['a', 'b', 'c'])
})

test('shortUrl strips the scheme and trailing slash and truncates', () => {
  assert.equal(shortUrl('https://example.com/'), 'example.com')
  assert.equal(shortUrl('https://example.com/' + 'a'.repeat(100), 20).length, 20)
  assert.equal(shortUrl(undefined), '')
})

test('geolintErrorMessage prefers the server error code, then the status', () => {
  assert.match(geolintErrorMessage(403, 'FORBIDDEN'), /admin list/)
  assert.match(geolintErrorMessage(503, 'STORE_DISABLED'), /AUDIT_STORE/)
  assert.match(geolintErrorMessage(429, ''), /Too many/)
  assert.match(geolintErrorMessage(500, ''), /500/)
  assert.match(geolintErrorMessage(418, ''), /418/)
})
