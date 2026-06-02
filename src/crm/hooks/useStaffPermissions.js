import { useEffect, useMemo, useState } from 'react'
import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, firebaseConfig, firebaseEnabled } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess, workspacePermissionKeysForBusiness } from './useWorkspaceAccess.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { businessPermissionKey, mapLegacyPermissionToModule, normalizeBusinessType } from '../data/moduleAccess.js'

function defaultPermissions(permissionKeys) {
  return Object.fromEntries(permissionKeys.map((item) => [item.key, false]))
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeStaffRole(role) {
  const value = String(role || 'staff').trim().toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'accountant') return 'accountant'
  if (value === 'manager') return 'manager'
  if (value === 'support' || value === 'support agent') return 'support'
  if (value === 'sales' || value === 'sales staff' || value === 'staff') return 'sales'
  return 'staff'
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
  if (row.businessPermissions && typeof row.businessPermissions === 'object') {
    return { ...normalizePermissionSet(row.businessPermissions[key] || {}, permissionKeys), __businessPermissions: row.businessPermissions }
  }
  return key === 'general-crm' ? { ...normalizePermissionSet(row, permissionKeys), __businessPermissions: {} } : { ...defaultPermissions(permissionKeys), __businessPermissions: {} }
}

function rootPermissionUnion(existing = {}, nextBusinessPermissions = {}, permissionKeys = []) {
  const merged = defaultPermissions(permissionKeys)
  for (const key of permissionKeys.map((item) => item.key)) {
    merged[key] = Boolean(existing[key])
  }
  for (const permissions of Object.values(nextBusinessPermissions || {})) {
    for (const key of permissionKeys.map((item) => item.key)) {
      merged[key] = Boolean(merged[key] || permissions?.[key])
    }
  }
  return merged
}

async function createSecondaryAuthUser(email, password) {
  if (!firebaseEnabled) return { ok: false, error: 'Secure account creation is not available right now.' }
  const secondaryApp = initializeApp(firebaseConfig, `staff-create-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await signOut(secondaryAuth).catch(() => {})
    return { ok: true, uid: credentials.user.uid }
  } catch (error) {
    return { ok: false, error: clientSafeMessage(error, 'Unable to create staff account.') }
  } finally {
    await deleteApp(secondaryApp).catch(() => {})
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

        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim().toLowerCase()
        const username = String(payload.username || '').trim()
        const usernameLower = username.toLowerCase()
        const password = String(payload.password || '')
        const confirmPassword = String(payload.confirmPassword || '')
        const role = normalizeStaffRole(payload.role)
        const status = String(payload.status || 'active').trim().toLowerCase() || 'active'
        if (!name) return { ok: false, error: 'Staff name is required.' }
        if (!email) return { ok: false, error: 'Staff email is required.' }
        if (!password) return { ok: false, error: 'Password is required.' }
        if (password !== confirmPassword) return { ok: false, error: 'Passwords do not match.' }
        if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

        const authResult = await createSecondaryAuthUser(email, password)
        const staffId = authResult.uid || payload.staffId || `staff-${slug(email) || Date.now()}`
        const basePermissions = { ...defaultPermissions(currentPermissionKeys), ...(payload.permissions || {}) }
        const businessKey = businessPermissionKey(businessType)
        const now = serverTimestamp()
        const baseStaff = {
          uid: staffId,
          staffId,
          name,
          email,
          username,
          usernameLower,
          role,
          status,
          permissions: basePermissions,
          businessType: normalizeBusinessType(businessType),
          businessPermissions: { [businessKey]: basePermissions },
          ownerId: workspaceId,
          companyId: workspaceId,
          workspaceId,
          userId: staffId,
          createdBy: userId,
          passwordSetPending: false,
          authCreated: authResult.ok,
          createdAt: now,
          updatedAt: now,
        }

        const writes = [
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), baseStaff, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), baseStaff, { merge: true }),
          setDoc(
            doc(db, 'workspaces', workspaceId, 'permissions', staffId),
            {
              ...basePermissions,
              businessType: normalizeBusinessType(businessType),
              businessPermissions: { [businessKey]: basePermissions },
              staffId,
              email,
              ownerId: workspaceId,
              workspaceId,
              userId: staffId,
              updatedBy: userId,
              updatedAt: now,
            },
            { merge: true },
          ),
        ]

        if (authResult.ok) {
          writes.push(
            setDoc(
              doc(db, 'users', staffId),
              {
                uid: staffId,
                name,
                fullName: name,
                email,
                username,
                usernameLower,
                role,
                status,
                createdBy: userId,
                ownerId: workspaceId,
                companyId: workspaceId,
                workspaceId,
                userId: staffId,
                staffId,
                permissions: basePermissions,
                businessPermissions: { [businessKey]: basePermissions },
                plan: userDoc?.plan || plan || 'Free',
                planStatus: userDoc?.planStatus || 'active',
                billingCycle: userDoc?.billingCycle || 'monthly',
                provider: 'password',
                createdAt: now,
                updatedAt: now,
              },
              { merge: true },
            ),
          )
        }

        await Promise.all([
          ...writes,
          logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff created',
            module: 'Team',
            description: `${name} was added as ${role}.`,
            targetId: staffId,
            targetName: name,
            metadata: { email, username, role, authCreated: authResult.ok },
          }),
        ])
        return {
          ok: true,
          message: authResult.ok
            ? 'Staff account created. Staff can log in with email and password.'
            : 'Staff account saved. Full login activation may require account approval.',
        }
      },
      async setStaffPermission(staffId, key, value) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff permissions.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
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
        const existingBusinessPermissions = __businessPermissions || staffRow?.businessPermissions || {}
        const nextBusinessPermissions = {
          ...existingBusinessPermissions,
          [businessKey]: {
            ...defaultPermissions(currentPermissionKeys),
            ...existingCurrentPermissions,
            [key]: Boolean(value),
          },
        }
        await setDoc(
          doc(db, 'workspaces', workspaceId, 'permissions', staffId),
          {
            ...rootPermissionUnion(existing, nextBusinessPermissions, currentPermissionKeys),
            businessType: normalizeBusinessType(businessType),
            businessPermissions: nextBusinessPermissions,
            staffId,
            email: staffRow?.email || '',
            ownerId: workspaceId,
            workspaceId,
            userId: staffId,
            updatedBy: userId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
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
      async setStaffStatus(staffId, status) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff access.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(staffId) === ownerId ||
          (String(staffId) === String(userId) && String(staffRow?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf) {
          const now = serverTimestamp()
          await Promise.all([
            setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), { role: 'owner', status: 'active', updatedAt: now, updatedBy: userId }, { merge: true }),
            setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), { role: 'Owner', status: 'Active', updatedAt: now, updatedBy: userId }, { merge: true }),
            setDoc(doc(db, 'users', staffId), { role: 'owner', status: 'active', updatedAt: now, updatedBy: userId }, { merge: true }),
          ])
          return { ok: false, error: 'Workspace owner cannot be disabled or downgraded.' }
        }
        const nextStatus = String(status || 'active').trim().toLowerCase()
        const now = serverTimestamp()
        await Promise.all([
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          setDoc(doc(db, 'users', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          logActivity({
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
          }),
        ])
        return { ok: true }
      },
    }),
    [access, businessType, currentPermissionKeys, error, firebaseUser, loading, permissions, plan, staff, userDoc, userId, workspaceDoc, workspaceId],
  )
}
