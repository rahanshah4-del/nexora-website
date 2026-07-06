import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase.js'
import { functions } from '../../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess, workspacePermissionKeysForBusiness } from './useWorkspaceAccess.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { businessPermissionKey, businessWorkspaceForType, mapLegacyPermissionToModule, normalizeBusinessType } from '../data/moduleAccess.js'

function defaultPermissions(permissionKeys) {
  return Object.fromEntries(permissionKeys.map((item) => [item.key, false]))
}

function normalizeStaffRole(role) {
  const value = String(role || 'staff').trim().toLowerCase()
  if (value === 'owner') return 'owner'
  if (value === 'admin') return 'admin'
  if (value === 'accountant') return 'accountant'
  if (value === 'manager') return 'manager'
  if (value === 'cashier') return 'cashier'
  if (value === 'support' || value === 'support agent' || value === 'support_staff') return 'support_staff'
  if (value === 'sales' || value === 'sales staff' || value === 'sales_staff' || value === 'staff') return 'sales_staff'
  if (value === 'data entry' || value === 'data_entry') return 'data_entry'
  if (value === 'viewer' || value === 'view only' || value === 'readonly') return 'viewer'
  return 'viewer'
}

function normalizePermissionSet(raw = {}, permissionKeys = []) {
  const next = defaultPermissions(permissionKeys)
  for (const item of permissionKeys) {
    if (typeof raw[item.key] === 'boolean') {
      next[item.key] = raw[item.key]
    } else {
      next[item.key] = mapLegacyPermissionToModule(raw, item.moduleKey, item.action)
    }
  }
  return next
}

function permissionsForBusiness(row = {}, businessType, permissionKeys) {
  const key = businessPermissionKey(businessType)
  const flatPermissions = normalizePermissionSet(row, permissionKeys)
  if (row.businessPermissions && typeof row.businessPermissions === 'object') {
    const scopedPermissions = normalizePermissionSet(row.businessPermissions[key] || {}, permissionKeys)
    return {
      ...(hasViewPermission(scopedPermissions, permissionKeys) ? scopedPermissions : flatPermissions),
      __businessPermissions: row.businessPermissions,
    }
  }
  return key === 'general-crm' || hasViewPermission(flatPermissions, permissionKeys)
    ? { ...flatPermissions, __businessPermissions: {} }
    : { ...defaultPermissions(permissionKeys), __businessPermissions: {} }
}

function hasViewPermission(permissions = {}, permissionKeys = []) {
  return permissionKeys.some((item) => item.action === 'view' && Boolean(permissions?.[item.key]))
}

function permissionsFromEnabledModules(enabledModules = [], permissionKeys = []) {
  const enabled = new Set(Array.isArray(enabledModules) ? enabledModules : [])
  if (!enabled.size) return {}
  return Object.fromEntries(
    permissionKeys
      .filter((item) => item.action === 'view' && enabled.has(item.moduleKey))
      .map((item) => [item.key, true]),
  )
}

function permissionsWithModuleFallback(permissions = {}, enabledModules = [], permissionKeys = []) {
  return hasViewPermission(permissions, permissionKeys)
    ? permissions
    : { ...permissions, ...permissionsFromEnabledModules(enabledModules, permissionKeys) }
}

function inferBusinessTypeFromModules(moduleKeys = [], fallbackBusinessType = '') {
  const selected = new Set((Array.isArray(moduleKeys) ? moduleKeys : []).filter(Boolean))
  if (selected.has('orders') || selected.has('ordersKot') || selected.has('tables') || selected.has('kitchenDisplay') || selected.has('menuManagement')) return 'Restaurant POS'
  if (selected.has('pos') || selected.has('posOrders') || selected.has('posDiscounts') || selected.has('inventory')) return 'Retail / POS'
  return normalizeBusinessType(fallbackBusinessType)
}

function accessScopeFromPermissions({ role = '', permissions = {}, permissionKeys = [], businessType = '' }) {
  const selectedModuleKeys = Array.from(new Set(
    permissionKeys
      .filter((item) => item.action === 'view' && permissions[item.key])
      .map((item) => item.moduleKey)
      .filter(Boolean),
  ))
  const normalizedBusinessType = inferBusinessTypeFromModules(selectedModuleKeys, businessType)
  const selectedWorkspace = businessWorkspaceForType(normalizedBusinessType).id
  const businessKey = businessPermissionKey(normalizedBusinessType)
  const cashierRole = normalizeStaffRole(role) === 'cashier'
  const cashierAllowed = businessKey === 'restaurant-pos'
    ? new Set(['dashboard', 'orders', 'ordersKot', 'tables'])
    : businessKey === 'retail-pos'
      ? new Set(['dashboard', 'pos', 'posOrders'])
      : null
  const scopedPermissions = cashierRole && cashierAllowed
    ? Object.fromEntries(Object.entries(permissions).filter(([key]) => {
        const moduleKey = String(key).match(/^module\.([^.]+)\./)?.[1] || ''
        return !moduleKey || cashierAllowed.has(moduleKey)
      }))
    : permissions
  const enabledModules = Array.from(new Set(
    permissionKeys
      .filter((item) => item.action === 'view' && scopedPermissions[item.key])
      .map((item) => item.moduleKey)
      .filter((moduleKey) => !cashierAllowed || cashierAllowed.has(moduleKey)),
  ))
  return { businessType: normalizedBusinessType, businessKey, selectedWorkspace, enabledModules, selectedModuleKeys: enabledModules, permissions: scopedPermissions }
}

function setIfKnown(next, knownKeys, key, value = true) {
  if (knownKeys.has(key)) next[key] = Boolean(value)
}

function applyPermissionDependencies(permissions = {}, permissionKeys = [], role = '') {
  const next = { ...permissions }
  const knownKeys = new Set(permissionKeys.map((item) => item.key))
  const hasAny = (...keys) => keys.some((key) => next[key] === true)
  const cashierRole = normalizeStaffRole(role) === 'cashier'

  const posEnabled = hasAny(
    'module.pos.view',
    'module.pos.create',
    'module.pos.edit',
    'module.pos.approve',
    'module.posOrders.view',
    'module.posOrders.create',
    'module.posOrders.edit',
    'module.posOrders.approve',
  )
  if (posEnabled) {
    setIfKnown(next, knownKeys, 'module.pos.view')
    setIfKnown(next, knownKeys, 'module.posOrders.view')
    if (!cashierRole) {
      setIfKnown(next, knownKeys, 'module.inventory.view')
      setIfKnown(next, knownKeys, 'module.products.view')
    }
  }

  if (hasAny('module.pos.create', 'module.pos.edit', 'module.posOrders.create', 'module.posOrders.edit')) {
    setIfKnown(next, knownKeys, 'module.pos.create')
    setIfKnown(next, knownKeys, 'module.posOrders.create')
    if (!cashierRole) {
      setIfKnown(next, knownKeys, 'module.inventory.edit')
      setIfKnown(next, knownKeys, 'module.products.edit')
    }
  }

  if (hasAny('module.inventory.create', 'module.inventory.edit')) {
    setIfKnown(next, knownKeys, 'module.inventory.view')
    setIfKnown(next, knownKeys, 'module.products.view')
    setIfKnown(next, knownKeys, 'module.products.edit')
  }

  return next
}

function accessProfilePatch({ staffRow = {}, staffId = '', workspaceId = '', businessType = '', businessKey = '', permissions = {}, permissionKeys = [], userId = '' }) {
  const normalizedBusinessType = normalizeBusinessType(businessType || staffRow.businessType)
  const selectedWorkspace = businessWorkspaceForType(normalizedBusinessType).id
  const enabledModules = Array.from(new Set(
    permissionKeys
      .filter((item) => item.action === 'view' && permissions[item.key])
      .map((item) => item.moduleKey)
      .filter(Boolean),
  ))
  const nextBusinessPermissions = {
    ...(staffRow.businessPermissions || {}),
    [businessKey]: permissions,
  }

  return {
    permissions,
    businessPermissions: nextBusinessPermissions,
    enabledModules,
    businessType: normalizedBusinessType,
    selectedBusinessType: normalizedBusinessType,
    currentBusinessType: normalizedBusinessType,
    primaryBusinessType: normalizedBusinessType,
    allowedBusinessTypes: [normalizedBusinessType],
    selectedWorkspace,
    workspaceId,
    ownerId: workspaceId,
    companyId: workspaceId,
    staffId,
    userId: staffId,
    email: staffRow.email || '',
    role: normalizeStaffRole(staffRow.role),
    isStaff: true,
    isOwner: false,
    isAdmin: false,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }
}

export function useStaffPermissions() {
  const { userId, workspaceId, businessType, userDoc, workspaceDoc, firebaseUser, plan, accessPlan } = useUser()
  const access = useWorkspaceAccess()
  const currentPermissionKeys = useMemo(() => workspacePermissionKeysForBusiness(businessType, accessPlan || plan), [accessPlan, businessType, plan])
  const [staff, setStaff] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !userId || !access.isAdmin) {
      Promise.resolve().then(() => {
        setStaff([])
        setPermissions({})
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const staffRef = collection(db, 'workspaces', workspaceId, 'staff')
    const permissionsRef = collection(db, 'workspaces', workspaceId, 'permissions')
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        setStaff(snap.docs.map((item) => ({ id: item.id, ...item.data() })))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load staff.'))
        setStaff([])
        setLoading(false)
      },
    )
    const unsubPermissions = onSnapshot(
      permissionsRef,
      (snap) => {
        setPermissions(Object.fromEntries(snap.docs.map((item) => [item.id, permissionsForBusiness(item.data(), businessType, currentPermissionKeys)])))
      },
      () => setPermissions({}),
    )

    return () => {
      unsubStaff()
      unsubPermissions()
    }
  }, [access.isAdmin, businessType, currentPermissionKeys, userId, workspaceId])

  return useMemo(
    () => ({
      staff,
      permissions,
      loading,
      error,
      canManage: access.isAdmin,
      permissionKeys: currentPermissionKeys,
      async createStaff(payload) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can create staff.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!functions) return { ok: false, error: 'Team staff service is not available right now.' }

        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim().toLowerCase()
        const username = String(payload.username || '').trim()
        const role = normalizeStaffRole(payload.role)
        const status = String(payload.status || 'active').trim().toLowerCase() || 'active'
        const currentEmail = String(firebaseUser?.email || userDoc?.email || '').trim().toLowerCase()
        if (!name) return { ok: false, error: 'Staff name is required.' }
        if (!email) return { ok: false, error: 'Staff email is required.' }
        if (currentEmail && email === currentEmail) return { ok: false, error: 'Owner/admin email ko staff invite me use nahi kar sakte. Staff ke liye separate email use karein.' }
        const basePermissions = applyPermissionDependencies({ ...defaultPermissions(currentPermissionKeys), ...(payload.permissions || {}) }, currentPermissionKeys, role)
        const accessScope = accessScopeFromPermissions({
          role,
          permissions: basePermissions,
          permissionKeys: currentPermissionKeys,
          businessType,
        })
        try {
          const createStaffCallable = httpsCallable(functions, 'createTeamStaff')
          const createdResponse = await createStaffCallable({
            workspaceId,
            name,
            email,
            username,
            role,
            status,
            businessType: accessScope.businessType,
            selectedWorkspace: accessScope.selectedWorkspace,
            permissions: accessScope.permissions,
            businessKey: accessScope.businessKey,
            enabledModules: accessScope.enabledModules,
            selectedModuleKeys: accessScope.selectedModuleKeys,
            workspaceCode: workspaceDoc?.workspaceCode || workspaceDoc?.teamWorkspaceCode || '',
          })
          const created = createdResponse?.data || {}
          if (!created.success) return { ok: false, error: 'Staff record could not be created.' }
          const staffId = created.staffId
          const workspaceCode = created.workspaceCode
          const staffLoginId = created.staffLoginId
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff invite sent',
            module: 'Team',
            description: `${name} was invited as ${role}.`,
            targetId: staffId,
            targetName: name,
            metadata: { email, username, role, workspaceCode, staffLoginId, authCreated: false, emailSent: created.emailSent === true, emailError: created.emailError || '' },
          })
          return {
            ok: true,
            message: created.emailSent
              ? `Invite email sent. Staff can login with workspace ${workspaceCode} and staff ID ${staffLoginId}.`
              : 'Staff login created, but invitation email could not be sent.',
            emailSent: created.emailSent === true,
            emailError: created.emailError || '',
            workspaceCode,
            staffLoginId,
          }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create staff access.') }
        }
      },
      async setStaffPermission(staffId, key, value) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff permissions.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!functions) return { ok: false, error: 'Team staff service is not available right now.' }
        if (!currentPermissionKeys.some((item) => item.key === key)) return { ok: false, error: 'Unknown permission.' }
        const staffRow = staff.find((item) => item.id === staffId)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(staffId) === ownerId ||
          (String(staffId) === String(userId) && String(staffRow?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf && value === false) {
          return { ok: false, error: 'Workspace owner cannot be disabled or downgraded.' }
        }
        const existing = permissions[staffId] || {}
        const { __businessPermissions, ...existingCurrentPermissions } = existing
        const businessKey = businessPermissionKey(businessType)
        const nextCurrentPermissions = applyPermissionDependencies(
          {
            ...defaultPermissions(currentPermissionKeys),
            ...existingCurrentPermissions,
            [key]: Boolean(value),
          },
          currentPermissionKeys,
          staffRow?.role,
        )
        const profilePatch = accessProfilePatch({
          staffRow,
          staffId,
          workspaceId,
          businessType,
          businessKey,
          permissions: nextCurrentPermissions,
          permissionKeys: currentPermissionKeys,
          userId,
        })
        const syncCallable = httpsCallable(functions, 'syncTeamStaffAccess')
        const accessScope = accessScopeFromPermissions({
          role: staffRow?.role,
          permissions: nextCurrentPermissions,
          permissionKeys: currentPermissionKeys,
          businessType: profilePatch.businessType,
        })
        const response = await syncCallable({
          workspaceId,
          staffId,
          email: staffRow?.email || '',
          role: staffRow?.role || '',
          businessType: accessScope.businessType,
          selectedWorkspace: accessScope.selectedWorkspace,
          businessKey: accessScope.businessKey,
          permissions: accessScope.permissions,
          enabledModules: accessScope.enabledModules,
          selectedModuleKeys: accessScope.selectedModuleKeys,
        })
        if (!response?.data?.success) return { ok: false, error: 'Staff permission was not synced.' }
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Staff permission updated',
          module: 'Team',
          description: `${key} permission ${value ? 'enabled' : 'disabled'} for ${staffRow?.name || staffId}.`,
          targetId: staffId,
          targetName: staffRow?.name || staffId,
          metadata: { permission: key, enabled: Boolean(value) },
        })
        return { ok: true }
      },
      async syncStaffAccess(staffId) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can send staff access.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!functions) return { ok: false, error: 'Team staff service is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        if (!staffRow) return { ok: false, error: 'Staff record was not found.' }
        const existing = permissions[staffId] || {}
        const { __businessPermissions, ...existingCurrentPermissions } = existing
        const businessKey = businessPermissionKey(businessType)
        const nextCurrentPermissions = applyPermissionDependencies(
          {
            ...defaultPermissions(currentPermissionKeys),
            ...permissionsWithModuleFallback(existingCurrentPermissions, staffRow.enabledModules, currentPermissionKeys),
          },
          currentPermissionKeys,
          staffRow?.role,
        )
        const profilePatch = accessProfilePatch({
          staffRow,
          staffId,
          workspaceId,
          businessType,
          businessKey,
          permissions: nextCurrentPermissions,
          permissionKeys: currentPermissionKeys,
          userId,
        })
        const syncCallable = httpsCallable(functions, 'syncTeamStaffAccess')
        const accessScope = accessScopeFromPermissions({
          role: staffRow?.role,
          permissions: nextCurrentPermissions,
          permissionKeys: currentPermissionKeys,
          businessType: profilePatch.businessType,
        })
        const response = await syncCallable({
          workspaceId,
          staffId,
          email: staffRow.email || '',
          role: staffRow.role || '',
          businessType: accessScope.businessType,
          selectedWorkspace: accessScope.selectedWorkspace,
          businessKey: accessScope.businessKey,
          permissions: accessScope.permissions,
          enabledModules: accessScope.enabledModules,
          selectedModuleKeys: accessScope.selectedModuleKeys,
        })
        if (!response?.data?.success) return { ok: false, error: 'Staff access was not synced.' }
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Staff access sent',
          module: 'Team',
          description: `${staffRow.name || staffRow.email || staffId} access was synced to staff login.`,
          targetId: staffId,
          targetName: staffRow.name || staffRow.email || staffId,
          metadata: { enabledModules: profilePatch.enabledModules, email: staffRow.email || '' },
        })
        return { ok: true, message: `Access sent to ${staffRow.name || staffRow.email || 'staff'}.` }
      },
      async resendStaffInvite(staffId) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can resend staff invites.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!functions) return { ok: false, error: 'Team staff service is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        if (!staffRow) return { ok: false, error: 'Staff record was not found.' }
        const email = String(staffRow.email || '').trim().toLowerCase()
        if (!email) return { ok: false, error: 'Staff email is missing.' }

        const rotatePinCallable = httpsCallable(functions, 'rotateTeamStaffPin')
        const rotatedResponse = await rotatePinCallable({ workspaceId, staffId })
        const rotated = rotatedResponse?.data || {}
        if (!rotated.success) return { ok: false, error: 'Staff PIN could not be rotated.' }
        const workspaceCode = rotated.workspaceCode
        const staffLoginId = rotated.staffLoginId
        const inviteEmailPatch = {
          inviteEmailStatus: rotated.emailSent ? 'sent' : 'failed',
          inviteEmailError: rotated.emailSent ? '' : rotated.emailError || 'Email could not be sent.',
          inviteEmailSentAt: rotated.emailSent ? serverTimestamp() : null,
          inviteStatus: 'sent',
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        }
        await Promise.allSettled([
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), inviteEmailPatch, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), inviteEmailPatch, { merge: true }),
          logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: rotated.emailSent ? 'Staff invite email resent' : 'Staff invite email failed',
            module: 'Team',
            description: `${staffRow.name || email} invite email ${rotated.emailSent ? 'resent' : 'failed to resend'}.`,
            targetId: staffId,
            targetName: staffRow.name || email,
            metadata: { email, workspaceCode, staffLoginId, pinRotated: true, emailSent: rotated.emailSent === true, emailError: rotated.emailError || '' },
          }),
        ])
        return rotated.emailSent
          ? { ok: true, message: `Invite email sent. New PIN generated for ${staffLoginId}.`, workspaceCode, staffLoginId, pinRotated: true }
          : { ok: false, error: rotated.emailError || 'Unable to resend invite email.' }
      },
      async setStaffStatus(staffId, status) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff access.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!functions) return { ok: false, error: 'Team staff service is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(staffId) === ownerId ||
          (String(staffId) === String(userId) && String(staffRow?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf) {
          return { ok: false, error: 'Workspace owner cannot be disabled or downgraded.' }
        }
        const nextStatus = String(status || 'active').trim().toLowerCase()
        const statusCallable = httpsCallable(functions, 'updateTeamStaffStatus')
        const response = await statusCallable({ workspaceId, staffId, status: nextStatus })
        if (!response?.data?.success) return { ok: false, error: 'Staff access was not updated.' }
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: nextStatus === 'blocked' ? 'Staff blocked' : 'Staff access updated',
          module: 'Team',
          description: `${staffRow?.name || staffId} access set to ${nextStatus}.`,
          targetId: staffId,
          targetName: staffRow?.name || staffId,
          metadata: { status: nextStatus },
        })
        return { ok: true }
      },
    }),
    [access, businessType, currentPermissionKeys, error, firebaseUser, loading, permissions, plan, staff, userDoc, userId, workspaceDoc, workspaceId],
  )
}
