const DAY_MS = 24 * 60 * 60 * 1000

function cleanString(value, fallback = '') {
  const next = String(value ?? '').trim()
  return next || fallback
}

export function normalizeApprovalBillingCycle(value) {
  const cycle = cleanString(value, 'monthly').toLowerCase()
  if (['year', 'annual', 'annually', 'yearly'].includes(cycle)) return 'yearly'
  return 'monthly'
}

export function approvalDurationDays(billingCycle) {
  return normalizeApprovalBillingCycle(billingCycle) === 'yearly' ? 365 : 30
}

export function buildApprovedSubscriptionPayload({
  plan,
  billingCycle,
  amount,
  currency,
  approvedBy,
  approvedByEmail,
} = {}) {
  const normalizedBillingCycle = normalizeApprovalBillingCycle(billingCycle)
  const now = new Date()
  const subscriptionExpiresAt = new Date(now.getTime() + approvalDurationDays(normalizedBillingCycle) * DAY_MS)

  if (Number.isNaN(subscriptionExpiresAt.getTime())) {
    throw new Error('Subscription approval requires a valid expiry date.')
  }

  const safeApprovedBy = cleanString(approvedBy, approvedByEmail)
  void amount

  return {
    plan: cleanString(plan, 'Standard'),
    planStatus: 'active',
    subscriptionStatus: 'active',
    billingCycle: normalizedBillingCycle,
    billingCurrency: cleanString(currency, 'PKR'),
    subscriptionStartedAt: now,
    subscriptionExpiresAt,
    nextBillingDate: subscriptionExpiresAt,
    expiresAt: subscriptionExpiresAt,
    isTrialActive: false,
    upgradedAt: now,
    approvedAt: now,
    approvedBy: safeApprovedBy,
    approvedByEmail: cleanString(approvedByEmail),
    updatedAt: now,
  }
}
