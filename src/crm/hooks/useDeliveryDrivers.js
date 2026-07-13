import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { isDriverAvailable, driverPerformanceKPIs, calculateDriverSettlement } from '../lib/deliveryCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

export function useDeliveryDrivers({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'deliveryDrivers', businessType, limitCount: 100,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setDrivers(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load drivers.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, role, userId, workspaceId])

  const availableDrivers = useMemo(() => drivers.filter(isDriverAvailable), [drivers])

  const api = useMemo(() => ({
    drivers, loading, error, availableDrivers,

    async createDriver(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      if (!payload.name?.trim()) return { ok: false, error: 'Driver name is required' }
      try {
        const ref = await createUserDoc(workspaceId, 'deliveryDrivers', {
          ...payload,
          name: String(payload.name).trim(),
          phone: String(payload.phone || '').trim(),
          email: String(payload.email || '').trim(),
          vehicleType: payload.vehicleType || 'motorcycle',
          vehicleNumber: String(payload.vehicleNumber || '').trim(),
          status: 'available',
          currentLoad: 0,
          maxLoad: Math.max(1, Number(payload.maxLoad || 5)),
          commissionRate: Math.max(0, Math.min(100, Number(payload.commissionRate || 10))),
          rating: 0,
          totalDeliveries: 0,
          active: payload.active !== false,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Driver created', module: 'Delivery',
          description: `Driver "${payload.name}" added`, targetId: ref.id,
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create driver.') } }
    },

    async updateDriver(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'deliveryDrivers', id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
        setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, ...payload } : d))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update driver.') } }
    },

    async deleteDriver(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'deliveryDrivers', id, { diagnostics: { currentUserUid: userId, role } })
        setDrivers((prev) => prev.filter((d) => d.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete driver.') } }
    },

    async setDriverStatus(id, status) {
      if (!id || !status) return { ok: false }
      return api.updateDriver(id, { status, updatedAt: serverTimestamp() })
    },

    async assignDriver(deliveryOrderId, driverId) {
      if (!deliveryOrderId || !driverId || !workspaceId || !db) return { ok: false }
      try {
        const orderRef = (await import('firebase/firestore')).doc(db, workspaceCollectionPath(workspaceId, 'deliveryOrders'), deliveryOrderId)
        const driverRef = (await import('firebase/firestore')).doc(db, workspaceCollectionPath(workspaceId, 'deliveryDrivers'), driverId)
        await runTransaction(db, async (tx) => {
          const orderSnap = await tx.get(orderRef)
          if (!orderSnap.exists()) throw new Error('Delivery order not found')
          const driverSnap = await tx.get(driverRef)
          if (!driverSnap.exists()) throw new Error('Driver not found')
          tx.update(orderRef, { driverId, status: 'accepted', updatedAt: serverTimestamp(), acceptedAt: serverTimestamp() })
          tx.update(driverRef, { currentLoad: (driverSnap.data().currentLoad || 0) + 1, status: 'on_delivery', updatedAt: serverTimestamp() })
        })
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to assign driver.') } }
    },

    performanceKPIs(driverId, deliveries = []) {
      const driver = drivers.find((d) => d.id === driverId)
      if (!driver) return null
      const driverDeliveries = deliveries.filter((d) => d.driverId === driverId)
      return driverPerformanceKPIs(driver, driverDeliveries)
    },

    driverSettlement(driverId, deliveries = []) {
      const driver = drivers.find((d) => d.id === driverId)
      if (!driver) return null
      return calculateDriverSettlement(driver, deliveries.filter((d) => d.driverId === driverId))
    },
  }), [drivers, loading, error, availableDrivers, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
