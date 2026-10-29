import assert from 'node:assert/strict'
import test from 'node:test'
import { yearlySavingPercent, premiumErrorMessage } from '../src/pages/public/tools/tempMailPremiumClient.js'
import { splitLongTime } from '../src/pages/public/tools/tempMailClient.js'

test('yearly saving is worked out from the two prices', () => {
  assert.equal(yearlySavingPercent('3.99', '29'), 39)
  assert.equal(yearlySavingPercent('0', '29'), 0)
  assert.equal(yearlySavingPercent('abc', '29'), 0)
})

test('long countdown splits into days and hours', () => {
  assert.deepEqual(splitLongTime(86400 * 33 + 3600 * 5 + 20), { days: 33, hours: 5 })
  assert.deepEqual(splitLongTime(-5), { days: 0, hours: 0 })
})

test('Premium errors are shown in plain words', () => {
  assert.match(premiumErrorMessage({ code: 'address_limit' }), /limit/i)
  assert.match(premiumErrorMessage({ code: 'wrong_code' }), /not right/i)
  assert.match(premiumErrorMessage({ code: 'invalid_destination', reason: 'own_domain' }), /real inbox/i)
  assert.match(premiumErrorMessage({ status: 429 }), /Too many/)
  assert.doesNotMatch(premiumErrorMessage({ message: 'HTTP 500' }), /HTTP/)
})

test('custom domain errors and day labels are shown in plain words', async () => {
  const { daysLeftLabel } = await import('../src/pages/public/tools/tempMailPremiumClient.js')
  assert.match(premiumErrorMessage({ code: 'domain_limit' }), /limit of custom domains/i)
  assert.match(premiumErrorMessage({ code: 'invalid_domain' }), /example\.com/)
  assert.match(premiumErrorMessage({ code: 'domain_not_verified' }), /Check records/)
  assert.equal(daysLeftLabel(1), '1 day left')
  assert.equal(daysLeftLabel(0), 'Ends today')
})
