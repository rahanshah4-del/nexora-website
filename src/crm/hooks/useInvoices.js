import { useEffect, useMemo, useState } from 'react'
import { arrayUnion, collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { financePermissions, normalizeFinanceRole } from '../lib/financeAccess.js'
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
  const lifecycleStatus = getInvoiceStatus({
    ...inv,
    ...calculated,
    paymentStatus: statusValue(inv.paymentStatus || inv.status, 'pending'),
    approvalStatus: statusValue(inv.approvalStatus, 'pending'),
  })
  const normalized = {
    ...inv,
    ...calculated,
    currency: normalizeCurrency(inv.currency),
    paymentStatus: statusValue(inv.paymentStatus || inv.status, 'pending'),
    approvalStatus: statusValue(inv.approvalStatus, 'pending'),
    requiresApproval: inv.requiresApproval ?? true,
    lifecycleStatus,
    lastPaymentDate: inv.lastPaymentDate || inv.lastPaymentAt || inv.paidAt || null,
  }
  return {
    ...normalized,
    status: lifecycleStatus,
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

async function addInventoryAdjustments(batch, workspaceId, invoice, now, businessType) {
  if (!db || !workspaceId || invoice.inventoryAdjustedAt || invoice.stockAdjustedAt) return false
  const productItems = (invoice.items || []).filter((item) => item.productId && toNumber(item.quantity ?? item.qty, 0) > 0)
  if (!productItems.length) return false

  await Promise.all(
    productItems.map(async (item) => {
      const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), item.productId)
      const productSnap = await getDoc(productRef)
      if (!productSnap.exists()) return
      const currentStock = toNumber(productSnap.data().stockQuantity ?? productSnap.data().stock, 0)
      const quantity = toNumber(item.quantity ?? item.qty, 0)
      batch.update(productRef, {
        businessType,
        stockQuantity: Math.max(0, currentStock - quantity),
        stockHistory: arrayUnion({
          type: 'invoice_paid',
          invoiceId: invoice.id || invoice.invoiceNumber || '',
          invoiceNumber: invoice.invoiceNumber || '',
          previousQuantity: currentStock,
          quantity: Math.max(0, currentStock - quantity),
          delta: -quantity,
          note: 'Invoice payment stock deduction',
          createdAt: new Date().toISOString(),
        }),
        updatedAt: now,
      })
    }),
  )

  return true
}

function roleName(role, userDoc) {
  return normalizeFinanceRole(userDoc?.role || role)
}

function canRoleApprovePayments(role, userDoc) {
  const rawRole = String(userDoc?.role ?? role ?? '').toLowerCase()
  return !rawRole || ['owner', 'admin', 'accountant'].includes(rawRole)
}

function approvalMetaForBusiness(businessType) {
  const type = String(businessType || '').trim()
  if (type === 'School ERP') return { approvalType: 'fee', approvalLabel: 'Fee Approval', sourceRoute: '/app/invoices' }
  if (type === 'Property ERP') return { approvalType: 'rent', approvalLabel: 'Rent Approval', sourceRoute: '/app/invoices' }
  if (type === 'Restaurant POS') return { approvalType: 'bill', approvalLabel: 'Bill Approval', sourceRoute: '/app/invoices' }
  if (type === 'Retail / POS') return { approvalType: 'bill', approvalLabel: 'Sales Bill Approval', sourceRoute: '/app/invoices' }
  return { approvalType: 'invoice', approvalLabel: 'Invoice Approval', sourceRoute: '/app/invoices' }
}

function invoicePermissions(role, userDoc) {
  const rawRole = String(userDoc?.role ?? role ?? '').trim().toLowerCase()
  const normalized = rawRole ? roleName(role, userDoc) : 'owner'
  const finance = financePermissions(normalized)
  const isOwnerAdmin = ['owner', 'admin'].includes(normalized)
  const isAccountant = normalized === 'accountant'
  const isSales = normalized === 'sales'
  return {
    role: normalized,
    invoiceActionRole: normalized,
    canView: finance.canViewInvoices || finance.canManageInvoices,
    canCreate: finance.canCreateInvoices || finance.canManageInvoices,
    canEdit: isOwnerAdmin || isSales,
    canDuplicate: isOwnerAdmin,
    canApprove: isOwnerAdmin,
    canReject: isOwnerAdmin,
    canRecordPayments: isOwnerAdmin || isAccountant,
    canSend: isOwnerAdmin,
    canDelete: isOwnerAdmin,
  }
}

export function useInvoices() {
  const { userId, workspaceId, businessType, role, userDoc, firebaseUser } = useUser()
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
      { businessType },
    )
    const unsubPay = subscribeUserCollection(
      workspaceId,
      'payments',
      (rows) => setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment)),
      () => setPayments([]),
      { businessType },
    )
    return () => {
      unsubInv?.()
      unsubPay?.()
    }
  }, [businessType, workspaceId])

  const stats = useMemo(() => {
    const byStatus = (status) => invoices.filter((i) => getInvoiceStatus(i) === status).length
    const paid = byStatus('paid')
    const pending = byStatus('pending')
    const pendingApproval = byStatus('pending_approval')
    const approved = byStatus('approved')
    const draft = byStatus('draft')
    const sent = byStatus('sent')
    const partialPaid = byStatus('partial_paid')
    const overdue = byStatus('overdue')
    const cancelled = invoices.filter((i) => ['cancelled', 'canceled', 'rejected'].includes(statusValue(i.status || i.paymentStatus, ''))).length
    const totalAmount = invoices.reduce((sum, invoice) => sum + toNumber(invoice.total ?? invoice.totalUsd, 0), 0)
    const paidAmount = invoices.reduce((sum, invoice) => sum + toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0), 0)
    const outstanding = invoices.reduce((sum, invoice) => sum + toNumber(invoice.balanceDue, calculateBalanceDue(invoice.total ?? invoice.totalUsd, invoice.amountPaid ?? invoice.partialPaidAmount)), 0)
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
    return { draft, pending, pendingApproval, approved, sent, partialPaid, paid, overdue, cancelled, total: invoices.length, totalAmount, paidAmount, outstanding, revenue: paidAmount, collectionRate }
  }, [invoices])

  const canApprovePayments = canRoleApprovePayments(role, userDoc)
  const permissions = invoicePermissions(role, userDoc)

  const api = useMemo(
    () => ({
      invoices,
      payments,
      loading,
      source,
      error,
      stats,
      canApprovePayments,
      permissions,
      async createInvoice(payload) {
        if (!permissions.canCreate) return { ok: false, error: 'You do not have permission to create invoices.' }
        const invoice = normalizeInvoice(payload)
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const invNo = String(invoice.invoiceNumber || '').trim()
        const name = String(invoice.customerName || '').trim()
        const email = String(invoice.customerEmail || '').trim()
        if (!invNo) return { ok: false, error: 'Invoice number is required' }
        if (!name) return { ok: false, error: 'Customer name is required' }
        if (!invoice.items.length) return { ok: false, error: 'Add at least one invoice item' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          const requestedStatus = statusValue(invoice.status, 'pending')
          const amountPaid = requestedStatus === 'paid'
            ? invoice.total
            : toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0)
          const fullyPaid = invoice.total > 0 && amountPaid >= invoice.total
          const partialPaid = amountPaid > 0 && !fullyPaid
          const paymentStatus = fullyPaid ? 'paid' : partialPaid ? 'partial_paid' : requestedStatus === 'draft' ? 'draft' : 'pending'
          const approvalStatus = fullyPaid || requestedStatus === 'approved' ? 'approved' : requestedStatus === 'draft' ? 'draft' : 'pending'
          const requiresApproval = requestedStatus === 'pending_approval' || (requestedStatus !== 'draft' && requestedStatus !== 'approved' && !fullyPaid)
          const docPayload = {
            workspaceId,
            businessType,
            invoiceNumber: invNo,
            customerName: name,
            customerEmail: email,
            customerPhone: invoice.customerPhone || '',
            customerTaxId: invoice.customerTaxId || invoice.customerNtn || invoice.ntnCnic || '',
            customerAddress: invoice.customerAddress || invoice.billingAddress || '',
            customerNotes: invoice.customerNotes || '',
            issueDate: invoice.issueDate || invoice.invoiceDate || '',
            invoiceDate: invoice.issueDate || invoice.invoiceDate || '',
            paymentTerms: invoice.paymentTerms || 'Net 14 Days',
            paymentMethod: invoice.paymentMethod || 'Bank Transfer',
            template: invoice.template || 'Professional',
            attachmentName: invoice.attachmentName || '',
            signatureName: invoice.signatureName || '',
            terms: invoice.terms || invoice.termsConditions || '',
            notes: invoice.notes || '',
            items: invoice.items,
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            discountTotal: invoice.discountTotal ?? invoice.discount,
            taxableAmount: invoice.taxableAmount,
            taxRate: invoice.taxRate ?? 0,
            taxAmount: invoice.taxAmount,
            taxTotal: invoice.taxTotal ?? invoice.taxAmount,
            roundOff: invoice.roundOff ?? 0,
            total: invoice.total,
            amountInWords: invoice.amountInWords || '',
            currency: invoice.currency || 'PKR',
            status: requestedStatus,
            paymentStatus,
            approvalStatus,
            requiresApproval,
            ...(requiresApproval
              ? {
                  ...approvalMetaForBusiness(businessType),
                  approvalAmount: invoice.total,
                  approvalCustomerName: name,
                  submittedForApprovalBy: userId,
                  submittedForApprovalAt: serverTimestamp(),
                }
              : {}),
            amountPaid,
            partialPaidAmount: amountPaid,
            balanceDue: calculateBalanceDue(invoice.total, amountPaid),
            paymentHistory: [],
            lastPaymentDate: null,
            dueDate: invoice.dueDate || '—',
            recurring: Boolean(invoice.recurring),
            recurringCycle: invoice.recurringCycle || '',
            createdBy: userId,
            createdAt: serverTimestamp(),
            subtotalUsd: invoice.subtotal,
            taxAmountUsd: invoice.taxAmount,
            totalUsd: invoice.total,
          }
          const ref = await createUserDoc(workspaceId, 'invoices', docPayload, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
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
        if (!permissions.canRecordPayments) return { ok: false, error: 'Only owner, admin, or accountant can record payments' }
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
          const stockAdjusted = await addInventoryAdjustments(batch, workspaceId, invoice, now, businessType)
          batch.update(invoiceRef, {
            paymentStatus: 'paid',
            status: 'paid',
            approvalStatus: 'approved',
            businessType,
            requiresApproval: false,
            paidAt: now,
            approvedBy: userId,
            approvedAt: now,
            amountPaid: invoice.total,
            partialPaidAmount: invoice.total,
            balanceDue: 0,
            lastPaymentAt: now,
            lastPaymentDate: now,
            lastPaymentBy: userId,
            paymentHistory: arrayUnion({
              amount: invoice.total,
              paymentMethod,
              status: 'paid',
              recordedBy: userId,
              recordedAt: new Date().toISOString(),
            }),
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), `invoice-${id}-paid`)
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
            businessType,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          })
          const transactionRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), `income-invoice-${id}`)
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
            businessType,
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
            businessType,
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
            businessType,
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
        if (!permissions.canReject) return { ok: false, error: 'Only owner or admin can reject invoices' }
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
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
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
        if (!permissions.canRecordPayments) return { ok: false, error: 'Only owner, admin, or accountant can record payments' }
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
          const stockAdjusted = fullyPaid ? await addInventoryAdjustments(batch, workspaceId, invoice, now, businessType) : false
          batch.update(invoiceRef, {
            paymentStatus: fullyPaid ? 'paid' : 'partial_paid',
            status: fullyPaid ? 'paid' : 'partial_paid',
            approvalStatus: fullyPaid ? 'approved' : invoice.approvalStatus || 'pending',
            businessType,
            requiresApproval: fullyPaid ? false : invoice.requiresApproval ?? true,
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: calculateBalanceDue(invoice.total, nextPaid),
            paidAt: fullyPaid ? now : invoice.paidAt || null,
            approvedBy: fullyPaid ? userId : invoice.approvedBy || null,
            approvedAt: fullyPaid ? now : invoice.approvedAt || null,
            lastPaymentAt: now,
            lastPaymentDate: now,
            lastPaymentBy: userId,
            paymentHistory: arrayUnion({
              amount,
              paymentMethod,
              status: fullyPaid ? 'paid' : 'partial_paid',
              recordedBy: userId,
              recordedAt: new Date().toISOString(),
            }),
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
            paymentStatus: fullyPaid ? 'paid' : 'partial_paid',
            status: fullyPaid ? 'paid' : 'partial_paid',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            businessType,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          })
          if (fullyPaid) {
            const transactionRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), `income-invoice-${id}`)
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
              businessType,
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
            businessType,
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
              businessType,
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
        if (!permissions.canEdit) return { ok: false, error: 'Only owner, admin, or accountant can edit invoices.' }
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        if (!db || !workspaceId || source !== 'firestore') return { ok: true }
        await patchUserDoc(workspaceId, 'invoices', id, patch, { businessType })
        return { ok: true }
      },
      async sendForApproval(id) {
        if (!permissions.canEdit) return { ok: false, error: 'Only owner, admin, or accountant can send invoices for approval.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          const approvalMeta = approvalMetaForBusiness(businessType)
          const amount = toNumber(invoice.total ?? invoice.totalUsd, 0)
          await patchUserDoc(workspaceId, 'invoices', id, {
            status: 'pending_approval',
            approvalStatus: 'pending',
            paymentStatus: invoice.amountPaid > 0 ? 'partial_paid' : 'pending',
            requiresApproval: true,
            ...approvalMeta,
            workspaceId,
            businessType,
            createdBy: invoice.createdBy || userId,
            amount,
            approvalAmount: amount,
            customerName: invoice.customerName || '',
            approvalCustomerName: invoice.customerName || invoice.customerEmail || '',
            route: approvalMeta.sourceRoute,
            sourceRoute: approvalMeta.sourceRoute,
            submittedForApprovalBy: userId,
            submittedForApprovalAt: serverTimestamp(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice sent for approval',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} was sent to Approval Center.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to send invoice for approval.') }
        }
      },
      async approveInvoice(id) {
        if (!permissions.canApprove) return { ok: false, error: 'Only owner or admin can approve invoices.' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        await patchUserDoc(workspaceId, 'invoices', id, {
          status: 'approved',
          approvalStatus: 'approved',
          requiresApproval: false,
          approvedBy: userId,
          approvedAt: serverTimestamp(),
        }, { businessType })
        return { ok: true }
      },
      async markInvoiceSent(id) {
        if (!permissions.canSend) return { ok: false, error: 'Only owner, admin, or accountant can send invoices.' }
        await patchUserDoc(workspaceId, 'invoices', id, {
          status: 'sent',
          sentAt: serverTimestamp(),
          sentBy: userId,
        }, { businessType })
        return { ok: true }
      },
      async markInvoiceUnpaid(id) {
        if (!permissions.canRecordPayments) return { ok: false, error: 'Only owner, admin, or accountant can update payments.' }
        await patchUserDoc(workspaceId, 'invoices', id, {
          status: 'sent',
          paymentStatus: 'pending',
          amountPaid: 0,
          partialPaidAmount: 0,
          balanceDue: invoices.find((item) => item.id === id)?.total || 0,
          paidAt: null,
          lastPaymentAt: null,
          lastPaymentDate: null,
        }, { businessType })
        return { ok: true }
      },
      async duplicateInvoice(id) {
        if (!permissions.canDuplicate) return { ok: false, error: 'You do not have permission to duplicate invoices.' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        const copyNumber = `${invoice.invoiceNumber || 'INV'}-COPY-${Date.now().toString().slice(-4)}`
        try {
          const payload = {
            ...invoice,
            invoiceNumber: copyNumber,
            status: 'draft',
            paymentStatus: 'draft',
            approvalStatus: 'draft',
            requiresApproval: false,
            amountPaid: 0,
            partialPaidAmount: 0,
            balanceDue: invoice.total || invoice.totalUsd || 0,
            paidAt: null,
            lastPaymentAt: null,
            lastPaymentDate: null,
            paymentHistory: [],
            createdBy: userId,
            duplicatedFrom: id,
          }
          delete payload.id
          await createUserDoc(workspaceId, 'invoices', payload, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to duplicate invoice.') }
        }
      },
      async deleteInvoice(id) {
        if (!permissions.canDelete) return { ok: false, error: 'Only owner or admin can delete invoices.' }
        if (!workspaceId) return { ok: false, error: 'Please login first' }
        await removeUserDoc(workspaceId, 'invoices', id)
        return { ok: true }
      },
    }),
    [invoices, payments, loading, source, error, stats, canApprovePayments, permissions, businessType, firebaseUser, userDoc, userId, workspaceId],
  )

  return api
}
