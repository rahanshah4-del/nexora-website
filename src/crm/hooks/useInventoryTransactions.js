import { useEffect, useMemo, useState } from 'react'
import { arrayUnion, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import {
  createUserDoc,
  patchUserDoc,
  subscribeUserCollection,
  workspaceCollectionPath,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

// Movement types and how each affects on-hand stock.
//  +1 => increases stock, -1 => decreases stock,
//  'set' => quantity is the new absolute count, 'none' => ledger only.
export const MOVEMENT_TYPES = {
  stock_in: { label: 'Stock In', direction: 1, tone: 'success' },
  opening: { label: 'Opening Stock', direction: 1, tone: 'info' },
  returned: { label: 'Returned Stock', direction: 1, tone: 'info' },
  purchase: { label: 'Purchase', direction: 1, tone: 'success' },
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
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

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
          // Read current stock from the products collection (source of truth).
          const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), productId)
          const snap = await getDoc(productRef)
          if (!snap.exists()) return { ok: false, error: 'Product not found' }
          const product = snap.data()
          const previousQuantity = toNumber(product.stockQuantity ?? product.stock, 0)

          let newQuantity = previousQuantity
          if (config.direction === 1) newQuantity = previousQuantity + quantity
          else if (config.direction === -1) newQuantity = Math.max(0, previousQuantity - quantity)
          else if (config.direction === 'set') newQuantity = Math.max(0, toNumber(input?.quantity))
          // 'none' (transfer) leaves on-hand stock unchanged.

          const delta = newQuantity - previousQuantity
          const movementQty = config.direction === 'set' ? Math.abs(delta) : quantity
          const unitCost = toNumber(input?.unitCost, toNumber(product.costPrice))
          const productName = product.name || input?.productName || 'Product'
          const sku = product.sku || input?.sku || ''

          // 1) Update product stock + append to its stock history (skip when neutral).
          if (config.direction !== 'none') {
            await patchUserDoc(
              workspaceId,
              'products',
              productId,
              {
                stockQuantity: newQuantity,
                stockHistory: arrayUnion({
                  type,
                  quantity: movementQty,
                  previousQuantity,
                  newQuantity,
                  delta,
                  note: String(input?.note || movementLabel(type)),
                  createdAt: new Date().toISOString(),
                  createdBy: userId,
                }),
              },
              { businessType },
            )
          }

          // 2) Write the immutable transaction ledger record.
          const ref = await createUserDoc(
            workspaceId,
            'inventoryTransactions',
            {
              type,
              productId,
              productName,
              sku,
              quantity: movementQty,
              delta,
              previousQuantity,
              newQuantity,
              unitCost,
              totalCost: unitCost * movementQty,
              note: String(input?.note || ''),
              reference: String(input?.reference || ''),
              supplierId: String(input?.supplierId || ''),
              supplierName: String(input?.supplierName || ''),
              fromBranch: String(input?.fromBranch || ''),
              toBranch: String(input?.toBranch || ''),
              createdBy: userId,
            },
            { businessType },
          )

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

          return { ok: true, id: ref.id, newQuantity }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record stock movement.') }
        }
      },
    }),
    [transactions, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
