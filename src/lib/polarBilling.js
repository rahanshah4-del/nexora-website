// Workspace billing: asks the payments worker for the Polar subscription, saved card and customer-portal link.
const PAYMENTS_WORKER_URL = String(
  import.meta.env.VITE_NOWPAYMENTS_WORKER_URL || 'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/+$/, '')

/** Resolves { hasSubscription, billing, portalUrl }. Throws an Error with a user-safe message on failure. */
export async function fetchPolarBilling(firebaseUser, returnPath = '/app/subscriptions') {
  if (!firebaseUser?.getIdToken) throw new Error('Sign in again to see billing.')
  const idToken = await firebaseUser.getIdToken()
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/polar/billing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnPath }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load billing right now.')
  return result
}

const CARD_BRANDS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay', diners: 'Diners Club' }

export function cardBrandLabel(brand) {
  const key = String(brand || '').toLowerCase()
  return CARD_BRANDS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Card')
}

/** Days from now until an ISO date (0 when past or invalid). */
export function daysLeft(value, now = Date.now()) {
  const time = new Date(value || '').getTime()
  return Number.isFinite(time) ? Math.max(Math.ceil((time - now) / 86400000), 0) : 0
}

/** Admin only: re-read a workspace's subscription from Polar and rewrite its access fields. */
export async function syncPolarSubscription(firebaseUser, workspaceId) {
  if (!firebaseUser?.getIdToken) throw new Error('Sign in again.')
  const idToken = await firebaseUser.getIdToken()
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/polar/admin/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.error || 'Could not sync with Polar.')
  return result
}
