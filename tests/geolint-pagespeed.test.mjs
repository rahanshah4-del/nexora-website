import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePageSpeed } from '../src/lib/geolintPageSpeed.js'
import { hasSpeed } from '../src/lib/geolintSpeed.js'

test('parses a PageSpeed response into score, metrics and ratings', () => {
  const run = parsePageSpeed({ lighthouseResult: { categories: { performance: { score: 0.82 } }, audits: { 'largest-contentful-paint': { numericValue: 2100.4 }, 'cumulative-layout-shift': { numericValue: 0.0123 } } } })
  assert.equal(run.score, 82)
  assert.equal(run.metrics.lcpMs, 2100)
  assert.equal(run.ratings.lcpMs, 'good')
  assert.equal(run.metrics.cls, 0.012)
})
test('returns null without a score and the PDF wrapper is recognised', () => {
  assert.equal(parsePageSpeed({}), null)
  assert.equal(hasSpeed({ before: null, after: { mobile: { score: 50 }, desktop: null } }), true)
})
