import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function normalizeLog(l) {
  const createdAt = toDateValue(l.createdAt)
  return {
    id: l.id,
    userId: l.userId || '',
    userEmail: l.userEmail || '',
    userName: l.userName || '—',
    module: l.module || 'System',
    action: l.action || 'Action',
    description: l.description || '',
    priority: l.priority || 'low',
    createdAt,
    createdAtLabel: createdAt ? createdAt.toISOString().slice(0, 10) : '—',
    metadata: l.metadata || {},
  }
}

export function useActivityLogs() {
  const { workspaceId } = useUser()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setLogs([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setLogs([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    const unsub = subscribeUserCollection(
      workspaceId,
      'activityLogs',
      (rows) => {
        const list = (Array.isArray(rows) ? rows : []).map(normalizeLog).sort((a, b) => {
          const at = a.createdAt?.getTime?.() || 0
          const bt = b.createdAt?.getTime?.() || 0
          return bt - at
        })
        setLogs(list)
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load activity logs.'))
        setLogs([])
        setSource('firestore')
        setLoading(false)
      },
    )

    return () => unsub?.()
  }, [workspaceId])

  const api = useMemo(
    () => ({
      logs,
      loading,
      source,
      error,
    }),
    [logs, loading, source, error],
  )

  return api
}
