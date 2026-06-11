import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function normalizeRow(row = {}) {
  return {
    id: row.id,
    ...row,
    title: row.title || row.name || row.quoteNumber || 'Untitled',
    status: row.status || 'Open',
  }
}

export function useSalesHubCollection(collectionName, options = {}) {
  const { workspaceId, businessType, userId } = useUser()
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
        setError(clientSafeMessage(err, `Unable to load ${collectionName}.`))
        setRows([])
        setLoading(false)
      },
      { businessType },
    )
    return () => unsubscribe?.()
  }, [businessType, collectionName, enabled, normalize, workspaceId])

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
          const ref = await createUserDoc(workspaceId, collectionName, { ...payload, createdBy: userId }, { businessType })
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
          await patchUserDoc(workspaceId, collectionName, id, payload, { businessType })
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
          await removeUserDoc(workspaceId, collectionName, id)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: clientSafeMessage(error, `Unable to delete ${collectionName}.`) }
        }
      },
    }),
    [businessType, collectionName, error, loading, rows, source, userId, validate, workspaceId],
  )
}
