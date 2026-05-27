export const BUSINESS_TRIAL_DAYS = 30
export const PLAN_ORDER = ['Free', 'Business', 'Enterprise']

export const businessFeatures = [
  'AI Assistant',
  'AI Lead Scoring',
  'Advanced analytics',
  'Approval Center',
  'Client Portal',
  'Desktop app download',
  'Follow-Up Automation',
  'Full reports',
  'HR Management',
  'Multi-user access',
  'Pipelines',
  'Team permissions',
]

export const enterpriseFeatures = [
  'Multi-branch',
  'Custom integrations',
  'Dedicated support',
  'White-label',
  'Enterprise deployment',
]

function timestampToDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function addDays(date, days) {
  const base = timestampToDate(date) || new Date()
  return new Date(base.getTime() + days * 86400000)
}

export function trialEndDate(userDoc = {}) {
  return timestampToDate(userDoc.trialEndsAt) || addDays(userDoc.trialStartedAt || userDoc.createdAt, BUSINESS_TRIAL_DAYS)
}

export function daysUntil(date) {
  const target = timestampToDate(date)
  if (!target) return 0
  return Math.max(Math.ceil((target.getTime() - Date.now()) / 86400000), 0)
}

export function normalizePlan(plan) {
  const value = String(plan || '').trim().toLowerCase()
  if (value === 'trial' || value === 'basic' || value === 'free') return 'Free'
  if (value === 'starter' || value === 'business' || value === 'premium') return 'Business'
  if (value === 'enterprise') return 'Enterprise'
  return 'Free'
}

export function isTrialActive(userDoc = {}) {
  const status = String(userDoc?.planStatus || '').toLowerCase()
  const plan = normalizePlan(userDoc?.plan)
  if (plan !== 'Free') return false
  if (!['trial', 'free trial'].includes(status)) return false
  return daysUntil(trialEndDate(userDoc)) > 0
}

export function isBusinessSubscriptionActive(userDoc = {}) {
  const plan = normalizePlan(userDoc?.plan)
  const status = String(userDoc?.planStatus || '').toLowerCase()
  if (!['Business', 'Enterprise'].includes(plan) || status !== 'active') return false
  const expiry = timestampToDate(userDoc.subscriptionExpiresAt || userDoc.nextBillingDate)
  return !expiry || expiry.getTime() >= Date.now()
}

export function accessPlanForUser(userDoc = {}, fallbackPlan = 'Free') {
  if (isTrialActive(userDoc)) return 'Business'
  if (isBusinessSubscriptionActive(userDoc)) return normalizePlan(userDoc?.plan)
  return normalizePlan(fallbackPlan) === 'Enterprise' ? 'Enterprise' : 'Free'
}

export function detectBillingMarket() {
  const locale =
    typeof navigator !== 'undefined'
      ? [navigator.language, ...(navigator.languages || [])].filter(Boolean).join(' ')
      : ''
  const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : ''
  const isPakistan = /(^|[-_\s])pk($|[-_\s])/i.test(locale) || /karachi|pakistan/i.test(timeZone)
  return isPakistan
    ? { country: 'Pakistan', currency: 'PKR', amount: 2000, priceLabel: 'PKR 2000/month' }
    : { country: 'International', currency: 'USD', amount: 10, priceLabel: '$10/month' }
}

export function getBusinessPlanPrice(market = detectBillingMarket()) {
  return {
    currency: market.currency || 'USD',
    amount: Number(market.amount) || 10,
    priceLabel: market.priceLabel || '$10/month',
    country: market.country || 'International',
  }
}

export const planCatalog = [
  {
    id: 'Free',
    name: 'Free Trial',
    badge: '30 Days',
    description: 'New workspaces get full Business access for the first 30 days.',
    monthlyPkr: 0,
    monthlyUsd: 0,
    priceLabel: 'Free for 30 days',
    features: ['Full Business access during trial', 'Dashboard', 'Customers', 'Invoices', 'Reports', 'Settings'],
  },
  {
    id: 'Business',
    name: 'Business',
    badge: 'All Access',
    description: 'One complete CRM plan with every Nexora Business feature unlocked.',
    monthlyPkr: 2000,
    monthlyUsd: 10,
    priceLabel: getBusinessPlanPrice().priceLabel,
    features: businessFeatures,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Contact Sales',
    description: 'Custom solution for multi-branch teams and future-ready modules.',
    monthlyPkr: null,
    monthlyUsd: null,
    priceLabel: 'Contact Sales',
    contactSales: true,
    features: enterpriseFeatures,
  },
]

export function getPlanCatalog(market = detectBillingMarket()) {
  const businessPrice = getBusinessPlanPrice(market)
  return planCatalog.map((plan) =>
    plan.id === 'Business'
      ? {
          ...plan,
          monthlyPkr: businessPrice.currency === 'PKR' ? businessPrice.amount : null,
          monthlyUsd: businessPrice.currency === 'USD' ? businessPrice.amount : null,
          priceLabel: businessPrice.priceLabel,
          billingCurrency: businessPrice.currency,
          billingAmount: businessPrice.amount,
        }
      : plan,
  )
}

export const moduleCatalog = [
  { key: 'dashboard', label: 'Dashboard', route: '/app/dashboard', alwaysEnabled: true },
  { key: 'clientPortal', label: 'Client Portal', route: '/app/client-portal', minPlan: 'Business' },
  { key: 'customers', label: 'Customers', route: '/app/customers', minPlan: 'Free' },
  { key: 'products', label: 'Products', route: '/app/products', minPlan: 'Business' },
  { key: 'leads', label: 'Leads', route: '/app/leads', minPlan: 'Business' },
  { key: 'aiLeadScoring', label: 'AI Lead Scoring', route: '/app/leads/scoring', minPlan: 'Business' },
  { key: 'aiAssistant', label: 'AI Assistant', route: '/app/ai-assistant', minPlan: 'Business' },
  { key: 'salesPipeline', label: 'Sales Pipeline', route: '/app/pipeline', minPlan: 'Business' },
  { key: 'followUps', label: 'Follow-Up Automation', route: '/app/follow-ups', minPlan: 'Business' },
  { key: 'team', label: 'Team Management', route: '/app/team', minPlan: 'Business' },
  { key: 'hr', label: 'HR Dashboard', route: '/app/hr', minPlan: 'Business' },
  { key: 'invoices', label: 'Invoices', route: '/app/invoices', minPlan: 'Free' },
  { key: 'payments', label: 'Payments', route: '/app/invoices', minPlan: 'Business' },
  { key: 'expenses', label: 'Expenses', route: '/app/expenses', minPlan: 'Business' },
  { key: 'accounts', label: 'Account Management', route: '/app/accounts', minPlan: 'Business' },
  { key: 'accountStatements', label: 'Account Statements', route: '/app/accounts/statements', minPlan: 'Business' },
  { key: 'approvals', label: 'Approval Center', route: '/app/approvals', minPlan: 'Business' },
  { key: 'subscriptions', label: 'Subscriptions', route: '/app/subscriptions', alwaysEnabled: true },
  { key: 'support', label: 'Support Tickets', route: '/app/support', minPlan: 'Business' },
  { key: 'activity', label: 'Activity Logs', route: '/app/activity-logs', minPlan: 'Business' },
  { key: 'analytics', label: 'Advanced Analytics', route: '/app/analytics', minPlan: 'Business' },
  { key: 'notifications', label: 'Notifications', route: '/app/notifications', minPlan: 'Business' },
  { key: 'reports', label: 'Reports', route: '/app/reports', minPlan: 'Free' },
  { key: 'settings', label: 'Settings', route: '/app/settings', alwaysEnabled: true },
]

export const businessTypes = [
  'Restaurant / POS',
  'Transport / Rental',
  'Software Agency',
  'Retail / Inventory',
  'General Business',
]

const recommendationMap = {
  'Restaurant / POS': ['dashboard', 'customers', 'products', 'invoices', 'payments', 'expenses', 'accounts', 'accountStatements', 'reports', 'team', 'support'],
  'Transport / Rental': ['dashboard', 'customers', 'leads', 'invoices', 'payments', 'expenses', 'accounts', 'accountStatements', 'reports', 'activity'],
  'Software Agency': ['dashboard', 'clientPortal', 'customers', 'leads', 'salesPipeline', 'followUps', 'invoices', 'accounts', 'accountStatements', 'reports', 'support'],
  'Retail / Inventory': ['dashboard', 'customers', 'products', 'invoices', 'expenses', 'accounts', 'accountStatements', 'reports', 'team'],
  'General Business': ['dashboard', 'customers', 'leads', 'invoices', 'expenses', 'accounts', 'accountStatements', 'reports'],
}

export const alwaysEnabledModules = ['dashboard', 'settings', 'subscriptions']

export function planRank(plan) {
  return PLAN_ORDER.indexOf(normalizePlan(plan))
}

export function hasPlanAccess(plan, minPlan = 'Free') {
  return planRank(plan) >= planRank(minPlan)
}

export function normalizeBusinessType(type) {
  const value = String(type || '').toLowerCase()
  if (value.includes('restaurant') || value.includes('canteen') || value.includes('pos')) return 'Restaurant / POS'
  if (value.includes('transport') || value.includes('rental') || value.includes('logistics')) return 'Transport / Rental'
  if (value.includes('software') || value.includes('agency') || value.includes('saas')) return 'Software Agency'
  if (value.includes('retail') || value.includes('inventory') || value.includes('pharma')) return 'Retail / Inventory'
  return 'General Business'
}

export function getRecommendedModules(type) {
  const normalized = normalizeBusinessType(type)
  return Array.from(new Set([...recommendationMap[normalized], ...alwaysEnabledModules]))
}

export function moduleByRoute(route) {
  return moduleCatalog.find((module) => module.route === route) || null
}

export function routeAllowedByPlan(route, plan) {
  const module = moduleByRoute(route)
  if (!module || module.alwaysEnabled) return true
  return hasPlanAccess(plan, module.minPlan)
}

export function moduleAllowedByPlan(moduleKey, plan) {
  const module = moduleCatalog.find((item) => item.key === moduleKey)
  if (!module || module.alwaysEnabled) return true
  return hasPlanAccess(plan, module.minPlan)
}

export function selectedModulesForSidebar({ enabledModules, onboardingCompleted, plan }) {
  const selected = new Set(Array.isArray(enabledModules) ? enabledModules : [])
  return moduleCatalog.filter((module) => {
    if (module.alwaysEnabled) return true
    if (!moduleAllowedByPlan(module.key, plan)) return false
    if (module.key === 'accounts' || module.key === 'accountStatements') return true
    if (!onboardingCompleted) return true
    return selected.has(module.key)
  })
}
