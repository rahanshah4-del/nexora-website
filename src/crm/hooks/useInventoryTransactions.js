import { useEffect, useMemo, useState } from 'react'
import { arrayUnion, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import {
  subscribeUserCollection,
  workspaceCollectionPath,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

// Movement types and how each affects on-hand stock.
//  +1 => increases stock, -1 => decreases stock,
//  'set' => quantity is the new absolute count, 'none' => ledger only.
export const MOVEMENT_TYPES = {
  stock_in: { label: 'Stock In', direction: 1, tone: 'success' },
  opening: { label: 'Opening Stock', direction: 1, tone: 'info' },
  returned: { label: 'Returned Stock', direction: 1, tone: 'info' },
  sales_return: { label: 'Sales Return', direction: 1, tone: 'info' },
  purchase: { label: 'Purchase', direction: 1, tone: 'success' },
  purchase_return: { label: 'Purchase Return', direction: -1, tone: 'warning' },
  stock_out: { label: 'Stock Out', direction: -1, tone: 'warning' },
  sale: { label: 'Sale', direction: -1, tone: 'purple' },
  damaged: { label: 'Damaged Stock', direction: -1, tone: 'danger' },
  adjustment: { label: 'Adjustment', direction: 'set', tone: 'warning' },
  transfer: { label: 'Transfer', direction: 'none', tone: 'default' },
}

export function movementLabel(type) {
  return MOVEMENT_TYPES[type]?.label || String(type || 'Movement')
}

export function movementTone(type) {
  return MOVEMENT_TYPES[type]?.tone || 'default'
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeTransaction(txn) {
  return {
    id: txn.id,
    type: txn.type || 'adjustment',
    productId: txn.productId || '',
    productName: txn.productName || 'Unknown product',
    sku: txn.sku || '',
    quantity: toNumber(txn.quantity),
    delta: toNumber(txn.delta),
    previousQuantity: toNumber(txn.previousQuantity),
    newQuantity: toNumber(txn.newQuantity),
    unitCost: toNumber(txn.unitCost),
    totalCost: toNumber(txn.totalCost),
    note: txn.note || '',
    reference: txn.reference || '',
    referenceId: txn.referenceId || '',
    supplierId: txn.supplierId || '',
    supplierName: txn.supplierName || '',
    fromBranch: txn.fromBranch || '',
    toBranch: txn.toBranch || '',
    createdBy: txn.createdBy || txn.userId || '',
    createdAt: txn.createdAt || null,
  }
}

export function useInventoryTransactions(options = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : null
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setTransactions([])
        setLoading(false)
        setError('')
      })
      return undefined
    }
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setTransactions([])
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
      'inventoryTransactions',
      (rows) => {
        setTransactions((Array.isArray(rows) ? rows : []).map(normalizeTransaction))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load inventory transactions.'))
        setTransactions([])
        setLoading(false)
      },
      {
        businessType,
        orderByField: limitCount ? 'createdAt' : '',
        orderDirection: 'desc',
        limitCount,
      },
    )

    return () => unsub?.()
  }, [businessType, enabled, limitCount, workspaceId])

  return useMemo(
    () => ({
      transactions,
      loading,
      error,
      async recordMovement(input) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }

        const type = String(input?.type || '').trim()
        const config = MOVEMENT_TYPES[type]
        if (!config) return { ok: false, error: 'Invalid stock movement type' }

        const productId = String(input?.productId || '').trim()
        if (!productId) return { ok: false, error: 'Select a product' }

        const quantity = Math.abs(toNumber(input?.quantity))
        if (quantity <= 0 && config.direction !== 'set') {
          return { ok: false, error: 'Quantity must be greater than zero' }
        }

        try {
          const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), productId)
          const referenceId = String(input?.referenceId || '').trim()

          // Deterministic ledger doc ID for purchase movements — enables atomic
          // duplicate detection. All other movements use a random ID as before.
          const ledgerId = referenceId && type === 'purchase'
            ? `purchase_${referenceId}_${productId}`
            : doc(collection(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions'))).id
          const ledgerRef = doc(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions'), ledgerId)

          const now = new Date().toISOString()
          const normalizedBT = normalizeBusinessType(businessType)

          const { newQuantity, movementQty, unitCost, productName, sku, previousQuantity, delta, alreadyExists } =
            await runTransaction(db, async (txn) => {
              // ── Atomic duplicate check for purchase movements ──
              if (type === 'purchase' && referenceId) {
                const dupSnap = await txn.get(ledgerRef)
                if (dupSnap.exists()) {
                  return { alreadyExists: true, newQuantity: 0, movementQty: 0, unitCost: 0, productName: '', sku: '', previousQuantity: 0, delta: 0 }
                }
              }

              const snap = await txn.get(productRef)
              if (!snap.exists()) throw new Error('Product not found')
              const product = snap.data()
              const prevQty = toNumber(product.stockQuantity ?? product.stock, 0)

              let newQty = prevQty
              if (config.direction === 1) newQty = prevQty + quantity
              else if (config.direction === -1) {
                if (prevQty < quantity)
                  throw new Error(
                    `Insufficient stock. Available: ${prevQty}, requested: ${quantity}`,
                  )
                newQty = prevQty - quantity
              } else if (config.direction === 'set') newQty = toNumber(input?.quantity)
              // 'none' (transfer) leaves on-hand stock unchanged.

              const d = newQty - prevQty
              const movQty = config.direction === 'set' ? Math.abs(d) : quantity
              const uCost = toNumber(input?.unitCost, toNumber(product.costPrice))
              const pName = product.name || input?.productName || 'Product'
              const s = product.sku || input?.sku || ''

              if (config.direction !== 'none') {
                txn.update(productRef, {
                  stockQuantity: newQty,
                  stockHistory: arrayUnion({
                    type,
                    quantity: movQty,
                    previousQuantity: prevQty,
                    newQuantity: newQty,
                    delta: d,
                    note: String(input?.note || movementLabel(type)),
                    createdAt: now,
                    createdBy: userId,
                  }),
                  ownerId: workspaceId,
                  userId: workspaceId,
                  workspaceId,
                  businessType: normalizedBT,
                  updatedAt: serverTimestamp(),
                })
              }

              txn.set(ledgerRef, {
                type,
                productId,
                productName: pName,
                sku: s,
                quantity: movQty,
                delta: d,
                previousQuantity: prevQty,
                newQuantity: newQty,
                unitCost: uCost,
                totalCost: uCost * movQty,
                note: String(input?.note || ''),
                reference: String(input?.reference || ''),
                referenceId,
                supplierId: String(input?.supplierId || ''),
                supplierName: String(input?.supplierName || ''),
                fromBranch: String(input?.fromBranch || ''),
                toBranch: String(input?.toBranch || ''),
                createdBy: userId,
                ownerId: workspaceId,
                userId: workspaceId,
                workspaceId,
                businessType: normalizedBT,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })

              return {
                newQuantity: newQty,
                movementQty: movQty,
                unitCost: uCost,
                productName: pName,
                sku: s,
                previousQuantity: prevQty,
                delta: d,
                alreadyExists: false,
              }
            })

          // Skip activity log for duplicate — already logged on first receive.
          if (!alreadyExists) {
            await logActivity({
              workspaceId,
              userId,
              businessType,
              ...userActivityInfo(userDoc, firebaseUser),
              action: `Stock ${movementLabel(type)}`,
              module: 'Inventory',
              description: `${movementLabel(type)} of ${movementQty} for ${productName}.`,
              targetId: productId,
              targetName: productName,
              metadata: { type, quantity: movementQty, previousQuantity, newQuantity },
            })
          }

          return { ok: true, id: ledgerRef.id, newQuantity, alreadyExists }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record stock movement.') }
        }
      },
    }),
    [transactions, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
