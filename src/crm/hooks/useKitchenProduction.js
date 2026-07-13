import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { BATCH_STATUSES, BATCH_STATUS_TRANSITIONS, generateBatchNumber, calculateBatchRequirements, validateBatchStockAvailability, calculateProductionCost, validateBatch } from '../lib/kitchenProductionCalculations.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

export function useProductionBatches({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [counter, setCounter] = useState(1)

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'restaurantProductionBatches', businessType, limitCount: 200,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        const list = Array.isArray(data) ? data : []
        setBatches(list)
        setCounter(list.length + 1)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load batches.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, role, userId, workspaceId])

  const activeBatches = useMemo(() => batches.filter((b) => b.status === 'in_progress' || b.status === 'planned'), [batches])

  const api = useMemo(() => ({
    batches, loading, error, activeBatches, statuses: BATCH_STATUSES, transitions: BATCH_STATUS_TRANSITIONS,

    async createBatch(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateBatch(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      const batchNumber = generateBatchNumber(counter)
      const requirements = calculateBatchRequirements(payload.recipe || {}, payload.plannedQty)
      const totalCost = (Array.isArray(payload.recipe?.ingredients) ? payload.recipe.ingredients : []).reduce((s, ing) => s + (Math.max(0, Number(ing.quantity || 0)) * Math.max(0, Number(ing.costPerUnit || 0)) * Math.max(1, Number(payload.plannedQty || 1))), 0)
      try {
        const ref = await createUserDoc(workspaceId, 'restaurantProductionBatches', {
          batchNumber,
          menuItemId: payload.menuItemId,
          menuItemName: String(payload.menuItemName || '').trim(),
          plannedQty: Math.max(1, Number(payload.plannedQty)),
          actualQty: null,
          wasteQty: 0,
          totalCost,
          requirements,
          status: 'planned',
          notes: String(payload.notes || '').trim(),
          shift: payload.shift || 'morning',
          expiresAt: payload.expiresAt || null,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setCounter((c) => c + 1)
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Batch created', module: 'Kitchen Production',
          description: `Batch ${batchNumber} for ${payload.menuItemName} (qty: ${payload.plannedQty})`,
          targetId: ref.id, targetName: payload.menuItemName,
        })
        return { ok: true, id: ref.id, batchNumber }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create batch.') } }
    },

    async updateBatchStatus(id, newStatus, meta = {}) {
      if (!id || !newStatus || !workspaceId || !db) return { ok: false }
      const current = batches.find((b) => b.id === id)
      const allowed = BATCH_STATUS_TRANSITIONS[current?.status] || []
      if (!allowed.includes(newStatus)) return { ok: false, error: `Cannot transition from ${current?.status} to ${newStatus}` }
      try {
        const patch = { status: newStatus, ...meta, updatedAt: serverTimestamp() }
        await patchUserDoc(workspaceId, 'restaurantProductionBatches', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        setBatches((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update batch.') } }
    },

    async completeBatch(id, { actualQty, wasteQty = 0, notes = '' } = {}) {
      if (!id || !workspaceId || !db) return { ok: false }
      const batch = batches.find((b) => b.id === id)
      if (!batch) return { ok: false, error: 'Batch not found' }
      const actual = Math.max(0, Number(actualQty || batch.plannedQty))
      const waste = Math.max(0, Number(wasteQty))
      const costCalc = calculateProductionCost(batch.totalCost ? batch.totalCost / Math.max(1, Number(batch.plannedQty || 1)) : 0, Number(batch.plannedQty || 1), actual)

      try {
        await runTransaction(db, async (tx) => {
          const ref = (await import('firebase/firestore')).doc(db, workspaceCollectionPath(workspaceId, 'restaurantProductionBatches'), id)
          tx.update(ref, {
            status: 'completed', actualQty: actual, wasteQty: waste,
            totalCost: costCalc.totalActualCost, yield_ : Math.round((actual / Math.max(1, Number(batch.plannedQty || 1))) * 100),
            notes: notes || batch.notes, completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
          const finishedRef = (await import('firebase/firestore')).doc((await import('firebase/firestore')).collection(db, workspaceCollectionPath(workspaceId, 'restaurantFinishedInventory')))
          tx.set(finishedRef, {
            batchId: id, menuItemId: batch.menuItemId, menuItemName: batch.menuItemName,
            quantity: actual, costPerUnit: costCalc.costPerUnit, category: 'finished_goods',
            workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
        })
        setBatches((prev) => prev.map((b) => b.id === id ? { ...b, status: 'completed', actualQty: actual, wasteQty: waste, totalCost: costCalc.totalActualCost } : b))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to complete batch.') } }
    },

    async deleteBatch(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'restaurantProductionBatches', id, { diagnostics: { currentUserUid: userId, role } })
        setBatches((prev) => prev.filter((b) => b.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete batch.') } }
    },
  }), [batches, loading, error, activeBatches, counter, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
