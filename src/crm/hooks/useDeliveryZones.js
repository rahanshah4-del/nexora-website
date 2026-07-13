import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculateDeliveryCharge, withinZoneBounds } from '../lib/deliveryCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

export function useDeliveryZones({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'deliveryZones', businessType, limitCount: 100,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setZones(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load zones.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, role, userId, workspaceId])

  const api = useMemo(() => ({
    zones, loading, error,

    async createZone(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      if (!payload.name?.trim()) return { ok: false, error: 'Zone name is required' }
      try {
        const ref = await createUserDoc(workspaceId, 'deliveryZones', {
          ...payload,
          name: String(payload.name).trim(),
          description: String(payload.description || '').trim(),
          baseCharge: Math.max(0, Number(payload.baseCharge || 0)),
          perKmCharge: Math.max(0, Number(payload.perKmCharge || 0)),
          maxCharge: Math.max(0, Number(payload.maxCharge || 0)),
          maxDistance: Math.max(0, Number(payload.maxDistance || 0)),
          freeDeliveryThreshold: Math.max(0, Number(payload.freeDeliveryThreshold || 0)),
          minOrderAmount: Math.max(0, Number(payload.minOrderAmount || 0)),
          estimatedTime: Math.max(0, Number(payload.estimatedTime || 30)),
          active: payload.active !== false,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Delivery zone created', module: 'Delivery',
          description: `Zone "${payload.name}" created`, targetId: ref.id,
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create zone.') } }
    },

    async updateZone(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'deliveryZones', id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
        setZones((prev) => prev.map((z) => z.id === id ? { ...z, ...payload } : z))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update zone.') } }
    },

    async deleteZone(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'deliveryZones', id, { diagnostics: { currentUserUid: userId, role } })
        setZones((prev) => prev.filter((z) => z.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete zone.') } }
    },

    calculateCharge(zone, distanceKm, subtotal) {
      return calculateDeliveryCharge({ zone, distanceKm, subtotal })
    },

    isWithinZone(zone, distanceKm) {
      return withinZoneBounds(zone, distanceKm)
    },
  }), [zones, loading, error, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
