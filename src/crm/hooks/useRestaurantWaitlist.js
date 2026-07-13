import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { WAITLIST_STATUSES, WAITLIST_PRIORITIES, estimateWaitTime, validateWaitlistEntry } from '../lib/restaurantReservationCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

export function useRestaurantWaitlist({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [waitlist, setWaitlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'restaurantWaitlist', businessType, limitCount: 200,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setWaitlist(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load waitlist.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, role, userId, workspaceId])

  const waitingEntries = useMemo(() => waitlist.filter((w) => w.status === 'waiting').sort((a, b) => {
    const pa = WAITLIST_PRIORITIES.find((p) => p.id === a.priority)?.value || 0
    const pb = WAITLIST_PRIORITIES.find((p) => p.id === b.priority)?.value || 0
    if (pb !== pa) return pb - pa
    return (a.joinedAt?.toDate?.()?.getTime() || 0) - (b.joinedAt?.toDate?.()?.getTime() || 0)
  }), [waitlist])

  const api = useMemo(() => ({
    waitlist, loading, error, waitingEntries,
    statuses: WAITLIST_STATUSES,
    priorities: WAITLIST_PRIORITIES,

    async addToWaitlist(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateWaitlistEntry(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      try {
        const ref = await createUserDoc(workspaceId, 'restaurantWaitlist', {
          customerName: String(payload.customerName).trim(),
          phone: String(payload.phone || '').trim(),
          guests: Math.max(1, Number(payload.adults || 0) + Number(payload.children || 1)),
          adults: Math.max(1, Number(payload.adults || 1)),
          children: Math.max(0, Number(payload.children || 0)),
          priority: payload.priority || 'normal',
          estimatedWait: Math.max(5, Number(payload.estimatedWait || 15)),
          status: 'waiting',
          notes: String(payload.notes || '').trim(),
          vip: Boolean(payload.vip),
          birthday: Boolean(payload.birthday),
          notified: false,
          joinedAt: serverTimestamp(),
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to add to waitlist.') } }
    },

    async updateStatus(id, newStatus) {
      if (!id || !newStatus || !workspaceId || !db) return { ok: false }
      try {
        const patch = { status: newStatus, updatedAt: serverTimestamp() }
        if (newStatus === 'notified') patch.notified = true
        if (newStatus === 'seated') patch.seatedAt = serverTimestamp()
        await patchUserDoc(workspaceId, 'restaurantWaitlist', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        setWaitlist((prev) => prev.map((w) => w.id === id ? { ...w, ...patch } : w))
        if (newStatus === 'seated') {
          await logActivity({
            workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
            action: 'Waitlist seated', module: 'Reservations',
            description: `Waitlist entry seated`, targetId: id,
          })
        }
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update waitlist status.') } }
    },

    async removeFromWaitlist(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'restaurantWaitlist', id, { diagnostics: { currentUserUid: userId, role } })
        setWaitlist((prev) => prev.filter((w) => w.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to remove from waitlist.') } }
    },

    estimateWait(tables = [], reservations = []) {
      return estimateWaitTime(waitlist, tables, reservations)
    },
  }), [waitlist, loading, error, waitingEntries, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
