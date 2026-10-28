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
  const trialing = status === 'trialing'
  // The app only treats 'active'/'paid'/'approved'/'current' as paid access, so a Polar trial is stored as
  // 'active' (the raw Polar status stays in polarStatus). It is NOT the app's own free trial: isTrialActive must
  // stay false, otherwise a customer whose free trial already ended is shown "trial expired" and locked out.
  const periodOrTrialEnd = periodEnd || (trialing ? trialEnd : '')
  return {
    plan: mapped.plan,
    planStatus,
    subscriptionStatus: trialing ? 'active' : status,
    polarStatus: status,
    billingCycle: mapped.cycle,
    billingCurrency: String(subscription.currency || 'USD').toUpperCase(),
    subscriptionStartedAt: subscription.started_at || subscription.created_at || now,
    subscriptionExpiresAt: endsAt || periodOrTrialEnd,
    nextBillingDate: cancelAtPeriodEnd || finished || status === 'canceled' ? '' : periodOrTrialEnd,
    isTrialActive: false,
    polarTrialEndsAt: trialEnd,
    polarSubscriptionId: String(subscription.id || ''),
    polarCustomerId: String(subscription.customer_id || subscription.customer?.id || ''),
    paymentProvider: 'polar',
    approvedBy: `polar:${subscription.id || ''}`,
    approvedAt: now,
    updatedAt: now,
  }
}

/** Create a hosted checkout through the Polar API. Resolves the checkout URL. */
export async function createPolarCheckout({ accessToken, server = 'production', productId, email, metadata = {}, successUrl = '', returnUrl = '', allowTrial = true, fetchImpl = fetch }) {
  if (!accessToken || !productId) throw new Error('Polar checkout is not configured.')
  const body = {
    products: [productId],
    // false = charge now even though the Polar product has a trial (the customer already used the 1-month trial).
    ...(allowTrial === false ? { allow_trial: false } : {}),
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

const TRIAL_HISTORY_STATUSES = ['trial', 'free trial', 'expired', 'trial expired', 'trialing']

/**
 * True when the account already had its free month (the in-app trial every signup gets, or an earlier Polar
 * subscription). Such an account must pay at once instead of starting a second trial at checkout.
 */
export function trialAlreadyUsed(...docs) {
  return docs.some((doc) => {
    if (!doc || typeof doc !== 'object') return false
    const status = String(doc.subscriptionStatus || doc.planStatus || '').trim().toLowerCase()
    return Boolean(
      doc.trialStartAt || doc.trialStartedAt || doc.trialEndsAt || doc.isTrialActive === true
      || doc.polarSubscriptionId || doc.paymentProvider === 'polar'
      || TRIAL_HISTORY_STATUSES.includes(status),
    )
  })
}

async function polarJson(url, { method = 'GET', token, body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

/** Short-lived customer session: gives a portal link and a token that can read the customer's saved cards. */
export async function createPolarCustomerSession({ accessToken, server = 'production', customerId, returnUrl = '', fetchImpl = fetch }) {
  const base = polarApiBase(server)
  let result = await polarJson(`${base}/customer-sessions/`, { method: 'POST', token: accessToken, body: { customer_id: customerId, ...(returnUrl ? { return_url: returnUrl } : {}) }, fetchImpl })
  if (!result.ok && returnUrl && result.status === 422) {
    result = await polarJson(`${base}/customer-sessions/`, { method: 'POST', token: accessToken, body: { customer_id: customerId }, fetchImpl })
  }
  if (!result.ok || !result.json?.token) throw new Error(`Polar customer session failed (${result.status}).`)
  return { token: result.json.token, portalUrl: result.json.customer_portal_url || '' }
}

export async function getPolarSubscription({ accessToken, server = 'production', subscriptionId, fetchImpl = fetch }) {
  const result = await polarJson(`${polarApiBase(server)}/subscriptions/${encodeURIComponent(subscriptionId)}`, { token: accessToken, fetchImpl })
  if (!result.ok) throw new Error(`Polar subscription lookup failed (${result.status}).`)
  return result.json
}

export async function listPolarPaymentMethods({ sessionToken, server = 'production', fetchImpl = fetch }) {
  const result = await polarJson(`${polarApiBase(server)}/customer-portal/customers/me/payment-methods`, { token: sessionToken, fetchImpl })
  if (!result.ok) throw new Error(`Polar payment methods lookup failed (${result.status}).`)
  return Array.isArray(result.json?.items) ? result.json.items : []
}

/** What the Workspace billing card shows, from a Polar subscription object and the customer's saved cards. */
export function summarizePolarBilling(subscription = {}, paymentMethods = []) {
  const status = String(subscription.status || '')
  const trialing = status === 'trialing'
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)
  const active = status === 'active' || trialing
  const periodEnd = subscription.current_period_end || ''
  const card = paymentMethods.find((item) => item?.type === 'card') || paymentMethods[0] || null
  const meta = card?.method_metadata || {}
  return {
    status,
    trialing,
    active,
    cancelAtPeriodEnd,
    endsAt: subscription.ends_at || '',
    // When the plan stops (cancelled) or the next charge happens (renewing).
    periodEnd,
    nextPaymentDate: active && !cancelAtPeriodEnd ? periodEnd : '',
    trialEnd: trialing ? subscription.trial_end || periodEnd : '',
    amount: polarMinorToUnits(subscription.amount),
    currency: String(subscription.currency || 'USD').toUpperCase(),
    interval: subscription.recurring_interval || '',
    card: card ? { id: String(card.id || ''), brand: meta.brand || '', last4: meta.last4 || '', expMonth: meta.exp_month || null, expYear: meta.exp_year || null } : null,
  }
}
