import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

export function useFollowUps() {
  const { userId, workspaceId } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
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

    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeUserCollection(
      workspaceId,
      'tasks',
      (data) => {
        setRows(Array.isArray(data) ? data : [])
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load follow-ups.'))
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [workspaceId])

  const grouped = useMemo(() => {
    const buckets = { Today: [], Upcoming: [], Overdue: [], Completed: [] }
    for (const t of rows) {
      const s = t.status || 'Upcoming'
      if (!buckets[s]) buckets[s] = []
      buckets[s].push(t)
    }
    return buckets
  }, [rows])

  const api = useMemo(
    () => ({
      tasks: rows,
      grouped,
      loading,
      source,
      error,
      async createTask(payload) {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }

        const clean = {
          ...payload,
          customerName: String(payload.customerName || '').trim(),
          email: String(payload.email || '').trim(),
          type: payload.type || 'WhatsApp',
          priority: payload.priority || 'Medium',
          status: payload.status || 'Upcoming',
        }
        if (!clean.customerName) return { ok: false, error: 'Customer name is required' }
        if (!clean.dueDate) return { ok: false, error: 'Due date is required' }

        try {
          await createUserDoc(workspaceId, 'tasks', { ...clean, createdBy: userId })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create follow-up.') }
        }
      },
      async updateTask(id, payload) {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!id) return { ok: false, error: 'Follow-up ID is required' }

        const clean = {
          ...payload,
          customerName: String(payload.customerName || '').trim(),
          email: String(payload.email || '').trim(),
          type: payload.type || 'WhatsApp',
          priority: payload.priority || 'Medium',
          status: payload.status || 'Upcoming',
          updatedBy: userId,
        }
        if (!clean.customerName) return { ok: false, error: 'Customer name is required' }
        if (!clean.dueDate) return { ok: false, error: 'Due date is required' }

        try {
          await patchUserDoc(workspaceId, 'tasks', id, clean)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update follow-up.') }
        }
      },
      async deleteTask(id) {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!id) return { ok: false, error: 'Follow-up ID is required' }
        try {
          await removeUserDoc(workspaceId, 'tasks', id)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete follow-up.') }
        }
      },
    }),
    [rows, grouped, loading, source, error, userId, workspaceId],
  )

  return api
}
