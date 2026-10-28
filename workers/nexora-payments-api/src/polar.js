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

// ---- Failed payments --------------------------------------------------------
// Polar's webhooks only say a subscription went past_due; the decline reason lives on the Payment object
// (GET /v1/payments: status, decline_reason, decline_message). The Control Centre reads it from there.

const DECLINE_LABELS = {
  insufficient_funds: 'Insufficient funds',
  card_declined: 'Card declined by bank',
  generic_decline: 'Card declined by bank',
  do_not_honor: 'Bank refused (do not honor)',
  expired_card: 'Card expired',
  incorrect_cvc: 'Wrong CVC',
  invalid_cvc: 'Wrong CVC',
  incorrect_number: 'Wrong card number',
  invalid_number: 'Wrong card number',
  invalid_expiry_month: 'Wrong expiry date',
  invalid_expiry_year: 'Wrong expiry date',
  incorrect_zip: 'Wrong postal code',
  lost_card: 'Card reported lost',
  stolen_card: 'Card reported stolen',
  pickup_card: 'Card blocked by bank',
  restricted_card: 'Card restricted',
  fraudulent: 'Flagged as fraud',
  card_velocity_exceeded: 'Too many attempts on this card',
  withdrawal_count_limit_exceeded: 'Card limit exceeded',
  currency_not_supported: 'Card does not support this currency',
  card_not_supported: 'Card type not supported',
  authentication_required: '3D Secure / authentication needed',
  authentication_failed: '3D Secure authentication failed',
  processing_error: 'Bank processing error',
  try_again_later: 'Bank temporarily unavailable',
  transaction_not_allowed: 'Transaction not allowed by bank',
  not_permitted: 'Transaction not allowed by bank',
  testmode_decline: 'Test card declined',
}

export function declineReasonLabel(code, message = '') {
  const key = String(code || '').trim().toLowerCase()
  if (!key) return String(message || '').trim() || 'Reason not provided'
  if (DECLINE_LABELS[key]) return DECLINE_LABELS[key]
  const words = key.replace(/[_-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Failed payments (newest first), what is counted today and why they failed.
 * `sinceIso` is the start of "today" in the viewer's time zone.
 */
export function summarizeFailedPayments(payments = [], { sinceIso = '' } = {}) {
  const since = new Date(sinceIso || '').getTime()
  const failures = (Array.isArray(payments) ? payments : [])
    .filter((payment) => String(payment?.status || '').toLowerCase() === 'failed')
    .map((payment) => {
      const meta = payment.method_metadata || {}
      return {
        id: String(payment.id || ''),
        createdAt: String(payment.created_at || ''),
        amount: polarMinorToUnits(payment.amount),
        currency: String(payment.currency || 'USD').toUpperCase(),
        reasonCode: String(payment.decline_reason || ''),
        reason: declineReasonLabel(payment.decline_reason, payment.decline_message),
        message: String(payment.decline_message || ''),
        method: [String(payment.method || ''), meta.brand, meta.last4 ? `•••• ${meta.last4}` : ''].filter(Boolean).join(' '),
        checkoutId: String(payment.checkout_id || ''),
        orderId: String(payment.order_id || ''),
        email: '',
        workspaceId: '',
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const today = Number.isFinite(since) ? failures.filter((row) => new Date(row.createdAt).getTime() >= since) : []
  const breakdown = (rows) => {
    const counts = new Map()
    rows.forEach((row) => counts.set(row.reason, (counts.get(row.reason) || 0) + 1))
    return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
  }
  return { failures, todayCount: today.length, todayReasons: breakdown(today), periodReasons: breakdown(failures) }
}

/** Recent Polar payments (up to `pages` x 100, newest first). The caller filters for failed ones. */
export async function listPolarPayments({ accessToken, server = 'production', pages = 3, fetchImpl = fetch }) {
  const base = polarApiBase(server)
  const items = []
  for (let page = 1; page <= pages; page += 1) {
    const result = await polarJson(`${base}/payments/?limit=100&page=${page}`, { token: accessToken, fetchImpl })
    if (!result.ok) {
      const error = new Error(`Polar payments lookup failed (${result.status}).`)
      error.status = result.status
      throw error
    }
    const batch = Array.isArray(result.json?.items) ? result.json.items : []
    items.push(...batch)
    if (batch.length < 100) break
  }
  return items
}

/** Who a failed payment belongs to: the checkout (or order) it came from carries the customer email and our workspace id. */
export async function lookupPolarPaymentOwner({ accessToken, server = 'production', checkoutId = '', orderId = '', fetchImpl = fetch }) {
  const base = polarApiBase(server)
  if (checkoutId) {
    const result = await polarJson(`${base}/checkouts/${encodeURIComponent(checkoutId)}`, { token: accessToken, fetchImpl })
    if (result.ok) return { email: String(result.json?.customer_email || result.json?.customer?.email || ''), workspaceId: String(result.json?.metadata?.workspace_id || '') }
  }
  if (orderId) {
    const result = await polarJson(`${base}/orders/${encodeURIComponent(orderId)}`, { token: accessToken, fetchImpl })
    if (result.ok) return { email: String(result.json?.customer?.email || ''), workspaceId: String(result.json?.metadata?.workspace_id || '') }
  }
  return { email: '', workspaceId: '' }
}
