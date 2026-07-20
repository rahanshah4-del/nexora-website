import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function timeMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function isWaitingCryptoCheckout(row = {}) {
  const safe = row || {}
  // Crypto checkouts auto-created by the payments worker before any payment is made.
  // These should not appear on the workspace timeline until actual payment activity occurs —
  // otherwise every "Pay with Crypto" click creates a zombie "pending" request.
  const paymentStatus = String(safe.paymentStatus || '').toLowerCase()
  const status = String(safe.status || '').toLowerCase()
  if (paymentStatus === 'waiting' || status === 'waiting') return true
  // Also exclude requests that have a NOWPayments order ID but never received any payment callback
  if (safe.nowPaymentsOrderId && !safe.nowPaymentsPaymentId && paymentStatus !== 'processing' && paymentStatus !== 'paid' && paymentStatus !== 'confirmed' && paymentStatus !== 'finished' && paymentStatus !== 'partially_paid') return true
  return false
}

function isStaleRequest(row = {}) {
  const safe = row || {}
  // Exclude requests with no actual payment data — these are abandoned checkouts or
  // empty submissions with no transaction proof
  const hasTransactionId = Boolean(String(safe.transactionId || '').trim())
  const hasPaymentProof = Boolean(String(safe.screenshotUrl || safe.screenshotKey || safe.paymentProof || '').trim())
  const hasCryptoPayment = Boolean(String(safe.nowPaymentsPaymentId || '').trim())
  const hasActualPayment = hasTransactionId || hasPaymentProof || hasCryptoPayment
  if (!hasActualPayment) {
    const createdMs = timeMs(safe.createdAt)
    const ageHours = createdMs ? (Date.now() - createdMs) / 3600000 : 0
    // Allow up to 2 hours for the user to complete payment; hide stale requests after that
    if (ageHours > 2) return true
  }
  return false
}

const CLOSED_STATUSES = ['approved', 'paid', 'active', 'completed', 'rejected', 'declined', 'failed', 'closed', 'expired', 'canceled', 'cancelled']

function requestStatus(row = {}) {
  const safe = row || {}
  return String(safe.approvalStatus || safe.status || safe.paymentStatus || 'pending').toLowerCase()
}

export function latestRelevantUpgrade(rows = []) {
  // Sort newest first
  const sorted = [...rows].sort((a, b) => (
    timeMs(b.createdAt || b.updatedAt || b.approvedAt || b.rejectedAt) -
    timeMs(a.createdAt || a.updatedAt || a.approvedAt || a.rejectedAt)
  ))
  // Find the first open request that has actual payment activity (not a stale/empty checkout)
  return sorted.find((row) => {
    if (isWaitingCryptoCheckout(row)) return false
    if (isStaleRequest(row)) return false
    if (CLOSED_STATUSES.includes(requestStatus(row))) return false
    return true
  }) || null
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
