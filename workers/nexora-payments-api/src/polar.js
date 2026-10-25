/**
 * Polar.sh (Merchant of Record) helpers for the payments worker (pure; tested in
 * tests/polar-webhook.test.mjs).
 *
 * Webhooks follow the Standard Webhooks spec: headers `webhook-id`,
 * `webhook-timestamp`, `webhook-signature` ("v1,<base64 hmac>" - several
 * space-separated signatures are allowed). The signed content is
 * `${id}.${timestamp}.${rawBody}` and Polar uses the raw UTF-8 bytes of the
 * webhook secret as the HMAC key. The timestamp is checked against a tolerance
 * window, which gives replay protection on top of idempotent Firestore writes.
 */

const API_BASES = {
  production: 'https://api.polar.sh/v1',
  sandbox: 'https://sandbox-api.polar.sh/v1',
}
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60

export function polarApiBase(server) {
  return String(server || '').toLowerCase() === 'sandbox' ? API_BASES.sandbox : API_BASES.production
}

/** Constant-time string comparison. */
export function timingSafeEqualString(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return diff === 0
}

async function hmacSha256Base64(secret, message, cryptoImpl) {
  const encoder = new TextEncoder()
  const key = await cryptoImpl.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await cryptoImpl.subtle.sign('HMAC', key, encoder.encode(message)))
  let binary = ''
  for (const byte of mac) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Fail-closed verification. Resolves { ok: true } or { ok: false, reason } with
 * reason one of: secret-not-configured, headers-missing, timestamp-invalid,
 * timestamp-out-of-range, signature-mismatch.
 */
export async function verifyPolarSignature({ secret, id, timestamp, signature, rawBody, nowSeconds = Math.floor(Date.now() / 1000), cryptoImpl = globalThis.crypto } = {}) {
  if (!secret) return { ok: false, reason: 'secret-not-configured' }
  if (!id || !timestamp || !signature) return { ok: false, reason: 'headers-missing' }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return { ok: false, reason: 'timestamp-invalid' }
  if (Math.abs(nowSeconds - ts) > TIMESTAMP_TOLERANCE_SECONDS) return { ok: false, reason: 'timestamp-out-of-range' }
  const expected = await hmacSha256Base64(secret, `${id}.${timestamp}.${rawBody ?? ''}`, cryptoImpl)
  const candidates = String(signature).split(' ').map((part) => part.trim()).filter(Boolean)
  for (const candidate of candidates) {
    const [version, value] = candidate.split(',')
    if (version === 'v1' && timingSafeEqualString(value, expected)) return { ok: true }
  }
  return { ok: false, reason: 'signature-mismatch' }
}

/** Parse the POLAR_PRODUCT_MAP var: { "<productId>": { plan, cycle } }. */
export function parseProductMap(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Plan + billing cycle for a product id, or null when the product is not mapped. */
export function planForProduct(productMap, productId) {
  const entry = productMap?.[String(productId ?? '')]
  if (!entry?.plan) return null
  return { plan: String(entry.plan), cycle: entry.cycle === 'yearly' ? 'yearly' : 'monthly' }
}

/** Product id for a plan + cycle (reverse lookup used when creating a checkout). */
export function productForPlan(productMap, plan, cycle = 'monthly') {
  const wanted = cycle === 'yearly' ? 'yearly' : 'monthly'
  for (const [productId, entry] of Object.entries(productMap || {})) {
    if (entry?.plan === plan && (entry.cycle === 'yearly' ? 'yearly' : 'monthly') === wanted) return productId
  }
  return ''
}

/** Polar amounts are integers in the smallest currency unit (cents). */
export function polarMinorToUnits(minor) {
  const numeric = Number(minor)
  return Number.isFinite(numeric) ? numeric / 100 : 0
}

/**
 * Build the Firestore subscription payload (same field names as the Paddle and
 * Lemon Squeezy ones) from a Polar `subscription` object. `fallback` is the plan
 * resolved from the checkout metadata when the product is not in the map.
 */
export function buildPolarSubscription(subscription = {}, { productMap = {}, fallback = null, now = new Date().toISOString() } = {}) {
  const mapped = planForProduct(productMap, subscription.product_id || subscription.product?.id) || fallback || { plan: 'basic', cycle: 'monthly' }
  const status = String(subscription.status || 'active')
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)
  const endsAt = subscription.ends_at || subscription.ended_at || ''
  const periodEnd = subscription.current_period_end || ''
  const trialEnd = subscription.trial_end || ''

  let planStatus
  if (status === 'active' || status === 'trialing') planStatus = cancelAtPeriodEnd ? 'canceled' : 'active'
  else if (status === 'past_due' || status === 'unpaid') planStatus = 'past_due'
  else if (status === 'canceled') planStatus = endsAt && new Date(endsAt).getTime() > Date.now() ? 'canceled' : 'expired'
  else if (status === 'revoked') planStatus = 'expired'
  else planStatus = status

  const finished = planStatus === 'expired'
  return {
    plan: mapped.plan,
    planStatus,
    subscriptionStatus: status,
    billingCycle: mapped.cycle,
    billingCurrency: String(subscription.currency || 'USD').toUpperCase(),
    subscriptionStartedAt: subscription.started_at || subscription.created_at || now,
    subscriptionExpiresAt: endsAt || periodEnd,
    nextBillingDate: cancelAtPeriodEnd || finished || status === 'canceled' ? '' : periodEnd,
    isTrialActive: status === 'trialing',
    trialEndDate: trialEnd,
    polarSubscriptionId: String(subscription.id || ''),
    polarCustomerId: String(subscription.customer_id || subscription.customer?.id || ''),
    paymentProvider: 'polar',
    approvedBy: `polar:${subscription.id || ''}`,
    approvedAt: now,
    updatedAt: now,
  }
}

/** Create a hosted checkout through the Polar API. Resolves the checkout URL. */
export async function createPolarCheckout({ accessToken, server = 'production', productId, email, metadata = {}, successUrl = '', returnUrl = '', fetchImpl = fetch }) {
  if (!accessToken || !productId) throw new Error('Polar checkout is not configured.')
  const body = {
    products: [productId],
    customer_email: email || undefined,
    metadata,
    success_url: successUrl || undefined,
    return_url: returnUrl || undefined,
  }
  const response = await fetchImpl(`${polarApiBase(server)}/checkouts/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  const url = json?.url
  if (!response.ok || !url) {
    const detail = typeof json?.detail === 'string' ? json.detail : json?.detail?.[0]?.msg
    throw new Error(detail || `Polar checkout failed (${response.status}).`)
  }
  return url
}
