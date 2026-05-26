import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, limit, onSnapshot, query, updateDoc, where, writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
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

function formatTimeAgo(date) {
  if (!date) return '—'
  const diffMs = Date.now() - date.getTime()
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function normalizeNotification(n) {
  const createdAt = toDateValue(n.createdAt)
  return {
    id: n.id,
    userId: n.userId ?? '',
    type: n.type ?? 'System',
    title: n.title ?? 'Notification',
    message: n.message ?? '',
    priority: n.priority ?? 'low',
    read: Boolean(n.read),
    createdAt,
    timeLabel: formatTimeAgo(createdAt),
    relatedId: n.relatedId ?? null,
  }
}

export function useNotifications() {
  const { userId } = useUser()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const lastSeenTopIdRef = useRef(null)

  useEffect(() => {
    if (!db || !userId) {
      lastSeenTopIdRef.current = null
      Promise.resolve().then(() => {
        setItems([])
        setSource(db ? 'firestore' : 'none')
        if (!db) setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    const ref = collection(db, 'notifications')
    // Avoid composite index requirement: do not combine `where + orderBy`.
    // Sort client-side by `createdAt` desc.
    const q = query(ref, where('userId', '==', userId), limit(50))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => normalizeNotification({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const at = a.createdAt?.getTime?.() || 0
            const bt = b.createdAt?.getTime?.() || 0
            return bt - at
          })
        const list = rows

        // Track latest item id for "new notification" detection.
        const topId = list[0]?.id ?? null
        if (lastSeenTopIdRef.current === null) lastSeenTopIdRef.current = topId

        setItems(list)
        setSource(rows.length ? 'firestore' : 'empty')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load notifications.'))
        setItems([])
        setSource('firestore')
        setLoading(false)
      },
    )

    return () => unsub()
  }, [userId])

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const api = useMemo(
    () => ({
      items,
      loading,
      source,
      error,
      unreadCount,
      hasNewSinceLastSeen() {
        const topId = items[0]?.id ?? null
        if (!topId) return false
        return lastSeenTopIdRef.current && topId !== lastSeenTopIdRef.current
      },
      markDropdownSeen() {
        const topId = items[0]?.id ?? null
        lastSeenTopIdRef.current = topId
      },
      async markAsRead(id) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        if (!db || source !== 'firestore') return
        await updateDoc(doc(db, 'notifications', id), { read: true })
      },
      async markAllRead() {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })))
        if (!db || source !== 'firestore') return
        const batch = writeBatch(db)
        items.filter((n) => !n.read).forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }))
        await batch.commit()
      },
      async clearAll() {
        setItems([])
        if (!db || source !== 'firestore') return
        const batch = writeBatch(db)
        items.forEach((n) => batch.delete(doc(db, 'notifications', n.id)))
        await batch.commit()
      },
    }),
    [items, loading, source, error, unreadCount],
  )

  return api
}
