import test from 'node:test'
import assert from 'node:assert/strict'
import { describeFailure } from '../src/lib/failureInfo.js'

test('network failure is explained', () => {
  const info = describeFailure(Object.assign(new Error('Failed to fetch'), { network: true }), 'Reply')
  assert.match(info.title, /Reply failed/)
  assert.match(info.reason, /never reached/)
})
test('maps status and provider errors', () => {
  assert.match(describeFailure(Object.assign(new Error('Unauthorized: expired'), { status: 401 })).reason, /session expired/)
  assert.match(describeFailure(Object.assign(new Error('Daily email limit reached'), { status: 429 })).reason, /limit/)
  assert.match(describeFailure(new Error('The domain is not verified')).fix, /Resend/)
  assert.match(describeFailure(new Error('RESEND_API_KEY missing'), 'x').reason, /key/)
})
test('unknown error keeps the raw detail', () => {
  const info = describeFailure(new Error('weird thing'))
  assert.match(info.detail, /weird thing/)
  assert.ok(info.fix)
})
