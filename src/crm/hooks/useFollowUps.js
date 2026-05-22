import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeCollection } from '../lib/firestore.js'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useUser } from './useUser.js'

export function useFollowUps() {
  const { userId } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeCollection(
      'tasks',
      (data) => {
        setRows(Array.isArray(data) ? data : [])
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load tasks')
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

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
        if (!db) return { ok: false, error: 'Firestore is not configured' }

        const clean = {
          ...payload,
          customerName: String(payload.customerName || '').trim(),
          email: String(payload.email || '').trim(),
          type: payload.type || 'WhatsApp',
          priority: payload.priority || 'Medium',
          status: payload.status || 'Upcoming',
          userId,
          createdAt: serverTimestamp(),
        }
        if (!clean.customerName) return { ok: false, error: 'Customer name is required' }
        if (!clean.dueDate) return { ok: false, error: 'Due date is required' }

        try {
          await addDoc(collection(db, 'tasks'), clean)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create task' }
        }
      },
    }),
    [rows, grouped, loading, source, error, userId],
  )

  return api
}
