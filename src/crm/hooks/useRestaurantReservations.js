import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { RESERVATION_STATUSES, RESERVATION_STATUS_TRANSITIONS, canReservationTransition, hasTableConflict, hasCapacityConflict, recommendTable, validateReservation, isLateArrival, isNoShow, defaultDuration, findAvailableTables } from '../lib/restaurantReservationCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

export function useRestaurantReservations({ date = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'restaurantReservations', businessType, limitCount: 500,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        let list = Array.isArray(data) ? data : []
        if (date) list = list.filter((r) => String(r.reservationDate) === date)
        setReservations(list)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load reservations.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, date, enabled, role, userId, workspaceId])

  const api = useMemo(() => ({
    reservations, loading, error,
    statuses: RESERVATION_STATUSES,
    validTransitions: RESERVATION_STATUS_TRANSITIONS,

    async createReservation(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateReservation(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      if (payload.tableId && payload.enableConflictDetection !== false) {
        const conflict = hasTableConflict({ ...payload, status: 'confirmed' }, reservations)
        if (conflict) return { ok: false, error: 'Table already reserved during this time slot' }
      }
      try {
        const ref = await createUserDoc(workspaceId, 'restaurantReservations', {
          customerName: String(payload.customerName).trim(),
          phone: String(payload.phone || '').trim(),
          email: String(payload.email || '').trim(),
          guests: Math.max(1, Number(payload.adults || 0) + Number(payload.children || 1)),
          adults: Math.max(1, Number(payload.adults || 1)),
          children: Math.max(0, Number(payload.children || 0)),
          tableId: payload.tableId || '',
          preferredTable: payload.preferredTable || '',
          reservationDate: payload.reservationDate,
          reservationTime: String(payload.reservationTime),
          duration: Math.max(30, Number(payload.duration || defaultDuration(payload.adults, payload.children))),
          arrivalTime: null,
          checkInAt: null,
          status: 'pending',
          specialRequest: String(payload.specialRequest || '').trim(),
          notes: String(payload.notes || '').trim(),
          vip: Boolean(payload.vip),
          birthday: Boolean(payload.birthday),
          anniversary: Boolean(payload.anniversary),
          wheelchair: Boolean(payload.wheelchair),
          highChair: Boolean(payload.highChair),
          outdoor: Boolean(payload.outdoor),
          smoking: Boolean(payload.smoking),
          indoor: Boolean(payload.indoor),
          walkIn: Boolean(payload.walkIn),
          source: payload.source || 'manual',
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Reservation created', module: 'Reservations',
          description: `${payload.customerName} reserved for ${payload.reservationDate} at ${payload.reservationTime}`,
          targetId: ref.id, targetName: payload.customerName,
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create reservation.') } }
    },

    async updateReservation(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'restaurantReservations', id, { ...payload, updatedAt: serverTimestamp() }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setReservations((prev) => prev.map((r) => r.id === id ? { ...r, ...payload } : r))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update reservation.') } }
    },

    async changeStatus(id, newStatus, meta = {}) {
      if (!id || !newStatus || !workspaceId || !db) return { ok: false }
      const current = reservations.find((r) => r.id === id)
      if (current && !canReservationTransition(current.status, newStatus)) return { ok: false, error: `Cannot transition from ${current.status} to ${newStatus}` }
      const timestampField = { seated: 'checkInAt', completed: 'completedAt', cancelled: 'cancelledAt', no_show: 'noShowAt' }
      const field = timestampField[newStatus]
      try {
        const patch = { status: newStatus, ...(field ? { [field]: serverTimestamp(), arrivalTime: new Date().toISOString().slice(0, 16) } : {}), ...meta, updatedAt: serverTimestamp() }
        await patchUserDoc(workspaceId, 'restaurantReservations', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        setReservations((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to change status.') } }
    },

    async deleteReservation(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'restaurantReservations', id, { diagnostics: { currentUserUid: userId, role } })
        setReservations((prev) => prev.filter((r) => r.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete reservation.') } }
    },

    async autoAssignTable(id, tables = []) {
      const reservation = reservations.find((r) => r.id === id)
      if (!reservation || !workspaceId || !db) return { ok: false }
      const recommended = recommendTable(reservations, reservation, tables)
      if (!recommended) return { ok: false, error: 'No available tables match this party size' }
      return api.updateReservation(id, { tableId: recommended.id })
    },

    findAvailableTables(tables = []) {
      return (date ? reservations.filter((r) => String(r.reservationDate) === date) : reservations)
    },

    checkLateArrivals() {
      return reservations.filter((r) => isLateArrival(r))
    },

    checkNoShows() {
      return reservations.filter((r) => isNoShow(r))
    },
  }), [reservations, loading, error, userId, workspaceId, businessType, userDoc, firebaseUser, role, date])

  return api
}
