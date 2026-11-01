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

test('billing-period progress is clamped and zero without dates', async () => {
  // BillingCard imports React components; test the pure maths from its source text instead of importing JSX
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('../src/crm/components/billing/BillingCard.jsx', import.meta.url), 'utf8')
  const body = src.match(/export function periodProgress[\s\S]*?\n}\n/)[0].replace('export ', '')
  const periodProgress = new Function(`${body}; return periodProgress`)()
  const start = '2026-11-01T00:00:00Z'
  const end = '2026-12-01T00:00:00Z'
  assert.equal(periodProgress(start, end, Date.parse('2026-11-16T00:00:00Z')), 50)
  assert.equal(periodProgress(start, end, Date.parse('2027-01-01T00:00:00Z')), 100)
  assert.equal(periodProgress(start, end, Date.parse('2026-10-01T00:00:00Z')), 0)
  assert.equal(periodProgress('', end), 0)
})
