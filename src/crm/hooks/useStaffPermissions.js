import { useEffect, useMemo, useState } from 'react'
import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, firebaseConfig, firebaseEnabled } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess, workspacePermissionKeys } from './useWorkspaceAccess.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'

function defaultPermissions() {
  return Object.fromEntries(workspacePermissionKeys.map((item) => [item.key, false]))
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
  return 'staff'
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
  const { userId, workspaceId, userDoc, firebaseUser, plan } = useUser()
  const access = useWorkspaceAccess()
  const [staff, setStaff] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !userId) {
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
        setPermissions(Object.fromEntries(snap.docs.map((item) => [item.id, { ...defaultPermissions(), ...item.data() }])))
      },
      () => setPermissions({}),
    )

    return () => {
      unsubStaff()
      unsubPermissions()
    }
  }, [userId, workspaceId])

  return useMemo(
    () => ({
      staff,
      permissions,
      loading,
      error,
      canManage: access.isAdmin || access.canManageSettings,
      permissionKeys: workspacePermissionKeys,
      async createStaff(payload) {
        if (!access.isAdmin && !access.canManageSettings) return { ok: false, error: 'You do not have permission to create staff.' }
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
        const basePermissions = { ...defaultPermissions(), ...(payload.permissions || {}) }
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
        if (!access.isAdmin && !access.canManageSettings) return { ok: false, error: 'You do not have permission to update staff permissions.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!workspacePermissionKeys.some((item) => item.key === key)) return { ok: false, error: 'Unknown permission.' }
        const staffRow = staff.find((item) => item.id === staffId)
        await setDoc(
          doc(db, 'workspaces', workspaceId, 'permissions', staffId),
          {
            [key]: Boolean(value),
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
    }),
    [access, error, firebaseUser, loading, permissions, plan, staff, userDoc, userId, workspaceId],
  )
}
