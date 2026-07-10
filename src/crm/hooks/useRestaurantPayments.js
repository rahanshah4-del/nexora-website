/**
 * Firestore-backed Restaurant POS payment ledger hook.
 *
 * workspaceId-scoped collection: workspaces/{workspaceId}/restaurantPayments
 *
 * No existing files modified. No UI changes. No Firestore rules changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  limit as queryLimit,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import {
  calculateRestaurantPaymentTotals,
  createRestaurantPaymentRecord,
  validateRestaurantPaymentRecord,
  buildRestaurantPaymentIdempotencyKey,
} from '../data/restaurantPaymentsData.js'

/* ─── Defaults ─────────────────────────────────────────────────── */

const DEFAULT_LIMIT = 100
const MAXIMUM_LIMIT = 500

/* ─── Simple deterministic string hash ─────────────────────────── */

function hashHex(value) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

/* ─── Document ID from idempotency key ─────────────────────────── */

function paymentDocId(idempotencyKey) {
  return `rp_${hashHex(idempotencyKey)}`
}

/* ─── Build filters for listener ───────────────────────────────── */

function buildFilters({
  orderId,
  invoiceId,
  businessDay,
  status,
  businessType,
  limitCount,
}) {
  const constraints = []

  if (businessType) {
    constraints.push(where('businessType', '==', businessType))
  }
  if (orderId) {
    constraints.push(where('orderId', '==', orderId))
  }
  if (invoiceId) {
    constraints.push(where('invoiceId', '==', invoiceId))
  }
  if (businessDay) {
    constraints.push(where('businessDay', '==', businessDay))
  }
  if (status) {
    constraints.push(where('status', '==', status))
  }

  constraints.push(orderBy('createdAt', 'desc'))

  const safeLimit = Math.min(
    MAXIMUM_LIMIT,
    Math.max(1, Number.isFinite(Number(limitCount)) ? Math.floor(Number(limitCount)) : DEFAULT_LIMIT),
  )
  constraints.push(queryLimit(safeLimit))

  return constraints
}

/* ─── Hook ─────────────────────────────────────────────────────── */

export function useRestaurantPayments(options = {}) {
  const {
    orderId,
    invoiceId,
    businessDay,
    status,
    limitCount = DEFAULT_LIMIT,
    enabled = true,
  } = options

  const {
    userId,
    workspaceId,
    businessType,
    staffId,
    userDoc,
    firebaseUser,
  } = useUser()

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState('none')
  const listenerRef = useRef(null)

  /* ─── Cashier identity (stable, caller-immutable) ───────────── */

  const cashierIdentity = useMemo(() => {
    const cid = String(staffId || userId || '').trim()
    const cname = String(
      userDoc?.name || userDoc?.fullName || firebaseUser?.displayName || firebaseUser?.email || '',
    ).trim()
    return { cashierId: cid, cashierName: cname, hasIdentity: Boolean(cid) }
  }, [staffId, userId, userDoc, firebaseUser])

  /* ─── Can record? ────────────────────────────────────────────── */

  const canRecordPayments = useMemo(() => {
    if (!db) return false
    if (!workspaceId) return false
    if (!userId) return false
    if (!cashierIdentity.hasIdentity) return false
    return true
  }, [workspaceId, userId, cashierIdentity.hasIdentity])

  /* ─── Payment listener ───────────────────────────────────────── */

  useEffect(() => {
    // Cleanup previous listener
    if (listenerRef.current) {
      listenerRef.current()
      listenerRef.current = null
    }

    if (!enabled || !db || !workspaceId) {
      setPayments([])
      setLoading(false)
      setSource(enabled && !db ? 'none' : workspaceId ? 'firestore' : 'none')
      setError(enabled && !db ? 'Secure Cloud Sync is not available right now.' : '')
      return
    }

    const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantPayments')
    if (!collectionPath) {
      setPayments([])
      setLoading(false)
      setSource('none')
      return
    }

    setLoading(true)
    setError('')

    const constraints = buildFilters({
      orderId,
      invoiceId,
      businessDay,
      status,
      businessType,
      limitCount,
    })
    const ref = collection(db, collectionPath)
    const q = query(ref, ...constraints)

    listenerRef.current = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data()?.createdAt || null }))
        setPayments(rows)
        setSource('firestore')
        setLoading(false)
        setError('')
      },
      (err) => {
        console.warn('[useRestaurantPayments] listener error:', err?.code || err?.message || err)
        setPayments([])
        setSource('firestore')
        setLoading(false)
        setError('Unable to load restaurant payments. Check permissions.')
      },
    )

    return () => {
      if (listenerRef.current) {
        listenerRef.current()
        listenerRef.current = null
      }
    }
  }, [enabled, workspaceId, businessType, orderId, invoiceId, businessDay, status, limitCount])

  /* ─── Totals ─────────────────────────────────────────────────── */

  const totals = useMemo(() => calculateRestaurantPaymentTotals(payments), [payments])

  /* ─── Get payment by idempotency key ─────────────────────────── */

  const getPaymentByIdempotencyKey = useCallback(
    (key) => {
      if (!key) return null
      return payments.find((p) => p.idempotencyKey === key) || null
    },
    [payments],
  )

  /* ─── Record payment ─────────────────────────────────────────── */

  const recordPayment = useCallback(
    async (input = {}) => {
      // ── Pre-checks ──────────────────────────────────────────

      if (!db) {
        return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      }
      if (!workspaceId) {
        return { ok: false, error: 'Workspace is not configured.' }
      }
      if (!userId) {
        return { ok: false, error: 'You must be logged in to record a payment.' }
      }
      if (!cashierIdentity.hasIdentity) {
        return {
          ok: false,
          error: 'No authenticated staff or user identity available. Cannot record payment without cashier identity.',
        }
      }

      // ── Build canonical record — caller cashierId is OVERRIDDEN ──
      const record = createRestaurantPaymentRecord({
        ...input,
        workspaceId,
        businessType: businessType || input.businessType,
        cashierId: cashierIdentity.cashierId,
        cashierName: cashierIdentity.cashierName,
        // createdAt/updatedAt set below for persistence
        createdAt: undefined,
        updatedAt: undefined,
      })

      // Add persistence timestamps
      const nowStr = new Date().toISOString()
      record.createdAt = nowStr
      record.updatedAt = nowStr

      // ── Validate ────────────────────────────────────────────
      const validation = validateRestaurantPaymentRecord(record)
      if (!validation.valid) {
        return { ok: false, error: validation.errors.join('; '), validation }
      }

      // ── Deterministic document ID ───────────────────────────
      const id = paymentDocId(record.idempotencyKey)
      const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantPayments')
      const ref = doc(db, collectionPath, id)

      // ── Atomic create-or-return via runTransaction ──────────
      try {
        const result = await runTransaction(db, async (transaction) => {
          const existing = await transaction.get(ref)
          if (existing.exists()) {
            return {
              ok: true,
              created: false,
              duplicate: true,
              payment: { id: existing.id, ...existing.data() },
            }
          }

          transaction.set(ref, record)
          return {
            ok: true,
            created: true,
            duplicate: false,
            payment: { id, ...record },
          }
        })

        return result
      } catch (txError) {
        const code = txError?.code || ''
        const message = txError?.message || ''

        if (code === 'permission-denied') {
          return {
            ok: false,
            error: 'You do not have permission to record restaurant payments.',
          }
        }

        console.warn('[useRestaurantPayments] recordPayment transaction failed:', code, message)
        return {
          ok: false,
          error: 'Unable to record restaurant payment. Please try again.',
        }
      }
    },
    [workspaceId, businessType, userId, cashierIdentity],
  )

  /* ─── Return ─────────────────────────────────────────────────── */

  return useMemo(
    () => ({
      payments,
      loading,
      error,
      source,
      totals,
      canRecordPayments,
      recordPayment,
      getPaymentByIdempotencyKey,
    }),
    [payments, loading, error, source, totals, canRecordPayments, recordPayment, getPaymentByIdempotencyKey],
  )
}
