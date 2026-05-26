import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess, workspacePermissionKeys } from './useWorkspaceAccess.js'

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

export function useStaffPermissions() {
  const { userId, workspaceId } = useUser()
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
        setError(err?.message || 'Failed to load staff')
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
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Firestore is not configured.' }

        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim().toLowerCase()
        const role = String(payload.role || 'staff').trim().toLowerCase()
        if (!name) return { ok: false, error: 'Staff name is required.' }
        if (!email) return { ok: false, error: 'Staff email is required.' }

        const staffId = payload.staffId || `staff-${slug(email) || Date.now()}`
        const basePermissions = { ...defaultPermissions(), ...(payload.permissions || {}) }
        await Promise.all([
          setDoc(
            doc(db, 'workspaces', workspaceId, 'staff', staffId),
            {
              staffId,
              name,
              email,
              role: role === 'admin' ? 'admin' : 'staff',
              status: 'active',
              ownerId: workspaceId,
              workspaceId,
              userId: staffId,
              createdBy: userId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
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
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ])
        return { ok: true }
      },
      async setStaffPermission(staffId, key, value) {
        if (!access.isAdmin && !access.canManageSettings) return { ok: false, error: 'You do not have permission to update staff permissions.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Firestore is not configured.' }
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
        return { ok: true }
      },
    }),
    [access, error, loading, permissions, staff, userId, workspaceId],
  )
}
