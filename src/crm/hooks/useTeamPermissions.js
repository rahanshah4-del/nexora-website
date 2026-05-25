import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'

const ROLES = ['Owner', 'Admin', 'Manager', 'Sales Staff', 'Support Agent', 'Accountant']

function emptyMatrix(permissionKeys) {
  const matrix = {}
  for (const role of ROLES) {
    matrix[role] = {}
    for (const key of permissionKeys) matrix[role][key] = false
  }
  return matrix
}

function defaultTemplate(permissionKeys) {
  const matrix = emptyMatrix(permissionKeys)
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
  const { userId } = useUser()
  const [matrix, setMatrix] = useState(() => emptyMatrix(permissionKeys))
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setMatrix(emptyMatrix(permissionKeys))
        setExists(false)
        setLoading(false)
        setSource('none')
        setError('Firestore is not configured.')
      })
      return
    }
    if (!userId) {
      Promise.resolve().then(() => {
        setMatrix(emptyMatrix(permissionKeys))
        setExists(false)
        setLoading(false)
        setSource('firestore')
        setError('')
      })
      return
    }

    const ref = doc(db, 'workspaces', userId, 'teamPermissions', 'default')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setMatrix(emptyMatrix(permissionKeys))
          setExists(false)
        } else {
          const data = snap.data()
          setMatrix(data?.matrix || emptyMatrix(permissionKeys))
          setExists(true)
        }
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load team permissions')
        setMatrix(emptyMatrix(permissionKeys))
        setExists(false)
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [permissionKeys, userId])

  const api = useMemo(
    () => ({
      roles: ROLES,
      matrix,
      exists,
      loading,
      source,
      error,
      toggle(role, permission) {
        setMatrix((prev) => ({
          ...prev,
          [role]: { ...(prev[role] || {}), [permission]: !prev?.[role]?.[permission] },
        }))
      },
      async initializeTemplate() {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const template = defaultTemplate(permissionKeys)
        try {
          await setDoc(
            doc(db, 'workspaces', userId, 'teamPermissions', 'default'),
            {
              matrix: template,
              ownerId: userId,
              userId,
              workspaceId: userId,
              createdAt: serverTimestamp(),
              createdBy: userId,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )
          return { ok: true }
        } catch (e) {
          console.error('[teamPermissions] init failed:', e)
          return { ok: false, error: e?.message || 'Failed to initialize permissions' }
        }
      },
      async save() {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        try {
          await setDoc(
            doc(db, 'workspaces', userId, 'teamPermissions', 'default'),
            { matrix, ownerId: userId, userId, workspaceId: userId, updatedAt: serverTimestamp(), updatedBy: userId },
            { merge: true },
          )
          return { ok: true }
        } catch (e) {
          console.error('[teamPermissions] save failed:', e)
          return { ok: false, error: e?.message || 'Failed to save permissions' }
        }
      },
    }),
    [matrix, exists, loading, source, error, permissionKeys, userId],
  )

  return api
}
