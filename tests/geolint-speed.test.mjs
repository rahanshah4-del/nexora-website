import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMetric, hasSpeed, speedGain, speedGrade, speedSummary } from '../src/lib/geolintSpeed.js'

const run = (s) => ({ score: s })
test('metric formatting and grades', () => {
  assert.equal(formatMetric('lcpMs', 2400), '2.4 s')
  assert.equal(formatMetric('tbtMs', 120.4), '120 ms')
  assert.equal(formatMetric('cls', 0.01234), '0.012')
  assert.equal(formatMetric('lcpMs', null), '-')
  assert.equal(speedGrade(95).word, 'Fast')
  assert.equal(speedGrade(60).tone, 'amber')
  assert.equal(speedGrade(20).word, 'Slow')
  assert.equal(speedGrade(undefined).word, 'Not measured')
})

test('gain, summary and presence', () => {
  const speed = { before: { mobile: run(54), desktop: run(88) }, after: { mobile: run(78), desktop: null } }
  assert.equal(speedGain(speed, 'mobile'), 24)
  assert.equal(speedGain(speed, 'desktop'), null)
  assert.equal(speedSummary(speed), 'Phone 54 -> 78, Desktop 88')
  assert.equal(speedSummary(null), '')
  assert.equal(hasSpeed(speed), true)
  assert.equal(hasSpeed({ before: null, after: null }), false)
  assert.equal(hasSpeed(undefined), false)
})
