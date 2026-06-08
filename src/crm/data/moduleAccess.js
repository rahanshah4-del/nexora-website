export const BUSINESS_TRIAL_DAYS = 7
export const PLAN_ORDER = ['Free', 'Basic', 'Business', 'Enterprise']
export const PRIMARY_UPGRADE_PLAN_NAME = 'Standard'
export const PRIMARY_UPGRADE_PLAN_PRICE = 'PKR 5,999/month'

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
  return timestampToDate(userDoc.trialEndsAt) || addDays(userDoc.trialStartAt || userDoc.trialStartedAt || userDoc.createdAt, BUSINESS_TRIAL_DAYS)
}

export function daysUntil(date) {
  const target = timestampToDate(date)
  if (!target) return 0
  return Math.max(Math.ceil((target.getTime() - Date.now()) / 86400000), 0)
}

export function normalizePlan(plan) {
  const value = String(plan || '').trim().toLowerCase()
  if (value === 'trial' || value === 'basic') return 'Basic'
  if (value === 'free') return 'Free'
  if (value === 'starter' || value === 'business' || value === 'standard') return 'Business'
  if (value === 'enterprise') return 'Enterprise'
  return 'Free'
}

export function packageNameForPlan(plan) {
  const normalized = normalizePlan(plan)
  if (normalized === 'Enterprise') return 'Enterprise'
  if (normalized === 'Business') return PRIMARY_UPGRADE_PLAN_NAME
  return 'Basic'
}

export function isTrialActive(userDoc = {}) {
  const status = String(userDoc?.subscriptionStatus || userDoc?.planStatus || '').toLowerCase()
  const plan = normalizePlan(userDoc?.plan)
  if (!['Free', 'Basic'].includes(plan)) return false
  if (!['trial', 'free trial'].includes(status) && userDoc?.isTrialActive !== true) return false
  return daysUntil(trialEndDate(userDoc)) > 0
}

export function isTrialExpired(userDoc = {}) {
  const status = String(userDoc?.subscriptionStatus || userDoc?.planStatus || '').toLowerCase()
  const plan = normalizePlan(userDoc?.plan)
  if (!['Free', 'Basic'].includes(plan)) return false
  if (!['trial', 'free trial', 'expired', 'trial expired'].includes(status) && userDoc?.isTrialActive !== true) return false
  return daysUntil(trialEndDate(userDoc)) <= 0
}

export function isBusinessSubscriptionActive(userDoc = {}) {
  const plan = normalizePlan(userDoc?.plan)
  const status = String(userDoc?.subscriptionStatus || userDoc?.planStatus || '').toLowerCase()
  if (!['Business', 'Enterprise'].includes(plan) || !['active', 'paid', 'approved', 'current'].includes(status)) return false
  const subscriptionExpiresAt = timestampToDate(userDoc.subscriptionExpiresAt)
  const nextBillingDate = timestampToDate(userDoc.nextBillingDate)
  const expiresAt = timestampToDate(userDoc.expiresAt)
  if (!subscriptionExpiresAt || !nextBillingDate) return false
  if (userDoc.expiresAt && (!expiresAt || expiresAt.getTime() !== subscriptionExpiresAt.getTime())) return false
  const now = Date.now()
  return subscriptionExpiresAt.getTime() >= now
    && nextBillingDate.getTime() >= now
    && (!userDoc.expiresAt || expiresAt.getTime() >= now)
}

export function accessPlanForUser(userDoc = {}, fallbackPlan = 'Free') {
  if (isTrialActive(userDoc)) return 'Basic'
  if (isTrialExpired(userDoc)) return 'Free'
  if (isBusinessSubscriptionActive(userDoc)) return normalizePlan(userDoc?.plan)
  const normalizedFallback = normalizePlan(fallbackPlan)
  if (normalizedFallback === 'Enterprise') return 'Enterprise'
  if (normalizedFallback === 'Business') return 'Business'
  return normalizedFallback === 'Basic' ? 'Basic' : 'Free'
}

export function detectBillingMarket() {
  return { country: 'Pakistan', currency: 'PKR', amount: 5999, priceLabel: PRIMARY_UPGRADE_PLAN_PRICE }
}

export function getBusinessPlanPrice(market = detectBillingMarket()) {
  return {
    currency: market.currency || 'PKR',
    amount: Number(market.amount) || 5999,
    priceLabel: market.priceLabel || PRIMARY_UPGRADE_PLAN_PRICE,
    country: market.country || 'International',
    planName: PRIMARY_UPGRADE_PLAN_NAME,
  }
}

export const planCatalog = [
  {
    id: 'Basic',
    name: 'Basic',
    badge: 'CRM',
    description: 'CRM package for small teams.',
    monthlyPkr: 2999,
    monthlyUsd: null,
    priceLabel: 'PKR 2,999/month',
    features: ['CRM Module', 'Up to 2 Users', '5GB Storage', 'Email Support'],
  },
  {
    id: 'Standard',
    name: 'Standard',
    badge: 'Popular',
    description: 'For growing businesses.',
    monthlyPkr: 5999,
    monthlyUsd: null,
    priceLabel: PRIMARY_UPGRADE_PLAN_PRICE,
    features: ['All Basic Features', 'School OR Property ERP', 'Up to 5 Users', '20GB Storage', 'Priority Support'],
    featured: true,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Contact Sales',
    description: 'For large organizations.',
    monthlyPkr: null,
    monthlyUsd: null,
    priceLabel: 'Custom Pricing',
    contactSales: true,
    features: ['All Standard Features', 'Unlimited Users', 'Custom Integrations', 'Dedicated Support', 'Custom Development'],
  },
]

export function getPlanCatalog() {
  return planCatalog
}

export const moduleCatalog = [
  { key: 'dashboard', label: 'Dashboard', route: '/app/dashboard', alwaysEnabled: true },
  { key: 'clientPortal', label: 'Client Portal', route: '/app/client-portal', minPlan: 'Business' },
  { key: 'customers', label: 'Customers', route: '/app/customers', minPlan: 'Basic' },
  { key: 'products', label: 'Products / Services', route: '/app/products', minPlan: 'Business' },
  { key: 'leads', label: 'Leads', route: '/app/leads', minPlan: 'Basic' },
  { key: 'aiLeadScoring', label: 'AI Lead Scoring', route: '/app/leads/scoring', minPlan: 'Business' },
  { key: 'aiAssistant', label: 'AI Assistant', route: '/app/ai-assistant', minPlan: 'Business' },
  { key: 'salesPipeline', label: 'Sales Pipeline', route: '/app/pipeline', minPlan: 'Business' },
  { key: 'followUps', label: 'Follow-Up Automation', route: '/app/follow-ups', minPlan: 'Business' },
  { key: 'team', label: 'Team Management', route: '/app/team', minPlan: 'Business' },
  { key: 'hr', label: 'HR Dashboard', route: '/app/hr', minPlan: 'Business' },
  { key: 'invoices', label: 'Invoices', route: '/app/invoices', minPlan: 'Basic' },
  { key: 'payments', label: 'Payments', route: '/app/invoices', minPlan: 'Business' },
  { key: 'expenses', label: 'Expenses', route: '/app/expenses', minPlan: 'Basic' },
  { key: 'accounts', label: 'Account Management', route: '/app/accounts', minPlan: 'Basic' },
  { key: 'accountStatements', label: 'Account Statements', route: '/app/accounts/statements', minPlan: 'Basic' },
  { key: 'approvals', label: 'Approval Center', route: '/app/approvals', alwaysEnabled: true },
  { key: 'subscriptions', label: 'Subscriptions', route: '/app/subscriptions', alwaysEnabled: true },
  { key: 'support', label: 'Support Tickets', route: '/app/support', minPlan: 'Business' },
  { key: 'activity', label: 'Activity Logs', route: '/app/activity-logs', minPlan: 'Business' },
  { key: 'analytics', label: 'Advanced Analytics', route: '/app/analytics', minPlan: 'Business' },
  { key: 'notifications', label: 'Notifications', route: '/app/notifications', minPlan: 'Basic' },
  { key: 'reports', label: 'Reports', route: '/app/reports', minPlan: 'Basic' },
  { key: 'settings', label: 'Settings', route: '/app/settings', alwaysEnabled: true },
  { key: 'inventory', label: 'Inventory', route: '/app/inventory', minPlan: 'Basic' },
  { key: 'pos', label: 'POS Billing', route: '/app/pos', minPlan: 'Basic' },
  { key: 'cashRegister', label: 'Cash Register', route: '/app/coming-soon/cash-register', comingSoon: true },
  { key: 'purchases', label: 'Purchases', route: '/app/coming-soon/purchases', comingSoon: true },
  { key: 'suppliers', label: 'Suppliers', route: '/app/coming-soon/suppliers', comingSoon: true },
  { key: 'attendance', label: 'Attendance', route: '/app/coming-soon/attendance', comingSoon: true },
  { key: 'exams', label: 'Exams', route: '/app/coming-soon/exams', comingSoon: true },
  { key: 'classes', label: 'Classes', route: '/app/coming-soon/classes', comingSoon: true },
  { key: 'maintenance', label: 'Maintenance', route: '/app/coming-soon/maintenance', comingSoon: true },
  { key: 'contracts', label: 'Contracts', route: '/app/coming-soon/contracts', comingSoon: true },
  { key: 'tables', label: 'Tables', route: '/app/coming-soon/tables', comingSoon: true },
  { key: 'ordersKot', label: 'Orders/KOT', route: '/app/coming-soon/orders-kot', comingSoon: true },
  { key: 'kitchenDisplay', label: 'Kitchen Display', route: '/app/coming-soon/kitchen-display', comingSoon: true },
  { key: 'whatsappInbox', label: 'WhatsApp Inbox', route: '/app/coming-soon/whatsapp-inbox', comingSoon: true },
  { key: 'autoReplies', label: 'Auto Replies', route: '/app/coming-soon/auto-replies', comingSoon: true },
  { key: 'campaigns', label: 'Campaigns', route: '/app/coming-soon/campaigns', comingSoon: true },
]

export const DEVELOPER_OWNER_EMAIL = 'ownertast@gmail.com'

export const businessTypes = [
  'General CRM',
  'Retail / POS',
  'School ERP',
  'Property ERP',
  'Restaurant POS',
  'WhatsApp CRM',
]

export const coreFinanceModules = ['invoices', 'payments', 'expenses', 'accounts', 'reports']

export const businessWorkspaceCatalog = [
  {
    id: 'general-crm',
    type: 'General CRM',
    title: 'General CRM',
    route: '/app/dashboard',
    description: 'Customer, sales, billing, approvals, team, and reporting workflows.',
    modules: [
      'dashboard',
      'customers',
      'products',
      'leads',
      'salesPipeline',
      'followUps',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'team',
      'notifications',
      'settings',
    ],
  },
  {
    id: 'retail-pos',
    type: 'Retail / POS',
    title: 'Retail / POS',
    route: '/app/dashboard',
    description: 'CRM billing and catalog tools with POS-specific modules staged for release.',
    modules: [
      'dashboard',
      'customers',
      'products',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'inventory',
      'pos',
      'team',
      'notifications',
      'settings',
    ],
  },
  {
    id: 'school-erp',
    type: 'School ERP',
    title: 'School ERP',
    route: '/app/dashboard',
    description: 'Student, parent, fees, payments, expenses, approvals, and school reports.',
    labels: {
      customers: 'Students/Parents',
      invoices: 'Fees/Billing',
    },
    modules: [
      'dashboard',
      'customers',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'team',
      'notifications',
      'settings',
    ],
  },
  {
    id: 'property-erp',
    type: 'Property ERP',
    title: 'Property ERP',
    route: '/app/dashboard',
    description: 'Tenant, owner, property, rent, finance, approval, and maintenance views.',
    labels: {
      customers: 'Tenants/Owners',
      products: 'Properties',
      invoices: 'Rent/Billing',
    },
    modules: [
      'dashboard',
      'customers',
      'products',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'team',
      'settings',
      'notifications',
      'maintenance',
      'contracts',
    ],
  },
  {
    id: 'restaurant-pos',
    type: 'Restaurant POS',
    title: 'Restaurant POS',
    route: '/app/dashboard',
    description: 'Menu, bills, payments, expenses, reports, and restaurant operations modules.',
    labels: {
      products: 'Menu Items',
      invoices: 'Bills/Invoices',
    },
    modules: [
      'dashboard',
      'customers',
      'products',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'team',
      'settings',
      'notifications',
      'tables',
      'ordersKot',
      'kitchenDisplay',
    ],
  },
  {
    id: 'whatsapp-crm',
    type: 'WhatsApp CRM',
    title: 'WhatsApp CRM',
    route: '/app/dashboard',
    description: 'Lead, customer, follow-up, support, finance, approval, and WhatsApp workflows.',
    modules: [
      'dashboard',
      'customers',
      'leads',
      'followUps',
      'support',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'reports',
      'approvals',
      'team',
      'settings',
      'notifications',
      'whatsappInbox',
      'autoReplies',
      'campaigns',
    ],
  },
]

const recommendationMap = Object.fromEntries(
  businessWorkspaceCatalog.map((workspace) => [workspace.type, workspace.modules]),
)

const businessTypeAliases = {
  'General Business': 'General CRM',
  'Restaurant / POS': 'Restaurant POS',
  'Restaurant / Canteen': 'Restaurant POS',
  'Retail / Inventory': 'Retail / POS',
  'Inventory / Pharma': 'Retail / POS',
  'Healthcare / Hospital': 'General CRM',
  'Transport / Rental': 'General CRM',
  'Transport / Logistics': 'General CRM',
  'Software Agency': 'General CRM',
  'Custom Enterprise': 'General CRM',
}

export const alwaysEnabledModules = ['dashboard', 'settings']
export const basicCrmModules = [
  'dashboard',
  'customers',
  'leads',
  'salesPipeline',
  'followUps',
  'invoices',
  'payments',
  'expenses',
  'accounts',
  'approvals',
  'reports',
  'team',
  'settings',
]

export function planRank(plan) {
  return PLAN_ORDER.indexOf(normalizePlan(plan))
}

export function hasPlanAccess(plan, minPlan = 'Free') {
  return planRank(plan) >= planRank(minPlan)
}

export function normalizeBusinessType(type) {
  const raw = String(type || '').trim()
  if (businessTypes.includes(raw)) return raw
  if (businessTypeAliases[raw]) return businessTypeAliases[raw]
  const value = raw.toLowerCase()
  if (value.includes('school') || value.includes('student') || value.includes('parent')) return 'School ERP'
  if (value.includes('property') || value.includes('tenant') || value.includes('rent')) return 'Property ERP'
  if (value.includes('whatsapp')) return 'WhatsApp CRM'
  if (value.includes('restaurant') || value.includes('canteen') || value.includes('kot') || value.includes('kitchen')) return 'Restaurant POS'
  if (value.includes('retail') || value.includes('inventory') || value.includes('pharma') || value === 'pos' || value.includes('pos')) return 'Retail / POS'
  return 'General CRM'
}

export function isDeveloperOwnerEmail(email) {
  return String(email || '').trim().toLowerCase() === DEVELOPER_OWNER_EMAIL
}

export function isDeveloperOwnerAccount(userDoc, firebaseUser) {
  return isDeveloperOwnerEmail(userDoc?.email || firebaseUser?.email)
}

export function businessPermissionKey(type) {
  return normalizeBusinessType(type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'general-crm'
}

export function businessWorkspaceForType(type) {
  const normalized = normalizeBusinessType(type)
  return businessWorkspaceCatalog.find((workspace) => workspace.type === normalized) || businessWorkspaceCatalog[0]
}

export function businessWorkspaceForId(id) {
  return businessWorkspaceCatalog.find((workspace) => workspace.id === id) || null
}

export function businessWorkspaceForSelection(value) {
  return businessWorkspaceForId(value) || businessWorkspaceForType(value)
}

export function businessModuleKeys(type) {
  const workspace = businessWorkspaceForType(type)
  return Array.from(new Set([...workspace.modules, 'dashboard', 'approvals']))
}

export function labelForBusinessModule(moduleKey, type) {
  const workspace = businessWorkspaceForType(type)
  const module = moduleCatalog.find((item) => item.key === moduleKey)
  return workspace.labels?.[moduleKey] || module?.label || moduleKey
}

export const modulePermissionActions = ['view', 'create', 'edit', 'delete', 'export', 'approve']

export const modulePermissionActionLabels = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
}

export const legacyPermissionAliases = {
  dashboard: ['dashboard'],
  customers: ['customerManagement'],
  leads: ['leadsManagement'],
  salesPipeline: ['deals', 'pipeline', 'salesPipeline'],
  followUps: ['followUpEdit', 'followUpDelete'],
  team: ['manageTeam', 'teamManagement', 'settingsAccess'],
  hr: ['hrDashboard'],
  invoices: ['invoices', 'manageBilling'],
  payments: ['payments', 'manageBilling', 'invoices'],
  expenses: ['expenses'],
  accounts: ['accounts', 'manageBilling'],
  accountStatements: ['accountStatements', 'reports'],
  approvals: ['approveRequests', 'approvals'],
  support: ['support'],
  activity: ['activityLogs'],
  analytics: ['analytics', 'reports'],
  notifications: ['notifications'],
  reports: ['reports', 'viewReports'],
  settings: ['settingsAccess'],
}

export function modulePermissionKey(moduleKey, action = 'view') {
  return `module.${moduleKey}.${action}`
}

export function moduleViewPermissionKey(moduleKey) {
  return modulePermissionKey(moduleKey, 'view')
}

export function permissionModuleDefinitions({ businessType, plan = 'Business', developerOverride = false, teamOverride = true, enabledModules, onboardingCompleted = true } = {}) {
  return selectedModulesForSidebar({
    enabledModules,
    onboardingCompleted,
    plan,
    businessType,
    developerOverride,
    teamOverride,
  }).map((module) => ({
    key: module.key,
    label: labelForBusinessModule(module.key, businessType),
    route: module.route,
    comingSoon: Boolean(module.comingSoon),
  }))
}

export function permissionKeysForBusiness(options = {}) {
  return permissionModuleDefinitions(options).flatMap((module) =>
    modulePermissionActions.map((action) => ({
      key: modulePermissionKey(module.key, action),
      moduleKey: module.key,
      moduleLabel: module.label,
      action,
      actionLabel: modulePermissionActionLabels[action],
      label: `${module.label} - ${modulePermissionActionLabels[action]}`,
      route: module.route,
      comingSoon: module.comingSoon,
    })),
  )
}

export function mapLegacyPermissionToModule(row = {}, moduleKey, action = 'view') {
  const direct = row[modulePermissionKey(moduleKey, action)]
  if (typeof direct === 'boolean') return direct
  if (action !== 'view') return false
  return (legacyPermissionAliases[moduleKey] || []).some((key) => Boolean(row[key]))
}

export function getRecommendedModules(type) {
  const normalized = normalizeBusinessType(type)
  return Array.from(new Set([...(recommendationMap[normalized] || recommendationMap['General CRM']), ...alwaysEnabledModules, 'approvals']))
}

export function moduleByRoute(route) {
  const pathname = String(route || '').split('?')[0].replace(/\/+$/, '') || '/'
  return (
    moduleCatalog
      .filter((module) => {
        const moduleRoute = module.route.replace(/\/+$/, '')
        return pathname === moduleRoute || pathname.startsWith(`${moduleRoute}/`)
      })
      .sort((a, b) => b.route.length - a.route.length)[0] || null
  )
}

export function routeAllowedByPlan(route, plan, options = {}) {
  if (options?.developerOverride) return true
  const module = moduleByRoute(route)
  if (!module || module.alwaysEnabled) return true
  if (module.key === 'team' && options?.teamOverride) return true
  return hasPlanAccess(plan, module.minPlan)
}

export function routeAllowedByBusinessType(route, type, options = {}) {
  if (options?.developerOverride) return true
  if (options?.allModulesAccess) return true
  const module = moduleByRoute(route)
  if (!module) return true
  if (module.alwaysEnabled) return true
  const allowedTypes = Array.from(new Set([
    type,
    ...(Array.isArray(options?.allowedBusinessTypes) ? options.allowedBusinessTypes : []),
  ].filter(Boolean))).map(normalizeBusinessType)
  return allowedTypes.some((businessType) => {
    if (module.key === 'accountStatements') return businessModuleKeys(businessType).includes('accounts')
    return businessModuleKeys(businessType).includes(module.key)
  })
}

export function moduleAllowedByPlan(moduleKey, plan) {
  const module = moduleCatalog.find((item) => item.key === moduleKey)
  if (!module || module.alwaysEnabled) return true
  return hasPlanAccess(plan, module.minPlan)
}

export function selectedModulesForSidebar({ enabledModules, onboardingCompleted, plan, businessType, developerOverride = false, teamOverride = false }) {
  if (developerOverride) {
    return moduleCatalog.map((module) => ({
      ...module,
      comingSoon: false,
      label: labelForBusinessModule(module.key, businessType),
    }))
  }

  const businessKeys = businessModuleKeys(businessType)
  const selected = new Set(onboardingCompleted ? businessKeys : Array.isArray(enabledModules) && enabledModules.length ? enabledModules : businessKeys)
  return moduleCatalog.filter((module) => {
    if (module.key === 'subscriptions') return false
    if (module.key === 'payments') return false
    if (module.alwaysEnabled) return selected.has(module.key) || businessKeys.includes(module.key)
    if (module.comingSoon) return businessKeys.includes(module.key)
    if (!moduleAllowedByPlan(module.key, plan) && !(module.key === 'team' && teamOverride)) return false
    if (module.key === 'accountStatements') return businessKeys.includes('accounts')
    if (coreFinanceModules.includes(module.key) || module.key === 'approvals') return businessKeys.includes(module.key)
    return selected.has(module.key) && businessKeys.includes(module.key)
  }).map((module) => ({
    ...module,
    label: labelForBusinessModule(module.key, businessType),
  }))
}
