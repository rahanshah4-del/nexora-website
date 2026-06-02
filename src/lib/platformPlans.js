export const DEFAULT_SAAS_CURRENCY = 'PKR'
export const PLATFORM_PLAN_COLLECTION = 'plans'

export const defaultPlatformPlans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 2999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    enabled: true,
    features: ['CRM Module', 'Up to 2 Users', '5GB Storage', 'Email Support'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 5999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    enabled: true,
    features: ['All Basic Features', 'One Business Module', 'Up to 5 Users', '20GB Storage', 'Priority Support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9999,
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'monthly',
    enabled: true,
    features: ['All Modules Access', 'Up to 10 Users', '50GB Storage', 'Priority Support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'custom',
    currency: DEFAULT_SAAS_CURRENCY,
    billingCycle: 'custom',
    enabled: true,
    features: ['Unlimited Users', 'Custom Integrations', 'Dedicated Support', 'Custom Development'],
  },
]

export function normalizePlanId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function mergePlatformPlans(planDocs = []) {
  const byId = new Map(defaultPlatformPlans.map((plan) => [plan.id, plan]))
  planDocs.forEach((plan) => {
    const id = normalizePlanId(plan.id || plan.name)
    if (!id) return
    byId.set(id, {
      ...(byId.get(id) || {}),
      ...plan,
      id,
      name: plan.name || byId.get(id)?.name || id,
      currency: plan.currency || DEFAULT_SAAS_CURRENCY,
      billingCycle: plan.billingCycle || 'monthly',
      features: Array.isArray(plan.features) ? plan.features : byId.get(id)?.features || [],
      enabled: plan.enabled !== false,
    })
  })
  return defaultPlatformPlans.map((plan) => byId.get(plan.id)).filter(Boolean)
}

export function planPriceLabel(plan) {
  if (!plan || String(plan.price).toLowerCase() === 'custom') return 'Custom'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency || DEFAULT_SAAS_CURRENCY,
    maximumFractionDigits: 0,
  }).format(Number(plan.price || 0))
}
