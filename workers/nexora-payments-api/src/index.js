const GOOGLE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1'
const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1'

const SERVER_PLANS = {
  basic: { id: 'basic', name: 'Basic', monthlyPrice: 2999, yearlyPrice: 2999 * 12, currency: 'PKR', active: true },
  standard: { id: 'standard', name: 'Standard', monthlyPrice: 5999, yearlyPrice: 5999 * 12, currency: 'PKR', active: true },
  enterprise: { id: 'enterprise', name: 'Enterprise', monthlyPrice: 'custom', yearlyPrice: 'custom', currency: 'PKR', active: true },
}

let jwkCache = { keys: null, expiresAt: 0 }
let serviceTokenCache = { token: '', expiresAt: 0 }

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function lower(value) {
  return clean(value).toLowerCase()
}

function normalizePlanId(value) {
  return lower(value).replace(/[^a-z0-9]+/g, '-')
}

function normalizeBillingCycle(value) {
  return ['year', 'annual', 'annually', 'yearly'].includes(lower(value)) ? 'yearly' : 'monthly'
}

function normalizePromoCode(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32)
}

function evaluatePromo(promo, { code, planId, billingCycle, amount }) {
  if (!promo || promo.active !== true || promo.code !== code) throw new Error('Promo code was not found or is inactive.')
  const originalAmount = Number(amount)
  const startsAt = new Date(promo.startsAt)
  const expiresAt = new Date(promo.expiresAt)
  const now = new Date()
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) throw new Error('Promo codes cannot be used with custom pricing.')
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || now < startsAt || now >= expiresAt) throw new Error('This promo code is not currently valid.')
  if (!Array.isArray(promo.applicablePlanIds) || (!promo.applicablePlanIds.includes('all') && !promo.applicablePlanIds.includes(planId))) throw new Error('This promo code is not valid for the selected plan.')
  if (!Array.isArray(promo.billingCycles) || !promo.billingCycles.includes(billingCycle)) throw new Error('This promo code is not valid for the selected billing cycle.')
  if (originalAmount < Number(promo.minOrderAmount || 0)) throw new Error('The selected plan does not meet this promo code minimum.')
  if (Number(promo.usageLimit || 0) > 0 && Number(promo.usedCount || 0) >= Number(promo.usageLimit)) throw new Error('This promo code has reached its usage limit.')
  const rawDiscount = promo.discountType === 'percentage'
    ? originalAmount * (Number(promo.discountValue || 0) / 100)
    : Number(promo.discountValue || 0)
  const maxDiscount = Number(promo.maxDiscount || 0)
  const discountAmount = Math.min(originalAmount, Math.max(0, maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount))
  const finalAmount = Number((originalAmount - discountAmount).toFixed(2))
  if (discountAmount <= 0 || finalAmount <= 0) throw new Error('This promo code does not produce a valid checkout amount.')
  return {
    promoCode: code,
    promoCodeId: code,
    promoDiscountType: promo.discountType,
    promoDiscountValue: Number(promo.discountValue || 0),
    originalAmount,
    discountAmount: Number(discountAmount.toFixed(2)),
    finalAmount,
  }
}

function firstString(...values) {
  return values.map(clean).find(Boolean) || ''
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const origins = allowedOrigins(env)
  return {
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0] || 'https://nexorasolution.online',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
  })
}

function base64UrlToBytes(input) {
  const base64 = String(input).replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function base64UrlToString(input) {
  return new TextDecoder().decode(base64UrlToBytes(input))
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let mismatch = 0
  for (let index = 0; index < a.length; index += 1) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return mismatch === 0
}

async function getGoogleJwks() {
  const now = Date.now()
  if (jwkCache.keys && now < jwkCache.expiresAt) return jwkCache.keys
  const response = await fetch(GOOGLE_JWK_URL)
  if (!response.ok) throw new Error('Could not load Firebase signing keys.')
  const payload = await response.json()
  const keys = Object.fromEntries((payload.keys || []).map((key) => [key.kid, key]))
  const maxAge = Number((response.headers.get('cache-control')?.match(/max-age=(\d+)/) || [])[1]) || 3600
  jwkCache = { keys, expiresAt: now + maxAge * 1000 }
  return keys
}

async function verifyFirebaseToken(token, env) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed Firebase token.')
  const header = JSON.parse(base64UrlToString(parts[0]))
  const payload = JSON.parse(base64UrlToString(parts[1]))
  const now = Math.floor(Date.now() / 1000)
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected Firebase token algorithm.')
  if (!payload.sub || payload.exp <= now || payload.iat > now + 300) throw new Error('Expired or invalid Firebase token.')
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error('Firebase token audience mismatch.')
  if (payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) throw new Error('Firebase token issuer mismatch.')
  const jwk = (await getGoogleJwks())[header.kid]
  if (!jwk) throw new Error('Unknown Firebase signing key.')
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!valid) throw new Error('Invalid Firebase token signature.')
  return payload
}

function firestoreName(env, path) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

function firestoreUrl(env, path = '') {
  const encodedPath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${encodedPath ? `/${encodedPath}` : ''}`
}

function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } }
  if (value && typeof value === 'object') return { mapValue: { fields: encodeFirestoreFields(value) } }
  return { nullValue: null }
}

function encodeFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeFirestoreValue(value)]),
  )
}

function decodeFirestoreValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue)
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue.fields || {})
  return undefined
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]))
}

function decodeFirestoreDocument(document) {
  return document?.fields ? decodeFirestoreFields(document.fields) : null
}

async function firestoreGet(env, token, path, transaction = '') {
  const url = new URL(firestoreUrl(env, path))
  if (transaction) url.searchParams.set('transaction', transaction)
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 404) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore read failed (${response.status}).`)
  return decodeFirestoreDocument(payload)
}

async function firestoreCreate(env, token, path, data) {
  const url = new URL(firestoreUrl(env, path))
  url.searchParams.set('currentDocument.exists', 'false')
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore create failed (${response.status}).`)
  return decodeFirestoreDocument(payload)
}

function updateWrite(env, path, data, exists) {
  const write = {
    update: { name: firestoreName(env, path), fields: encodeFirestoreFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
  }
  if (typeof exists === 'boolean') write.currentDocument = { exists }
  return write
}

async function firestoreCommit(env, token, writes, transaction = '') {
  const response = await fetch(
    `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore commit failed (${response.status}).`)
  return payload
}

async function beginFirestoreTransaction(env, token) {
  const response = await fetch(
    `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:beginTransaction`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { readWrite: {} } }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.transaction) throw new Error(payload?.error?.message || 'Could not start payment transaction.')
  return payload.transaction
}

async function rollbackFirestoreTransaction(env, token, transaction) {
  await fetch(
    `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:rollback`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction }),
    },
  ).catch(() => {})
}

async function getPaymentServiceToken(env) {
  const now = Date.now()
  if (serviceTokenCache.token && now < serviceTokenCache.expiresAt) return serviceTokenCache.token
  if (!env.FIREBASE_PAYMENT_SERVICE_EMAIL || !env.FIREBASE_PAYMENT_SERVICE_PASSWORD) {
    throw new Error('Payment service identity is not configured.')
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.FIREBASE_PAYMENT_SERVICE_EMAIL,
        password: env.FIREBASE_PAYMENT_SERVICE_PASSWORD,
        returnSecureToken: true,
      }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.idToken) throw new Error('Payment service authentication failed.')
  serviceTokenCache = {
    token: payload.idToken,
    expiresAt: now + Math.max(300, Number(payload.expiresIn || 3600) - 300) * 1000,
  }
  return serviceTokenCache.token
}

async function nowPaymentsRequest(env, path, options = {}) {
  if (!env.NOWPAYMENTS_API_KEY) throw new Error('NOWPayments API key is not configured.')
  const response = await fetch(`${NOWPAYMENTS_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.NOWPAYMENTS_API_KEY,
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(clean(payload?.message || payload?.error) || `NOWPayments request failed (${response.status}).`)
  return payload
}

function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortedObject(value[key])
    return result
  }, {})
}

async function validNowPaymentsSignature(body, signature, secret) {
  if (!signature || !secret) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(sortedObject(body))))
  return timingSafeEqual(bytesToHex(mac), lower(signature))
}

function checkoutContext(claims, user, workspace, plan, billingCycle, configuredPkrPerUsd, promo = null, promoCode = '') {
  const fallbackPlan = SERVER_PLANS[plan.id]
  const cycle = normalizeBillingCycle(billingCycle)
  const role = lower(user.role || claims.role)
  const workspaceId = clean(user.workspaceId) || claims.sub
  const canUpgrade = claims.sub === workspaceId
    || workspace.ownerId === claims.sub
    || workspace.createdBy === claims.sub
    || (user.workspaceId === workspaceId && ['owner', 'admin'].includes(role))
  if (!canUpgrade) throw new Error('Only the workspace owner/admin can upgrade this plan.')
  if (plan.active === false || plan.enabled === false) throw new Error('This plan is not available.')

  const configuredAmount = cycle === 'yearly' ? plan.nowPaymentsYearlyPrice : plan.nowPaymentsMonthlyPrice
  const hasCryptoAmount = configuredAmount !== null && configuredAmount !== undefined && configuredAmount !== ''
  const planAmount = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
  const billingCurrency = lower(plan.currency || 'PKR')
  const pkrPerUsd = Number(configuredPkrPerUsd)
  if (billingCurrency === 'pkr' && !hasCryptoAmount && (!Number.isFinite(pkrPerUsd) || pkrPerUsd <= 0)) {
    throw new Error('PKR to USD checkout rate is not configured.')
  }
  const basePriceAmount = billingCurrency === 'pkr' && !hasCryptoAmount
    ? Number((Number(planAmount) / pkrPerUsd).toFixed(2))
    : Number(hasCryptoAmount ? configuredAmount : planAmount)
  const priceCurrency = billingCurrency === 'pkr' && !hasCryptoAmount
    ? 'usd'
    : lower(hasCryptoAmount ? plan.nowPaymentsCurrency || 'USD' : billingCurrency)
  const billingAmount = Number(planAmount)
  if (!Number.isFinite(basePriceAmount) || basePriceAmount <= 0 || !priceCurrency || !Number.isFinite(billingAmount) || billingAmount <= 0) throw new Error('Invalid crypto plan price.')
  const promoResult = promoCode ? evaluatePromo(promo, { code: promoCode, planId: plan.id, billingCycle: cycle, amount: billingAmount }) : null
  const finalBillingAmount = promoResult?.finalAmount ?? billingAmount
  const priceAmount = Number((basePriceAmount * (finalBillingAmount / billingAmount)).toFixed(2))

  return {
    uid: claims.sub,
    email: lower(claims.email || user.email),
    workspaceId,
    ownerId: clean(workspace.ownerId) || claims.sub,
    workspaceName: firstString(workspace.workspaceName, workspace.companyName, workspace.businessName, 'Nexora Workspace'),
    businessType: firstString(workspace.selectedBusinessType, workspace.businessType, user.selectedBusinessType, user.businessType),
    currentPlan: firstString(workspace.plan, workspace.selectedPlan, user.plan, 'Basic'),
    requestedPlan: firstString(plan.planName, plan.name, fallbackPlan.name),
    planId: plan.id,
    billingCycle: cycle,
    priceAmount,
    priceCurrency,
    billingAmount: finalBillingAmount,
    originalAmount: promoResult?.originalAmount ?? billingAmount,
    discountAmount: promoResult?.discountAmount ?? 0,
    promoCode: promoResult?.promoCode || '',
    promoCodeId: promoResult?.promoCodeId || '',
    promoDiscountType: promoResult?.promoDiscountType || '',
    promoDiscountValue: promoResult?.promoDiscountValue || 0,
    billingCurrency: billingCurrency.toUpperCase(),
  }
}

async function handleCreateInvoice(request, env) {
  const origin = request.headers.get('Origin') || ''
  if (!allowedOrigins(env).includes(origin)) return jsonResponse(request, env, { ok: false, error: 'Origin not allowed.' }, 403)
  const authHeader = request.headers.get('Authorization') || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  let claims
  try {
    claims = await verifyFirebaseToken(idToken, env)
  } catch {
    return jsonResponse(request, env, { ok: false, error: 'Sign in again before starting checkout.' }, 401)
  }

  let input
  try {
    input = await request.json()
  } catch {
    return jsonResponse(request, env, { ok: false, error: 'Invalid checkout request.' }, 400)
  }
  const planId = normalizePlanId(input?.planId)
  const promoCode = normalizePromoCode(input?.promoCode)
  const fallbackPlan = SERVER_PLANS[planId]
  if (!fallbackPlan) return jsonResponse(request, env, { ok: false, error: 'Select a valid subscription plan.' }, 400)

  try {
    const user = await firestoreGet(env, idToken, `users/${claims.sub}`) || {}
    const workspaceId = clean(user.workspaceId) || claims.sub
    const [workspace, storedPlan, promo] = await Promise.all([
      firestoreGet(env, idToken, `workspaces/${workspaceId}`),
      firestoreGet(env, idToken, `platformPlans/${planId}`),
      promoCode ? firestoreGet(env, idToken, `promoCodes/${promoCode}`) : Promise.resolve(null),
    ])
    if (!workspace) throw new Error('Workspace record is missing.')
    const plan = { ...fallbackPlan, ...(storedPlan || {}), id: planId }
    const context = checkoutContext(claims, user, workspace, plan, input?.billingCycle, env.PKR_PER_USD, promo, promoCode)
    const checkoutId = crypto.randomUUID().replaceAll('-', '')
    const orderId = `nx_${checkoutId}`
    const callbackUrl = `${new URL(request.url).origin}/webhooks/nowpayments`
    const invoice = await nowPaymentsRequest(env, '/invoice', {
      method: 'POST',
      body: JSON.stringify({
        price_amount: context.priceAmount,
        price_currency: context.priceCurrency,
        order_id: orderId,
        order_description: `${context.requestedPlan} plan - ${context.billingCycle}`,
        ipn_callback_url: callbackUrl,
        success_url: `${env.APP_BASE_URL}/upgrade-business?crypto=processing`,
        cancel_url: `${env.APP_BASE_URL}/upgrade-business?crypto=cancelled`,
      }),
    })
    const invoiceUrl = clean(invoice.invoice_url)
    const parsedUrl = new URL(invoiceUrl)
    if (parsedUrl.protocol !== 'https:' || !/(^|\.)nowpayments\.io$/i.test(parsedUrl.hostname)) {
      throw new Error('NOWPayments returned an invalid checkout URL.')
    }

    const now = new Date()
    await firestoreCreate(env, idToken, `upgradeRequests/${checkoutId}`, {
      email: context.email,
      uid: context.uid,
      userId: context.uid,
      createdBy: context.uid,
      ownerId: context.ownerId,
      workspaceId: context.workspaceId,
      workspaceName: context.workspaceName,
      businessType: context.businessType,
      currentPlan: context.currentPlan,
      requestedPlan: context.requestedPlan,
      selectedPlan: context.requestedPlan,
      planId: context.planId,
      billingCycle: context.billingCycle,
      originalAmount: context.originalAmount,
      discountAmount: context.discountAmount,
      finalAmount: context.billingAmount,
      promoCode: context.promoCode,
      promoCodeId: context.promoCodeId,
      promoDiscountType: context.promoDiscountType,
      promoDiscountValue: context.promoDiscountValue,
      amount: context.billingAmount,
      amountPaid: 0,
      currency: context.billingCurrency,
      paymentMethod: 'Crypto (NOWPayments)',
      paymentMethodId: 'nowpayments',
      automaticVerification: true,
      nowPaymentsOrderId: orderId,
      nowPaymentsInvoiceId: String(invoice.id || ''),
      nowPaymentsPriceAmount: context.priceAmount,
      nowPaymentsPriceCurrency: context.priceCurrency.toUpperCase(),
      invoiceUrl,
      status: 'waiting',
      approvalStatus: 'pending',
      paymentStatus: 'waiting',
      createdAt: now,
      updatedAt: now,
    })
    return jsonResponse(request, env, { ok: true, checkoutId, invoiceUrl })
  } catch (error) {
    console.error('[Payments Worker] invoice failed', error?.message || String(error))
    return jsonResponse(request, env, { ok: false, error: error?.message || 'Unable to start crypto checkout.' }, 400)
  }
}

function approvedSubscriptionPayload(payment, paymentId, checkoutId) {
  const cycle = normalizeBillingCycle(payment.billingCycle)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
  return {
    plan: payment.requestedPlan,
    planStatus: 'active',
    subscriptionStatus: 'active',
    billingCycle: cycle,
    billingCurrency: payment.currency || 'PKR',
    subscriptionStartedAt: now,
    subscriptionExpiresAt: expiresAt,
    nextBillingDate: expiresAt,
    expiresAt,
    isTrialActive: false,
    upgradedAt: now,
    approvedAt: now,
    approvedBy: `nowpayments:${paymentId}`,
    approvedByEmail: '',
    paymentCheckoutId: checkoutId,
    updatedAt: now,
  }
}

async function updateIpnStatus(env, token, checkoutId, paymentId, status) {
  const now = new Date()
  await firestoreCommit(env, token, [
    updateWrite(env, `upgradeRequests/${checkoutId}`, {
      status,
      paymentStatus: status,
      nowPaymentsPaymentId: paymentId,
      lastIpnAt: now,
      updatedAt: now,
    }, true),
  ])
}

async function activateFinishedPayment(env, token, checkoutId, paymentId, verified) {
  const transaction = await beginFirestoreTransaction(env, token)
  try {
    const payment = await firestoreGet(env, token, `upgradeRequests/${checkoutId}`, transaction)
    if (!payment) throw new Error('Checkout not found.')
    if (payment.autoApprovedAt) {
      await rollbackFirestoreTransaction(env, token, transaction)
      return false
    }
    const promo = payment.promoCodeId
      ? await firestoreGet(env, token, `promoCodes/${payment.promoCodeId}`, transaction)
      : null
    const subscription = approvedSubscriptionPayload(payment, paymentId, checkoutId)
    const paidAmount = Number(verified.actually_paid || verified.pay_amount || 0) || 0
    const paidCurrency = clean(verified.pay_currency).toUpperCase()
    const requestUpdate = {
      status: 'approved',
      approvalStatus: 'approved',
      paymentStatus: 'paid',
      amountPaid: paidAmount,
      paidCurrency,
      nowPaymentsPaymentId: paymentId,
      lastIpnAt: subscription.updatedAt,
      autoApprovedAt: subscription.approvedAt,
      approvedAt: subscription.approvedAt,
      approvedBy: subscription.approvedBy,
      subscriptionExpiresAt: subscription.subscriptionExpiresAt,
      nextBillingDate: subscription.nextBillingDate,
      updatedAt: subscription.updatedAt,
    }
    const writes = [
      updateWrite(env, `upgradeRequests/${checkoutId}`, requestUpdate, true),
      updateWrite(env, `users/${payment.ownerId}`, subscription, true),
      updateWrite(env, `workspaces/${payment.workspaceId}`, subscription, true),
      updateWrite(env, `platformPayments/${checkoutId}`, {
        clientEmail: payment.email || '',
        workspaceId: payment.workspaceId,
        workspaceName: payment.workspaceName || '',
        plan: payment.requestedPlan,
        amount: Number(payment.amount || 0),
        originalAmount: Number(payment.originalAmount || payment.amount || 0),
        discountAmount: Number(payment.discountAmount || 0),
        promoCode: payment.promoCode || '',
        promoCodeId: payment.promoCodeId || '',
        currency: payment.currency,
        cryptoAmountPaid: paidAmount,
        cryptoCurrency: paidCurrency,
        transactionId: paymentId,
        paymentMethod: 'Crypto (NOWPayments)',
        status: 'paid',
        paymentStatus: 'paid',
        approvedBy: subscription.approvedBy,
        approvedAt: subscription.approvedAt,
        subscriptionExpiresAt: subscription.subscriptionExpiresAt,
        nextBillingDate: subscription.nextBillingDate,
        source: 'nowpayments-ipn',
        sourceId: checkoutId,
        updatedAt: subscription.updatedAt,
      }),
    ]
    if (promo && (Number(promo.usageLimit || 0) === 0 || Number(promo.usedCount || 0) < Number(promo.usageLimit))) {
      writes.push(updateWrite(env, `promoCodes/${payment.promoCodeId}`, {
        usedCount: Number(promo.usedCount || 0) + 1,
        updatedAt: subscription.updatedAt,
      }, true))
    }
    await firestoreCommit(env, token, writes, transaction)
    return true
  } catch (error) {
    await rollbackFirestoreTransaction(env, token, transaction)
    throw error
  }
}

async function handleNowPaymentsIpn(request, env) {
  const rawBody = await request.text()
  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const validSignature = await validNowPaymentsSignature(
    body,
    request.headers.get('x-nowpayments-sig'),
    env.NOWPAYMENTS_IPN_SECRET,
  )
  if (!validSignature) return new Response('Invalid signature', { status: 401 })

  const orderId = clean(body.order_id)
  const paymentId = clean(String(body.payment_id || ''))
  const status = lower(body.payment_status)
  if (!/^nx_[a-zA-Z0-9_-]{20,120}$/.test(orderId) || !paymentId || !status) {
    return new Response('Invalid notification', { status: 400 })
  }
  const checkoutId = orderId.slice(3)

  try {
    const serviceToken = await getPaymentServiceToken(env)
    const payment = await firestoreGet(env, serviceToken, `upgradeRequests/${checkoutId}`)
    if (!payment
      || payment.nowPaymentsOrderId !== orderId
      || payment.paymentMethodId !== 'nowpayments'
      || payment.automaticVerification !== true) {
      return new Response('Checkout not found', { status: 404 })
    }

    if (status !== 'finished') {
      await updateIpnStatus(env, serviceToken, checkoutId, paymentId, status)
      return new Response('OK', { status: 200 })
    }

    const verified = await nowPaymentsRequest(env, `/payment/${encodeURIComponent(paymentId)}`)
    const amountMatches = Number.isFinite(Number(verified.price_amount))
      && Math.abs(Number(verified.price_amount) - Number(payment.nowPaymentsPriceAmount)) <= 0.01
    const currencyMatches = lower(verified.price_currency) === lower(payment.nowPaymentsPriceCurrency)
    if (lower(verified.payment_status) !== 'finished'
      || clean(verified.order_id) !== orderId
      || !amountMatches
      || !currencyMatches) {
      console.error('[Payments Worker] verification mismatch', { checkoutId, paymentId })
      return new Response('Verification mismatch', { status: 409 })
    }

    await activateFinishedPayment(env, serviceToken, checkoutId, paymentId, verified)
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[Payments Worker] IPN failed', error?.message || String(error))
    return new Response('Verification failed', { status: 500 })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse(request, env, {
        ok: true,
        service: 'nexora-payments-api',
        nowPaymentsConfigured: Boolean(env.NOWPAYMENTS_API_KEY && env.NOWPAYMENTS_IPN_SECRET),
        firebaseServiceConfigured: Boolean(env.FIREBASE_PAYMENT_SERVICE_EMAIL && env.FIREBASE_PAYMENT_SERVICE_PASSWORD),
      })
    }
    if (request.method === 'POST' && url.pathname === '/api/payments/invoice') {
      return handleCreateInvoice(request, env)
    }
    if (request.method === 'POST' && url.pathname === '/webhooks/nowpayments') {
      return handleNowPaymentsIpn(request, env)
    }
    return jsonResponse(request, env, { ok: false, error: 'Not found.' }, 404)
  },
}
