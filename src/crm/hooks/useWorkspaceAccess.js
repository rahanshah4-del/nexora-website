import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { workspacePermissionDefaults } from '../../lib/roles.js'
import {
  businessPermissionKey,
  mapLegacyPermissionToModule,
  moduleCatalog,
  modulePermissionKey,
  moduleViewPermissionKey,
  permissionKeysForBusiness,
} from '../data/moduleAccess.js'

export const legacyWorkspacePermissionKeys = [
  { key: 'followUpEdit', label: 'Follow-Up Edit' },
  { key: 'followUpDelete', label: 'Follow-Up Delete' },
  { key: 'customerManagement', label: 'Customer Management' },
  { key: 'leadsManagement', label: 'Leads Management' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'reports', label: 'Reports' },
  { key: 'support', label: 'Support Tickets' },
  { key: 'hrDashboard', label: 'HR Dashboard' },
  { key: 'settingsAccess', label: 'Settings Access' },
]

function traceAccess(event, payload = {}) {
  if (import.meta.env.DEV) {
    console.log(`[StaffAccessTrace] ${event}`, payload)
  }
}

export const workspacePermissionKeys = permissionKeysForBusiness({ businessType: 'General CRM', plan: 'Enterprise' })

const permissionKeyCatalog = moduleCatalog.flatMap((module) =>
  ['view', 'create', 'edit', 'delete', 'export', 'approve'].map((action) => ({
    key: modulePermissionKey(module.key, action),
    moduleKey: module.key,
    moduleLabel: module.label,
    action,
    actionLabel: action,
    label: `${module.label} - ${action}`,
    route: module.route,
    comingSoon: module.comingSoon,
  })),
)

const permissionModuleAliases = {
  pos: ['pos', 'retail_pos', 'retail', 'retail-pos'],
  posOrders: ['posOrders', 'pos_orders', 'pos-orders', 'retail_pos_orders', 'retail-pos-orders'],
  retail_pos: ['retail_pos', 'retail-pos', 'retail', 'pos'],
  dashboard: ['dashboard'],
}

function mergePermissionKeys(...groups) {
  const byKey = new Map()
  groups.flat().filter(Boolean).forEach((item) => {
    if (!byKey.has(item.key)) byKey.set(item.key, item)
  })
  return Array.from(byKey.values())
}

function aliasKeysFor(moduleKey) {
  return permissionModuleAliases[moduleKey] || [moduleKey]
}

function permissionValue(row = {}, moduleKey, action = 'view') {
  return aliasKeysFor(moduleKey).some((key) => row?.[modulePermissionKey(key, action)] === true)
}

function enabledModuleHas(enabled = new Set(), moduleKey) {
  return aliasKeysFor(moduleKey).some((key) => enabled.has(key))
}

export function workspacePermissionKeysForBusiness(businessType, plan = 'Business') {
  return permissionKeysForBusiness({ businessType, plan, teamOverride: true })
}

function emptyPermissions(keys = workspacePermissionKeys) {
  return Object.fromEntries([...keys, ...legacyWorkspacePermissionKeys].map((item) => [item.key, false]))
}

function applyLegacyCompatibility(next, raw = {}, keys = []) {
  for (const item of keys) {
    if (typeof raw[item.key] === 'boolean') {
      next[item.key] = raw[item.key]
    } else {
      next[item.key] = mapLegacyPermissionToModule(raw, item.moduleKey, item.action)
    }
  }

  next.followUpEdit = Boolean(next.followUpEdit || next[modulePermissionKey('followUps', 'edit')] || next[moduleViewPermissionKey('followUps')])
  next.followUpDelete = Boolean(next.followUpDelete || next[modulePermissionKey('followUps', 'delete')])
  next.customerManagement = Boolean(next.customerManagement || next[moduleViewPermissionKey('customers')])
  next.leadsManagement = Boolean(next.leadsManagement || next[moduleViewPermissionKey('leads')])
  next.invoices = Boolean(next.invoices || next[moduleViewPermissionKey('invoices')])
  next.reports = Boolean(next.reports || next[moduleViewPermissionKey('reports')])
  next.support = Boolean(next.support || next[moduleViewPermissionKey('support')])
  next.hrDashboard = Boolean(next.hrDashboard || next[moduleViewPermissionKey('hr')])
  next.settingsAccess = Boolean(next.settingsAccess || next[moduleViewPermissionKey('settings')])
  return next
}

function hasPermissionGrant(row = {}, keys = []) {
  return keys.some((item) => row?.[item.key] === true || permissionValue(row, item.moduleKey, item.action))
}

function permissionsForBusiness(data = {}, businessType, plan) {
  const keys = workspacePermissionKeysForBusiness(businessType, plan)
  const key = businessPermissionKey(businessType)
  const next = emptyPermissions(keys)
  const flatPermissions = applyLegacyCompatibility({ ...next, ...data }, data, keys)
  if (data.businessPermissions && typeof data.businessPermissions === 'object') {
    const scopedPermissions =
      data.businessPermissions[key] ||
      (key === 'retail-pos' ? data.businessPermissions.retail_pos || data.businessPermissions.retail || data.businessPermissions.pos : null) ||
      {}
    const nestedPermissions = applyLegacyCompatibility({ ...next, ...scopedPermissions }, scopedPermissions, keys)
    return hasPermissionGrant(nestedPermissions, keys) ? nestedPermissions : flatPermissions
  }
  return key === 'general-crm' || hasPermissionGrant(flatPermissions, keys) ? flatPermissions : next
}

function roleDefaultPermissions(role, businessType, plan) {
  const defaults = workspacePermissionDefaults(role)
  if (String(role || '').trim().toLowerCase() === 'sales') {
    defaults.invoices = true
  }
  return permissionsForBusiness(defaults, businessType, plan)
}

function mergePermissionGrants(defaults = {}, overrides = {}) {
  return Object.fromEntries(
    Object.keys({ ...defaults, ...overrides }).map((key) => [key, Boolean(defaults[key] || overrides[key])]),
  )
}

function enabledModuleViewPermissions(userDoc = {}, keys = []) {
  const enabled = new Set(Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : [])
  if (!enabled.size) return {}
  const grants = Object.fromEntries(
    mergePermissionKeys(keys, permissionKeyCatalog)
      .filter((item) => item.action === 'view' && enabledModuleHas(enabled, item.moduleKey))
      .map((item) => [item.key, true]),
  )
  if (enabledModuleHas(enabled, 'pos')) grants[moduleViewPermissionKey('pos')] = true
  if (enabledModuleHas(enabled, 'posOrders')) grants[moduleViewPermissionKey('posOrders')] = true
  if (enabledModuleHas(enabled, 'retail_pos')) grants[moduleViewPermissionKey('retail_pos')] = true
  return grants
}

function applyAccessFallbacks(permissions = {}, userDoc = {}, keys = []) {
  if (hasPermissionGrant(permissions, keys)) return permissions
  return { ...permissions, ...enabledModuleViewPermissions(userDoc, keys) }
}

export function useWorkspaceAccess() {
  const { userId, workspaceId, businessType, staffId, role, userDoc, isAdmin, isOwner, isStaff, isAccountant, isManager, accessPlan } = useUser()
  const currentPermissionKeys = useMemo(
    () => mergePermissionKeys(workspacePermissionKeysForBusiness(businessType, accessPlan), permissionKeyCatalog),
    [accessPlan, businessType],
  )
  const [permissions, setPermissions] = useState(() => emptyPermissions(currentPermissionKeys))
  const [explicitPermissions, setExplicitPermissions] = useState(() => emptyPermissions(currentPermissionKeys))
  const [loading, setLoading] = useState(true)
  const staffAccount = Boolean(isStaff && !isOwner && !isAdmin)
  const enabledModulesKey = Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules.filter(Boolean).join('|') : ''
  const fallbackUserDoc = useMemo(
    () => ({ enabledModules: enabledModulesKey ? enabledModulesKey.split('|').filter(Boolean) : [] }),
    [enabledModulesKey],
  )

  useEffect(() => {
    if (!db || !workspaceId || !userId) {
      Promise.resolve().then(() => {
        setPermissions(emptyPermissions(currentPermissionKeys))
        setExplicitPermissions(emptyPermissions(currentPermissionKeys))
        setLoading(false)
      })
      return
    }

    if (isAdmin && !staffAccount) {
      Promise.resolve().then(() => {
        const defaults = { ...emptyPermissions(currentPermissionKeys), ...workspacePermissionDefaults(isOwner ? 'owner' : role) }
        currentPermissionKeys.forEach((item) => {
          defaults[item.key] = true
        })
        setPermissions(defaults)
        setExplicitPermissions(emptyPermissions(currentPermissionKeys))
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const permissionDocId = staffId || userId
    const ref = doc(db, 'workspaces', workspaceId, 'permissions', permissionDocId)
    traceAccess('permission-listener-subscribe', {
      permissionDocId,
      role,
      staffId,
      workspaceId,
      businessType,
      enabledModules: fallbackUserDoc.enabledModules,
    })
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const defaults = roleDefaultPermissions(role, businessType, accessPlan)
        const rawOverrides = snap.exists() ? permissionsForBusiness(snap.data(), businessType, accessPlan) : {}
        const profileModuleFallback = enabledModuleViewPermissions(fallbackUserDoc, currentPermissionKeys)
        const overrides = applyAccessFallbacks(rawOverrides, fallbackUserDoc, currentPermissionKeys)
        const resolvedModules = currentPermissionKeys
          .filter((item) => item.action === 'view' && overrides[item.key])
          .map((item) => item.moduleKey)
        traceAccess('permission-listener-update', {
          exists: snap.exists(),
          role,
          staffId,
          workspaceId,
          businessType,
          enabledModules: fallbackUserDoc.enabledModules,
          resolvedModules,
          permissionKeys: Object.keys(overrides).filter((key) => overrides[key] === true),
        })
        setExplicitPermissions(snap.exists() ? overrides : emptyPermissions(currentPermissionKeys))
        setPermissions(staffAccount
          ? (snap.exists() ? overrides : { ...emptyPermissions(currentPermissionKeys), ...profileModuleFallback })
          : (snap.exists() ? overrides : mergePermissionGrants(defaults, overrides)))
        setLoading(false)
      },
      () => {
        setPermissions({ ...emptyPermissions(currentPermissionKeys), ...enabledModuleViewPermissions(fallbackUserDoc, currentPermissionKeys) })
        setExplicitPermissions(emptyPermissions(currentPermissionKeys))
        setLoading(false)
      },
    )
    return () => {
      traceAccess('permission-listener-unsubscribe', { permissionDocId, staffId, workspaceId, businessType })
      unsub()
    }
  }, [accessPlan, businessType, currentPermissionKeys, fallbackUserDoc, isAdmin, isOwner, role, staffAccount, staffId, userId, workspaceId])

  return useMemo(
    () => ({
      role,
      userId,
      workspaceId,
      businessType,
      staffId,
      isOwner,
      isAdmin,
      isStaff,
      isAccountant,
      isManager,
      loading,
      accessReady: !loading,
      permissions,
      explicitPermissions,
      canManageSettings: isAdmin || Boolean(permissions.settingsAccess),
      canEditFollowUps: isAdmin || Boolean(permissions.followUpEdit),
      canDeleteFollowUps: isAdmin || Boolean(permissions.followUpDelete),
      canAccessHr: isAdmin || Boolean(permissions.hrDashboard),
      permissionKeys: currentPermissionKeys,
      hasModulePermission(moduleKey, action = 'view') {
        const permissionKey = modulePermissionKey(moduleKey, action)
        if (isOwner || isAdmin) return true
        if (permissionValue(permissions, moduleKey, action)) return true
        if (moduleKey === 'support') {
          const allowed = Boolean(permissions.support || permissions[permissionKey])
          if (!allowed) {
            console.warn('[Sales Hub Access Denied]', {
              source: 'useWorkspaceAccess.hasModulePermission',
              role,
              workspaceId,
              permissionKey,
              moduleKey,
              action,
              denialReason: 'missing_support_or_module_permission',
            })
          }
          return allowed
        }
        const allowed = Boolean(permissions[permissionKey])
        if (!allowed) {
          console.warn('[Sales Hub Access Denied]', {
            source: 'useWorkspaceAccess.hasModulePermission',
            role,
            workspaceId,
            permissionKey,
            moduleKey,
            action,
            denialReason: 'missing_module_permission',
          })
        }
        return allowed
      },
      hasPermission(key) {
        if (isOwner || isAdmin) return true
        const allowed = Boolean(permissions[key])
        if (!allowed) {
          console.warn('[Sales Hub Access Denied]', {
            source: 'useWorkspaceAccess.hasPermission',
            role,
            workspaceId,
            permissionKey: key,
            denialReason: 'missing_legacy_permission',
          })
        }
        return allowed
      },
    }),
    [businessType, currentPermissionKeys, explicitPermissions, isAccountant, isAdmin, isManager, isOwner, isStaff, loading, permissions, role, staffId, userId, workspaceId],
  )
}
