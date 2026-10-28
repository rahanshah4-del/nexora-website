/**
 * Card payment for a GeoLint order goes through Polar, and only Polar. The engine says which plans have a
 * Polar product (GET /api/fix-service -> polar: { plans }); a plan without one cannot be paid by card yet.
 * Pure helpers: no React, no network.
 */

/** Added to the order page address when Polar sends the client back after paying. */
export const PAID_RETURN_PARAM = 'paid'

/** True when the engine can open a Polar checkout for this plan. */
export function canPayByCard(service, plan = 'geo') {
  const plans = service?.polar?.plans
  return Array.isArray(plans) && plans.includes(plan || 'geo')
}

/** True when the page was opened by Polar's redirect after a payment. */
export function returnedFromCheckout(search) {
  return new URLSearchParams(String(search || '')).get(PAID_RETURN_PARAM) === '1'
}
