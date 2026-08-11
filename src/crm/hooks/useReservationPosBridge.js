/**
 * Restaurant Reservation ↔ POS Till Bridge
 *
 * Real-time bridge between reservations and the POS ordering interface.
 * Handles table locking, reservation search, auto-order creation, and status sync.
 *
 * DESIGN: This hook is split into two modes:
 *   - Full mode (dashboard): uses Firestore via useRestaurantReservations()
 *   - Lite mode (POS Till): reads reservations from Firestore directly with its own listener
 * This avoids crashing the POS page if the full reservation hook has issues.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from './useUser.js'
import { db } from '../lib/firebase.js'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

/* ── Helpers ── */
function safeStr(v) { return String(v ?? '').trim().toLowerCase() }

/* ── Hook ── */
export function useReservationPosBridge({
  workspaceId: wsIdOverride,
  tables = [],
  activeOrderTableId = '',
} = {}) {
  const { workspaceId: userWsId } = useUser()
  const workspaceId = wsIdOverride || userWsId || ''
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── Firestore listener (self-contained, no dependency on useRestaurantReservations) ── */
  const unsubRef = useRef(null)
  const lastPathRef = useRef('')

  // Subscription effect — only re-subscribes when path actually changes
  useEffect(() => {
    if (!workspaceId || !db) { setLoading(false); return }

    const pathKey = `workspaces/${workspaceId}/restaurantReservations`
    if (lastPathRef.current === pathKey) return // path unchanged — keep existing subscription
    lastPathRef.current = pathKey

    // Tear down old subscription before creating new one
    unsubRef.current?.()
    unsubRef.current = null

    setLoading(true)
    const colRef = collection(db, 'workspaces', workspaceId, 'restaurantReservations')
    const q = query(colRef, where('status', 'in', ['pending', 'confirmed', 'seated', 'completed']))

    unsubRef.current = onSnapshot(q, { includeMetadataChanges: false },
      (snap) => {
        const list = []
        snap.forEach((doc) => { if (doc.exists()) list.push({ id: doc.id, ...doc.data() }) })
        setReservations(list)
        setLoading(false)
        setError('')
      },
      (err) => {
        console.warn('[ReservationPosBridge] Listener error:', err?.message)
        setError('')
        setLoading(false)
      },
    )
  }, [workspaceId])

  // Unmount-only cleanup
  useEffect(() => () => {
    unsubRef.current?.()
    unsubRef.current = null
    lastPathRef.current = ''
  }, [])

  /* ── Today's reservations ── */
  const todayReservations = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return reservations
      .filter((r) => {
        const d = (r.reservationDate || r.date || '').toString().slice(0, 10)
        return d === todayStr
      })
      .sort((a, b) => {
        const ta = a.time || a.reservationTime || ''
        const tb = b.time || b.reservationTime || ''
        return ta.localeCompare(tb)
      })
  }, [reservations])

  /* ── Reserved table IDs ── */
  const reservedTableIds = useMemo(() => {
    const ids = new Set()
    for (const r of todayReservations) {
      if (r.status === 'confirmed' || r.status === 'pending') {
        const tid = r.tableId || r.tableNumber
        if (tid) ids.add(tid)
      }
    }
    return ids
  }, [todayReservations])

  /* ── Check if a table is reserved ── */
  const isTableReserved = useCallback((tableId) => {
    return tableId ? reservedTableIds.has(tableId) : false
  }, [reservedTableIds])

  /* ── Get reservation for a table ── */
  const getReservationForTable = useCallback((tableId) => {
    if (!tableId) return null
    return todayReservations.find(
      (r) => (r.tableId || r.tableNumber) === tableId &&
        (r.status === 'confirmed' || r.status === 'pending'),
    ) || null
  }, [todayReservations])

  /* ── Search ── */
  const [searchQuery, setSearchQuery] = useState('')
  const searchResults = useMemo(() => {
    const q = safeStr(searchQuery)
    if (!q) return todayReservations.slice(0, 20)
    return reservations.filter((r) => {
      const name = safeStr(r.customerName || r.name)
      const phone = safeStr(r.customerPhone || r.phone)
      const rid = safeStr(r.id)
      const table = safeStr(r.tableId || r.tableNumber)
      return name.includes(q) || phone.includes(q) || rid.includes(q) || table.includes(q)
    }).slice(0, 20)
  }, [reservations, todayReservations, searchQuery])

  /* ── Seat a reservation (update Firestore) ── */
  const seatReservation = useCallback(async (reservation, orderNumber = '') => {
    if (!reservation?.id || !workspaceId || !db) {
      return { ok: false, error: 'Missing reservation ID or workspace' }
    }
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const ref = doc(db, 'workspaces', workspaceId, 'restaurantReservations', reservation.id)
      await updateDoc(ref, {
        status: 'seated',
        checkInAt: serverTimestamp(),
        orderNumber: orderNumber || '',
        seatedAt: new Date().toISOString(),
      })
      // Update local state
      setReservations((prev) => prev.map((r) =>
        r.id === reservation.id ? { ...r, status: 'seated', orderNumber } : r,
      ))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || 'Failed to seat reservation' }
    }
  }, [workspaceId])

  /* ── Complete a reservation ── */
  const completeReservation = useCallback(async (reservationId) => {
    if (!reservationId || !workspaceId || !db) return { ok: false, error: 'Invalid' }
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const ref = doc(db, 'workspaces', workspaceId, 'restaurantReservations', reservationId)
      await updateDoc(ref, { status: 'completed', completedAt: serverTimestamp() })
      setReservations((prev) => prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'completed' } : r,
      ))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || 'Failed' }
    }
  }, [workspaceId])

  /* ── Cancel a reservation ── */
  const cancelReservation = useCallback(async (reservationId, reason = '') => {
    if (!reservationId || !workspaceId || !db) return { ok: false, error: 'Invalid' }
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const ref = doc(db, 'workspaces', workspaceId, 'restaurantReservations', reservationId)
      await updateDoc(ref, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelReason: reason || 'Cancelled by staff',
      })
      setReservations((prev) => prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'cancelled', cancelReason: reason } : r,
      ))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || 'Failed' }
    }
  }, [workspaceId])

  /* ── Mark no-show ── */
  const markNoShow = useCallback(async (reservationId) => {
    if (!reservationId || !workspaceId || !db) return { ok: false, error: 'Invalid' }
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const ref = doc(db, 'workspaces', workspaceId, 'restaurantReservations', reservationId)
      await updateDoc(ref, { status: 'no_show', noShowAt: serverTimestamp() })
      setReservations((prev) => prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'no_show' } : r,
      ))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || 'Failed' }
    }
  }, [workspaceId])

  return {
    reservations, todayReservations, loading, error,
    searchQuery, setSearchQuery, searchResults,
    reservedTableIds, isTableReserved, getReservationForTable,
    seatReservation, completeReservation, cancelReservation, markNoShow,
  }
}
