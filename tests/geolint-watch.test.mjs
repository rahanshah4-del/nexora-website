import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestCitationQueries } from '../src/lib/geolint.js'
import { safeNext } from '../src/lib/geolintFix.js'
import { noindexPagePaths } from '../src/config/noindexPages.js'
import { GEOLINT_MONITORS_PATH } from '../src/lib/geolintLaunch.js'

test('citation questions start from the brand and the page topic', () => {
  const q = suggestCitationQueries({ host: 'www.acme.com', title: 'Free Invoice Generator | Acme' })
  assert.equal(q.length, 3)
  assert.equal(q[0], 'What is Acme and is it any good?')
  assert.equal(q[1], 'What is the best free invoice generator?')
  assert.match(q[2], /free invoice generator/)
})

test('citation questions still make sense without a title', () => {
  const q = suggestCitationQueries({ host: 'example.org' })
  assert.ok(q.length >= 2)
  assert.ok(q.every((s) => s.length >= 5))
})

test('sign-in may return to the monitors page, nowhere else new', () => {
  assert.equal(safeNext('/tools/geo-audit/monitors/?add=https%3A%2F%2Fa.com'), '/tools/geo-audit/monitors/?add=https%3A%2F%2Fa.com')
  assert.equal(safeNext('//evil.com/tools/geo-audit/monitors'), '/tools/geo-audit/fix')
  assert.equal(safeNext('/tools/geo-audit/monitorsx'), '/tools/geo-audit/fix')
})

test('the monitors page is never indexed', () => {
  assert.ok(noindexPagePaths(true).has(GEOLINT_MONITORS_PATH))
})
