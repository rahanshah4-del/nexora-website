import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
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
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'
import {
  createRestaurantCashSessionRecord,
  validateRestaurantCashSession,
  buildRestaurantCashSessionCloseData,
  buildReopenSessionData,
} from '../data/restaurantCashData.js'
import { clientSafeMessage } from '../utils/messages.js'

function rawNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function normalizeMovementType(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'deposit' || raw === 'dep') return 'deposit'
  if (raw === 'withdrawal' || raw === 'withdraw' || raw === 'wd' || raw === 'with') return 'withdrawal'
  if (raw === 'expense' || raw === 'exp') return 'expense'
  if (raw === 'adjustment' || raw === 'adj' || raw === 'adjust') return 'adjustment'
  return 'deposit'
}

/* ─── Defaults ─────────────────────────────────────────────────── */

const DEFAULT_LIMIT = 50
const MAXIMUM_LIMIT = 200

/* ─── Hook ──────────────────────────────────────────────────────── */

export function useRestaurantCashSessions(options = {}) {
  const { workspaceId, businessType, staffId, userId, firebaseUser, userDoc } = useUser()
  const enabled = options.enabled !== false

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const submittingRef = useRef(false)

  /* ── Cashier identity ────────────────────────────────────────── */

  const cashierId = useMemo(() => String(staffId || userId || firebaseUser?.uid || '').trim(), [staffId, userId, firebaseUser?.uid])
  const cashierName = useMemo(
    () => String(userDoc?.name || userDoc?.fullName || firebaseUser?.displayName || firebaseUser?.email || '').trim(),
    [userDoc, firebaseUser],
  )

  /* ── Active session (derived from listener data) ─────────────── */

  const activeSession = useMemo(() => {
    if (!cashierId) return null
    return sessions.find((s) => s.cashierId === cashierId && s.status === 'open') || null
  }, [sessions, cashierId])

  /* ── Computed flags ──────────────────────────────────────────── */

  const canOpenSession = Boolean(db && workspaceId && cashierId && !activeSession)
  const canCloseSession = Boolean(db && workspaceId && cashierId && activeSession)

  /* ── Listener ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!enabled) {
      setSessions([])
      setLoading(false)
      setError('')
      return
    }
    if (!db) {
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setSessions([])
      setLoading(false)
      return
    }
    if (!workspaceId) {
      setError('Workspace is required.')
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setSource('firestore')

    const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantCashSessions')
    if (!collectionPath) {
      setSessions([])
      setLoading(false)
      return () => {}
    }

    const ref = collection(db, collectionPath)
    const q = query(ref, orderBy('openedAt', 'desc'), queryLimit(MAXIMUM_LIMIT))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setSessions(rows)
        setLoading(false)
      },
      (err) => {
        console.warn('[useRestaurantCashSessions] listener error:', err?.code || err?.message || err)
        setSessions([])
        setLoading(false)
        setError('Unable to load cash sessions.')
      },
    )

    return () => unsub()
  }, [enabled, workspaceId])

  /* ── openSession ─────────────────────────────────────────────── */

  const openSession = useCallback(
    async (input = {}) => {
      // ── Guards ──────────────────────────────────────────────
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!cashierId) return { ok: false, error: 'Cashier identity is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }

      const openingCash = Math.max(0, Number(input.openingCash || 0))
      if (openingCash < 0) return { ok: false, error: 'Opening cash cannot be negative.' }

      if (activeSession) return { ok: false, error: 'You already have an open session. Close it first.' }

      // ── Double-click guard ──────────────────────────────────
      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const businessDay = restaurantBusinessDateKey(new Date(), options.settings)

        // ── Build session record ──────────────────────────────
        const record = createRestaurantCashSessionRecord({
          workspaceId,
          businessType: businessType || options.businessType || '',
          cashierId,
          cashierName: input.cashierName || cashierName,
          openingCash,
          openedAt: input.openedAt || now,
          status: 'open',
          settings: options.settings,
        })

        // ── Validate ──────────────────────────────────────────
        const validation = validateRestaurantCashSession(record)
        if (!validation.valid) {
          return { ok: false, error: validation.errors.join('; ') }
        }

        // ── Atomic open via runTransaction ────────────────────
        const collectionPath = workspaceCollectionPath(workspaceId, 'restaurantCashSessions')
        const ref = collection(db, collectionPath)

        const result = await runTransaction(db, async (txn) => {
          // Double-check no other open session for this cashier
          const openQuery = query(ref, where('cashierId', '==', cashierId), where('status', '==', 'open'), queryLimit(1))
          const openSnap = await getDocs(openQuery)
          if (!openSnap.empty) {
            return { ok: false, error: 'You already have an open session. Close it first.' }
          }

          const newRef = doc(ref)
          txn.set(newRef, {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          return { ok: true, session: { id: newRef.id, ...record } }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to open cash session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, businessType, cashierId, cashierName, firebaseUser, activeSession, options.settings],
  )

  /* ── closeSession ────────────────────────────────────────────── */

  const closeSession = useCallback(
    async (input = {}) => {
      // ── Guards ──────────────────────────────────────────────
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }
      if (!activeSession) return { ok: false, error: 'No open session to close.' }

      const actualClosingCash = Number(input.actualClosingCash)
      if (input.actualClosingCash === undefined || input.actualClosingCash === null || Number.isNaN(actualClosingCash)) {
        return { ok: false, error: 'Actual closing cash is required.' }
      }
      if (actualClosingCash < 0) {
        return { ok: false, error: 'Actual closing cash cannot be negative.' }
      }

      // Workspace mismatch guard
      if (activeSession.workspaceId && activeSession.workspaceId !== workspaceId) {
        return { ok: false, error: 'Workspace mismatch. Cannot close session from a different workspace.' }
      }

      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const openedAt = activeSession.openedAt || ''
        const sessionPath = `${workspaceCollectionPath(workspaceId, 'restaurantCashSessions')}/${activeSession.id}`
        const ref = doc(db, sessionPath)

        // ── 1. Query completed cash payments (session window) ──
        let cashPayments = []
        try {
          const paysPath = workspaceCollectionPath(workspaceId, 'restaurantPayments')
          const paysCol = collection(db, paysPath)
          const paysConstraints = [where('createdAt', '>=', openedAt), where('createdAt', '<=', now), where('status', '==', 'completed'), orderBy('createdAt', 'asc')]
          const paysQ = query(paysCol, ...paysConstraints)
          const paysSnap = await getDocs(paysQ)
          cashPayments = paysSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (e) {
          console.warn('[closeSession] payments query failed:', e?.code || e?.message || e)
        }

        // ── 2. Query completed refunds (session window) ────────
        let cashRefundsList = []
        try {
          const refsPath = workspaceCollectionPath(workspaceId, 'restaurantRefunds')
          const refsCol = collection(db, refsPath)
          const refsConstraints = [where('createdAt', '>=', openedAt), where('createdAt', '<=', now), where('status', '==', 'completed'), orderBy('createdAt', 'asc')]
          const refsQ = query(refsCol, ...refsConstraints)
          const refsSnap = await getDocs(refsQ)
          cashRefundsList = refsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (e) {
          console.warn('[closeSession] refunds query failed:', e?.code || e?.message || e)
        }

        // ── 3. Query cash movements for this session ───────────
        let movementList = []
        try {
          const movsPath = workspaceCollectionPath(workspaceId, 'restaurantCashMovements')
          const movsCol = collection(db, movsPath)
          const movsQ = query(movsCol, where('sessionId', '==', activeSession.id), orderBy('createdAt', 'asc'))
          const movsSnap = await getDocs(movsQ)
          movementList = movsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (e) {
          console.warn('[closeSession] movements query failed:', e?.code || e?.message || e)
        }

        // ── 4. Compute aggregates ──────────────────────────────
        const openingCash = Number(activeSession.openingCash) || 0

        // Cash sales: completed payments where paymentMethod === 'Cash'
        const cashSales = cashPayments
          .filter((p) => {
            const method = String(p.paymentMethod || '').trim().toLowerCase()
            return method === 'cash'
          })
          .reduce((sum, p) => sum + rawNumber(p.amount), 0)

        // Total completed payments (all methods) for transaction metrics
        const allCompletedAmounts = cashPayments.map((p) => rawNumber(p.amount))
        const totalTransactions = cashPayments.length
        const averageSale = totalTransactions > 0
          ? allCompletedAmounts.reduce((a, b) => a + b, 0) / totalTransactions
          : 0
        const largestSale = totalTransactions > 0 ? Math.max(...allCompletedAmounts) : 0

        // Cash refunds: completed refunds where refundMethod === 'Cash' (or any if method missing)
        const cashRefunds = cashRefundsList
          .filter((r) => {
            const method = String(r.refundMethod || r.paymentMethod || '').trim().toLowerCase()
            return !method || method === 'cash'
          })
          .reduce((sum, r) => sum + rawNumber(r.refundTotal), 0)
        const largestRefund = cashRefundsList.length > 0
          ? Math.max(...cashRefundsList.map((r) => rawNumber(r.refundTotal)), 0)
          : 0

        // Cash movements
        const cashDeposits = movementList
          .filter((m) => normalizeMovementType(m.type) === 'deposit')
          .reduce((sum, m) => sum + safeMoney(m.amount), 0)
        const cashWithdrawals = movementList
          .filter((m) => normalizeMovementType(m.type) === 'withdrawal')
          .reduce((sum, m) => sum + safeMoney(m.amount), 0)
        const cashExpenses = movementList
          .filter((m) => normalizeMovementType(m.type) === 'expense')
          .reduce((sum, m) => sum + safeMoney(m.amount), 0)
        const cashAdjustments = movementList
          .filter((m) => normalizeMovementType(m.type) === 'adjustment')
          .reduce((sum, m) => sum + rawNumber(m.amount), 0)

        // ── 5. Build close payload using pure data helper ──────
        const closePayload = buildRestaurantCashSessionCloseData({
          openingCash,
          actualClosingCash,
          cashSales,
          cashRefunds,
          cashDeposits,
          cashWithdrawals,
          cashExpenses,
          cashAdjustments,
          totalTransactions,
          averageSale,
          largestSale,
          largestRefund,
          varianceOptions: input.varianceOptions,
          settledBy: firebaseUser.uid,
          managerApprovedBy: input.managerApprovedBy,
          notes: input.notes,
          closedAt: now,
        })

        // ── 6. Atomic close via runTransaction ──────────────────
        const result = await runTransaction(db, async (txn) => {
          const snap = await txn.get(ref)
          if (!snap.exists()) throw new Error('Session not found.')
          const data = snap.data()
          if (data.status !== 'open') throw new Error('Session is already closed.')

          txn.update(ref, {
            ...closePayload,
            updatedAt: serverTimestamp(),
          })

          return {
            ok: true,
            sessionId: activeSession.id,
            ...closePayload,
          }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to close cash session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, activeSession, firebaseUser],
  )

  /* ── approveSession ──────────────────────────────────────────── */

  const approveSession = useCallback(
    async (sessionId, input = {}) => {
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }

      const path = `${workspaceCollectionPath(workspaceId, 'restaurantCashSessions')}/${sessionId}`
      const ref = doc(db, path)

      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const result = await runTransaction(db, async (txn) => {
          const snap = await txn.get(ref)
          if (!snap.exists()) return { ok: false, error: 'Session not found.' }
          const data = snap.data()
          if (data.status !== 'pending_review' && data.status !== 'closed') {
            return { ok: false, error: 'Session is not awaiting approval.' }
          }
          if (data.workspaceId && data.workspaceId !== workspaceId) {
            return { ok: false, error: 'Workspace mismatch.' }
          }

          txn.update(ref, {
            status: 'approved',
            settlementStatus: 'approved',
            approvedBy: input.approvedBy || firebaseUser.uid,
            approvedAt: now,
            managerNotes: String(input.managerNotes || ''),
            differenceReason: String(input.differenceReason || ''),
            updatedAt: serverTimestamp(),
          })

          return { ok: true, sessionId, approvedAt: now, approvedBy: firebaseUser.uid }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to approve session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, firebaseUser],
  )

  /* ── rejectSession ───────────────────────────────────────────── */

  const rejectSession = useCallback(
    async (sessionId, input = {}) => {
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }

      const path = `${workspaceCollectionPath(workspaceId, 'restaurantCashSessions')}/${sessionId}`
      const ref = doc(db, path)

      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const result = await runTransaction(db, async (txn) => {
          const snap = await txn.get(ref)
          if (!snap.exists()) return { ok: false, error: 'Session not found.' }
          const data = snap.data()
          if (data.status !== 'pending_review' && data.status !== 'closed') {
            return { ok: false, error: 'Session is not awaiting approval.' }
          }
          if (data.workspaceId && data.workspaceId !== workspaceId) {
            return { ok: false, error: 'Workspace mismatch.' }
          }
          if (!input.reason) return { ok: false, error: 'Rejection reason is required.' }

          txn.update(ref, {
            status: 'rejected',
            settlementStatus: 'rejected',
            rejectedBy: firebaseUser.uid,
            rejectedAt: now,
            rejectionReason: String(input.reason),
            managerNotes: String(input.managerNotes || ''),
            updatedAt: serverTimestamp(),
          })

          return { ok: true, sessionId, rejectedAt: now, rejectedBy: firebaseUser.uid }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reject session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, firebaseUser],
  )

  /* ── lockSession ─────────────────────────────────────────────── */

  const lockSession = useCallback(
    async (sessionId, input = {}) => {
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }

      const path = `${workspaceCollectionPath(workspaceId, 'restaurantCashSessions')}/${sessionId}`
      const ref = doc(db, path)

      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const result = await runTransaction(db, async (txn) => {
          const snap = await txn.get(ref)
          if (!snap.exists()) return { ok: false, error: 'Session not found.' }
          const data = snap.data()
          if (data.status !== 'approved') return { ok: false, error: 'Only approved sessions can be locked.' }
          if (data.workspaceId && data.workspaceId !== workspaceId) {
            return { ok: false, error: 'Workspace mismatch.' }
          }

          txn.update(ref, {
            status: 'locked',
            settlementStatus: 'locked',
            lockedBy: firebaseUser.uid,
            lockedAt: now,
            updatedAt: serverTimestamp(),
          })

          return { ok: true, sessionId, lockedAt: now, lockedBy: firebaseUser.uid }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to lock session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, firebaseUser],
  )

  /* ── reopenSession (owner only) ────────────────────────────────── */

  const reopenSession = useCallback(
    async (sessionId, input = {}) => {
      if (!db) return { ok: false, error: 'Database not available.' }
      if (!workspaceId) return { ok: false, error: 'Workspace is required.' }
      if (!firebaseUser) return { ok: false, error: 'Authentication required.' }

      const path = `${workspaceCollectionPath(workspaceId, 'restaurantCashSessions')}/${sessionId}`
      const ref = doc(db, path)

      if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
      submittingRef.current = true

      try {
        const now = new Date().toISOString()
        const result = await runTransaction(db, async (txn) => {
          const snap = await txn.get(ref)
          if (!snap.exists()) return { ok: false, error: 'Session not found.' }
          const data = snap.data()
          if (data.status !== 'locked') return { ok: false, error: 'Only locked sessions can be reopened.' }
          if (data.workspaceId && data.workspaceId !== workspaceId) {
            return { ok: false, error: 'Workspace mismatch.' }
          }

          const reopenPayload = buildReopenSessionData({ reopenedBy: firebaseUser.uid })

          txn.update(ref, reopenPayload)

          return { ok: true, sessionId, reopenedAt: now, reopenedBy: firebaseUser.uid }
        })

        return result
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reopen session.') }
      } finally {
        submittingRef.current = false
      }
    },
    [workspaceId, firebaseUser],
  )

  /* ── Pending settlement sessions (for manager review) ────────── */

  const pendingSettlements = useMemo(
    () => sessions.filter((s) => s.settlementStatus === 'pending_review' || (s.status === 'closed' && !s.settlementStatus)).sort((a, b) => new Date(b.closedAt || b.createdAt) - new Date(a.closedAt || a.createdAt)),
    [sessions],
  )

  /* ── Return ──────────────────────────────────────────────────── */

  return useMemo(
    () => ({
      sessions,
      loading,
      error,
      source,
      canOpenSession,
      canCloseSession,
      activeSession,
      openSession,
      closeSession,
      approveSession,
      rejectSession,
      lockSession,
      reopenSession,
      pendingSettlements,
    }),
    [sessions, loading, error, source, canOpenSession, canCloseSession, activeSession, openSession, closeSession, approveSession, rejectSession, lockSession, reopenSession, pendingSettlements],
  )
}
