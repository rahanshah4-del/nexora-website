import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasPaidPlan } from '../src/lib/paidPlan.js'

test('only a workspace that paid sees "Subscription" instead of "Upgrade Plan"', () => {
  const paid = { planStatus: 'active', polarSubscriptionId: 'sub_1' }
  assert.equal(hasPaidPlan({ userDoc: paid }), true)
  assert.equal(hasPaidPlan({ userDoc: { planStatus: 'active', paymentProvider: 'polar' } }), true)
  assert.equal(hasPaidPlan({ userDoc: paid, isTrialActive: true }), false)
  assert.equal(hasPaidPlan({ userDoc: paid, isTrialExpired: true }), false)
  assert.equal(hasPaidPlan({ userDoc: { planStatus: 'active' } }), false)
  assert.equal(hasPaidPlan({ userDoc: { planStatus: 'trial', polarSubscriptionId: 'sub_1' } }), false)
  assert.equal(hasPaidPlan({}), false)
  assert.equal(hasPaidPlan({ workspaceDoc: paid, userDoc: {} }), true)
})
