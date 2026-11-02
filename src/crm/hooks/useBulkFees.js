import { useMemo } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, removeUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { isRejectedRecord } from '../lib/calculations.js'
import { buildBillPayload, billNumber, monthLabel } from '../lib/bulkFees.js'
import { resolveInvoicePermissions } from '../lib/invoiceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'

const WORKERS = 5

/** Run `task(item)` for every item with a few in flight at once; reports progress after each one. */
async function runPool(items, task, onProgress) {
  let next = 0
  let done = 0
  const results = new Array(items.length)
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await task(items[index], index)
      done += 1
      onProgress?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(WORKERS, items.length) }, worker))
  return results
}

/** Bulk creation of monthly fee bills for the school workspace. */
export function useBulkFees() {
  const { userId, workspaceId, businessType, role, userDoc, firebaseUser, activeBranchId } = useUser()
  const access = useWorkspaceAccess()
  const permissions = resolveInvoicePermissions(role, userDoc, access.permissions, access.explicitPermissions)
  const canGenerate = Boolean(permissions.canCreateInvoice ?? permissions.canCreate)
  const canDelete = Boolean(permissions.canDeleteInvoice ?? permissions.canDelete)

  return useMemo(() => ({
    canGenerate,

    /** Students who already have a live bill for the month, and the invoice numbers in use. */
    async loadMonth(month) {
      if (!db || !workspaceId || !month) return { ok: false, error: 'Please login first' }
      try {
        const snap = await getDocs(query(collection(db, workspaceCollectionPath(workspaceId, 'invoices')), where('feeMonth', '==', month)))
        const billedIds = new Set()
        const numbers = new Set()
        snap.docs.forEach((d) => {
          const data = d.data()
          if (data.invoiceNumber) numbers.add(String(data.invoiceNumber).toUpperCase())
          if (data.customerId && !isRejectedRecord(data)) billedIds.add(data.customerId)
        })
        return { ok: true, billedIds, numbers }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to check the bills already created for this month.') }
      }
    },

    /**
     * Create one bill per ready row. Never throws: returns { ok, created, failed: [{name, error}], batchId }.
     * Partial failures leave the successful bills in place; run again and only the missing students are billed.
     */
    async generate(rows, options, onProgress) {
      if (!canGenerate) return { ok: false, error: 'You do not have permission to create fee bills.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Please login first' }
      const ready = rows.filter((row) => row.status === 'ready')
      if (!ready.length) return { ok: false, error: 'No student is ready to be billed.' }

      const batchId = `bulk-${Date.now().toString(36)}`
      const taken = new Set(options.takenNumbers || [])
      // Numbers are chosen up front, one by one, so parallel workers can never pick the same one.
      const planned = ready.map((row) => ({ row, number: billNumber({ prefix: options.prefix, month: options.month, student: row.student, taken }) }))
      const failed = []
      const created = []
      await runPool(planned, async ({ row, number }) => {
        const payload = {
          ...buildBillPayload(row, { ...options, batchId, number, businessType }),
          workspaceId,
          branchId: activeBranchId || null,
          createdBy: userId,
          ...(options.needsApproval ? { submittedForApprovalBy: userId } : {}),
        }
        try {
          const ref = await createUserDoc(workspaceId, 'invoices', payload, { businessType })
          created.push({ id: ref.id, name: row.name, total: row.total })
        } catch (err) {
          failed.push({ name: row.name, error: clientSafeMessage(err, 'Unable to save.') })
        }
      }, onProgress)

      const amount = created.reduce((sum, bill) => sum + bill.total, 0)
      if (created.length) {
        // Supplementary: one summary note instead of one per student.
        const label = monthLabel(options.month)
        logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Fee bills generated', module: 'Invoices',
          description: `${created.length} fee bills were generated for ${label}.`, targetName: batchId,
          metadata: { count: created.length, amount, month: options.month, batchId },
        }).catch(() => {})
        createWorkspaceNotification({
          workspaceId, userId, businessType, type: 'Invoices', priority: options.needsApproval ? 'high' : 'medium',
          title: options.needsApproval ? 'Fee bills waiting for approval' : 'Fee bills generated',
          message: `${created.length} fee bills for ${label} were created.`,
          route: options.needsApproval ? '/app/approvals' : '/app/invoices',
          createdBy: userId, createdByEmail: firebaseUser?.email || userDoc?.email || '',
          metadata: { count: created.length, batchId },
        }).catch(() => {})
      }
      return { ok: created.length > 0, created: created.length, amount, failed, batchId, error: created.length ? '' : 'No bill could be saved.' }
    },

    /** Delete the unpaid bills of one batch. Bills that already received a payment are kept. */
    async undoBatch(batchId) {
      if (!db || !workspaceId || !batchId) return { ok: false, error: 'Nothing to undo.' }
      if (!canDelete) return { ok: false, error: 'Only owner or admin can delete fee bills.' }
      try {
        const snap = await getDocs(query(collection(db, workspaceCollectionPath(workspaceId, 'invoices')), where('bulkBatchId', '==', batchId)))
        const deletable = snap.docs.filter((d) => !(Number(d.data().amountPaid ?? d.data().partialPaidAmount ?? 0) > 0))
        let removed = 0
        await runPool(deletable, async (d) => {
          try { await removeUserDoc(workspaceId, 'invoices', d.id, { businessType }); removed += 1 } catch { /* counted below */ }
        })
        logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Fee bills batch undone', module: 'Invoices', description: `${removed} generated fee bills were deleted.`, targetName: batchId,
        }).catch(() => {})
        return { ok: true, removed, kept: snap.size - deletable.length, failed: deletable.length - removed }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to undo this batch.') }
      }
    },
  }), [activeBranchId, businessType, canDelete, canGenerate, firebaseUser, userDoc, userId, workspaceId])
}
