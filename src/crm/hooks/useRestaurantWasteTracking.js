/**
 * Firestore-backed Restaurant POS waste tracking hook.
 *
 * workspaceId-scoped collection: workspaces/{workspaceId}/restaurantWaste
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
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'
import { createWasteRecord, validateWaste, createStockAdjustmentRecord } from '../data/restaurantRecipeData.js'
import { clientSafeMessage } from '../utils/messages.js'

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const DEFAULT_LIMIT = 100
const MAXIMUM_LIMIT = 500

export function useRestaurantWasteTracking(options = {}) {
  const { workspaceId, businessType, staffId, userId, firebaseUser, userDoc } = useUser()
  const { businessDay, ingredientId, enabled = true } = options

  const [wasteRecords, setWasteRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  const whereFilters = useMemo(() => {
    const filters = []
    if (businessDay) filters.push(['businessDay', '==', businessDay])
    if (ingredientId) filters.push(['ingredientId', '==', ingredientId])
    return filters
  }, [businessDay, ingredientId])

  /* ── Listener ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!enabled || !db || !workspaceId || !businessType) {
      setWasteRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    const path = workspaceCollectionPath(workspaceId, 'restaurantWaste')
    if (!path) { setLoading(false); return }
    const ref = collection(db, path)
    const q = query(ref, orderBy('occurredAt', 'desc'), queryLimit(MAXIMUM_LIMIT))

    const unsub = onSnapshot(
      q,
      (snap) => {
        setWasteRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => { setWasteRecords([]); setLoading(false) },
    )
    return () => unsub()
  }, [enabled, workspaceId, businessType, whereFilters])

  /* ── recordWaste ─────────────────────────────────────────────── */

  const recordWaste = useCallback(async (input = {}) => {
    if (!db || !workspaceId || !firebaseUser) return { ok: false, error: 'Authentication required.' }
    if (submittingRef.current) return { ok: false, error: 'Already submitting.' }
    submittingRef.current = true

    try {
      const now = new Date().toISOString()
      const staffName = String(userDoc?.name || userDoc?.fullName || firebaseUser?.displayName || '').trim()
      const record = createWasteRecord({
        ...input,
        workspaceId,
        businessType,
        recordedBy: staffName || firebaseUser.uid,
        occurredAt: input.occurredAt || now,
        createdAt: now,
        updatedAt: now,
      })
      const validation = validateWaste(record)
      if (!validation.valid) {
        return { ok: false, error: validation.errors.join('; ') }
      }

      const wastePath = workspaceCollectionPath(workspaceId, 'restaurantWaste')
      const ingPath = workspaceCollectionPath(workspaceId, 'restaurantIngredients')
      const wasteRef = doc(collection(db, wastePath))
      const ingRef = doc(db, ingPath, record.ingredientId)

      await runTransaction(db, async (txn) => {
        // Deduct from ingredient stock
        const ingSnap = await txn.get(ingRef)
        if (ingSnap.exists()) {
          const current = safeMoney(ingSnap.data().stockQuantity)
          txn.update(ingRef, {
            stockQuantity: Math.max(0, current - record.quantity),
            updatedAt: serverTimestamp(),
          })
        }
        txn.set(wasteRef, {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })

      return { ok: true, waste: record }
    } catch (err) {
      return { ok: false, error: clientSafeMessage(err, 'Failed to record waste.') }
    } finally {
      submittingRef.current = false
    }
  }, [workspaceId, businessType, firebaseUser, userDoc])

  /* ── Totals ──────────────────────────────────────────────────── */

  const totals = useMemo(() => {
    const byReason = {}
    let totalQty = 0
    let totalCost = 0
    wasteRecords.forEach((w) => {
      const qty = safeMoney(w.quantity)
      const cost = safeMoney(w.totalCost)
      totalQty += qty
      totalCost += cost
      const reason = w.reason || 'Other'
      byReason[reason] = (byReason[reason] || 0) + cost
    })
    return { count: wasteRecords.length, totalQty, totalCost, byReason }
  }, [wasteRecords])

  return useMemo(() => ({
    wasteRecords,
    loading,
    error,
    totals,
    recordWaste,
    canRecord: Boolean(db && workspaceId && firebaseUser),
  }), [wasteRecords, loading, error, totals, recordWaste])
}
