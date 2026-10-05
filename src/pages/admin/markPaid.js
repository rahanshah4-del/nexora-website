// Mark Paid (admin): pure helpers for the form and the platformPayments record.
// A manual "paid" must always leave a payment record, otherwise the client gets
// access but Revenue / Transactions never show it.

const TRIAL_PLAN_NAMES = new Set(['', 'free', 'basic', 'trial'])
export const MARK_PAID_CYCLES = ['monthly', 'yearly']
export const MARK_PAID_METHODS = ['Bank transfer', 'JazzCash', 'Easypaisa', 'Cash', 'Card / Paddle', 'Other']

function priceFor(plan, cycle) {
  const raw = cycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice ?? plan?.price
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/** Plans an admin can sell: enabled, priced (not the free/basic trial plan, not "custom"). */
export function sellablePlans(plans = []) {
  return plans.filter((plan) => (
    plan && plan.enabled !== false && plan.active !== false
    && !TRIAL_PLAN_NAMES.has(String(plan.name || '').trim().toLowerCase())
  ))
}

export function markPaidDefaults(row = {}, plans = []) {
  const sellable = sellablePlans(plans)
  const current = String(row.plan || row.selectedPlan || row.requestedPlan || '').trim()
  const picked = sellable.find((plan) => plan.name === current) || sellable.find((plan) => plan.name === 'Standard') || sellable[0]
  const billingCycle = row.billingCycle === 'yearly' ? 'yearly' : 'monthly'
  return {
    plan: picked?.name || 'Standard',
    billingCycle,
    amount: picked ? priceFor(picked, billingCycle) : 0,
    currency: String(picked?.currency || row.billingCurrency || row.currency || 'PKR').toUpperCase(),
    paymentMethod: 'Bank transfer',
    transactionId: '',
    note: '',
  }
}

/** Re-price when the admin changes plan or billing cycle. */
export function markPaidAmountFor(planName, billingCycle, plans = []) {
  const plan = sellablePlans(plans).find((item) => item.name === planName)
  return plan ? priceFor(plan, billingCycle) : 0
}

export function validateMarkPaid(form = {}, plans = []) {
  if (!sellablePlans(plans).some((plan) => plan.name === form.plan)) return 'Choose a paid plan.'
  if (!MARK_PAID_CYCLES.includes(form.billingCycle)) return 'Choose monthly or yearly.'
  const amount = Number(form.amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount received (more than 0).'
  if (!String(form.currency || '').trim()) return 'Enter a currency.'
  return ''
}

/** Unique id per payment so a later payment never overwrites an earlier one. */
export function manualPaymentId(workspaceId, now = new Date()) {
  return `manual-${workspaceId}-${now.getTime()}`
}

export function buildManualPaymentRecord({ row = {}, workspaceId, form = {}, subscription = {}, adminUid = '', adminEmail = '' } = {}) {
  return {
    clientEmail: row.email || row.clientEmail || row.ownerEmail || '',
    workspaceId,
    workspaceName: row.workspaceName || row.name || row.businessName || '',
    plan: form.plan,
    billingCycle: form.billingCycle,
    amount: Number(form.amount),
    currency: String(form.currency).trim().toUpperCase(),
    transactionId: String(form.transactionId || '').trim(),
    paymentMethod: form.paymentMethod || 'Manual',
    note: String(form.note || '').trim(),
    status: 'paid',
    paymentStatus: 'paid',
    approvedBy: adminUid || adminEmail,
    approvedByEmail: adminEmail,
    approvedAt: subscription.approvedAt,
    paymentDate: subscription.approvedAt,
    subscriptionExpiresAt: subscription.subscriptionExpiresAt,
    nextBillingDate: subscription.nextBillingDate,
    source: 'admin-mark-paid',
    sourceId: workspaceId,
    updatedAt: subscription.updatedAt,
  }
}
