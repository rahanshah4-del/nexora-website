import { arrayUnion, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { workspaceCollectionPath } from './firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

/**
 * Restore stock for sold product items. Each item gets +qty to product stock
 * and an immutable ledger entry of type 'sales_return'.
 *
 * Call this when an order/invoice is cancelled, refunded, marked unpaid,
 * or deleted — only when stock was previously deducted.
 *
 * Duplicate-protected per product via a deterministic ledger doc ID.
 * The check and write happen inside a single runTransaction so there is
 * no TOCTOU race window. A product that already has a sales_return ledger
 * entry for this referenceId is skipped while other products still proceed.
 *
 * @param {Object} opts
 * @param {Object} opts.db             – Firestore db instance
 * @param {string} opts.workspaceId
 * @param {string} opts.businessType
 * @param {string} opts.userId
 * @param {Array}  opts.items          – [{ productId, quantity/qty, productName?, sku? }]
 * @param {string} opts.referenceId    – order/invoice Firestore id
 * @param {string} [opts.reference]    – human-readable order/invoice number
 * @returns {{ ok: boolean, restored: number, errors: string[], skipped: number }}
 */
export async function restoreInventoryItems({
  db,
  workspaceId,
  businessType,
  userId,
  items,
  referenceId,
  reference,
}) {
  if (!db || !workspaceId || !userId) {
    return { ok: false, restored: 0, errors: ['Missing db/workspaceId/userId'], skipped: 0 }
  }

  const productItems = (items || []).filter(
    (item) => item.productId && Number(item.quantity ?? item.qty ?? 0) > 0,
  )
  if (!productItems.length) return { ok: true, restored: 0, errors: [], skipped: 0 }

  const normalizedBT = normalizeBusinessType(businessType)
  const errors = []
  let restored = 0
  let skipped = 0

  for (const item of productItems) {
    const qty = Number(item.quantity ?? item.qty ?? 0)
    const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), item.productId)
    const now = new Date().toISOString()

    // Deterministic ledger doc ID — enables atomic duplicate check inside runTransaction.
    const ledgerId = referenceId
      ? `sales_return_${referenceId}_${item.productId}`
      : doc(collection(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions'))).id
    const ledgerRef = doc(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions'), ledgerId)

    try {
      await runTransaction(db, async (txn) => {
        // ── Atomic per-product duplicate check ──
        const ledgerSnap = await txn.get(ledgerRef)
        if (ledgerSnap.exists()) {
          skipped++
          return
        }

        const snap = await txn.get(productRef)
        if (!snap.exists()) {
          errors.push(`product ${item.productId}: not found`)
          return
        }
        const product = snap.data()
        const prevQty = Number(product.stockQuantity ?? product.stock ?? 0)
        const newQty = prevQty + qty

        txn.update(productRef, {
          stockQuantity: newQty,
          stockHistory: arrayUnion({
            type: 'sales_return',
            quantity: qty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            delta: qty,
            note: `Sales return — ${reference || referenceId || ''}`,
            createdAt: now,
            createdBy: userId,
          }),
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType: normalizedBT,
          updatedAt: serverTimestamp(),
        })

        txn.set(ledgerRef, {
          type: 'sales_return',
          productId: item.productId,
          productName: item.productName || product.name || '',
          sku: item.sku || product.sku || '',
          quantity: qty,
          delta: qty,
          previousQuantity: prevQty,
          newQuantity: newQty,
          unitCost: 0,
          totalCost: 0,
          note: `Sales return — ${reference || referenceId || ''}`,
          reference: reference || '',
          referenceId: referenceId || '',
          supplierId: '',
          supplierName: '',
          fromBranch: '',
          toBranch: '',
          createdBy: userId,
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType: normalizedBT,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
      restored++
    } catch (e) {
      errors.push(`product ${item.productId}: ${e.message}`)
    }
  }

  return { ok: errors.length === 0, restored, errors, skipped }
}
