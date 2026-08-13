/**
 * Restaurant POS — Simplified Role Definitions
 *
 * This module defines exactly 5 roles for Restaurant POS workspaces,
 * independent of the shared/legacy role systems (src/lib/roles.js,
 * src/crm/lib/rbac.js, useTeamPermissions.js, PermissionMatrix.jsx)
 * that other business types depend on.
 *
 * Each role maps to a clear set of module.<key>.<action> permission keys,
 * reusing the existing moduleAccess.js format so runtime enforcement
 * via useWorkspaceAccess continues to work unchanged.
 *
 * Only the Cashier role has canUseDesktopPOS: true — staff login
 * credentials (workspace code + staff ID + PIN) are generated ONLY
 * for Cashier assignments.
 */

import { modulePermissionKey } from './moduleAccess.js'

// ---------------------------------------------------------------------------
// Actions each role is allowed across its assigned modules
// ---------------------------------------------------------------------------
const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve']
const STANDARD_ACTIONS = ['view', 'create', 'edit']
const KITCHEN_ACTIONS = ['view', 'edit'] // can mark items as ready
const WAITER_ACTIONS = ['view', 'create'] // can place orders
const MANAGE_ACTIONS = ['view', 'create', 'edit', 'export', 'approve'] // no delete

// ---------------------------------------------------------------------------
// Module scopes per role (Restaurant POS module keys from moduleAccess.js)
// ---------------------------------------------------------------------------

/** Owner — full access to every Restaurant POS module. Website only. */
const OWNER_MODULES = [
  'dashboard',
  'orders',
  'ordersKot',
  'menuManagement',
  'customers',
  'tables',
  'kitchenDisplay',
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
]

/** Admin/Manager — daily operations, reports, staff management, approvals. Website only. */
const ADMIN_MODULES = [
  'dashboard',
  'orders',
  'ordersKot',
  'menuManagement',
  'customers',
  'tables',
  'kitchenDisplay',
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
]

/** Cashier — till operations. Desktop POS login (the only role with PIN credentials). */
const CASHIER_MODULES = [
  'dashboard',
  'orders',
  'ordersKot',
  'tables',
  'reservations',
]

/** Waiter — order/table/KOT visibility from website. No desktop POS login. */
const WAITER_MODULES = [
  'dashboard',
  'orders',
  'ordersKot',
  'tables',
  'reservations',
  'kitchenDisplay',
]

/** Kitchen Staff — KOT / Kitchen Display visibility from website. No desktop POS login. */
const KITCHEN_STAFF_MODULES = [
  'dashboard',
  'ordersKot',
  'kitchenDisplay',
  'kitchenProduction',
]

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

export const RESTAURANT_ROLES = /** @type {const} */ ([
  {
    key: 'owner',
    label: 'Owner',
    description: 'Full access to all restaurant modules, settings, and reports.',
    modules: OWNER_MODULES,
    actions: ALL_ACTIONS,
    canUseDesktopPOS: false,
    order: 0,
  },
  {
    key: 'admin',
    label: 'Admin / Manager',
    description: 'Daily operations, reports, staff management, and approvals.',
    modules: ADMIN_MODULES,
    actions: MANAGE_ACTIONS,
    canUseDesktopPOS: false,
    order: 1,
  },
  {
    key: 'cashier',
    label: 'Cashier',
    description: 'Till operations — the only role that logs into the desktop POS with a PIN.',
    modules: CASHIER_MODULES,
    actions: STANDARD_ACTIONS,
    canUseDesktopPOS: true,
    order: 2,
  },
  {
    key: 'waiter',
    label: 'Waiter',
    description: 'View and place orders, check table status and KOT.',
    modules: WAITER_MODULES,
    actions: WAITER_ACTIONS,
    canUseDesktopPOS: false,
    order: 3,
  },
  {
    key: 'kitchen_staff',
    label: 'Kitchen Staff',
    description: 'View KOT orders and update kitchen display status.',
    modules: KITCHEN_STAFF_MODULES,
    actions: KITCHEN_ACTIONS,
    canUseDesktopPOS: false,
    order: 4,
  },
])

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map of role key → role definition. */
export const RESTAURANT_ROLE_MAP = Object.fromEntries(
  RESTAURANT_ROLES.map((role) => [role.key, role]),
)

/** Role labels for dropdowns — ordered by `order`. */
export const RESTAURANT_ROLE_LABELS = RESTAURANT_ROLES.map((role) => role.label)

/** Role keys for dropdowns — ordered by `order`. */
export const RESTAURANT_ROLE_KEYS = RESTAURANT_ROLES.map((role) => role.key)

/**
 * Build a flat permissions object { 'module.<key>.<action>': true } for a role.
 * This is the format expected by useWorkspaceAccess and the Firestore permissions doc.
 */
export function buildRestaurantPermissions(roleKey) {
  const role = RESTAURANT_ROLE_MAP[roleKey]
  if (!role) return {}
  const permissions = {}
  for (const moduleKey of role.modules) {
    for (const action of role.actions) {
      permissions[modulePermissionKey(moduleKey, action)] = true
    }
  }
  return permissions
}

/**
 * Return the enabled module keys for a restaurant role (used for sidebar nav).
 */
export function enabledModulesForRestaurantRole(roleKey) {
  const role = RESTAURANT_ROLE_MAP[roleKey]
  return role ? [...role.modules] : []
}

/**
 * Check whether a role is allowed to use the desktop POS (PIN login).
 * Only Cashier returns true.
 */
export function canUseDesktopPOS(roleKey) {
  const role = RESTAURANT_ROLE_MAP[roleKey]
  return role?.canUseDesktopPOS === true
}

/**
 * Normalize a raw role value to a restaurant role key.
 * Returns the matching key or 'cashier' as safe fallback.
 */
export function normalizeRestaurantRole(raw) {
  const value = String(raw || '').trim().toLowerCase()
  // Direct key match
  if (RESTAURANT_ROLE_MAP[value]) return value
  // Label match
  const byLabel = RESTAURANT_ROLES.find(
    (role) => role.label.toLowerCase() === value,
  )
  if (byLabel) return byLabel.key
  // Alias match
  if (value === 'manager' || value === 'admin/manager') return 'admin'
  if (value === 'kitchen' || value === 'chef' || value === 'cook') return 'kitchen_staff'
  if (value === 'server' || value === 'waitstaff') return 'waiter'
  // Fallback
  return 'cashier'
}

/**
 * Get the display label for a restaurant role key.
 */
export function restaurantRoleLabel(roleKey) {
  const role = RESTAURANT_ROLE_MAP[normalizeRestaurantRole(roleKey)]
  return role?.label || 'Cashier'
}

export default RESTAURANT_ROLES
