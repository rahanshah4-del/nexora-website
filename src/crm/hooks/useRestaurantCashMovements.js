/**
 * Firestore-backed Restaurant POS cash movement ledger hook.
 *
 * workspaceId-scoped collection: workspaces/{workspaceId}/restaurantCashMovements
 *
 * Tracks deposits, withdrawals, cash expenses, and cash adjustments
 * that affect the physical cash drawer during a shift.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
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
  createRestaurantCashMovementRecord,
  validateRestaurantCashMovement,
  calculateRestaurantCashMovementTotals,
} from '../data/restaurantCashMovementsData.js'
import { clientSafeMessage } from '../utils/messages.js'

/* ─── Defaults ─────────────────────────────────────────────────── */

const DEFAULT_LIMIT = 100
const MAXIMUM_LIMIT = 500

/* ─── Simple deterministic string hash for idempotency ─────────── */

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

function movementDocId(idempotencyKey) {
  return `cm_${hashHex(idempotencyKey)}`
}

/* ─── Build idempotency key ────────────────────────────────────── */

function buildMovementIdempotencyKey({ sessionId, type, amount, cashierId, reason }) {
  const parts = [
    String(sessionId ?? ''),
    String(type ?? ''),
    String(Number(amount).toFixed(2)),
    String(cashierId ?? ''),
    String(reason ?? ''),
  ]
  return parts.join('::')
}

/* ─── Hook ─────────────────────────────────────────────────────── */

export function useRestaurantCashMovements(options = {}) {
  const {
    sessionId,
    type: filterType,
    limitCount = DEFAULT_LIMIT,
    enabled = true,
  } = options

  const {
    workspaceId,
    businessType,
    staffId,
    userId,
    userDoc,
    firebaseUser,
  } = useUser()

  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState('none')
  const submittingRef = useRef(false)
  const listenerRef = useRef(null)

  /* ─── Cashier identity ──────────────────────────────────────── */

  const cashierIdentity = useMemo(() => {
    const cid = String(staffId || userId || '').trim()
    const cname = String(
      userDoc?.name || userDoc?.fullName || firebaseUser?.displayName || firebaseUser?.email || '',
    ).trim()
    return { cashierId: cid, cashierName: cname, hasIdentity: Boolean(cid) }
  }, [staffId, userId, userDoc, firebaseUser])

  /* ─── Can record? ────────────────────────────────────────────── */

  const canRecordMovement = Boolean(
    db && workspaceId && sessionId && cashierIdentity.hasIdentity && firebaseUser,
  )

  /* ─── Listener ────────────────────────────────────────────────── */

  useEffect(() => {
    if (listenerRef.current) {
      listenerRef.current()
      listenerRef.current = null
    }

    if (!enabled || !db || !workspaceId) {
      setMovements([])
      setLoading(false)
      setSource(enabled && !db ? 'none' : workspaceId ? 'firestore' : 'none')
      setError(enabled && !db ? 'Secure Cloud Sync is not available right now.' : '')
      return
    }

    const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantCashMovements')
    if (!collectionPath) {
      setMovements([])
      setLoading(false)
      setSource('none')
      return
    }

    setLoading(true)
    setError('')

    const constraints = []
    if (sessionId) {
      constraints.push(where('sessionId', '==', sessionId))
    }
    if (filterType) {
      constraints.push(where('type', '==', filterType))
    }
    constraints.push(orderBy('createdAt', 'desc'))
    const safeLimit = Math.min(MAXIMUM_LIMIT, Math.max(1, Number.isFinite(Number(limitCount)) ? Math.floor(Number(limitCount)) : DEFAULT_LIMIT))
    constraints.push(queryLimit(safeLimit))

    const ref = collection(db, collectionPath)
    const q = query(ref, ...constraints)

    listenerRef.current = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data()?.createdAt || null }))
        setMovements(rows)
        setSource('firestore')
        setLoading(false)
        setError('')
      },
      (err) => {
        console.warn('[useRestaurantCashMovements] listener error:', err?.code || err?.message || err)
        setMovements([])
        setSource('firestore')
        setLoading(false)
        setError('Unable to load cash movements.')
      },
    )

    return () => {
      if (listenerRef.current) {
        listenerRef.current()
        listenerRef.current = null
      }
    }
  }, [enabled, workspaceId, sessionId, filterType, limitCount])

  /* ─── Totals ─────────────────────────────────────────────────── */

  const totals = useMemo(() => calculateRestaurantCashMovementTotals(movements), [movements])

  /* ─── Record movement ────────────────────────────────────────── */

  const recordMovement = useCallback(
    async (input = {}) => {
      if (!db) {
        return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      }
      if (!workspaceId) {
        return { ok: false, error: 'Workspace is not configured.' }
      }
      if (!sessionId) {
        return { ok: false, error: 'Session is required.' }
      }
      if (!firebaseUser) {
        return { ok: false, error: 'Authentication required.' }
      }
      if (!cashierIdentity.hasIdentity) {
        return { ok: false, error: 'No cashier identity available.' }
      }

      const record = createRestaurantCashMovementRecord({
        ...input,
        sessionId,
        workspaceId,
        businessType: businessType || input.businessType || '',
        cashierId: cashierIdentity.cashierId,
        cashierName: cashierIdentity.cashierName,
        createdAt: undefined,
        updatedAt: undefined,
      })

      const nowStr = new Date().toISOString()
      record.createdAt = nowStr

      const validation = validateRestaurantCashMovement(record)
      if (!validation.valid) {
        return { ok: false, error: validation.errors.join('; '), validation }
      }

      const idempotencyKey = buildMovementIdempotencyKey({
        sessionId,
        type: record.type,
        amount: record.amount,
        cashierId: cashierIdentity.cashierId,
        reason: record.reason,
      })
      record.idempotencyKey = idempotencyKey

      const id = movementDocId(idempotencyKey)
      const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantCashMovements')
      const ref = doc(db, collectionPath, id)

      if (submittingRef.current) {
        return { ok: false, error: 'Already submitting.' }
      }
      submittingRef.current = true

      try {
        const result = await runTransaction(db, async (transaction) => {
          const existing = await transaction.get(ref)
          if (existing.exists()) {
            return {
              ok: true,
              created: false,
              duplicate: true,
              movement: { id: existing.id, ...existing.data() },
            }
          }

          transaction.set(ref, {
            ...record,
            updatedAt: serverTimestamp(),
          })

          return {
            ok: true,
            created: true,
            duplicate: false,
            movement: { id, ...record },
          }
        })

        return result
      } catch (txError) {
        const code = txError?.code || ''
        console.warn('[useRestaurantCashMovements] recordMovement failed:', code, txError?.message || '')
        return { ok: false, error: clientSafeMessage(txError, 'Unable to record cash movement.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, businessType, sessionId, firebaseUser, cashierIdentity],
  )

  /* ─── Return ─────────────────────────────────────────────────── */

  return useMemo(
    () => ({
      movements,
      loading,
      error,
      source,
      totals,
      canRecordMovement,
      recordMovement,
    }),
    [movements, loading, error, source, totals, canRecordMovement, recordMovement],
  )
}
