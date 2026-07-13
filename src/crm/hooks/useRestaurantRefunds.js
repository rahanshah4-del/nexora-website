import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { clientSafeMessage } from '../utils/messages.js'
import { db } from '../lib/firebase.js'
import { listenToWorkspaceCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import {
  createRestaurantRefundRecord,
  validateRestaurantRefundRecord,
} from '../data/restaurantRefundsData.js'

/* ─── Deterministic refund ID (djb2 hash) ──────────────────────── */

function hashRefundKey(workspaceId, orderId, refundType, refundTotal, businessDay) {
  const str = `${workspaceId}:${orderId}:${refundType}:${refundTotal}:${businessDay || ''}`
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return 'ref_' + Math.abs(hash >>> 0).toString(36)
}

/* ─── Constants ────────────────────────────────────────────────── */

const DEFAULT_LIMIT = 100
const MAXIMUM_LIMIT = 500

/* ─── Hook: useRestaurantRefunds ────────────────────────────────── */

export function useRestaurantRefunds(options = {}) {
  const { workspaceId, firebaseUser } = useUser()
  const enabled = options.enabled !== false

  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const submittingRef = useRef(false)

  /* ── Computed filters ──────────────────────────────────────── */

  const whereFilters = useMemo(() => {
    const filters = []
    if (options.orderId) filters.push(['orderId', '==', options.orderId])
    if (options.customerId) filters.push(['customerId', '==', options.customerId])
    if (options.refundType) filters.push(['refundType', '==', options.refundType])
    if (options.approvalStatus) filters.push(['approvalStatus', '==', options.approvalStatus])
    if (options.businessDay) filters.push(['businessDay', '==', options.businessDay])
    return filters
  }, [options.orderId, options.customerId, options.refundType, options.approvalStatus, options.businessDay])

  const limitCount = useMemo(() => {
    const count = Number(options.limitCount) || DEFAULT_LIMIT
    return Math.min(Math.max(1, count), MAXIMUM_LIMIT)
  }, [options.limitCount])

  /* ── Listener ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!enabled) {
      setRefunds([])
      setLoading(false)
      setError('')
      return
    }
    if (!db) {
      setSource('none')
      setError('Firestore is not available.')
      setRefunds([])
      setLoading(false)
      return
    }
    if (!workspaceId) {
      setError('Workspace is required.')
      setRefunds([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setSource('firestore')

    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'restaurantRefunds',
      businessType: options.businessType || '',
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
      whereFilters,
      onData: (rows) => {
        setRefunds(Array.isArray(rows) ? rows : [])
        setLoading(false)
      },
      onError: (err) => {
        setError(clientSafeMessage(err, 'Unable to load refunds.'))
        setRefunds([])
        setLoading(false)
      },
    })

    return () => unsub?.()
  }, [enabled, workspaceId, limitCount, whereFilters, options.businessType])

  /* ── Totals ─────────────────────────────────────────────────── */

  const totals = useMemo(() => {
    if (!refunds.length) {
      return { count: 0, totalAmount: 0, byType: {}, byStatus: {} }
    }

    const byType = {}
    const byStatus = {}
    let totalAmount = 0

    for (const r of refunds) {
      const amount = Number(r.refundTotal) || 0
      totalAmount += amount

      const type = r.refundType || 'unknown'
      byType[type] = (byType[type] || 0) + amount

      const status = r.status || 'unknown'
      byStatus[status] = (byStatus[status] || 0) + 1
    }

    return { count: refunds.length, totalAmount, byType, byStatus }
  }, [refunds])

  /* ── canCreateRefund ────────────────────────────────────────── */

  const canCreateRefund = Boolean(db && workspaceId && firebaseUser)

  /* ── computeRefundId ────────────────────────────────────────── */

  const computeRefundId = useCallback(
    (orderId, refundType, refundTotal, businessDay) => {
      return hashRefundKey(workspaceId, orderId, refundType, refundTotal, businessDay)
    },
    [workspaceId],
  )

  /* ── getRefund ──────────────────────────────────────────────── */

  const getRefund = useCallback(
    async (refundId) => {
      if (!db || !workspaceId || !refundId) return null
      try {
        const ref = doc(db, `workspaces/${workspaceId}/restaurantRefunds/${refundId}`)
        const snap = await getDoc(ref)
        if (!snap.exists()) return null
        return { id: snap.id, ...snap.data() }
      } catch {
        return null
      }
    },
    [workspaceId],
  )

  /* ── recordRefund ───────────────────────────────────────────── */

  const recordRefund = useCallback(
    async (input = {}, options = {}) => {
      // ── Workspace / auth guards ──────────────────────────────
      if (!workspaceId) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'Workspace is required.' }
      }
      if (!firebaseUser) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'Authentication required.' }
      }
      if (!input.orderId) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'orderId is required.' }
      }
      if (!Array.isArray(input.paymentIds) || !input.paymentIds.length) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'At least one paymentId is required.' }
      }
      const refundAmount = Number(input.refundTotal) || Number(input.requestedRefundAmount) || 0
      if (refundAmount <= 0) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'Refund amount must be greater than zero.' }
      }

      // ── Payments to reverse (only for full refunds) ────────────
      const paymentsToReverse = Array.isArray(options?.paymentsToReverse)
        ? options.paymentsToReverse.filter(Boolean)
        : []

      // ── Capture original order snapshot (used for local order update) ──
      const orderSnapshot = options?.orderSnapshot || {}

      // ── Identity override — cashier MUST come from auth only ──
      const safeInput = {
        ...input,
        workspaceId,
        cashierId: firebaseUser.uid,
        cashierName: input.cashierName || firebaseUser?.displayName || '',
      }

      // ── Normalize ────────────────────────────────────────────
      const record = createRestaurantRefundRecord(safeInput)

      // ── Validate ─────────────────────────────────────────────
      const validation = validateRestaurantRefundRecord(record)
      if (!validation.valid) {
        return { ok: false, created: false, duplicate: false, refund: null, error: validation.errors.join('; ') }
      }

      // ── Double-click guard ───────────────────────────────────
      if (submittingRef.current) {
        return { ok: false, created: false, duplicate: false, refund: null, error: 'Already submitting.' }
      }
      submittingRef.current = true

      try {
        // ── Deterministic refund ID ──────────────────────────────
        const refundId = hashRefundKey(
          workspaceId,
          record.orderId,
          record.refundType,
          record.refundTotal,
          record.businessDay,
        )

        const refundPath = `workspaces/${workspaceId}/restaurantRefunds/${refundId}`
        const refundRef = doc(db, refundPath)

        // ── Firestore transaction (refund + payment reversals) ──
        const result = await runTransaction(db, async (txn) => {
          // Duplicate check
          const existingSnap = await txn.get(refundRef)
          if (existingSnap.exists()) {
            return { created: false, duplicate: true, refund: { id: existingSnap.id, ...existingSnap.data() }, reversals: [] }
          }

          // Reverse each payment inside the same transaction
          const reversals = []
          for (const p of paymentsToReverse) {
            const paymentPath = `workspaces/${workspaceId}/restaurantPayments/${p.paymentId}`
            const paymentRef = doc(db, paymentPath)
            const paymentSnap = await txn.get(paymentRef)

            if (!paymentSnap.exists()) {
              throw new Error(`Payment ${p.paymentId} not found. Refund cancelled.`)
            }

            const paymentData = paymentSnap.data()
            if (paymentData?.status === 'reversed') {
              throw new Error(`Payment ${p.paymentId} is already reversed. Cannot refund the same payment twice.`)
            }

            txn.update(paymentRef, {
              status: 'reversed',
              reversedAt: serverTimestamp(),
              reversedBy: firebaseUser.uid,
              reversedByRefundId: refundId,
              notes: (paymentData?.notes || '') + ` | Reversed by refund ${refundId}`,
              updatedAt: serverTimestamp(),
            })

            reversals.push({ paymentId: p.paymentId, amount: p.amount, reversed: true })
          }

          // Create refund record
          txn.set(refundRef, {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          return {
            created: true,
            duplicate: false,
            refund: { id: refundId, ...record },
            reversals,
          }
        })

        return { ok: true, ...result, orderSnapshot }
      } catch (err) {
        return {
          ok: false,
          created: false,
          duplicate: false,
          refund: null,
          error: clientSafeMessage(err, 'Unable to record refund.'),
        }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, firebaseUser],
  )

  /* ── Memoized return ────────────────────────────────────────── */

  return useMemo(
    () => ({
      refunds,
      loading,
      error,
      totals,
      source,
      canCreateRefund,
      recordRefund,
      getRefund,
      computeRefundId,
    }),
    [refunds, loading, error, source, totals, canCreateRefund, recordRefund, getRefund, computeRefundId],
  )
}
