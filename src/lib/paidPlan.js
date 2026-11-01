/**
 * True for a workspace that has paid for a plan (or is on a Polar subscription): the menus then say "Subscription"
 * and open the billing page instead of offering "Upgrade Plan". A trial, an expired trial and a workspace that never
 * paid keep the upgrade button.
 */
export function hasPaidPlan({ userDoc, workspaceDoc, isTrialActive = false, isTrialExpired = false } = {}) {
  if (isTrialActive || isTrialExpired) return false
  const doc = { ...(workspaceDoc || {}), ...(userDoc || {}) }
  const status = String(doc.planStatus || doc.subscriptionStatus || '').toLowerCase()
  if (!['active', 'past_due', 'canceled', 'cancelled'].includes(status)) return false
  return Boolean(doc.polarSubscriptionId || doc.paymentProvider || doc.approvedBy)
}
