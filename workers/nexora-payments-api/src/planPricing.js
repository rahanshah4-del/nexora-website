/**
 * Plan pricing for the payments worker (crypto checkout).
 *
 * Copy of the site's rule in src/lib/platformPlans.js — the worker is deployed
 * on its own and cannot import from src/. tests/pricing.test.mjs fails if the
 * two ever disagree.
 */

export const YEARLY_DISCOUNT = 0.8

/** round(monthly × 12 × 0.8); 'custom' stays 'custom'. */
export function yearlyPrice(monthly) {
  if (String(monthly).toLowerCase() === 'custom') return 'custom'
  const numeric = Number(monthly)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 12 * YEARLY_DISCOUNT) : 0
}

// Fallback when no Firestore platformPlans/{id} doc exists.
export const SERVER_PLANS = {
  basic: { id: 'basic', name: 'Basic', monthlyPrice: 2000, yearlyPrice: yearlyPrice(2000), currency: 'PKR', active: true },
  standard: { id: 'standard', name: 'Standard', monthlyPrice: 5999, yearlyPrice: yearlyPrice(5999), currency: 'PKR', active: true },
  enterprise: { id: 'enterprise', name: 'Enterprise', monthlyPrice: 'custom', yearlyPrice: 'custom', currency: 'PKR', active: true },
}

function explicitOverride(value) {
  if (String(value).toLowerCase() === 'custom') return 'custom'
  const numeric = Number(value)
  return value !== null && value !== undefined && value !== '' && Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

/**
 * Firestore platformPlans/{id} wins over SERVER_PLANS. Yearly always follows
 * yearlyPrice() unless the doc stores an explicit yearlyPriceOverride (a stored
 * yearlyPrice alone is ignored — older admin saves wrote monthly × 12 there).
 */
export function resolveServerPlan(planId, storedPlan = null) {
  const fallback = SERVER_PLANS[planId] || {}
  const merged = { ...fallback, ...(storedPlan || {}), id: planId }
  const monthlyPrice = merged.monthlyPrice ?? merged.price ?? fallback.monthlyPrice
  const override = explicitOverride(storedPlan?.yearlyPriceOverride)
  return { ...merged, monthlyPrice, yearlyPrice: override ?? yearlyPrice(monthlyPrice) }
}
