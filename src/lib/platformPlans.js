export const DEFAULT_SAAS_CURRENCY = 'PKR'
export const PLATFORM_PLAN_COLLECTION = 'platformPlans'

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

export const defaultPlatformPlans = [
  {
    id: 'basic',
    planName: 'Basic',
    name: 'Basic',
    monthlyPrice: 2999,
    yearlyPrice: 2999 * 12,
    price: 2999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    active: true,
    enabled: true,
    recommended: false,
    features: ['CRM Module', 'Up to 2 Users', '5GB Storage', 'Email Support'],
  },
  {
    id: 'standard',
    planName: 'Standard',
    name: 'Standard',
    monthlyPrice: 5999,
    yearlyPrice: 5999 * 12,
    price: 5999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    active: true,
    enabled: true,
    recommended: true,
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
  const yearlyPrice = normalizePrice(
    plan.yearlyPrice,
    monthlyPrice === 'custom' ? 'custom' : Number(monthlyPrice || 0) * 12,
  )
  const active = plan.active !== false && plan.enabled !== false
  return {
    ...fallback,
    ...plan,
    id,
    planName: name,
    name,
    monthlyPrice,
    yearlyPrice,
    price: monthlyPrice,
    currency: plan.currency || fallback.currency || DEFAULT_SAAS_CURRENCY,
    billingCycle: plan.billingCycle || fallback.billingCycle || 'monthly',
    features: Array.isArray(plan.features) ? plan.features : fallback.features || [],
    active,
    enabled: active,
    recommended: Boolean(plan.recommended ?? fallback.recommended),
  }
}

export function mergePlatformPlans(planDocs = []) {
  const byId = new Map(defaultPlatformPlans.map((plan) => [plan.id, normalizePlan(plan)]))
  planDocs.forEach((plan) => {
    const id = normalizePlanId(plan.id || plan.planName || plan.name)
    if (!id) return
    byId.set(id, normalizePlan(plan, byId.get(id) || {}))
  })
  return defaultPlatformPlans.map((plan) => byId.get(plan.id)).filter(Boolean)
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
