import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import {
  createUserDoc,
  patchUserDoc,
  removeUserDoc,
  subscribeUserCollection,
  workspaceCollectionPath,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculatePurchaseBalanceDue, calculatePurchasePaymentStatus } from '../lib/financeCalculations.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

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
  const paidAmount = toNumber(purchase.paidAmount, 0)
  const returnedAmount = toNumber(purchase.returnedAmount, 0)
  const total = toNumber(purchase.total, 0)
  return {
    id: purchase.id,
    reference: purchase.reference || purchase.id,
    supplierId: purchase.supplierId || '',
    supplierName: purchase.supplierName || '',
    items,
    taxRate: toNumber(purchase.taxRate),
    subtotal: toNumber(purchase.subtotal),
    tax: toNumber(purchase.tax),
    total,
    currency: purchase.currency || 'PKR',
    status: purchase.status || 'ordered',
    notes: purchase.notes || '',
    expectedDate: purchase.expectedDate || '',
    receivedAt: purchase.receivedAt || null,
    // Payment fields
    paidAmount,
    returnedAmount,
    balanceDue: toNumber(purchase.balanceDue, Math.max(total - paidAmount - returnedAmount, 0)),
    paymentStatus: purchase.paymentStatus || calculatePurchasePaymentStatus({ ...purchase, paidAmount, total, returnedAmount }),
    lastPaymentAt: purchase.lastPaymentAt || null,
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'medium',
            title: 'Purchase order created',
            message: `Purchase order for ${purchase.supplierName || 'supplier'} was created.`,
            relatedId: ref.id,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Purchase order updated',
            message: `${purchase.reference || id} was updated.`,
            relatedId: id,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Purchase order deleted',
            message: `${id} was deleted.`,
            relatedId: id,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete purchase order.') }
        }
      },
      // Receiving stock applies each line as a `purchase` movement (increases stock
      // + writes an inventoryTransactions record) via the provided recordMovement helper.
      // Duplicate-protected per product via deterministic ledger IDs.
      async receivePurchase(id, recordMovement) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (typeof recordMovement !== 'function') return { ok: false, error: 'Stock handler unavailable' }

        // ── Fresh Firestore read — avoids stale local state race ──
        const purchaseRef = doc(db, workspaceCollectionPath(workspaceId, 'purchases'), id)
        const freshSnap = await getDoc(purchaseRef)
        if (!freshSnap.exists()) return { ok: false, error: 'Purchase order not found' }
        const freshPurchase = { id, ...freshSnap.data() }
        if (freshPurchase.status === 'received') return { ok: false, error: 'Stock already received' }

        try {
          for (const item of freshPurchase.items) {
            if (!item.productId || item.quantity <= 0) continue
            // eslint-disable-next-line no-await-in-loop
            const result = await recordMovement({
              type: 'purchase',
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitCost: item.unitCost,
              supplierId: freshPurchase.supplierId,
              supplierName: freshPurchase.supplierName,
              reference: freshPurchase.reference || id,
              referenceId: id,
              note: `Received from purchase order ${freshPurchase.reference || id}`,
            })
            if (!result.ok) {
              return { ok: false, error: `Failed to receive ${item.productName || item.productId}: ${result.error}` }
            }
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
            description: `Stock received for purchase order ${freshPurchase.reference || id}.`,
            targetId: id,
            targetName: freshPurchase.reference || id,
            metadata: { items: freshPurchase.items.length, total: freshPurchase.total },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'medium',
            title: 'Purchase stock received',
            message: `Stock received for purchase order ${freshPurchase.reference || id}.`,
            relatedId: id,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { items: freshPurchase.items.length, total: freshPurchase.total },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to receive stock.') }
        }
      },
      async recordPurchasePayment(id, amount, options = {}) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }

        const purchase = purchases.find((item) => item.id === id)
        if (!purchase) return { ok: false, error: 'Purchase order not found' }

        const paymentAmount = Math.max(toNumber(amount, 0), 0)
        if (paymentAmount <= 0) return { ok: false, error: 'Payment amount must be greater than zero' }

        const total = toNumber(purchase.total, 0)
        const currentPaid = toNumber(purchase.paidAmount, 0)
        if (currentPaid >= total) return { ok: false, error: 'Purchase is already fully paid' }

        // ── Wallet balance guard ──
        const availableBalance = toNumber(options.availableBalance, 0)
        if (paymentAmount > availableBalance && !options.allowNegativeWallet) {
          return { ok: false, error: 'Insufficient wallet balance for this supplier payment.' }
        }

        const newPaid = Math.min(currentPaid + paymentAmount, total)
        const acceptedAmount = newPaid - currentPaid
        const newBalanceDue = total - newPaid
        const newPaymentStatus = calculatePurchasePaymentStatus({ total, paidAmount: newPaid })

        const now = serverTimestamp()

        try {
          await patchUserDoc(workspaceId, 'purchases', id, {
            paidAmount: newPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,
            lastPaymentAt: now,
            updatedAt: now,
          }, { businessType })

          // ── Create accountTransactions entry ──
          const createTransaction = options.createTransaction
          if (typeof createTransaction === 'function' && acceptedAmount > 0) {
            const paymentMethod = options.paymentMethod || 'Manual'
            const supplierName = purchase.supplierName || ''
            const txnResult = await createTransaction({
              type: 'supplier_payment',
              amount: acceptedAmount,
              paymentMethod,
              method: paymentMethod,
              status: 'approved',
              approvalStatus: 'approved',
              requiresApproval: false,
              title: `Supplier payment — ${purchase.reference || id}`,
              description: `Payment of ${acceptedAmount} for purchase order ${purchase.reference || id} from ${supplierName}`,
              relatedId: id,
              availableBalance,
              allowNegativeWallet: options.allowNegativeWallet,
              reference: purchase.reference || id,
              supplierId: purchase.supplierId || '',
              supplierName,
              paidTo: supplierName,
              metadata: {
                purchaseId: id,
                purchaseReference: purchase.reference || id,
                supplierId: purchase.supplierId || '',
                supplierName,
                totalPaid: newPaid,
                balanceDue: newBalanceDue,
              },
            })
            if (!txnResult?.ok) {
              return { ok: false, error: `Supplier payment transaction failed: ${txnResult?.error || 'Unknown error'}` }
            }
          }

          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Purchase payment recorded',
            module: 'Inventory',
            description: `${purchase.reference || id} payment of ${paymentAmount} was recorded.`,
            targetId: id,
            targetName: purchase.reference || id,
            metadata: { paymentAmount, newPaid, newBalanceDue, paymentStatus: newPaymentStatus },
          })

          return { ok: true, paidAmount: newPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record purchase payment.') }
        }
      },
      async returnPurchaseItems(id, returnItems, recordMovement) {
        if (!id) return { ok: false, error: 'Purchase ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (typeof recordMovement !== 'function') return { ok: false, error: 'Stock handler unavailable' }

        const purchase = purchases.find((item) => item.id === id)
        if (!purchase) return { ok: false, error: 'Purchase order not found' }
        if (purchase.status !== 'received') return { ok: false, error: 'Only received purchases can be returned' }

        const items = (returnItems || []).filter(
          (item) => item.productId && Number(item.quantity ?? item.qty ?? 0) > 0,
        )
        if (!items.length) return { ok: false, error: 'No valid return items' }

        // ── Validate return quantities against original received quantities ──
        const receivedMap = {}
        purchase.items.forEach((orig) => {
          receivedMap[orig.productId] = (receivedMap[orig.productId] || 0) + toNumber(orig.quantity)
        })
        for (const item of items) {
          const qty = toNumber(item.quantity ?? item.qty, 0)
          const maxReturnable = receivedMap[item.productId] || 0
          if (qty > maxReturnable) {
            return { ok: false, error: `Return quantity ${qty} exceeds received quantity ${maxReturnable} for product ${item.productName || item.productId}` }
          }
        }

        const totalReturnAmount = items.reduce((sum, item) => {
          const qty = toNumber(item.quantity ?? item.qty, 0)
          const found = purchase.items.find((orig) => orig.productId === item.productId)
          return sum + (qty * (found ? toNumber(found.unitCost) : 0))
        }, 0)

        try {
          // ── Deduct stock for each returned item via recordMovement ──
          for (const item of items) {
            const qty = toNumber(item.quantity ?? item.qty, 0)
            // eslint-disable-next-line no-await-in-loop
            const result = await recordMovement({
              type: 'purchase_return',
              productId: item.productId,
              productName: item.productName || '',
              sku: item.sku || '',
              quantity: qty,
              unitCost: 0,
              supplierId: purchase.supplierId || '',
              supplierName: purchase.supplierName || '',
              reference: purchase.reference || id,
              referenceId: id,
              note: `Purchase return — ${purchase.reference || id}`,
            })
            if (!result.ok) {
              return { ok: false, error: `Failed to return ${item.productName || item.productId}: ${result.error}` }
            }
          }

          // ── Update purchase return fields ──
          const currentReturned = toNumber(purchase.returnedAmount, 0)
          const newReturned = currentReturned + totalReturnAmount
          const newTotal = toNumber(purchase.total, 0)
          const newBalanceDue = Math.max(newTotal - toNumber(purchase.paidAmount, 0) - newReturned, 0)
          const newPaymentStatus = calculatePurchasePaymentStatus({
            total: newTotal,
            paidAmount: toNumber(purchase.paidAmount, 0),
            returnedAmount: newReturned,
          })

          await patchUserDoc(workspaceId, 'purchases', id, {
            returnedAmount: newReturned,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,
            updatedAt: serverTimestamp(),
          }, { businessType })

          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Purchase return recorded',
            module: 'Inventory',
            description: `${items.length} item(s) returned from purchase ${purchase.reference || id}.`,
            targetId: id,
            targetName: purchase.reference || id,
            metadata: { returnAmount: totalReturnAmount, returnItems: items.length, newReturned, newBalanceDue },
          })

          return { ok: true, returnedAmount: newReturned, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to return purchase items.') }
        }
      },
    }),
    [purchases, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
