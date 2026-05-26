import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'

export const workspacePermissionKeys = [
  { key: 'followUpEdit', label: 'Follow-Up Edit' },
  { key: 'followUpDelete', label: 'Follow-Up Delete' },
  { key: 'customerManagement', label: 'Customer Management' },
  { key: 'leadsManagement', label: 'Leads Management' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'reports', label: 'Reports' },
  { key: 'hrDashboard', label: 'HR Dashboard' },
  { key: 'settingsAccess', label: 'Settings Access' },
]

function emptyPermissions() {
  return Object.fromEntries(workspacePermissionKeys.map((item) => [item.key, false]))
}

export function useWorkspaceAccess() {
  const { userId, workspaceId, staffId, role, isAdmin, isOwner, isStaff } = useUser()
  const [permissions, setPermissions] = useState(() => emptyPermissions())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !workspaceId || !userId) {
      Promise.resolve().then(() => {
        setPermissions(emptyPermissions())
        setLoading(false)
      })
      return
    }

    if (!isStaff) {
      Promise.resolve().then(() => {
        setPermissions(Object.fromEntries(workspacePermissionKeys.map((item) => [item.key, true])))
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
        setPermissions({ ...emptyPermissions(), ...(snap.exists() ? snap.data() : {}) })
        setLoading(false)
      },
      () => {
        setPermissions(emptyPermissions())
        setLoading(false)
      },
    )
    return () => unsub()
  }, [isStaff, staffId, userId, workspaceId])

  return useMemo(
    () => ({
      role,
      userId,
      workspaceId,
      staffId,
      isOwner,
      isAdmin,
      isStaff,
      loading,
      permissions,
      canManageSettings: isAdmin || Boolean(permissions.settingsAccess),
      canEditFollowUps: isAdmin || Boolean(permissions.followUpEdit),
      canDeleteFollowUps: isAdmin || Boolean(permissions.followUpDelete),
      canAccessHr: isAdmin || Boolean(permissions.hrDashboard),
      hasPermission(key) {
        return isAdmin || Boolean(permissions[key])
      },
    }),
    [isAdmin, isOwner, isStaff, loading, permissions, role, staffId, userId, workspaceId],
  )
}
