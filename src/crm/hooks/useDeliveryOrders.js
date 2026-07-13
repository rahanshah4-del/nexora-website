import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { DELIVERY_ORDER_STATUSES, canTransition, validTransitions, estimateDeliveryTime, generateDeliveryOTP } from '../lib/deliveryCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

export function useDeliveryOrders({ driverId = null, zoneId = null, statusFilter = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'deliveryOrders', businessType, limitCount: 200,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        let list = Array.isArray(data) ? data : []
        if (driverId) list = list.filter((o) => o.driverId === driverId)
        if (zoneId) list = list.filter((o) => o.zoneId === zoneId)
        if (statusFilter) list = list.filter((o) => o.status === statusFilter)
        setOrders(list)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load delivery orders.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, driverId, enabled, role, statusFilter, userId, workspaceId, zoneId])

  const activeOrders = useMemo(() => orders.filter((o) => !['delivered', 'cancelled', 'refunded', 'returned'].includes(o.status)), [orders])
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders])

  const api = useMemo(() => ({
    orders, loading, error, activeOrders, deliveredOrders,
    statuses: DELIVERY_ORDER_STATUSES,

    async createDeliveryOrder(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      try {
        const ref = await createUserDoc(workspaceId, 'deliveryOrders', {
          ...payload,
          orderNumber: payload.orderNumber || `DEL-${Date.now().toString(36).toUpperCase()}`,
          source: payload.source || 'manual',
          orderType: payload.orderType || 'delivery',
          status: 'pending',
          customerName: String(payload.customerName || '').trim(),
          customerPhone: String(payload.customerPhone || '').trim(),
          deliveryAddress: String(payload.deliveryAddress || '').trim(),
          deliveryInstructions: String(payload.deliveryInstructions || '').trim(),
          items: Array.isArray(payload.items) ? payload.items : [],
          subtotal: Math.max(0, Number(payload.subtotal || 0)),
          deliveryFee: Math.max(0, Number(payload.deliveryFee || 0)),
          total: Math.max(0, Number(payload.total || 0)),
          paymentMethod: payload.paymentMethod || 'Cash',
          paymentStatus: 'pending',
          zoneId: payload.zoneId || '',
          driverId: payload.driverId || '',
          otpCode: payload.otpEnabled !== false ? generateDeliveryOTP() : '',
          estimatedEta: payload.estimatedEta || null,
          scheduledAt: payload.scheduledAt || null,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create delivery order.') } }
    },

    async updateStatus(id, newStatus, meta = {}) {
      if (!id || !newStatus || !workspaceId || !db) return { ok: false, error: 'Invalid request' }
      const current = orders.find((o) => o.id === id)
      if (current && !canTransition(current.status, newStatus)) return { ok: false, error: `Cannot transition from ${current.status} to ${newStatus}` }
      const timestampField = {
        accepted: 'acceptedAt', preparing: 'preparingAt', ready: 'readyAt',
        picked_up: 'pickedUpAt', on_route: 'onRouteAt', delivered: 'deliveredAt',
        cancelled: 'cancelledAt', refunded: 'refundedAt', returned: 'returnedAt',
      }
      const field = timestampField[newStatus]
      try {
        const patch = { status: newStatus, ...(field ? { [field]: serverTimestamp() } : {}), ...meta, updatedAt: serverTimestamp() }
        await patchUserDoc(workspaceId, 'deliveryOrders', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update status.') } }
    },

    async updateDeliveryOrder(id, payload) {
      if (!id) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'deliveryOrders', id, { ...payload, updatedAt: serverTimestamp() }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...payload } : o))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update delivery order.') } }
    },

    async deleteDeliveryOrder(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'deliveryOrders', id, { diagnostics: { currentUserUid: userId, role } })
        setOrders((prev) => prev.filter((o) => o.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete delivery order.') } }
    },

    getValidTransitions(status) { return validTransitions(status) },
    estimateETA(distanceKm, prepTimeMinutes) { return estimateDeliveryTime({ distanceKm, prepTimeMinutes, driverAssignmentMinutes: 5 }) },
  }), [orders, loading, error, activeOrders, deliveredOrders, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
