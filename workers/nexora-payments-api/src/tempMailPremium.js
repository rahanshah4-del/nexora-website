/**
 * Temp Mail Premium billing helpers (pure; tested in tests/temp-mail-premium-billing.test.mjs).
 *
 * Premium is a separate Polar product from the workspace plans, so it never touches Firestore workspaces. The
 * webhook writes an entitlement into the temp-mail Worker's KV (binding TEMP_MAIL, same namespace) under
 * `pm:<firebase uid>`; the temp-mail Worker reads it. The shape is documented in
 * workers/nexora-temp-mail/src/premium.js and must stay in step with it.
 */

const DAY_MS = 86_400_000
const UID_RE = /^[A-Za-z0-9_-]{6,128}$/

/** POLAR_TEMPMAIL_PRODUCTS: { "<productId>": { "cycle": "monthly" | "yearly" } }. */
export function parseTempMailProducts(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function tempMailProductFor(products, cycle = 'monthly') {
  const wanted = cycle === 'yearly' ? 'yearly' : 'monthly'
  for (const [productId, entry] of Object.entries(products || {})) {
    if ((entry?.cycle === 'yearly' ? 'yearly' : 'monthly') === wanted) return productId
  }
  return ''
}

export function tempMailCycleFor(products, productId, metadata = {}) {
  const entry = products?.[String(productId ?? '')]
  if (entry) return entry.cycle === 'yearly' ? 'yearly' : 'monthly'
  return metadata?.cycle === 'yearly' ? 'yearly' : 'monthly'
}

/** True when a Polar subscription/order belongs to the Temp Mail Premium product. */
export function isTempMailEvent(products, data = {}) {
  const productId = String(data.product_id || data.product?.id || '')
  if (productId && products?.[productId]) return true
  return String(data.metadata?.product || '') === 'tempmail'
}

/** The Firebase uid we put in the checkout metadata, or '' when missing or malformed. */
export function tempMailUid(data = {}) {
  const uid = String(data.metadata?.uid || data.subscription?.metadata?.uid || '').trim()
  return UID_RE.test(uid) ? uid : ''
}

/** Entitlement object for the temp-mail Worker from a Polar `subscription` payload. */
export function buildTempMailEntitlement(subscription = {}, { cycle = 'monthly', email = '', now = Date.now() } = {}) {
  const status = String(subscription.status || 'active')
  const periodEnd = Date.parse(subscription.current_period_end || '')
  const endsAt = Date.parse(subscription.ends_at || subscription.ended_at || '')
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)

  let mapped
  let expiresAt
  if (status === 'revoked') {
    mapped = 'revoked'
    expiresAt = 0
  } else if (status === 'canceled') {
    mapped = 'canceled'
    expiresAt = Number.isFinite(endsAt) ? endsAt : Number.isFinite(periodEnd) ? periodEnd : 0
  } else if (status === 'past_due' || status === 'unpaid') {
    mapped = 'past_due'
    expiresAt = Number.isFinite(periodEnd) ? periodEnd : now
  } else if (status === 'active' || status === 'trialing') {
    mapped = cancelAtPeriodEnd ? 'canceled' : 'active'
    expiresAt = Number.isFinite(periodEnd) ? periodEnd : now + 32 * DAY_MS
  } else {
    mapped = 'expired'
    expiresAt = 0
  }

  return {
    status: mapped,
    cycle: cycle === 'yearly' ? 'yearly' : 'monthly',
    expiresAt,
    subscriptionId: String(subscription.id || ''),
    customerId: String(subscription.customer_id || subscription.customer?.id || ''),
    email: String(email || subscription.customer?.email || '').toLowerCase().slice(0, 200),
    source: 'polar',
    updatedAt: new Date(now).toISOString(),
  }
}

/** Entitlement after a refund: access ends at once. */
export function revokedTempMailEntitlement(previous = {}, now = Date.now()) {
  return { ...previous, status: 'revoked', expiresAt: 0, source: 'polar', updatedAt: new Date(now).toISOString() }
}

/** Same rule as isPremiumActive in the temp-mail Worker. */
export function tempMailEntitlementActive(entitlement, now = Date.now()) {
  if (!entitlement || typeof entitlement !== 'object') return false
  if (entitlement.status === 'expired' || entitlement.status === 'revoked') return false
  return Number(entitlement.expiresAt) > now
}
