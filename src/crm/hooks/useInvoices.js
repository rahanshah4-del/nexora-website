import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import {
  calculateBalanceDue,
  calculateInvoiceTotals,
  getInvoiceStatus,
  normalizeCurrency,
  paymentValue,
  statusValue,
  toNumber,
} from '../lib/calculations.js'

function normalizeInvoice(inv) {
  const calculated = calculateInvoiceTotals(inv)
  const normalized = {
    ...inv,
    ...calculated,
    currency: normalizeCurrency(inv.currency),
    paymentStatus: statusValue(inv.paymentStatus || inv.status, 'pending'),
    approvalStatus: statusValue(inv.approvalStatus, 'pending'),
    requiresApproval: inv.requiresApproval ?? true,
  }
  return {
    ...normalized,
    status: getInvoiceStatus(normalized),
    subtotalUsd: normalized.subtotal,
    taxAmountUsd: normalized.taxAmount,
    totalUsd: normalized.total,
  }
}

function normalizePayment(payment) {
  return {
    ...payment,
    id: payment.id,
    invoiceId: payment.invoiceId || payment.invoiceNumber || '—',
    customerName: payment.customerName || '—',
    amount: paymentValue(payment),
    amountUsd: paymentValue(payment),
    currency: normalizeCurrency(payment.currency),
    paymentMethod: payment.paymentMethod || 'Manual Approval',
    paymentStatus: statusValue(payment.paymentStatus || payment.status, 'pending'),
    paidAt: payment.paidAt || payment.createdAt || null,
    reference: payment.reference || payment.invoiceNumber || '—',
  }
}

async function addInventoryAdjustments(batch, workspaceId, invoice, now) {
  if (!db || !workspaceId || invoice.inventoryAdjustedAt || invoice.stockAdjustedAt) return false
  const productItems = (invoice.items || []).filter((item) => item.productId && toNumber(item.quantity ?? item.qty, 0) > 0)
  if (!productItems.length) return false

  await Promise.all(
    productItems.map(async (item) => {
      const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), item.productId)
      const productSnap = await getDoc(productRef)
      if (!productSnap.exists()) return
      const currentStock = toNumber(productSnap.data().stockQuantity ?? productSnap.data().stock, 0)
      batch.update(productRef, {
        stockQuantity: Math.max(0, currentStock - toNumber(item.quantity ?? item.qty, 0)),
        updatedAt: now,
      })
    }),
  )

  return true
}

function canRoleApprovePayments(role, userDoc) {
  const rawRole = String(userDoc?.role ?? role ?? '').toLowerCase()
  return ['owner', 'admin', 'accountant'].includes(rawRole)
}

export function useInvoices() {
  const { userId, workspaceId, role, userDoc, firebaseUser } = useUser()
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsubInv = subscribeUserCollection(
      workspaceId,
      'invoices',
      (rows) => {
        setInvoices((Array.isArray(rows) ? rows : []).map(normalizeInvoice))
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load invoices.'))
        setInvoices([])
        setSource('firestore')
        setLoading(false)
      },
    )
    const unsubPay = subscribeUserCollection(
      workspaceId,
      'payments',
      (rows) => setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment)),
      () => setPayments([]),
    )
    return () => {
      unsubInv?.()
      unsubPay?.()
    }
  }, [workspaceId])

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.paymentStatus === 'paid' || i.status === 'paid').length
    const pending = invoices.filter((i) => i.paymentStatus === 'pending' || i.status === 'pending').length
    const overdue = invoices.filter((i) => i.status === 'overdue').length
    const cancelled = invoices.filter((i) => i.status === 'cancelled' || i.paymentStatus === 'rejected').length
    return { paid, pending, overdue, cancelled, total: invoices.length }
  }, [invoices])

  const canApprovePayments = canRoleApprovePayments(role, userDoc)

  const api = useMemo(
    () => ({
      invoices,
      payments,
      loading,
      source,
      error,
      stats,
      canApprovePayments,
      async createInvoice(payload) {
        const invoice = normalizeInvoice(payload)
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const invNo = String(invoice.invoiceNumber || '').trim()
        const name = String(invoice.customerName || '').trim()
        const email = String(invoice.customerEmail || '').trim()
        if (!invNo) return { ok: false, error: 'Invoice number is required' }
        if (!name) return { ok: false, error: 'Customer name is required' }
        if (!email) return { ok: false, error: 'Customer email is required' }
        if (!invoice.items.length) return { ok: false, error: 'Add at least one invoice item' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          const docPayload = {
            invoiceNumber: invNo,
            customerName: name,
            customerEmail: email,
            customerPhone: invoice.customerPhone || '',
            items: invoice.items,
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            taxableAmount: invoice.taxableAmount,
            taxRate: invoice.taxRate ?? 0,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            currency: invoice.currency || 'PKR',
            status: 'pending',
            paymentStatus: 'pending',
            approvalStatus: 'pending',
            requiresApproval: true,
            amountPaid: 0,
            partialPaidAmount: 0,
            balanceDue: invoice.total,
            dueDate: invoice.dueDate || '—',
            recurring: Boolean(invoice.recurring),
            notes: invoice.notes || '',
            createdBy: userId,
            createdAt: serverTimestamp(),
            subtotalUsd: invoice.subtotal,
            taxAmountUsd: invoice.taxAmount,
            totalUsd: invoice.total,
          }
          const ref = await createUserDoc(workspaceId, 'invoices', docPayload)
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice created',
            module: 'Invoices',
            description: `${invNo} was created for ${name}.`,
            targetId: ref.id,
            targetName: invNo,
            metadata: { customerName: name, total: invoice.total, currency: invoice.currency },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create invoice.') }
        }
      },
      async markInvoicePaid(id, options = {}) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can approve payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        if (getInvoiceStatus(invoice) === 'paid') return { ok: false, error: 'This invoice is already paid.' }
        try {
          const paymentMethod = options.paymentMethod || 'Manual Approval'
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id)
          const stockAdjusted = await addInventoryAdjustments(batch, workspaceId, invoice, now)
          batch.update(invoiceRef, {
            paymentStatus: 'paid',
            status: 'paid',
            approvalStatus: 'approved',
            requiresApproval: false,
            paidAt: now,
            approvedBy: userId,
            approvedAt: now,
            amountPaid: invoice.total,
            partialPaidAmount: invoice.total,
            balanceDue: 0,
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'payments')))
          const transactionId = `${workspaceId}-income-${id}-${Date.now()}`
          batch.set(paymentRef, {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount: invoice.total,
            amountPaid: invoice.total,
            amountUsd: invoice.total,
            currency: invoice.currency || 'PKR',
            paymentMethod,
            paymentStatus: 'paid',
            status: 'paid',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            createdAt: now,
            updatedAt: now,
          })
          const transactionRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'accountTransactions')))
          batch.set(transactionRef, {
            transactionId,
            type: 'income',
            source: 'invoice',
            amount: invoice.total,
            currency: invoice.currency || 'PKR',
            method: paymentMethod,
            status: 'approved',
            approvalStatus: 'approved',
            title: `Invoice payment - ${invoice.invoiceNumber || id}`,
            description: `${invoice.customerName || 'Customer'} invoice payment was added to wallet.`,
            relatedId: id,
            invoiceId: id,
            paymentId: paymentRef.id,
            customerName: invoice.customerName || '',
            createdBy: userId,
            approvedBy: userId,
            approvedAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            createdAt: now,
            updatedAt: now,
            metadata: {
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: invoice.amountPaid || 0 },
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoice.total },
            },
          })
          await batch.commit()
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice paid',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} was marked as paid.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              amount: invoice.total,
              currency: invoice.currency,
              paymentMethod,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: invoice.amountPaid || 0 },
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoice.total },
            },
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice payment added to wallet',
            module: 'Account Management',
            description: `${invoice.invoiceNumber || id} payment was added to wallet.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              amount: invoice.total,
              currency: invoice.currency,
              paymentMethod,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: invoice.amountPaid || 0 },
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoice.total },
            },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to mark invoice as paid.') }
        }
      },
      async rejectInvoicePayment(id) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can reject payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          await patchUserDoc(workspaceId, 'invoices', id, {
            paymentStatus: 'rejected',
            status: 'rejected',
            approvalStatus: 'rejected',
            requiresApproval: false,
            rejectedAt: serverTimestamp(),
            rejectedBy: userId,
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Payment rejected',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} payment was rejected/cancelled.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              customerName: invoice.customerName,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus },
              newValue: { status: 'rejected', paymentStatus: 'rejected' },
            },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to reject payment.') }
        }
      },
      async recordPartialPayment(id, options = {}) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can record payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        if (getInvoiceStatus(invoice) === 'paid') return { ok: false, error: 'This invoice is already paid.' }
        const amount = Number(options.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid partial payment amount' }
        try {
          const currentPaid = toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0)
          const nextPaid = Math.min(invoice.total, currentPaid + amount)
          const fullyPaid = nextPaid >= invoice.total
          const paymentMethod = options.paymentMethod || 'Manual Approval'
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id)
          const stockAdjusted = fullyPaid ? await addInventoryAdjustments(batch, workspaceId, invoice, now) : false
          batch.update(invoiceRef, {
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            status: fullyPaid ? 'paid' : 'partial',
            approvalStatus: fullyPaid ? 'approved' : invoice.approvalStatus || 'pending',
            requiresApproval: fullyPaid ? false : invoice.requiresApproval ?? true,
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: calculateBalanceDue(invoice.total, nextPaid),
            paidAt: fullyPaid ? now : invoice.paidAt || null,
            approvedBy: fullyPaid ? userId : invoice.approvedBy || null,
            approvedAt: fullyPaid ? now : invoice.approvedAt || null,
            lastPaymentAt: now,
            lastPaymentBy: userId,
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'payments')))
          const transactionId = `${workspaceId}-income-${id}-${Date.now()}`
          batch.set(paymentRef, {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount,
            amountUsd: amount,
            currency: invoice.currency || 'PKR',
            paymentMethod,
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            status: fullyPaid ? 'paid' : 'partial',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            createdAt: now,
            updatedAt: now,
          })
          if (fullyPaid) {
            const transactionRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'accountTransactions')))
            batch.set(transactionRef, {
              transactionId,
              type: 'income',
              source: 'invoice',
              amount: invoice.total,
              currency: invoice.currency || 'PKR',
              method: paymentMethod,
              status: 'approved',
              approvalStatus: 'approved',
              title: `Invoice payment - ${invoice.invoiceNumber || id}`,
              description: `${invoice.customerName || 'Customer'} invoice payment was added to wallet.`,
              relatedId: id,
              invoiceId: id,
              paymentId: paymentRef.id,
              customerName: invoice.customerName || '',
              createdBy: userId,
              approvedBy: userId,
              approvedAt: now,
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              createdAt: now,
              updatedAt: now,
              metadata: {
                oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
                newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoice.total },
              },
            })
          }
          await batch.commit()
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: fullyPaid ? 'Invoice paid' : 'Partial payment recorded',
            module: 'Invoices',
            description: `${amount} ${invoice.currency || 'PKR'} was recorded for ${invoice.invoiceNumber || id}.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              amount,
              currency: invoice.currency,
              paymentMethod,
              fullyPaid,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
              newValue: { status: fullyPaid ? 'paid' : 'partial', paymentStatus: fullyPaid ? 'paid' : 'partial', amountPaid: nextPaid },
            },
          })
          if (fullyPaid) {
            await logActivity({
              workspaceId,
              userId,
              ...userActivityInfo(userDoc, firebaseUser),
              action: 'Invoice payment added to wallet',
              module: 'Account Management',
              description: `${invoice.invoiceNumber || id} payment was added to wallet.`,
              targetId: id,
              targetName: invoice.invoiceNumber || id,
              metadata: {
                amount: invoice.total,
                currency: invoice.currency,
                paymentMethod,
                oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
                newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoice.total },
              },
            })
          }
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record partial payment.') }
        }
      },
      async updateInvoice(id, patch) {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        if (!db || !workspaceId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'invoices', id, patch)
      },
    }),
    [invoices, payments, loading, source, error, stats, canApprovePayments, firebaseUser, userDoc, userId, workspaceId],
  )

  return api
}
