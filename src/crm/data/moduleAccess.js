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
    description: 'Perfect for small businesses using a single Nexora solution.',
    monthlyPkr: 2000,
    monthlyUsd: null,
    priceLabel: 'PKR 2,000/month',
    features: [
      'Choose ANY ONE Nexora Business Module (Restaurant POS, Retail POS, School ERP, Transport, Medical Store POS, CRM, WhatsApp CRM, or any future module)',
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
    id: 'Standard',
    name: 'Standard',
    badge: 'Popular',
    description: 'For growing businesses that need more users and storage.',
    monthlyPkr: 5999,
    monthlyUsd: null,
    priceLabel: PRIMARY_UPGRADE_PLAN_PRICE,
    features: ['All Basic Features', 'One Business Module', 'Up to 5 Users', '20GB Storage', 'Priority Support'],
    featured: true,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Contact Sales',
    description: 'For organizations with custom requirements.',
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
  { key: 'deals', label: 'Deals', route: '/app/deals', minPlan: 'Basic' },
  { key: 'tasks', label: 'Tasks & Follow-Ups', route: '/app/tasks', minPlan: 'Basic' },
  { key: 'activities', label: 'Activities', route: '/app/activities', minPlan: 'Basic' },
  { key: 'quotations', label: 'Quotations', route: '/app/quotations', minPlan: 'Basic' },
  { key: 'salesProducts', label: 'Products & Services', route: '/app/products-services', minPlan: 'Basic' },
  { key: 'business_services', label: 'Business Services', route: '/app/business-services', minPlan: 'Business' },
  { key: 'aiLeadScoring', label: 'AI Lead Scoring', route: '/app/leads/scoring', minPlan: 'Business' },
  { key: 'aiAssistant', label: 'AI Assistant', route: '/app/ai-assistant', minPlan: 'Business' },
  { key: 'salesPipeline', label: 'Sales Pipeline', route: '/app/pipeline', minPlan: 'Basic' },
  { key: 'followUps', label: 'Follow-Up Automation', route: '/app/follow-ups', minPlan: 'Business' },
  { key: 'team', label: 'Team Management', route: '/app/team', minPlan: 'Business' },
  { key: 'schoolPayroll', label: 'Salary / Payroll', route: '/app/payroll', minPlan: 'Basic' },
  { key: 'hr', label: 'HR Dashboard', route: '/app/hr', minPlan: 'Business' },
  { key: 'invoices', label: 'Invoices', route: '/app/invoices', minPlan: 'Basic' },
  { key: 'payments', label: 'Payments', route: '/app/invoices', minPlan: 'Business' },
  { key: 'expenses', label: 'Expenses', route: '/app/expenses', minPlan: 'Basic' },
  { key: 'accounts', label: 'Account Management', route: '/app/accounts', minPlan: 'Basic' },
  { key: 'accountStatements', label: 'Account Statements', route: '/app/accounts/statements', minPlan: 'Basic' },
  { key: 'approvals', label: 'Approval Center', route: '/app/approvals', alwaysEnabled: true },
  { key: 'subscriptions', label: 'Subscriptions', route: '/app/subscriptions', alwaysEnabled: true },
  { key: 'support', label: 'Support Tickets', route: '/app/support', minPlan: 'Basic' },
  { key: 'activity', label: 'Activity Logs', route: '/app/activity-logs', minPlan: 'Business' },
  { key: 'analytics', label: 'Advanced Analytics', route: '/app/analytics', minPlan: 'Business' },
  { key: 'notifications', label: 'Notifications', route: '/app/notifications', minPlan: 'Basic' },
  { key: 'reports', label: 'Reports', route: '/app/reports', minPlan: 'Basic' },
  { key: 'schoolReports', label: 'School Reports Center', route: '/app/school-reports', minPlan: 'Basic' },
  { key: 'maintenance', label: 'Maintenance', route: '/app/maintenance', minPlan: 'Business' },
  { key: 'contracts', label: 'Contracts', route: '/app/contracts', minPlan: 'Business' },
  { key: 'settings', label: 'Settings', route: '/app/settings', alwaysEnabled: true },
  { key: 'inventory', label: 'Inventory', route: '/app/inventory', minPlan: 'Basic' },
  { key: 'pos', label: 'POS Billing', route: '/app/pos', minPlan: 'Basic' },
  { key: 'posOrders', label: 'POS Orders', route: '/app/pos-orders', minPlan: 'Basic' },
  { key: 'posDiscounts', label: 'Tax & Promo', route: '/app/pos-discounts', minPlan: 'Basic' },
  { key: 'orders', label: 'POS Till', route: '/app/orders', minPlan: 'Basic', hidden: true },
  { key: 'menuManagement', label: 'Menu Management', route: '/app/menu-management', minPlan: 'Basic' },
  { key: 'cashRegister', label: 'Cash Register', route: '/app/coming-soon/cash-register', comingSoon: true },
  { key: 'purchases', label: 'Purchases', route: '/app/coming-soon/purchases', comingSoon: true },
  { key: 'suppliers', label: 'Suppliers', route: '/app/coming-soon/suppliers', comingSoon: true },
  { key: 'attendance', label: 'Attendance', route: '/app/attendance', minPlan: 'Basic' },
  { key: 'exams', label: 'Exams', route: '/app/coming-soon/exams', comingSoon: true },
  { key: 'classes', label: 'Classes', route: '/app/coming-soon/classes', comingSoon: true },
  { key: 'tables', label: 'Tables', route: '/app/tables', minPlan: 'Basic' },
  { key: 'ordersKot', label: 'Orders/KOT', route: '/app/orders-kot', minPlan: 'Basic' },
  { key: 'kitchenDisplay', label: 'Kitchen Display', route: '/app/kitchen-display', minPlan: 'Basic' },
  { key: 'fleetDashboard', label: 'Fleet Dashboard', route: '/app/transport-dashboard', minPlan: 'Basic' },
  { key: 'transportVehicles', label: 'Vehicles', route: '/app/transport/vehicles', minPlan: 'Basic' },
  { key: 'transportBookings', label: 'Bookings & Rentals', route: '/app/transport/bookings', minPlan: 'Basic' },
  { key: 'transportCustomers', label: 'Rental Customers', route: '/app/transport/customers', minPlan: 'Basic' },
  { key: 'transportPayments', label: 'Rental Payments', route: '/app/transport/payments', minPlan: 'Basic' },
  { key: 'whatsappInbox', label: 'WhatsApp Inbox', route: '/app/whatsapp-inbox', minPlan: 'Basic' },
  { key: 'whatsappLeads', label: 'WhatsApp Leads', route: '/app/whatsapp-leads', minPlan: 'Basic' },
  { key: 'whatsappFollowUps', label: 'WhatsApp Follow-Ups', route: '/app/whatsapp-followups', minPlan: 'Basic' },
  { key: 'whatsappTemplates', label: 'WhatsApp Templates', route: '/app/whatsapp-templates', minPlan: 'Basic' },
  { key: 'autoReplies', label: 'Auto Replies', route: '/app/coming-soon/auto-replies', comingSoon: true },
  { key: 'campaigns', label: 'Campaigns', route: '/app/coming-soon/campaigns', comingSoon: true },
  { key: 'delivery', label: 'Delivery Management', route: '/app/delivery', minPlan: 'Basic' },
  { key: 'deliveryDrivers', label: 'Delivery Drivers', route: '/app/delivery/drivers', minPlan: 'Basic' },
  { key: 'deliveryZones', label: 'Delivery Zones', route: '/app/delivery/zones', minPlan: 'Basic' },
  { key: 'driverDashboard', label: 'Driver Dashboard', route: '/app/driver', minPlan: 'Basic' },
  { key: 'reservations', label: 'Reservations', route: '/app/reservations', minPlan: 'Basic' },
  { key: 'kitchenProduction', label: 'Kitchen Production', route: '/app/kitchen-production', minPlan: 'Basic' },
]

export const DEVELOPER_OWNER_EMAIL = 'ownertast@gmail.com'

export const businessTypes = [
  'General CRM',
  'Retail / POS',
  'School ERP',
  'Property ERP',
  'Restaurant POS',
  'Transport / Rental',
  'WhatsApp CRM',
]

export const coreFinanceModules = ['invoices', 'payments', 'expenses', 'accounts', 'reports']

const salesHubSidebarCoreModules = new Set([
  'dashboard',
  'salesPipeline',
  'leads',
  'customers',
  'deals',
  'tasks',
  'activities',
  'quotations',
  'invoices',
  'salesProducts',
  'business_services',
  'expenses',
  'accounts',
  'accountStatements',
  'team',
  'reports',
  'notifications',
  'approvals',
  'settings',
])

export const businessWorkspaceCatalog = [
  {
    id: 'general-crm',
    type: 'General CRM',
    title: 'Nexora Sales Hub',
    route: '/app/dashboard',
    description: 'Manage leads, customers, sales, invoices, follow-ups, and business growth from one workspace.',
    labels: {
      salesPipeline: 'Pipeline',
    },
    modules: [
      'dashboard',
      'customers',
      'products',
      'leads',
      'salesPipeline',
      'deals',
      'tasks',
      'activities',
      'quotations',
      'salesProducts',
      'business_services',
      'followUps',
      'invoices',
      'payments',
      'expenses',
      'accounts',
      'accountStatements',
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
      'inventory',
      'pos',
      'posOrders',
      'posDiscounts',
      'invoices',
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
    id: 'school-erp',
    type: 'School ERP',
    title: 'School ERP',
    route: '/app/dashboard',
    description: 'Student, parent, fees, payments, expenses, approvals, and school reports.',
    labels: {
      customers: 'Students/Parents',
      invoices: 'Fees/Billing',
      schoolPayroll: 'Salary / Payroll',
      reports: 'School Reports Center',
      schoolReports: 'School Reports Center',
    },
    modules: [
      'dashboard',
      'customers',
      'attendance',
      'invoices',
      'payments',
      'expenses',
      'schoolPayroll',
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
      tables: 'Tables / Floor View',
    },
    modules: [
      'dashboard',
      'ordersKot',
      'orders',
      'menuManagement',
      'customers',
      'tables',
      'kitchenDisplay',
      'delivery',
      'deliveryDrivers',
      'deliveryZones',
      'driverDashboard',
      'reservations',
      'kitchenProduction',
      'invoices',
      'expenses',
      'accounts',
      'accountStatements',
      'team',
      'approvals',
      'notifications',
      'reports',
      'settings',
    ],
  },
  {
    id: 'transport-rental',
    type: 'Transport / Rental',
    title: 'Transport / Rental',
    route: '/app/transport-dashboard',
    description: 'Manage your fleet, rental bookings, customers, payments, and dues from one workspace.',
    labels: {
      customers: 'Rental Customers',
    },
    modules: [
      'dashboard',
      'fleetDashboard',
      'transportVehicles',
      'transportBookings',
      'transportCustomers',
      'transportPayments',
      'expenses',
      'accounts',
      'accountStatements',
      'reports',
      'team',
      'notifications',
      'settings',
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
      'whatsappLeads',
      'whatsappFollowUps',
      'whatsappTemplates',
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
  'Transport / Logistics': 'Transport / Rental',
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
  if (value.includes('transport') || value.includes('rental') || value.includes('fleet')) return 'Transport / Rental'
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

export function teamManagementEnabledForBusinessType(type) {
  return true
}

export function labelForBusinessType(type) {
  return businessWorkspaceForType(type).title
}

export function businessModuleKeys(type) {
  const workspace = businessWorkspaceForType(type)
  const forcedModules = normalizeBusinessType(type) === 'Transport / Rental' ? ['dashboard'] : ['dashboard', 'approvals']
  const modules = workspace.modules.filter((moduleKey) => moduleKey !== 'team' || teamManagementEnabledForBusinessType(type))
  return Array.from(new Set([...modules, ...forcedModules]))
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
  deals: ['deals', 'pipeline', 'salesPipeline'],
  tasks: ['followUpEdit', 'followUpDelete'],
  activities: ['activityLogs'],
  quotations: ['reports', 'viewReports'],
  salesProducts: ['products', 'inventory'],
  followUps: ['followUpEdit', 'followUpDelete'],
  orders: ['invoices', 'manageBilling'],
  menuManagement: ['products', 'inventory'],
  ordersKot: ['invoices', 'manageBilling'],
  tables: ['invoices', 'manageBilling'],
  kitchenDisplay: ['invoices', 'manageBilling'],
  team: ['manageTeam', 'teamManagement', 'settingsAccess'],
  schoolPayroll: ['expenses', 'manageBilling', 'reports'],
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
  schoolReports: ['reports', 'viewReports'],
  settings: ['settingsAccess'],
  business_services: ['businessServices', 'business_services', 'support', 'settingsAccess'],
  businessServices: ['business_services', 'support', 'settingsAccess'],
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
  if (normalizeBusinessType(options?.businessType) === 'General CRM' && salesHubSidebarCoreModules.has(module.key)) return true
  if (module.key === 'team' && options?.teamOverride) return true
  if (module.key === 'team' && normalizeBusinessType(options?.businessType) === 'Restaurant POS') return true
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
    if (module.key === 'schoolReports') return normalizeBusinessType(businessType) === 'School ERP'
    if (module.key === 'support') return true
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
    const normalizedType = normalizeBusinessType(businessType)
    return moduleCatalog
      .filter((module) => normalizedType === 'General CRM' || module.key !== 'salesPipeline')
      .filter((module) => module.key !== 'team' || teamManagementEnabledForBusinessType(businessType))
      .filter((module) => !module.hidden)
      .map((module) => ({
        ...module,
        comingSoon: false,
        label: labelForBusinessModule(module.key, businessType),
      }))
  }

  const businessKeys = businessModuleKeys(businessType)
  const isSalesHub = normalizeBusinessType(businessType) === 'General CRM'
  const isSchoolErp = normalizeBusinessType(businessType) === 'School ERP'
  const isRestaurantPOS = normalizeBusinessType(businessType) === 'Restaurant POS'
  const selected = new Set(onboardingCompleted ? businessKeys : Array.isArray(enabledModules) && enabledModules.length ? enabledModules : businessKeys)
  if (isSchoolErp) selected.add('reports')
  return moduleCatalog.filter((module) => {
    if (module.key === 'subscriptions') return false
    if (module.key === 'payments') return false
    if (module.hidden) return false
    if (module.alwaysEnabled) return selected.has(module.key) || businessKeys.includes(module.key)
    if (module.comingSoon) return businessKeys.includes(module.key)
    if (!moduleAllowedByPlan(module.key, plan) && !(module.key === 'team' && teamOverride) && !(module.key === 'team' && isRestaurantPOS) && !(isSalesHub && salesHubSidebarCoreModules.has(module.key))) return false
    if (module.key === 'accountStatements') return businessKeys.includes('accounts')
    if (coreFinanceModules.includes(module.key) || module.key === 'approvals') return businessKeys.includes(module.key)
    return selected.has(module.key) && businessKeys.includes(module.key)
  }).map((module) => ({
    ...module,
    label: labelForBusinessModule(module.key, businessType),
  }))
}
