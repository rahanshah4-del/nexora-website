import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

function normalizeRow(row = {}) {
  return {
    id: row.id,
    ...row,
    title: row.title || row.name || row.quoteNumber || 'Untitled',
    status: row.status || 'Open',
  }
}

function notificationRoute(collectionName) {
  if (collectionName === 'leads') return '/app/leads'
  if (collectionName === 'tasks') return '/app/follow-ups'
  if (collectionName === 'quotes') return '/app/quotes'
  if (collectionName === 'deals') return '/app/deals'
  return '/app/dashboard'
}

function collectionLabel(collectionName) {
  return String(collectionName || 'record')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (char) => char.toUpperCase())
}

export function useSalesHubCollection(collectionName, options = {}) {
  const { workspaceId, businessType, userId, role } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const normalize = options.normalize || normalizeRow
  const validate = options.validate || (() => '')
  const enabled = options.enabled !== false

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setRows([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }
    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })
    const unsubscribe = subscribeUserCollection(
      workspaceId,
      collectionName,
      (nextRows) => {
        setRows((Array.isArray(nextRows) ? nextRows : []).map(normalize))
        setLoading(false)
      },
      (err) => {
        console.warn('[Sales Hub Firestore Read Failed]', {
          currentUserUid: userId || '',
          role: role || '',
          workspaceId: workspaceId || '',
          collectionPath: workspaceId ? `workspaces/${workspaceId}/${collectionName}` : '',
          collectionName,
          firestoreErrorCode: err?.code || err?.originalError?.code || 'unknown',
        })
        setError(clientSafeMessage(err, `Unable to load ${collectionName}.`))
        setRows([])
        setLoading(false)
      },
      { businessType, diagnostics: { currentUserUid: userId, role } },
    )
    return () => unsubscribe?.()
  }, [businessType, collectionName, enabled, normalize, role, userId, workspaceId])

  return useMemo(
    () => ({
      rows,
      loading,
      source,
      error,
      async createRow(payload) {
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const message = validate(payload)
        if (message) return { ok: false, error: message }
        try {
          const ref = await createUserDoc(workspaceId, collectionName, { ...payload, createdBy: userId }, { businessType, diagnostics: { currentUserUid: userId, role } })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: collectionLabel(collectionName),
            priority: 'low',
            title: `${collectionLabel(collectionName)} created`,
            message: `${payload.title || payload.name || payload.quoteNumber || 'Record'} was created.`,
            relatedId: ref.id,
            route: notificationRoute(collectionName),
            createdBy: userId,
          })
          return { ok: true, id: ref.id }
        } catch (error) {
          return { ok: false, error: clientSafeMessage(error, `Unable to save ${collectionName}.`) }
        }
      },
      async updateRow(id, payload) {
        if (!id) return { ok: false, error: 'Record ID is required' }
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const message = validate(payload)
        if (message) return { ok: false, error: message }
        try {
          await patchUserDoc(workspaceId, collectionName, id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: collectionLabel(collectionName),
            priority: 'low',
            title: `${collectionLabel(collectionName)} updated`,
            message: `${payload.title || payload.name || payload.quoteNumber || 'Record'} was updated.`,
            relatedId: id,
            route: notificationRoute(collectionName),
            createdBy: userId,
          })
          return { ok: true }
        } catch (error) {
          return { ok: false, error: clientSafeMessage(error, `Unable to update ${collectionName}.`) }
        }
      },
      async deleteRow(id) {
        if (!id) return { ok: false, error: 'Record ID is required' }
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, collectionName, id, { diagnostics: { currentUserUid: userId, role } })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: collectionLabel(collectionName),
            priority: 'low',
            title: `${collectionLabel(collectionName)} deleted`,
            message: 'Record was deleted.',
            relatedId: id,
            route: notificationRoute(collectionName),
            createdBy: userId,
          })
          return { ok: true }
        } catch (error) {
          return { ok: false, error: clientSafeMessage(error, `Unable to delete ${collectionName}.`) }
        }
      },
    }),
    [businessType, collectionName, error, loading, role, rows, source, userId, validate, workspaceId],
  )
}
