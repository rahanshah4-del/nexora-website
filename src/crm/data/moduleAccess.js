export const PLAN_ORDER = ['Free', 'Starter', 'Business', 'Enterprise']

export const planCatalog = [
  {
    id: 'Free',
    name: 'Trial / Free',
    badge: 'Free Trial',
    description: 'Start with essential customer, lead, invoice, and report tools.',
    monthlyPkr: 0,
    yearlyPkr: 0,
    priceLabel: 'Free',
    features: ['Dashboard', 'Customers limited', 'Leads limited', 'Basic invoices', 'Basic reports', 'Settings', 'Subscriptions'],
  },
  {
    id: 'Starter',
    name: 'Starter',
    badge: 'Starter',
    description: 'For teams that need products, payments, reports, support, and basic team access.',
    monthlyPkr: 2000,
    yearlyPkr: 24000,
    priceLabel: 'PKR 2000/month',
    features: ['Everything in Free', 'Products', 'More customers/leads', 'Payments', 'Expenses', 'Reports', 'Activity Logs', 'Basic Team Management', 'Support Tickets'],
  },
  {
    id: 'Business',
    name: 'Business',
    badge: 'Best',
    description: 'Advanced CRM workspace with automation, AI, analytics, approvals, and multi-user controls.',
    monthlyPkr: 5000,
    yearlyPkr: 60000,
    priceLabel: 'PKR 5000/month',
    features: [
      'Everything in Starter',
      'AI Assistant',
      'AI Lead Scoring',
      'Sales Pipeline',
      'Follow-Up Automation',
      'HR Management',
      'Advanced Analytics',
      'Team Permissions',
      'Client Portal',
      'Desktop App Download',
      'Multi-user access',
      'Approval Center',
    ],
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Contact Sales',
    description: 'Custom solution for multi-branch teams and future-ready modules.',
    monthlyPkr: null,
    yearlyPkr: null,
    priceLabel: 'Contact Sales',
    contactSales: true,
    features: ['Custom Solution', 'Future-ready modules', 'Multi-branch', 'Dedicated support', 'Custom integrations'],
  },
]

export const moduleCatalog = [
  { key: 'dashboard', label: 'Dashboard', route: '/app/dashboard', alwaysEnabled: true },
  { key: 'clientPortal', label: 'Client Portal', route: '/app/client-portal', minPlan: 'Business' },
  { key: 'customers', label: 'Customers', route: '/app/customers', minPlan: 'Free' },
  { key: 'products', label: 'Products', route: '/app/products', minPlan: 'Starter' },
  { key: 'leads', label: 'Leads', route: '/app/leads', minPlan: 'Free' },
  { key: 'aiLeadScoring', label: 'AI Lead Scoring', route: '/app/leads/scoring', minPlan: 'Business' },
  { key: 'aiAssistant', label: 'AI Assistant', route: '/app/ai-assistant', minPlan: 'Business' },
  { key: 'salesPipeline', label: 'Sales Pipeline', route: '/app/pipeline', minPlan: 'Business' },
  { key: 'followUps', label: 'Follow-Up Automation', route: '/app/follow-ups', minPlan: 'Business' },
  { key: 'team', label: 'Team Management', route: '/app/team', minPlan: 'Starter' },
  { key: 'hr', label: 'HR Dashboard', route: '/app/hr', minPlan: 'Business' },
  { key: 'invoices', label: 'Invoices', route: '/app/invoices', minPlan: 'Free' },
  { key: 'payments', label: 'Payments', route: '/app/invoices', minPlan: 'Starter' },
  { key: 'expenses', label: 'Expenses', route: '/app/expenses', minPlan: 'Starter' },
  { key: 'approvals', label: 'Approval Center', route: '/app/approvals', minPlan: 'Business' },
  { key: 'subscriptions', label: 'Subscriptions', route: '/app/subscriptions', alwaysEnabled: true },
  { key: 'support', label: 'Support Tickets', route: '/app/support', minPlan: 'Starter' },
  { key: 'activity', label: 'Activity Logs', route: '/app/activity-logs', minPlan: 'Starter' },
  { key: 'analytics', label: 'Advanced Analytics', route: '/app/analytics', minPlan: 'Business' },
  { key: 'notifications', label: 'Notifications', route: '/app/notifications', minPlan: 'Starter' },
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
  'Restaurant / POS': ['dashboard', 'customers', 'products', 'invoices', 'payments', 'expenses', 'reports', 'team', 'support'],
  'Transport / Rental': ['dashboard', 'customers', 'leads', 'invoices', 'payments', 'expenses', 'reports', 'activity'],
  'Software Agency': ['dashboard', 'clientPortal', 'customers', 'leads', 'salesPipeline', 'followUps', 'invoices', 'reports', 'support'],
  'Retail / Inventory': ['dashboard', 'customers', 'products', 'invoices', 'expenses', 'reports', 'team'],
  'General Business': ['dashboard', 'customers', 'leads', 'invoices', 'expenses', 'reports'],
}

export const alwaysEnabledModules = ['dashboard', 'settings', 'subscriptions']

export function normalizePlan(plan) {
  const value = String(plan || '').trim().toLowerCase()
  if (value === 'trial' || value === 'basic' || value === 'free') return 'Free'
  if (value === 'starter') return 'Starter'
  if (value === 'business' || value === 'premium') return 'Business'
  if (value === 'enterprise') return 'Enterprise'
  return 'Free'
}

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
    if (!onboardingCompleted) return true
    return selected.has(module.key)
  })
}
