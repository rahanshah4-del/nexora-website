import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

export function useDeliveryTracking({ deliveryOrderId = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'deliveryTracking', businessType, limitCount: 200,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        let list = Array.isArray(data) ? data : []
        if (deliveryOrderId) list = list.filter((e) => e.deliveryOrderId === deliveryOrderId)
        setEvents(list.sort((a, b) => {
          const ta = a.timestamp?.toDate?.()?.getTime() || new Date(a.timestamp || 0).getTime()
          const tb = b.timestamp?.toDate?.()?.getTime() || new Date(b.timestamp || 0).getTime()
          return ta - tb
        }))
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load tracking.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, deliveryOrderId, enabled, role, userId, workspaceId])

  const api = useMemo(() => ({
    events, loading, error,

    async addEvent({ deliveryOrderId: orderId, status, location = {}, note = '', metadata = {} } = {}) {
      if (!workspaceId || !db || !orderId || !status) return { ok: false }
      try {
        const ref = await createUserDoc(workspaceId, 'deliveryTracking', {
          deliveryOrderId: orderId, status,
          location: location || {}, note: String(note || '').trim(), metadata,
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
          timestamp: serverTimestamp(), createdAt: serverTimestamp(),
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to add tracking event.') } }
    },
  }), [events, loading, error, userId, workspaceId, businessType, role])

  return api
}
