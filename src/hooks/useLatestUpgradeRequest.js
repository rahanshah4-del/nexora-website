import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function timeMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function requestStatus(row = {}) {
  const safe = row || {}
  return String(safe.approvalStatus || safe.status || safe.paymentStatus || 'pending').toLowerCase()
}

export function latestRelevantUpgrade(rows = []) {
  const sorted = [...rows].sort((a, b) => (
    timeMs(b.createdAt || b.updatedAt || b.approvedAt || b.rejectedAt) -
    timeMs(a.createdAt || a.updatedAt || a.approvedAt || a.rejectedAt)
  ))
  return sorted.find((row) => !['approved', 'paid', 'active', 'completed', 'rejected', 'declined', 'failed', 'closed'].includes(requestStatus(row))) || sorted[0] || null
}

export default function useLatestUpgradeRequest(userId, enabled = true) {
  const [request, setRequest] = useState(null)
  const [timelineEntries, setTimelineEntries] = useState([])
  const [supportTickets, setSupportTickets] = useState([])

  useEffect(() => {
    if (!db || !userId || !enabled) {
      setRequest(null)
      setTimelineEntries([])
      setSupportTickets([])
      return undefined
    }
    const q = query(collection(db, 'upgradeRequests'), where('userId', '==', userId), limit(20))
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setRequest(latestRelevantUpgrade(rows))
      },
      () => setRequest(null),
    )
  }, [enabled, userId])

  useEffect(() => {
    if (!db || !request?.id) {
      setTimelineEntries([])
      return undefined
    }
    const q = query(collection(db, 'upgradeRequests', request.id, 'timeline'), orderBy('createdAt', 'desc'), limit(8))
    return onSnapshot(
      q,
      (snap) => setTimelineEntries(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      () => setTimelineEntries([]),
    )
  }, [request?.id])

  useEffect(() => {
    const workspaceId = request?.workspaceId || request?.ownerId || request?.userId || ''
    if (!db || !request?.id || !workspaceId) {
      setSupportTickets([])
      return undefined
    }
    const q = query(collection(db, 'workspaces', workspaceId, 'supportTickets'), where('upgradeRequestId', '==', request.id), limit(5))
    return onSnapshot(
      q,
      (snap) => setSupportTickets(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      () => setSupportTickets([]),
    )
  }, [request?.id, request?.ownerId, request?.userId, request?.workspaceId])

  return request ? { ...request, timelineEntries, supportTickets } : null
}
