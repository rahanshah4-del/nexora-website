/**
 * Lemon Squeezy helpers for the payments worker (pure; tested in
 * tests/lemonsqueezy-webhook.test.mjs).
 *
 * Webhook signature: the `X-Signature` header is the hex HMAC-SHA256 of the
 * raw request body, keyed with the webhook signing secret. There is no
 * timestamp in the signature, so replay protection comes from idempotent
 * Firestore writes (a replayed event rewrites the same state).
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1'

/** Constant-time comparison of two hex strings. */
export function timingSafeEqualHex(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return diff === 0
}

async function hmacSha256Hex(secret, message, cryptoImpl) {
  const encoder = new TextEncoder()
  const key = await cryptoImpl.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await cryptoImpl.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Fail-closed verification. Resolves { ok: true } or { ok: false, reason }
 * with reason one of: secret-not-configured, signature-missing,
 * signature-malformed, signature-mismatch.
 */
export async function verifyLemonSqueezySignature({ secret, header, rawBody, cryptoImpl = globalThis.crypto } = {}) {
  if (!secret) return { ok: false, reason: 'secret-not-configured' }
  const provided = String(header || '').trim().toLowerCase()
  if (!provided) return { ok: false, reason: 'signature-missing' }
  if (!/^[0-9a-f]{64}$/.test(provided)) return { ok: false, reason: 'signature-malformed' }
  const expected = await hmacSha256Hex(secret, rawBody ?? '', cryptoImpl)
  return timingSafeEqualHex(provided, expected) ? { ok: true } : { ok: false, reason: 'signature-mismatch' }
}

/** Parse the LEMONSQUEEZY_VARIANT_MAP var: { "<variantId>": { plan, cycle } }. */
export function parseVariantMap(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Plan + billing cycle for a variant id, or null when the variant is not mapped. */
export function planForVariant(variantMap, variantId) {
  const entry = variantMap?.[String(variantId ?? '')]
  if (!entry?.plan) return null
  return { plan: String(entry.plan), cycle: entry.cycle === 'yearly' ? 'yearly' : 'monthly' }
}

/** Variant id for a plan + cycle (reverse lookup used when creating a checkout). */
export function variantForPlan(variantMap, plan, cycle = 'monthly') {
  const wanted = cycle === 'yearly' ? 'yearly' : 'monthly'
  for (const [variantId, entry] of Object.entries(variantMap || {})) {
    if (entry?.plan === plan && (entry.cycle === 'yearly' ? 'yearly' : 'monthly') === wanted) return variantId
  }
  return ''
}

/** Lemon Squeezy amounts are integers in the smallest unit (cents). */
export function lemonMinorToUnits(minor) {
  const numeric = Number(minor)
  return Number.isFinite(numeric) ? numeric / 100 : 0
}

// Lemon Squeezy subscription status -> the planStatus the site understands.
const ACTIVE_STATUSES = new Set(['on_trial', 'active'])

/**
 * Build the Firestore subscription payload (same field names as the Paddle
 * one) from a Lemon Squeezy `subscriptions` resource. `fallback` is the plan
 * resolved from meta.custom_data when the variant is not in the map.
 */
export function buildLemonSqueezySubscription(resource = {}, { variantMap = {}, fallback = null, now = new Date().toISOString() } = {}) {
  const attributes = resource.attributes || {}
  const mapped = planForVariant(variantMap, attributes.variant_id) || fallback || { plan: 'basic', cycle: 'monthly' }
  const status = String(attributes.status || 'active')
  const cancelled = Boolean(attributes.cancelled) || status === 'cancelled'
  const endsAt = attributes.ends_at || ''
  const renewsAt = attributes.renews_at || ''
  const expiresAt = endsAt || renewsAt || ''

  let planStatus = 'active'
  if (status === 'expired') planStatus = 'expired'
  else if (status === 'paused') planStatus = 'paused'
  else if (status === 'unpaid' || status === 'past_due') planStatus = 'past_due'
  else if (cancelled) planStatus = 'canceled'
  else if (!ACTIVE_STATUSES.has(status)) planStatus = status

  return {
    plan: mapped.plan,
    planStatus,
    subscriptionStatus: status,
    billingCycle: mapped.cycle,
    billingCurrency: 'USD',
    subscriptionStartedAt: attributes.created_at || now,
    subscriptionExpiresAt: expiresAt,
    nextBillingDate: cancelled ? '' : renewsAt,
    isTrialActive: status === 'on_trial',
    trialEndDate: attributes.trial_ends_at || '',
    lemonSqueezySubscriptionId: String(resource.id || ''),
    lemonSqueezyCustomerId: String(attributes.customer_id ?? ''),
    paymentProvider: 'lemonsqueezy',
    approvedBy: `lemonsqueezy:${resource.id || ''}`,
    approvedAt: now,
    updatedAt: now,
  }
}

/** Create a hosted checkout through the Lemon Squeezy API. Resolves the checkout URL. */
export async function createLemonSqueezyCheckout({ apiKey, storeId, variantId, email, customData = {}, redirectUrl = '', testMode = false, fetchImpl = fetch }) {
  if (!apiKey || !storeId || !variantId) throw new Error('Lemon Squeezy checkout is not configured.')
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: { email: email || undefined, custom: customData },
        product_options: redirectUrl ? { redirect_url: redirectUrl } : {},
        test_mode: Boolean(testMode),
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }
  const response = await fetchImpl(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  const url = json?.data?.attributes?.url
  if (!response.ok || !url) throw new Error(json?.errors?.[0]?.detail || `Lemon Squeezy checkout failed (${response.status}).`)
  return url
}
