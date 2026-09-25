export const DEFAULT_SAAS_CURRENCY = 'PKR'
export const PLATFORM_PLAN_COLLECTION = 'platformPlans'
export const PLATFORM_YEARLY_DISCOUNT = 0.8 // 20% savings on yearly
export const NEW_USER_DISCOUNT = 0.5 // 50% off for new users

/**
 * Yearly price rule, shared by the site, the admin Plans tab and (as a copy)
 * the payments worker: round(monthly × 12 × 0.8). 'custom' stays 'custom'.
 */
export function yearlyPrice(monthly) {
  if (String(monthly).toLowerCase() === 'custom') return 'custom'
  const numeric = Number(monthly)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 12 * PLATFORM_YEARLY_DISCOUNT) : 0
}

export const defaultPaymentAccounts = {
  jazzcash: {
    id: 'jazzcash',
    label: 'JazzCash',
    accountTitle: 'Nexora Solution',
    accountNumber: '0300-1234567',
    instructions: 'Send payment to this JazzCash number and keep the receipt screenshot.',
  },
  easypaisa: {
    id: 'easypaisa',
    label: 'Easypaisa',
    accountTitle: 'Nexora Solution',
    accountNumber: '0300-1234567',
    instructions: 'Send payment to this Easypaisa number and keep the receipt screenshot.',
  },
  bank_transfer: {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    bankName: 'Meezan Bank',
    accountTitle: 'Nexora Solution',
    accountNumber: 'XXXXXXXX',
    instructions: 'Use your email or workspace ID as the payment reference.',
  },
  nowpayments: {
    id: 'nowpayments',
    label: 'Crypto (NOWPayments)',
    accountTitle: 'NOWPayments Hosted Checkout',
    accountNumber: 'Payment link',
    paymentUrl: 'https://nowpayments.io/payment/?iid=6260577741&source=button',
    buttonImageUrl: 'https://nowpayments.io/images/embeds/payment-button-white.svg',
    instructions: 'Secure crypto checkout with automatic payment verification and plan activation.',
  },
  paddle: {
    id: 'paddle',
    label: 'Card / PayPal (Paddle)',
    accountTitle: 'Paddle Checkout',
    accountNumber: 'Card, PayPal, Apple Pay, Google Pay',
    instructions: 'Secure card payment via Paddle. Instant activation after payment.',
  },
  manual_payment: {
    id: 'manual_payment',
    label: 'Manual Payment',
    accountTitle: 'Nexora Solution',
    accountNumber: 'Contact support',
    instructions: 'Contact support after payment and upload proof if available.',
  },
}

export const defaultPlatformSettings = {
  defaultCurrency: DEFAULT_SAAS_CURRENCY,
  supportEmail: 'support@nexorasolution.online',
  paymentAccounts: defaultPaymentAccounts,
}

/* Free Trial — used only on the public website pricing page.
   NOT included in defaultPlatformPlans so it never appears in UpgradeBusiness. */
export const freeTrialConfig = {
  id: 'free-trial',
  name: '1-Month Free Trial',
  monthlyPrice: 0,
  yearlyPrice: 0,
  price: 0,
  priceLabel: 'PKR 0',
  priceNote: 'No credit card required',
  description: 'Experience the complete Nexora platform before subscribing.',
  currency: DEFAULT_SAAS_CURRENCY,
  active: true,
  recommended: false,
  badge: null,
  features: [
    'Full access to ALL Nexora modules',
    'Unlimited users during trial',
    'Unlimited storage during trial',
    'All premium features enabled',
    'Team Management enabled',
    'Reports & Analytics',
    'Cloud Sync',
    'Email Support',
    'No credit card required',
  ],
}

export const defaultPlatformPlans = [
  {
    id: 'basic',
    planName: 'Basic',
    name: 'Basic',
    monthlyPrice: 2000,
    yearlyPrice: yearlyPrice(2000),
    price: 2000,
    description: 'Perfect for small businesses using a single Nexora solution.',
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    active: true,
    enabled: true,
    recommended: false,
    badge: null,
    features: [
      'Choose ANY ONE Nexora Business Module (Restaurant POS, Retail POS, School ERP, Transport, PharmaFlow, CRM, WhatsApp CRM, or any future module)',
      'Up to 2 Team Members',
      'Team Management (maximum 2 users)',
      'Role & Permission Management',
      'Dashboard & Reports',
      'Invoice & Billing',
      '5 GB Secure Cloud Storage',
      'Automatic Backup & Restore',
      'Email Support',
      'Free Updates',
      'Secure Cloud Sync',
    ],
  },
  {
    id: 'standard',
    planName: 'Standard',
    name: 'Standard',
    monthlyPrice: 5999,
    yearlyPrice: yearlyPrice(5999),
    price: 5999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    active: true,
    enabled: true,
    recommended: true,
    badge: 'Recommended',
    features: ['All Basic Features', 'One Business Module', 'Up to 5 Users', '20GB Storage', 'Priority Support'],
  },
  {
    id: 'enterprise',
    planName: 'Enterprise',
    name: 'Enterprise',
    monthlyPrice: 'custom',
    yearlyPrice: 'custom',
    price: 'custom',
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'custom',
    active: true,
    enabled: true,
    recommended: false,
    badge: null,
    features: ['All Standard Features', 'Unlimited Users', 'Custom Integrations', 'Dedicated Support', 'Custom Development'],
  },
]

export function normalizePlanId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function normalizePrice(value, fallback) {
  if (String(value).toLowerCase() === 'custom') return 'custom'
  if (value === null || value === undefined || value === '') return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizePlan(plan, fallback = {}) {
  const id = normalizePlanId(plan.id || plan.planName || plan.name || fallback.id)
  const name = plan.planName || plan.name || fallback.planName || fallback.name || id
  const monthlyPrice = normalizePrice(plan.monthlyPrice ?? plan.price, fallback.monthlyPrice ?? fallback.price ?? 0)
  // Yearly always follows the -20% rule unless the admin stored an explicit
  // yearlyPriceOverride (a stored yearlyPrice alone is ignored: older Plans-tab
  // saves wrote monthly × 12 there).
  const override = normalizePrice(plan.yearlyPriceOverride, null)
  const yearly = override === 'custom' || (typeof override === 'number' && override > 0) ? override : yearlyPrice(monthlyPrice)
  const active = plan.active !== false && plan.enabled !== false
  const merged = { ...fallback, ...plan }
  // A strike-through price is only kept when it is really higher than the price.
  const originalPrice = Number(merged.originalPrice)
  if (!(Number.isFinite(originalPrice) && typeof monthlyPrice === 'number' && originalPrice > monthlyPrice)) delete merged.originalPrice
  return {
    ...merged,
    id,
    planName: name,
    name,
    monthlyPrice,
    yearlyPrice: yearly,
    price: monthlyPrice,
    currency: plan.currency || fallback.currency || DEFAULT_SAAS_CURRENCY,
    billingCycle: plan.billingCycle || fallback.billingCycle || 'monthly',
    features: Array.isArray(plan.features) ? plan.features : fallback.features || [],
    active,
    enabled: active,
    recommended: Boolean(plan.recommended ?? fallback.recommended),
  }
}

/**
 * The one plan list: Firestore platformPlans docs (edited in the admin Plans
 * tab) win over defaultPlatformPlans, which are only the fallback.
 */
export function resolvePlatformPlans(planDocs = []) {
  const byId = new Map(defaultPlatformPlans.map((plan) => [plan.id, normalizePlan(plan)]))
  planDocs.forEach((plan) => {
    const id = normalizePlanId(plan.id || plan.planName || plan.name)
    if (!id) return
    byId.set(id, normalizePlan(plan, byId.get(id) || {}))
  })
  return defaultPlatformPlans.map((plan) => byId.get(plan.id)).filter(Boolean)
}

// Previous name, kept for existing imports.
export const mergePlatformPlans = resolvePlatformPlans

/** Resolved default plans (no Firestore data). */
export function defaultResolvedPlans() {
  return resolvePlatformPlans([])
}

function formatPlanPkr(amount) {
  return `PKR ${Number(amount || 0).toLocaleString('en-US')}`
}

/**
 * One-sentence price summary for FAQ/SEO copy, e.g.
 * "Plans start at PKR 2,000/month (Basic) and PKR 5,999/month (Standard); Enterprise is custom-priced."
 */
export function planPriceSentence(plans = defaultResolvedPlans()) {
  const priced = plans.filter((plan) => plan.active !== false && typeof plan.monthlyPrice === 'number' && plan.monthlyPrice > 0)
  const custom = plans.filter((plan) => plan.active !== false && plan.monthlyPrice === 'custom')
  const parts = priced.map((plan) => `${formatPlanPkr(plan.monthlyPrice)}/month (${plan.name})`)
  const lead = parts.length ? `Plans start at ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}` : 'See the pricing page for current plans'
  const tail = custom.length ? `; ${custom.map((plan) => plan.name).join(', ')} ${custom.length > 1 ? 'are' : 'is'} custom-priced` : ''
  return `${lead}${tail}.`
}

export function mergePlatformSettings(settingDocs = []) {
  const merged = settingDocs.reduce((acc, doc) => ({ ...acc, ...doc }), {})
  return {
    ...defaultPlatformSettings,
    ...merged,
    paymentAccounts: {
      ...defaultPaymentAccounts,
      ...(merged.paymentAccounts || {}),
    },
  }
}

export function paymentMethodsFromSettings(settings = defaultPlatformSettings) {
  const accounts = settings.paymentAccounts || defaultPaymentAccounts
  return [
    accounts.nowpayments,
    accounts.jazzcash,
    accounts.easypaisa,
    accounts.bank_transfer || accounts.bank,
    accounts.manual_payment || accounts.manual,
  ].filter(Boolean)
}

export function planPriceLabel(plan, cycle = 'monthly') {
  const rawPrice = cycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice ?? plan?.price
  if (!plan || String(rawPrice).toLowerCase() === 'custom') return 'Custom'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency || DEFAULT_SAAS_CURRENCY,
    maximumFractionDigits: 0,
  }).format(Number(rawPrice || 0))
}

/**
 * Extract the raw PKR amount from a plan for a given billing cycle.
 * Used by the multi-currency conversion layer.
 *
 * @param {Object} plan
 * @param {string} cycle — 'monthly' or 'yearly'
 * @returns {number|null} — PKR amount or null for custom pricing
 */
export function getPlanPkrAmount(plan, cycle = 'monthly') {
  if (!plan) return null
  const raw = String(plan.monthlyPrice ?? plan.price ?? '').toLowerCase()
  if (raw === 'custom') return null
  if (cycle === 'yearly' && plan.yearlyPrice && String(plan.yearlyPrice).toLowerCase() !== 'custom') {
    return Number(plan.yearlyPrice) || null
  }
  return Number(plan.monthlyPrice ?? plan.price) || 0
}

// ---- Build-time read (scripts/prerender.mjs) ------------------------------

export const PLATFORM_PLANS_REST_URL = 'https://firestore.googleapis.com/v1/projects/nexora-business-suite/databases/(default)/documents/platformPlans'

function decodeRestValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeRestValue)
  if ('mapValue' in value) return decodeRestFields(value.mapValue.fields || {})
  return undefined
}

function decodeRestFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeRestValue(value)]))
}

/** Firestore REST list response → plain platformPlans docs ({ id, ...fields }). */
export function platformPlanDocsFromRest(json = {}) {
  return (Array.isArray(json.documents) ? json.documents : []).map((document) => ({
    id: String(document.name || '').split('/').pop(),
    ...decodeRestFields(document.fields || {}),
  }))
}
