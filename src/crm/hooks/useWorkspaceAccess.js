import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { workspacePermissionDefaults } from '../../lib/roles.js'
import {
  businessPermissionKey,
  mapLegacyPermissionToModule,
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

export const workspacePermissionKeys = permissionKeysForBusiness({ businessType: 'General CRM', plan: 'Enterprise' })

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

function permissionsForBusiness(data = {}, businessType, plan) {
  const keys = workspacePermissionKeysForBusiness(businessType, plan)
  const key = businessPermissionKey(businessType)
  const next = emptyPermissions(keys)
  if (data.businessPermissions && typeof data.businessPermissions === 'object') {
    return applyLegacyCompatibility({ ...next, ...(data.businessPermissions[key] || {}) }, data.businessPermissions[key] || {}, keys)
  }
  return key === 'general-crm' ? applyLegacyCompatibility({ ...next, ...data }, data, keys) : next
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

function hasModuleViewGrant(permissions = {}, keys = []) {
  return keys.some((item) => item.action === 'view' && Boolean(permissions[item.key]))
}

function enabledModuleViewPermissions(userDoc = {}, keys = []) {
  const enabled = new Set(Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : [])
  if (!enabled.size) return {}
  return Object.fromEntries(
    keys
      .filter((item) => item.action === 'view' && enabled.has(item.moduleKey))
      .map((item) => [item.key, true]),
  )
}

export function useWorkspaceAccess() {
  const { userId, workspaceId, businessType, staffId, role, userDoc, isAdmin, isOwner, isStaff, isAccountant, isManager, accessPlan } = useUser()
  const currentPermissionKeys = useMemo(() => workspacePermissionKeysForBusiness(businessType, accessPlan), [accessPlan, businessType])
  const [permissions, setPermissions] = useState(() => emptyPermissions(currentPermissionKeys))
  const [explicitPermissions, setExplicitPermissions] = useState(() => emptyPermissions(currentPermissionKeys))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !workspaceId || !userId) {
      Promise.resolve().then(() => {
        setPermissions(emptyPermissions(currentPermissionKeys))
        setExplicitPermissions(emptyPermissions(currentPermissionKeys))
        setLoading(false)
      })
      return
    }

    if (isAdmin) {
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
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const defaults = roleDefaultPermissions(userDoc?.role || role, businessType, accessPlan)
        const rawOverrides = snap.exists() ? permissionsForBusiness(snap.data(), businessType, accessPlan) : {}
        const profileModuleFallback = enabledModuleViewPermissions(userDoc, currentPermissionKeys)
        const overrides = snap.exists() && !hasModuleViewGrant(rawOverrides, currentPermissionKeys)
          ? { ...rawOverrides, ...profileModuleFallback }
          : rawOverrides
        setExplicitPermissions(snap.exists() ? overrides : emptyPermissions(currentPermissionKeys))
        setPermissions(snap.exists() ? overrides : mergePermissionGrants(defaults, overrides))
        setLoading(false)
      },
      () => {
        setPermissions({ ...emptyPermissions(currentPermissionKeys), ...enabledModuleViewPermissions(userDoc, currentPermissionKeys) })
        setExplicitPermissions(emptyPermissions(currentPermissionKeys))
        setLoading(false)
      },
    )
    return () => unsub()
  }, [accessPlan, businessType, currentPermissionKeys, isAdmin, isOwner, role, staffId, userDoc?.role, userId, workspaceId])

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
