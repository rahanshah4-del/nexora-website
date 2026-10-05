import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildManualPaymentRecord,
  manualPaymentId,
  markPaidAmountFor,
  markPaidDefaults,
  sellablePlans,
  validateMarkPaid,
} from '../src/pages/admin/markPaid.js'
import { revenueKpis } from '../src/pages/admin/controlCentreStats.js'
import { buildApprovedSubscriptionPayload } from '../src/lib/subscriptionApproval.js'

const plans = [
  { id: 'basic', name: 'Basic', monthlyPrice: 0, yearlyPrice: 0, currency: 'PKR' },
  { id: 'standard', name: 'Standard', monthlyPrice: 2000, yearlyPrice: 20000, currency: 'PKR' },
  { id: 'pro', name: 'Pro', monthlyPrice: 5999, yearlyPrice: 59990, currency: 'PKR' },
  { id: 'enterprise', name: 'Enterprise', monthlyPrice: 'custom', yearlyPrice: 'custom', currency: 'PKR' },
  { id: 'old', name: 'Legacy', monthlyPrice: 100, enabled: false },
]

test('sellable plans exclude the trial plan and disabled plans', () => {
  assert.deepEqual(sellablePlans(plans).map((plan) => plan.name), ['Standard', 'Pro', 'Enterprise'])
})

test('a trial (Basic) workspace never defaults to the trial plan: Standard with its real price', () => {
  const form = markPaidDefaults({ plan: 'Basic' }, plans)
  assert.equal(form.plan, 'Standard')
  assert.equal(form.amount, 2000)
  assert.equal(form.currency, 'PKR')
  assert.equal(form.billingCycle, 'monthly')
})

test('an existing paid plan and yearly cycle are kept and priced', () => {
  const form = markPaidDefaults({ plan: 'Pro', billingCycle: 'yearly' }, plans)
  assert.equal(form.plan, 'Pro')
  assert.equal(form.amount, 59990)
  assert.equal(markPaidAmountFor('Standard', 'yearly', plans), 20000)
  assert.equal(markPaidAmountFor('Enterprise', 'monthly', plans), 0) // custom price: admin types it
})

test('validation: needs a paid plan, a cycle and an amount above zero', () => {
  const ok = { plan: 'Standard', billingCycle: 'monthly', amount: 2000, currency: 'PKR' }
  assert.equal(validateMarkPaid(ok, plans), '')
  assert.match(validateMarkPaid({ ...ok, plan: 'Basic' }, plans), /paid plan/)
  assert.match(validateMarkPaid({ ...ok, amount: 0 }, plans), /amount/)
  assert.match(validateMarkPaid({ ...ok, amount: 'abc' }, plans), /amount/)
  assert.match(validateMarkPaid({ ...ok, billingCycle: 'weekly' }, plans), /monthly or yearly/)
  assert.match(validateMarkPaid({ ...ok, currency: ' ' }, plans), /currency/)
})

test('payment ids are unique per payment so a later one never overwrites an earlier one', () => {
  assert.notEqual(manualPaymentId('ws1', new Date(1000)), manualPaymentId('ws1', new Date(2000)))
})

test('the payment record is counted as revenue with the right amount, currency and date', () => {
  const form = { plan: 'Standard', billingCycle: 'monthly', amount: '2000', currency: 'pkr', paymentMethod: 'JazzCash', transactionId: ' T1 ', note: '' }
  const subscription = buildApprovedSubscriptionPayload({ plan: 'Standard', billingCycle: 'monthly', amount: 2000, currency: 'PKR', approvedBy: 'admin', approvedByEmail: 'a@x.com' })
  const record = buildManualPaymentRecord({ row: { email: 'c@x.com', workspaceName: 'Acme' }, workspaceId: 'ws1', form, subscription, adminUid: 'admin', adminEmail: 'a@x.com' })
  assert.equal(record.amount, 2000)
  assert.equal(record.currency, 'PKR')
  assert.equal(record.transactionId, 'T1')
  assert.equal(record.status, 'paid')
  assert.equal(record.source, 'admin-mark-paid')
  const kpis = revenueKpis([{ id: 'p1', ...record }], [], new Date())
  assert.equal(kpis.primary.total, 2000)
  assert.equal(kpis.primary.monthly, 2000)
  assert.equal(kpis.primary.count, 1)
})
