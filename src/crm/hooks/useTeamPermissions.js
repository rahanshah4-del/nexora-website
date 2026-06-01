import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

const ROLES = ['Owner', 'Admin', 'Manager', 'Sales Staff', 'Support Agent', 'Accountant', 'Custom Role']

function emptyMatrix(permissionKeys) {
  const matrix = {}
  for (const role of ROLES) {
    matrix[role] = {}
    for (const key of permissionKeys) matrix[role][key] = false
  }
  return matrix
}

function normalizeMatrix(matrix, permissionKeys) {
  const normalized = emptyMatrix(permissionKeys)
  for (const role of ROLES) {
    for (const key of permissionKeys) {
      normalized[role][key] = role === 'Owner' ? true : Boolean(matrix?.[role]?.[key])
    }
  }
  return normalized
}

function defaultTemplate(permissionKeys) {
  const matrix = normalizeMatrix(null, permissionKeys)
  for (const role of ['Owner', 'Admin']) {
    for (const key of permissionKeys) matrix[role][key] = true
  }
  // Sensible default: everyone can view reports except Support Agent.
  if (permissionKeys.includes('View Reports')) {
    for (const role of ROLES) matrix[role]['View Reports'] = role !== 'Support Agent'
  }
  return matrix
}

export function useTeamPermissions({ permissionKeys }) {
  const { userId, workspaceId, isAdmin } = useUser()
  const [matrix, setMatrix] = useState(() => emptyMatrix(permissionKeys))
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setMatrix(normalizeMatrix(null, permissionKeys))
        setExists(false)
        setLoading(false)
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setMatrix(normalizeMatrix(null, permissionKeys))
        setExists(false)
        setLoading(false)
        setSource('firestore')
        setError('')
      })
      return
    }

    const ref = doc(db, 'workspaces', workspaceId, 'teamPermissions', 'default')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setMatrix(normalizeMatrix(null, permissionKeys))
          setExists(false)
        } else {
          const data = snap.data()
          setMatrix(normalizeMatrix(data?.matrix, permissionKeys))
          setExists(true)
        }
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load team permissions.'))
        setMatrix(normalizeMatrix(null, permissionKeys))
        setExists(false)
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [permissionKeys, workspaceId])

  const api = useMemo(
    () => ({
      roles: ROLES,
      matrix,
      exists,
      loading,
      source,
      error,
      toggle(role, permission) {
        if (role === 'Owner') return
        setMatrix((prev) => ({
          ...prev,
          [role]: { ...(prev[role] || {}), [permission]: !prev?.[role]?.[permission] },
        }))
      },
      async initializeTemplate() {
        if (!isAdmin) return { ok: false, error: 'Only an owner or admin can initialize permissions.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const template = defaultTemplate(permissionKeys)
        try {
          await setDoc(
            doc(db, 'workspaces', workspaceId, 'teamPermissions', 'default'),
            {
              matrix: template,
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              createdAt: serverTimestamp(),
              createdBy: userId,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to initialize permissions.') }
        }
      },
      async save() {
        if (!isAdmin) return { ok: false, error: 'Only an owner or admin can save permissions.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const nextMatrix = normalizeMatrix(matrix, permissionKeys)
        try {
          await setDoc(
            doc(db, 'workspaces', workspaceId, 'teamPermissions', 'default'),
            { matrix: nextMatrix, ownerId: workspaceId, userId: workspaceId, workspaceId, updatedAt: serverTimestamp(), updatedBy: userId },
            { merge: true },
          )
          setMatrix(nextMatrix)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to save permissions.') }
        }
      },
    }),
    [matrix, exists, loading, source, error, permissionKeys, userId, workspaceId, isAdmin],
  )

  return api
}
