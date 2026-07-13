import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

export function useOnlineOrders({ customerUid = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'onlineOrders', businessType, limitCount: 100,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        let list = Array.isArray(data) ? data : []
        if (customerUid) list = list.filter((o) => o.customerUid === customerUid)
        setOrders(list)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load online orders.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, customerUid, enabled, role, userId, workspaceId])

  const api = useMemo(() => ({
    orders, loading, error,

    async placeOrder(payload) {
      if (!workspaceId || !db) return { ok: false, error: 'Service unavailable' }
      if (!payload.items?.length) return { ok: false, error: 'Cart is empty' }
      try {
        const ref = await createUserDoc(workspaceId, 'onlineOrders', {
          ...payload,
          status: 'placed',
          customerUid: payload.customerUid || userId || '',
          customerName: String(payload.customerName || '').trim(),
          customerPhone: String(payload.customerPhone || '').trim(),
          customerEmail: String(payload.customerEmail || '').trim(),
          orderType: payload.orderType || 'delivery',
          items: payload.items,
          subtotal: Math.max(0, Number(payload.subtotal || 0)),
          deliveryFee: Math.max(0, Number(payload.deliveryFee || 0)),
          total: Math.max(0, Number(payload.total || 0)),
          paymentMethod: payload.paymentMethod || 'Cash',
          paymentStatus: 'pending',
          deliveryAddress: String(payload.deliveryAddress || '').trim(),
          deliveryInstructions: String(payload.deliveryInstructions || '').trim(),
          scheduledAt: payload.scheduledAt || null,
          source: 'online',
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId || payload.customerUid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to place order.') } }
    },

    async updateOnlineOrder(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'onlineOrders', id, { ...payload, updatedAt: serverTimestamp() }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...payload } : o))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update order.') } }
    },
  }), [orders, loading, error, userId, workspaceId, businessType, role])

  return api
}
