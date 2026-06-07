import { useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import {
  createUserDoc,
  patchUserDoc,
  removeUserDoc,
  subscribeUserCollection,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeItem(item) {
  const quantity = toNumber(item.quantity ?? item.qty)
  const unitCost = toNumber(item.unitCost ?? item.cost)
  return {
    productId: String(item.productId || '').trim(),
    productName: String(item.productName || item.name || '').trim(),
    sku: String(item.sku || '').trim(),
    quantity,
    unitCost,
    total: toNumber(item.total, quantity * unitCost),
  }
}

function computeTotals(items, taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.total, item.quantity * item.unitCost), 0)
  const tax = subtotal * (toNumber(taxRate) / 100)
  return { subtotal, tax, total: subtotal + tax }
}

function normalizePurchase(purchase) {
  const items = Array.isArray(purchase.items) ? purchase.items.map(normalizeItem) : []
  return {
    id: purchase.id,
    reference: purchase.reference || purchase.id,
    supplierId: purchase.supplierId || '',
    supplierName: purchase.supplierName || '',
    items,
    taxRate: toNumber(purchase.taxRate),
    subtotal: toNumber(purchase.subtotal),
    tax: toNumber(purchase.tax),
    total: toNumber(purchase.total),
    currency: purchase.currency || 'PKR',
    status: purchase.status || 'ordered',
    notes: purchase.notes || '',
    expectedDate: purchase.expectedDate || '',
    receivedAt: purchase.receivedAt || null,
    createdAt: purchase.createdAt || null,
    updatedAt: purchase.updatedAt || null,
  }
}

function sanitizePurchase(payload) {
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map(normalizeItem)
    .filter((item) => item.productId && item.quantity > 0)
  const totals = computeTotals(items, payload.taxRate)
  return {
    reference: String(payload.reference || '').trim(),
    supplierId: String(payload.supplierId || '').trim(),
    supplierName: String(payload.supplierName || '').trim(),
    items,
    taxRate: toNumber(payload.taxRate),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    currency: String(payload.currency || 'PKR').trim() || 'PKR',
    status: String(payload.status || 'ordered').trim() || 'ordered',
    notes: String(payload.notes || '').trim(),
    expectedDate: String(payload.expectedDate || '').trim(),
  }
}

export function usePurchases() {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setPurchases([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      'purchases',
      (rows) => {
        setPurchases((Array.isArray(rows) ? rows : []).map(normalizePurchase))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load purchases.'))
        setPurchases([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, workspaceId])

  return useMemo(
    () => ({
      purchases,
      loading,
      error,
      async createPurchase(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const purchase = sanitizePurchase(payload)
        if (!purchase.supplierName && !purchase.supplierId) return { ok: false, error: 'Select a supplier' }
        if (!purchase.items.length) return { ok: false, error: 'Add at least one product line' }
        try {
          const ref = await createUserDoc(workspaceId, 'purchases', { ...purchase, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Purchase order created',
            module: 'Inventory',
            description: `Purchase order for ${purchase.supplierName || 'supplier'} (${purchase.items.length} items).`,
            targetId: ref.id,
            targetName: purchase.reference || ref.id,
            metadata: { total: purchase.total, items: purchase.items.length },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create purchase order.') }
        }
      },
      async updatePurchase(id, payload) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const purchase = sanitizePurchase(payload)
        if (!purchase.items.length) return { ok: false, error: 'Add at least one product line' }
        try {
          await patchUserDoc(workspaceId, 'purchases', id, purchase, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update purchase order.') }
        }
      },
      async deletePurchase(id) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, 'purchases', id)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete purchase order.') }
        }
      },
      // Receiving stock applies each line as a `purchase` movement (increases stock
      // + writes an inventoryTransactions record) via the provided recordMovement helper.
      async receivePurchase(id, recordMovement) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (typeof recordMovement !== 'function') return { ok: false, error: 'Stock handler unavailable' }
        const purchase = purchases.find((item) => item.id === id)
        if (!purchase) return { ok: false, error: 'Purchase order not found' }
        if (purchase.status === 'received') return { ok: false, error: 'Stock already received' }

        try {
          for (const item of purchase.items) {
            if (!item.productId || item.quantity <= 0) continue
            // eslint-disable-next-line no-await-in-loop
            await recordMovement({
              type: 'purchase',
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitCost: item.unitCost,
              supplierId: purchase.supplierId,
              supplierName: purchase.supplierName,
              reference: purchase.reference || id,
              note: `Received from purchase order ${purchase.reference || id}`,
            })
          }

          await patchUserDoc(
            workspaceId,
            'purchases',
            id,
            { status: 'received', receivedAt: serverTimestamp() },
            { businessType },
          )

          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Purchase received',
            module: 'Inventory',
            description: `Stock received for purchase order ${purchase.reference || id}.`,
            targetId: id,
            targetName: purchase.reference || id,
            metadata: { items: purchase.items.length, total: purchase.total },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to receive stock.') }
        }
      },
    }),
    [purchases, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
