import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { PREP_STATUSES } from '../lib/kitchenProductionCalculations.js'

export function useKitchenPrep({ date = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const [prepItems, setPrepItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'restaurantKitchenPrep', businessType, limitCount: 200,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        let list = Array.isArray(data) ? data : []
        if (date) list = list.filter((p) => String(p.prepDate) === date)
        setPrepItems(list)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load prep items.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, date, enabled, role, userId, workspaceId])

  const todayPrep = useMemo(() => {
    const today = date || new Date().toISOString().slice(0, 10)
    return prepItems.filter((p) => String(p.prepDate || p.date) === today)
  }, [prepItems, date])

  const api = useMemo(() => ({
    prepItems, loading, error, todayPrep, statuses: PREP_STATUSES,

    async createPrepItem(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      if (!payload.menuItemId || !payload.prepDate || !payload.plannedQty) return { ok: false, error: 'Menu item, date, and qty required' }
      try {
        const ref = await createUserDoc(workspaceId, 'restaurantKitchenPrep', {
          menuItemId: payload.menuItemId,
          menuItemName: String(payload.menuItemName || '').trim(),
          menuItemCategory: payload.menuItemCategory || '',
          prepDate: payload.prepDate,
          shift: payload.shift || 'morning',
          plannedQty: Math.max(1, Number(payload.plannedQty)),
          completedQty: 0,
          remainingQty: Math.max(1, Number(payload.plannedQty)),
          status: 'pending',
          ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
          notes: String(payload.notes || '').trim(),
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create prep item.') } }
    },

    async updatePrepStatus(id, completedQty) {
      if (!id || !workspaceId || !db) return { ok: false }
      const item = prepItems.find((p) => p.id === id)
      if (!item) return { ok: false }
      const planned = Math.max(1, Number(item.plannedQty || 1))
      const completed = Math.max(0, Number(completedQty || 0))
      const remaining = Math.max(0, planned - completed)
      let status = 'pending'
      if (completed >= planned) status = 'completed'
      else if (completed > 0) status = 'partial'
      try {
        await patchUserDoc(workspaceId, 'restaurantKitchenPrep', id, {
          completedQty: completed, remainingQty: remaining, status, updatedAt: serverTimestamp(),
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setPrepItems((prev) => prev.map((p) => p.id === id ? { ...p, completedQty: completed, remainingQty: remaining, status } : p))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update prep item.') } }
    },

    async deletePrepItem(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'restaurantKitchenPrep', id, { diagnostics: { currentUserUid: userId, role } })
        setPrepItems((prev) => prev.filter((p) => p.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete prep item.') } }
    },
  }), [prepItems, loading, error, todayPrep, userId, workspaceId, businessType, role])

  return api
}
