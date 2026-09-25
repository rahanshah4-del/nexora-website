/**
 * Shared module registry — the single list of Nexora business modules.
 *
 * Imported by the public site, the client app (via src/crm/data/moduleAccess.js),
 * the admin Control Centre and Node tests, so it must stay pure data + pure
 * functions: no Firebase, React or browser imports.
 *
 * Field notes:
 *   type          – exact `businessType` value stored on users/workspaces today.
 *   id            – workspace id (`selectedWorkspace`) used today.
 *   label         – display name (same as businessWorkspaceCatalog[].title).
 *   legacyTypes   – exact legacy values that normalize to this type. These build
 *                   the alias map used by normalizeBusinessType().
 *   aliases       – every known alternate value (legacyTypes + other spellings
 *                   seen in stored data, admin maps and workspace ids). Each one
 *                   resolves to this type through normalizeBusinessType().
 *   looseMatch    – words matched by normalizeBusinessType()'s fallback. Order
 *                   matters and is set by LOOSE_MATCH_ORDER below.
 *   maintenanceKey / marketingKey – value stored by src/lib/maintenanceMode.js /
 *                   src/lib/marketing.js. `...InUse: false` marks a proposed key
 *                   that those files do not offer yet.
 *   usageCollections – main per-workspace Firestore collections
 *                   (workspaces/{id}/<name>) for admin usage views.
 */

const MODULES = [
  {
    type: 'General CRM',
    id: 'general-crm',
    label: 'Nexora Sales Hub',
    legacyTypes: ['General Business', 'Healthcare / Hospital', 'Software Agency', 'Custom Enterprise'],
    aliases: ['crm', 'general-crm', 'sales-hub', 'nexora-sales-hub', 'Sales Hub', 'Nexora Sales Hub'],
    looseMatch: [],
    maintenanceKey: 'crm',
    maintenanceKeyInUse: true,
    marketingKey: 'crm',
    marketingKeyInUse: true,
    color: '#7c3aed',
    publicPath: '/crm/',
    routePrefixes: ['/app/dashboard', '/app/leads', '/app/pipeline', '/app/deals', '/app/tasks', '/app/activities', '/app/quotations', '/app/products-services', '/app/follow-ups', '/app/invoices'],
    usageCollections: ['customers', 'leads', 'salesDeals', 'salesTasks', 'salesActivities', 'salesQuotes', 'salesProducts', 'invoices', 'payments', 'expenses', 'accountTransactions', 'approvals'],
  },
  {
    type: 'Retail / POS',
    id: 'retail-pos',
    label: 'Retail / POS',
    // 'Inventory / Pharma' resolves to Retail / POS (not PharmaFlow) — kept exactly as the app does today.
    legacyTypes: ['Retail / Inventory', 'Inventory / Pharma'],
    aliases: ['retail', 'pos', 'retail-pos', 'Retail POS'],
    looseMatch: ['retail', 'inventory', 'pharma', 'pos'],
    maintenanceKey: 'retail',
    maintenanceKeyInUse: true,
    marketingKey: 'retail',
    marketingKeyInUse: false,
    color: '#f59e0b',
    publicPath: '/retail-pos',
    routePrefixes: ['/app/pos', '/app/pos-orders', '/app/pos-discounts', '/app/inventory'],
    usageCollections: ['products', 'inventoryTransactions', 'posOrders', 'posWalletPayments', 'posQueueJobs', 'suppliers', 'purchases', 'customers', 'invoices'],
  },
  {
    type: 'School ERP',
    id: 'school-erp',
    label: 'School ERP',
    legacyTypes: [],
    aliases: ['school', 'school-erp'],
    looseMatch: ['school', 'student', 'parent'],
    maintenanceKey: 'school',
    maintenanceKeyInUse: true,
    marketingKey: 'school',
    marketingKeyInUse: true,
    color: '#3b82f6',
    publicPath: '/school-erp',
    routePrefixes: ['/app/attendance', '/app/payroll', '/app/school-reports'],
    usageCollections: ['customers', 'invoices', 'studentAttendance', 'staffAttendance', 'attendanceDevices', 'attendanceDeviceLogs', 'payrollMembers', 'staffSalaryPayments'],
  },
  {
    type: 'Property ERP',
    id: 'property-erp',
    label: 'Property ERP',
    legacyTypes: [],
    aliases: ['property', 'property-erp'],
    looseMatch: ['property', 'tenant', 'rent'],
    maintenanceKey: 'property',
    maintenanceKeyInUse: true,
    marketingKey: 'property',
    marketingKeyInUse: true,
    color: '#ef4444',
    publicPath: '/solutions/property-erp/',
    routePrefixes: ['/app/products', '/app/maintenance', '/app/contracts'],
    usageCollections: ['customers', 'products', 'invoices', 'propertyMaintenance', 'propertyContracts'],
  },
  {
    type: 'Restaurant POS',
    id: 'restaurant-pos',
    label: 'Restaurant POS',
    legacyTypes: ['Restaurant / POS', 'Restaurant / Canteen'],
    aliases: ['restaurant', 'restaurant-pos', 'restaurant pos'],
    looseMatch: ['restaurant', 'canteen', 'kot', 'kitchen'],
    maintenanceKey: 'restaurant',
    maintenanceKeyInUse: true,
    marketingKey: 'restaurant',
    marketingKeyInUse: true,
    color: '#14b8a6',
    publicPath: '/restaurant-pos',
    routePrefixes: ['/app/orders-kot', '/app/restaurant-pos', '/app/menu-management', '/app/tables', '/app/kitchen-display', '/app/reservations', '/app/kitchen-production', '/app/loyalty', '/menu/'],
    usageCollections: [
      'orders', 'kot', 'bills', 'menuItems', 'tables',
      'restaurantCashSessions', 'restaurantCashMovements', 'restaurantPayments', 'restaurantRefunds',
      'restaurantReservations', 'restaurantWaitlist',
      'restaurantProductionBatches', 'restaurantKitchenPrep', 'restaurantIngredients', 'restaurantRecipes', 'restaurantDeductions', 'restaurantWaste', 'restaurantFinishedInventory',
      'loyaltyAccounts', 'loyaltyPointsLedger', 'loyaltyRedemptions',
      'onlineOrders',
    ],
  },
  {
    type: 'Transport / Rental',
    id: 'transport-rental',
    label: 'Transport / Rental',
    legacyTypes: ['Transport / Logistics'],
    // 'rental' and 'transport-rental' are NOT listed: normalizeBusinessType() maps
    // them to Property ERP today (the 'rent' word match runs first).
    aliases: ['transport', 'fleet', 'Transport'],
    looseMatch: ['transport', 'rental', 'fleet'],
    maintenanceKey: 'transport',
    maintenanceKeyInUse: true,
    marketingKey: 'transport',
    marketingKeyInUse: true,
    color: '#f97316',
    publicPath: '/transport-fleet',
    routePrefixes: ['/app/transport-dashboard', '/app/transport'],
    // Transport data is stored in browser localStorage only (src/crm/data/transport*.js).
    usageCollections: [],
  },
  {
    type: 'WhatsApp CRM',
    id: 'whatsapp-crm',
    label: 'WhatsApp CRM',
    legacyTypes: [],
    aliases: ['whatsapp', 'whatsapp-crm'],
    looseMatch: ['whatsapp'],
    maintenanceKey: 'whatsapp',
    maintenanceKeyInUse: true,
    marketingKey: 'whatsapp',
    marketingKeyInUse: false,
    color: '#0ea5e9',
    publicPath: '/whatsapp-crm',
    routePrefixes: ['/app/whatsapp-inbox', '/app/whatsapp-leads', '/app/whatsapp-followups', '/app/whatsapp-templates', '/app/whatsapp-connect'],
    usageCollections: ['whatsappContacts', 'whatsappSettings', 'leads', 'salesTasks'],
  },
  {
    type: 'PharmaFlow',
    id: 'medical-store-pos',
    label: 'PharmaFlow',
    // Legacy canonical value, renamed to 'PharmaFlow'; existing workspaces still
    // store it (e.g. workspace ekvbpDEZYRdIHgEE7JNYDh26JX92).
    legacyTypes: ['Medical Store POS'],
    // 'pharmaflow' / 'PHARMAFLOW' are NOT listed: they miss the exact match and
    // hit Retail / POS's 'pharma' word match today.
    aliases: ['medical', 'pharmacy', 'medicine', 'Pharmacy POS', 'medical-store-pos'],
    looseMatch: ['medical', 'pharmacy', 'medicine'],
    // maintenanceMode.js has no PharmaFlow option yet; 'pharmaflow' is the key its
    // normalizeKey() already derives from the app's 'PharmaFlow' context.
    maintenanceKey: 'pharmaflow',
    maintenanceKeyInUse: false,
    marketingKey: 'pharmacy',
    marketingKeyInUse: false,
    color: '#059669',
    publicPath: '/pharmacy-pos/',
    routePrefixes: ['/app/medical-inventory', '/app/medical-pos', '/app/medical-pos-orders', '/pos-till/medical'],
    usageCollections: ['medicineInventory', 'medicalPosOrders', 'medicalPosQueueJobs', 'branches', 'suppliers', 'purchases', 'customers', 'invoices'],
  },
]

// Order in which normalizeBusinessType() tries loose word matches. Changing it
// changes results (e.g. 'rental' hits Property ERP's 'rent' before Transport).
const LOOSE_MATCH_ORDER = ['School ERP', 'Property ERP', 'WhatsApp CRM', 'Restaurant POS', 'Transport / Rental', 'PharmaFlow', 'Retail / POS']

export const DEFAULT_BUSINESS_TYPE = 'General CRM'

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child)
  })
  return Object.freeze(value)
}

export const MODULE_REGISTRY = deepFreeze(MODULES.map((module) => ({ ...module })))

export const BUSINESS_TYPES = Object.freeze(MODULE_REGISTRY.map((module) => module.type))

// Plain object (not a null-prototype map) so lookups behave exactly like the
// original businessTypeAliases literal in moduleAccess.js.
export const BUSINESS_TYPE_ALIASES = Object.freeze(Object.fromEntries(
  MODULE_REGISTRY.flatMap((module) => module.legacyTypes.map((legacyType) => [legacyType, module.type])),
))

const LOOSE_MATCH_RULES = LOOSE_MATCH_ORDER.map((type) => {
  const module = MODULE_REGISTRY.find((item) => item.type === type)
  return { type, words: module.looseMatch }
})

export function normalizeBusinessType(type) {
  const raw = String(type || '').trim()
  if (BUSINESS_TYPES.includes(raw)) return raw
  if (BUSINESS_TYPE_ALIASES[raw]) return BUSINESS_TYPE_ALIASES[raw]
  const value = raw.toLowerCase()
  const match = LOOSE_MATCH_RULES.find((rule) => rule.words.some((word) => value.includes(word)))
  return match ? match.type : DEFAULT_BUSINESS_TYPE
}

/** Registry entry for a business type, workspace id or any alias. Falls back to Nexora Sales Hub, like normalizeBusinessType(). */
export function getModule(typeOrAlias) {
  const raw = String(typeOrAlias || '').trim()
  const byId = MODULE_REGISTRY.find((module) => module.id === raw)
  if (byId) return byId
  const type = normalizeBusinessType(raw)
  return MODULE_REGISTRY.find((module) => module.type === type)
}

export function moduleLabel(value) {
  return getModule(value).label
}

export function listModules() {
  return MODULE_REGISTRY
}
