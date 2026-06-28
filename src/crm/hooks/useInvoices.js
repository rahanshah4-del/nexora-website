import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, removeUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { isDraftInvoice, resolveInvoicePermissions } from '../lib/invoiceAccess.js'
import { hasOpenInvoicePayment, pendingInvoicePaymentId } from '../lib/approvalQueue.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import {
  calculateBalanceDue,
  calculateInvoiceTotals,
  getInvoiceStatus,
  isRejectedRecord,
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
    amountPaid: toNumber(payment.amountPaid, 0),
    appliedAmount: toNumber(payment.appliedAmount, 0),
    currency: normalizeCurrency(payment.currency),
    paymentMethod: payment.paymentMethod || 'Manual Approval',
    paymentStatus: statusValue(payment.paymentStatus || payment.status, 'pending'),
    approvalStatus: statusValue(payment.approvalStatus || payment.paymentStatus || payment.status, 'pending'),
    paidAt: payment.paidAt || null,
    paymentSubmittedAt: payment.paymentSubmittedAt || payment.createdAt || null,
    createdAt: payment.createdAt || null,
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

const INVOICE_BUSINESS_EDIT_FIELDS = new Set([
  'customerName',
  'customerEmail',
  'customerPhone',
  'customerTaxId',
  'customerAddress',
  'customerNotes',
  'items',
  'subtotal',
  'subtotalUsd',
  'discount',
  'discountTotal',
  'tax',
  'taxableAmount',
  'taxRate',
  'taxAmount',
  'taxTotal',
  'roundOff',
  'total',
  'totalUsd',
  'amountInWords',
  'notes',
  'terms',
  'dueDate',
  'issueDate',
  'invoiceDate',
  'paymentTerms',
  'template',
  'attachmentName',
  'signatureName',
  'status',
  'updatedAt',
])

const INVOICE_PAYMENT_EDIT_FIELDS = new Set([
  'amountPaid',
  'partialPaidAmount',
  'balanceDue',
  'paymentStatus',
  'approvalStatus',
  'requiresApproval',
  'paidAt',
  'approvedAt',
  'approvedBy',
  'paymentHistory',
  'lastPaymentAt',
  'lastPaymentDate',
  'updatedAt',
])

function filterInvoicePatch(patch, allowedFields) {
  return Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowedFields.has(key)))
}

function changedInvoicePatch(invoice, patch) {
  return Object.fromEntries(Object.entries(patch || {}).filter(([key, value]) => !Object.is(invoice?.[key], value)))
}

function hasUnsafeBusinessStatus(patch) {
  return Object.prototype.hasOwnProperty.call(patch || {}, 'status') && !['draft', 'pending'].includes(statusValue(patch.status, 'pending'))
}

const DEFAULT_INVOICE_LIST_LIMIT = 50
const PAYMENT_LIST_LIMIT = 100
const PAYMENT_EPSILON = 0.005

function requiresSchoolFeeApproval(businessType) {
  return normalizeBusinessType(businessType) === 'School ERP'
}

function safeInvoiceListLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_INVOICE_LIST_LIMIT
  return Math.min(DEFAULT_INVOICE_LIST_LIMIT, Math.floor(next))
}

function mergeInvoicePages(currentRows, nextRows) {
  const seen = new Set((currentRows || []).map((invoice) => invoice.id))
  return [
    ...(currentRows || []),
    ...(nextRows || []).filter((invoice) => !seen.has(invoice.id)),
  ]
}

function invoiceTotalAmount(invoice = {}) {
  return Math.max(toNumber(invoice.total ?? invoice.totalUsd, 0), 0)
}

function invoicePaidAmount(invoice = {}) {
  return Math.min(Math.max(toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0), 0), invoiceTotalAmount(invoice))
}

function invoiceRemainingBalance(invoice = {}) {
  return calculateBalanceDue(invoiceTotalAmount(invoice), invoicePaidAmount(invoice))
}

function paymentLimitMessage(remainingBalance, currency = 'PKR') {
  return `Payment amount cannot exceed remaining invoice balance (${remainingBalance.toFixed(2)} ${currency}).`
}

function isOverpayment(amount, remainingBalance) {
  return toNumber(amount, 0) - toNumber(remainingBalance, 0) > PAYMENT_EPSILON
}

async function recordOverpaymentAttempt({
  workspaceId,
  invoice,
  amount,
  remainingBalance,
  paymentMethod,
  businessType,
  userId,
  userDoc,
  firebaseUser,
  module = 'Invoices',
}) {
  const attemptedAmount = Math.max(toNumber(amount, 0), 0)
  const safeRemaining = Math.max(toNumber(remainingBalance, 0), 0)
  const overpaymentAmount = Math.max(attemptedAmount - safeRemaining, 0)
  const recordedAt = new Date().toISOString()
  const entry = {
    amount: attemptedAmount,
    attemptedAmount,
    appliedAmount: 0,
    remainingBalance: safeRemaining,
    overpaymentAmount,
    paymentMethod,
    status: 'overpayment_rejected',
    recordedBy: userId,
    recordedAt,
  }

  const tasks = []
  if (workspaceId && invoice?.id) {
    tasks.push(
      patchUserDoc(
        workspaceId,
        'invoices',
        invoice.id,
        {
          paymentHistory: arrayUnion(entry),
          updatedAt: serverTimestamp(),
        },
        { businessType },
      ).catch(() => null),
    )
  }
  tasks.push(
    logActivity({
      workspaceId,
      userId,
      businessType,
      ...userActivityInfo(userDoc, firebaseUser),
      action: 'Overpayment rejected',
      module,
      description: `${invoice?.invoiceNumber || invoice?.id || 'Invoice'} payment attempt exceeded the remaining balance.`,
      targetId: invoice?.id || '',
      targetName: invoice?.invoiceNumber || invoice?.id || '',
      metadata: {
        attemptedAmount,
        appliedAmount: 0,
        remainingBalance: safeRemaining,
        overpaymentAmount,
        paymentMethod,
        currency: invoice?.currency || 'PKR',
      },
    }).catch(() => null),
  )

  await Promise.all(tasks)
}

function addSnapshotDocs(target, snap) {
  snap.docs.forEach((row) => {
    if (!target.has(row.ref.path)) target.set(row.ref.path, row)
  })
}

async function fetchInvoiceFinanceDocs(workspaceId, invoice = {}) {
  if (!db || !workspaceId || !invoice?.id) return { payments: [], transactions: [] }
  const invoiceKeys = Array.from(new Set([invoice.id, invoice.invoiceNumber].map((value) => String(value || '').trim()).filter(Boolean)))
  const payments = new Map()
  const transactions = new Map()
  const paymentRef = collection(db, workspaceCollectionPath(workspaceId, 'payments'))
  const transactionRef = collection(db, workspaceCollectionPath(workspaceId, 'accountTransactions'))

  await Promise.all(
    invoiceKeys.flatMap((key) => [
      getDocs(query(paymentRef, where('invoiceId', '==', key))).then((snap) => addSnapshotDocs(payments, snap)),
      getDocs(query(paymentRef, where('invoiceNumber', '==', key))).then((snap) => addSnapshotDocs(payments, snap)),
      getDocs(query(transactionRef, where('invoiceId', '==', key))).then((snap) => addSnapshotDocs(transactions, snap)),
      getDocs(query(transactionRef, where('relatedId', '==', key))).then((snap) => addSnapshotDocs(transactions, snap)),
    ]),
  )

  return {
    payments: Array.from(payments.values()),
    transactions: Array.from(transactions.values()),
  }
}

async function cancelInvoiceFinanceDocs({ batch, workspaceId, invoice, now, userId }) {
  const linked = await fetchInvoiceFinanceDocs(workspaceId, invoice)
  const reversal = {
    invoiceId: invoice?.id || '',
    invoiceNumber: invoice?.invoiceNumber || '',
    reason: 'Invoice marked unpaid',
  }

  linked.payments.forEach((paymentDoc) => {
    batch.update(paymentDoc.ref, {
      status: 'cancelled',
      paymentStatus: 'cancelled',
      approvalStatus: 'cancelled',
      cancelledAt: now,
      reversedAt: now,
      cancelledBy: userId,
      reversedBy: userId,
      reversal,
      updatedAt: now,
    })
  })

  linked.transactions.forEach((transactionDoc) => {
    batch.update(transactionDoc.ref, {
      status: 'cancelled',
      approvalStatus: 'cancelled',
      cancelledAt: now,
      reversedAt: now,
      cancelledBy: userId,
      reversedBy: userId,
      reversal,
      updatedAt: now,
    })
  })

  return {
    payments: linked.payments.length,
    transactions: linked.transactions.length,
  }
}

export function useInvoices({ limitCount = DEFAULT_INVOICE_LIST_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, role, userDoc, firebaseUser } = useUser()
  const workspaceAccess = useWorkspaceAccess()
  const invoiceListLimit = safeInvoiceListLimit(limitCount)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMoreInvoices, setHasMoreInvoices] = useState(false)
  const [invoicePage, setInvoicePage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const invoiceCursorRef = useRef(null)
  const invoiceRequestRef = useRef(0)

  const loadInvoicePage = useCallback(async ({ reset = false } = {}) => {
    if (!enabled) {
      setInvoices([])
      setPayments([])
      setSource(db ? 'firestore' : 'none')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      setHasMoreInvoices(false)
      setInvoicePage(0)
      return { ok: true }
    }
    if (!db) {
      setInvoices([])
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: false }
    }
    if (!workspaceId) {
      setInvoices([])
      invoiceCursorRef.current = null
      setHasMoreInvoices(false)
      setInvoicePage(0)
      setSource('firestore')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }

    const requestId = ++invoiceRequestRef.current
    if (reset) {
      invoiceCursorRef.current = null
      setInvoices([])
      setHasMoreInvoices(false)
      setInvoicePage(0)
      setLoading(true)
    } else {
      setPaginationLoading(true)
    }

    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId,
        collectionName: 'invoices',
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: invoiceListLimit,
        startAfterDoc: reset ? null : invoiceCursorRef.current,
      })
      if (requestId !== invoiceRequestRef.current) return { ok: false }

      const nextRows = (Array.isArray(page.rows) ? page.rows : []).map(normalizeInvoice)
      setInvoices((currentRows) => (reset ? nextRows : mergeInvoicePages(currentRows, nextRows)))
      invoiceCursorRef.current = page.lastDoc
      setHasMoreInvoices(page.hasMore)
      setInvoicePage((currentPage) => (reset ? 1 : currentPage + 1))
      setSource('firestore')
      setError('')
      console.log(reset ? '[Invoices] first page loaded' : '[Invoices] next page loaded', {
        count: page.size,
        pageSize: invoiceListLimit,
        hasMore: page.hasMore,
      })
      console.log('[Invoices] pagination cursor', {
        cursorId: page.lastDoc?.id || null,
        hasCursor: Boolean(page.lastDoc),
      })
      return { ok: true }
    } catch (err) {
      if (requestId !== invoiceRequestRef.current) return { ok: false }
      setError(clientSafeMessage(err, 'Unable to load invoices.'))
      if (reset) setInvoices([])
      setSource('firestore')
      return { ok: false, error: clientSafeMessage(err, 'Unable to load invoices.') }
    } finally {
      if (requestId === invoiceRequestRef.current) {
        if (reset) setLoading(false)
        else setPaginationLoading(false)
      }
    }
  }, [businessType, enabled, invoiceListLimit, workspaceId])

  const loadMoreInvoices = useCallback(async () => {
    if (loading || paginationLoading || !hasMoreInvoices) return { ok: true }
    return loadInvoicePage({ reset: false })
  }, [hasMoreInvoices, loadInvoicePage, loading, paginationLoading])

  const patchLoadedInvoice = useCallback((id, patch) => {
    setInvoices((currentRows) =>
      currentRows.map((invoice) => (invoice.id === id ? normalizeInvoice({ ...invoice, ...patch }) : invoice)),
    )
  }, [])

  const prependLoadedInvoice = useCallback((invoice) => {
    setInvoices((currentRows) => [normalizeInvoice(invoice), ...currentRows])
  }, [])

  const removeLoadedInvoice = useCallback((id) => {
    setInvoices((currentRows) => currentRows.filter((invoice) => invoice.id !== id))
  }, [])

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreInvoices(false)
        setInvoicePage(0)
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreInvoices(false)
        setInvoicePage(0)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        invoiceCursorRef.current = null
        setHasMoreInvoices(false)
        setInvoicePage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }

    loadInvoicePage({ reset: true })
    const unsubPay = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'payments',
      businessType,
      limitCount: PAYMENT_LIST_LIMIT,
      onData(rows) {
        setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment))
      },
      onError() {
        setPayments([])
      },
    })
    return () => {
      invoiceRequestRef.current += 1
      unsubPay?.()
    }
  }, [businessType, enabled, invoiceListLimit, loadInvoicePage, workspaceId])

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
    const activeInvoices = invoices.filter((invoice) => !isRejectedRecord(invoice))
    const cancelled = invoices.length - activeInvoices.length
    const totalAmount = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total ?? invoice.totalUsd, 0), 0)
    const paidAmount = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0), 0)
    const outstanding = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.balanceDue, calculateBalanceDue(invoice.total ?? invoice.totalUsd, invoice.amountPaid ?? invoice.partialPaidAmount)), 0)
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
    return { draft, pending, pendingApproval, approved, sent, partialPaid, paid, overdue, cancelled, total: invoices.length, totalAmount, paidAmount, outstanding, revenue: paidAmount, collectionRate }
  }, [invoices])

  const canApprovePayments = canRoleApprovePayments(role, userDoc)
  const permissions = resolveInvoicePermissions(role, userDoc, workspaceAccess.permissions, workspaceAccess.explicitPermissions)

  const api = useMemo(
    () => ({
      invoices,
      payments,
      loading,
      paginationLoading,
      hasMoreInvoices,
      invoicePage,
      invoicePageSize: invoiceListLimit,
      loadMoreInvoices,
      source,
      error,
      stats,
      canApprovePayments,
      permissions,
      async createInvoice(payload) {
        if (!permissions.canCreateInvoice) return { ok: false, error: 'You do not have permission to create invoices.' }
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
          const schoolApprovalOnly = requiresSchoolFeeApproval(businessType)
          const initialStatus = statusValue(invoice.status, 'pending')
          const requestedStatus = schoolApprovalOnly && ['paid', 'approved', 'partial_paid'].includes(initialStatus)
            ? 'pending'
            : permissions.canCreatePaidInvoices && ['paid', 'approved'].includes(initialStatus)
            ? initialStatus
            : initialStatus === 'draft'
              ? 'draft'
              : 'pending'
          const amountPaid = schoolApprovalOnly
            ? 0
            : permissions.canCreatePaidInvoices && requestedStatus === 'paid'
            ? invoice.total
            : permissions.canCreatePaidInvoices
              ? toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0)
              : 0
          const fullyPaid = invoice.total > 0 && amountPaid >= invoice.total
          const partialPaid = permissions.canCreatePaidInvoices && amountPaid > 0 && !fullyPaid
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
          prependLoadedInvoice({
            id: ref.id,
            ...docPayload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Invoices',
            priority: requiresApproval ? 'high' : 'medium',
            title: requiresApproval ? 'Invoice approval needed' : 'Invoice created',
            message: requiresApproval
              ? `${invNo} for ${name} is waiting for approval.`
              : `${invNo} was created for ${name}.`,
            relatedId: ref.id,
            route: requiresApproval ? '/app/approvals' : '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { invoiceNumber: invNo, total: invoice.total, currency: invoice.currency },
          })
          return { ok: true, id: ref.id, invoice: { id: ref.id, ...docPayload, invoiceNumber: invNo } }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create invoice.') }
        }
      },
      async markInvoicePaid(id, options = {}) {
        if (!permissions.canRecordPayment) return { ok: false, error: 'Only owner, admin, or accountant can record invoice payments.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        if (getInvoiceStatus(invoice) === 'paid') return { ok: false, error: 'This invoice is already paid.' }
        if (requiresSchoolFeeApproval(businessType) && hasOpenInvoicePayment(id, payments)) {
          return { ok: false, error: 'A payment for this invoice is already waiting in Approval Center.' }
        }
        const total = invoiceTotalAmount(invoice)
        const currentPaid = invoicePaidAmount(invoice)
        const remainingBalance = invoiceRemainingBalance(invoice)
        const paymentMethod = options.paymentMethod || 'Manual Approval'
        const requestedAmount = toNumber(options.amount ?? remainingBalance, remainingBalance)
        if (remainingBalance <= PAYMENT_EPSILON) return { ok: false, error: 'This invoice has no remaining balance.' }
        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return { ok: false, error: 'Enter a valid payment amount' }
        if (isOverpayment(requestedAmount, remainingBalance)) {
          await recordOverpaymentAttempt({
            workspaceId,
            invoice,
            amount: requestedAmount,
            remainingBalance,
            paymentMethod,
            businessType,
            userId,
            userDoc,
            firebaseUser,
          })
          return { ok: false, error: paymentLimitMessage(remainingBalance, invoice.currency || 'PKR') }
        }
        if (requestedAmount + PAYMENT_EPSILON < remainingBalance) {
          return { ok: false, error: 'Amount is less than the remaining balance. Use partial payment instead.' }
        }
        const appliedAmount = remainingBalance
        try {
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id)
          if (requiresSchoolFeeApproval(businessType)) {
            const approvalMeta = approvalMetaForBusiness(businessType)
            const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), pendingInvoicePaymentId(id, currentPaid))
            const pendingPayment = {
              id: paymentRef.id,
              invoiceId: id,
              invoiceNumber: invoice.invoiceNumber || id,
              customerName: invoice.customerName || '',
              amount: appliedAmount,
              amountPaid: 0,
              amountUsd: appliedAmount,
              appliedAmount: 0,
              requestedAmount,
              currency: invoice.currency || 'PKR',
              paymentMethod,
              source: invoice.source || '',
              seedBatchId: invoice.seedBatchId || '',
              paymentStatus: 'pending_verification',
              status: 'pending_verification',
              approvalStatus: 'pending',
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType,
              createdBy: userId,
              submittedForApprovalBy: userId,
              paymentSubmittedAt: now,
              createdAt: now,
              updatedAt: now,
            }
            batch.update(invoiceRef, {
              status: 'pending_approval',
              paymentStatus: 'pending_verification',
              approvalStatus: 'pending',
              businessType,
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              submittedForApprovalBy: userId,
              submittedForApprovalAt: now,
              lastPaymentAt: now,
              lastPaymentDate: now,
              paymentHistory: arrayUnion({
                amount: appliedAmount,
                attemptedAmount: requestedAmount,
                appliedAmount: 0,
                paymentMethod,
                status: 'pending_approval',
                approvalPaymentId: paymentRef.id,
                recordedBy: userId,
                recordedAt: new Date().toISOString(),
              }),
              updatedAt: now,
            })
            batch.set(paymentRef, pendingPayment)
            await batch.commit()
            setPayments((currentRows) => [
              normalizePayment({
                ...pendingPayment,
                paymentSubmittedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
              ...currentRows.filter((payment) => payment.id !== paymentRef.id),
            ])
            patchLoadedInvoice(id, {
              status: 'pending_approval',
              paymentStatus: 'pending_verification',
              approvalStatus: 'pending',
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              submittedForApprovalBy: userId,
              submittedForApprovalAt: new Date().toISOString(),
              lastPaymentAt: new Date().toISOString(),
              lastPaymentDate: new Date().toISOString(),
            })
            await logActivity({
              workspaceId,
              userId,
              businessType,
              ...userActivityInfo(userDoc, firebaseUser),
              action: 'Fee payment sent for approval',
              module: 'Invoices',
              description: `${invoice.invoiceNumber || id} fee payment was sent to Approval Center.`,
              targetId: id,
              targetName: invoice.invoiceNumber || id,
              metadata: {
                amount: appliedAmount,
                attemptedAmount: requestedAmount,
                currency: invoice.currency,
                paymentMethod,
                oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
                newValue: { status: 'pending_approval', paymentStatus: 'pending_verification', amountPaid: currentPaid },
            },
          })
            await createWorkspaceNotification({
              workspaceId,
              userId,
              businessType,
              type: 'Approvals',
              priority: 'high',
              title: 'Payment sent for approval',
              message: `${invoice.invoiceNumber || id} payment is waiting in Approval Center.`,
              relatedId: paymentRef.id,
              route: '/app/approvals',
              createdBy: userId,
              createdByEmail: firebaseUser?.email || userDoc?.email || '',
              metadata: { invoiceId: id, amount: appliedAmount, currency: invoice.currency },
            })
            return { ok: true, pendingApproval: true }
          }
          const canEditAllInvoiceFields = permissions.canEditAllInvoiceFields
          const stockAdjusted = canEditAllInvoiceFields ? await addInventoryAdjustments(batch, workspaceId, invoice, now, businessType) : false
          batch.update(invoiceRef, {
            paymentStatus: 'paid',
            approvalStatus: 'approved',
            businessType,
            requiresApproval: false,
            paidAt: now,
            approvedBy: userId,
            approvedAt: now,
            amountPaid: total,
            partialPaidAmount: total,
            balanceDue: 0,
            lastPaymentAt: now,
            lastPaymentDate: now,
            paymentHistory: arrayUnion({
              amount: appliedAmount,
              attemptedAmount: requestedAmount,
              appliedAmount,
              paymentMethod,
              status: 'paid',
              recordedBy: userId,
              recordedAt: new Date().toISOString(),
            }),
            ...(canEditAllInvoiceFields ? { status: 'paid', lastPaymentBy: userId } : {}),
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), `invoice-${id}-paid`)
          const transactionId = `${workspaceId}-income-${id}-${Date.now()}`
          batch.set(paymentRef, {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount: appliedAmount,
            amountPaid: appliedAmount,
            amountUsd: appliedAmount,
            appliedAmount,
            attemptedAmount: requestedAmount,
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
            amount: total,
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
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: total },
              appliedAmount,
            },
          })
          await batch.commit()
          patchLoadedInvoice(id, {
            paymentStatus: 'paid',
            approvalStatus: 'approved',
            requiresApproval: false,
            paidAt: new Date().toISOString(),
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            amountPaid: total,
            partialPaidAmount: total,
            balanceDue: 0,
            lastPaymentAt: new Date().toISOString(),
            lastPaymentDate: new Date().toISOString(),
            ...(canEditAllInvoiceFields ? { status: 'paid', lastPaymentBy: userId } : {}),
            ...(stockAdjusted ? { inventoryAdjustedAt: new Date().toISOString() } : {}),
          })
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
              amount: appliedAmount,
              appliedAmount,
              attemptedAmount: requestedAmount,
              currency: invoice.currency,
              paymentMethod,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: total },
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
              amount: total,
              appliedAmount,
              currency: invoice.currency,
              paymentMethod,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
              newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: total },
            },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Payments',
            priority: 'medium',
            title: 'Invoice paid',
            message: `${invoice.invoiceNumber || id} was marked as paid.`,
            relatedId: id,
            route: '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { amount: appliedAmount, currency: invoice.currency, paymentMethod },
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
          patchLoadedInvoice(id, {
            paymentStatus: 'rejected',
            status: 'rejected',
            approvalStatus: 'rejected',
            requiresApproval: false,
            rejectedAt: new Date().toISOString(),
            rejectedBy: userId,
          })
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Payments',
            priority: 'high',
            title: 'Payment rejected',
            message: `${invoice.invoiceNumber || id} payment was rejected.`,
            relatedId: id,
            route: '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to reject payment.') }
        }
      },
      async recordPartialPayment(id, options = {}) {
        if (!permissions.canRecordPayment) return { ok: false, error: 'Only owner, admin, or accountant can record invoice payments.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        if (getInvoiceStatus(invoice) === 'paid') return { ok: false, error: 'This invoice is already paid.' }
        if (requiresSchoolFeeApproval(businessType) && hasOpenInvoicePayment(id, payments)) {
          return { ok: false, error: 'A payment for this invoice is already waiting in Approval Center.' }
        }
        const amount = Number(options.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid partial payment amount' }
        const currentPaid = invoicePaidAmount(invoice)
        const remainingBalance = invoiceRemainingBalance(invoice)
        const paymentMethod = options.paymentMethod || 'Manual Approval'
        if (remainingBalance <= PAYMENT_EPSILON) return { ok: false, error: 'This invoice has no remaining balance.' }
        if (isOverpayment(amount, remainingBalance)) {
          await recordOverpaymentAttempt({
            workspaceId,
            invoice,
            amount,
            remainingBalance,
            paymentMethod,
            businessType,
            userId,
            userDoc,
            firebaseUser,
          })
          return { ok: false, error: paymentLimitMessage(remainingBalance, invoice.currency || 'PKR') }
        }
        const appliedAmount = Math.min(amount, remainingBalance)
        try {
          const nextPaid = Math.min(invoiceTotalAmount(invoice), currentPaid + appliedAmount)
          const total = invoiceTotalAmount(invoice)
          const fullyPaid = calculateBalanceDue(total, nextPaid) <= PAYMENT_EPSILON
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id)
          if (requiresSchoolFeeApproval(businessType)) {
            const approvalMeta = approvalMetaForBusiness(businessType)
            const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), pendingInvoicePaymentId(id, currentPaid))
            const pendingPayment = {
              id: paymentRef.id,
              invoiceId: id,
              invoiceNumber: invoice.invoiceNumber || id,
              customerName: invoice.customerName || '',
              amount: appliedAmount,
              amountPaid: 0,
              amountUsd: appliedAmount,
              appliedAmount: 0,
              requestedAmount: amount,
              currency: invoice.currency || 'PKR',
              paymentMethod,
              paymentStatus: 'pending_verification',
              status: 'pending_verification',
              approvalStatus: 'pending',
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType,
              createdBy: userId,
              submittedForApprovalBy: userId,
              paymentSubmittedAt: now,
              createdAt: now,
              updatedAt: now,
            }
            batch.update(invoiceRef, {
              status: 'pending_approval',
              paymentStatus: 'pending_verification',
              approvalStatus: 'pending',
              businessType,
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              submittedForApprovalBy: userId,
              submittedForApprovalAt: now,
              lastPaymentAt: now,
              lastPaymentDate: now,
              paymentHistory: arrayUnion({
                amount: appliedAmount,
                attemptedAmount: amount,
                appliedAmount: 0,
                paymentMethod,
                status: 'pending_approval',
                approvalPaymentId: paymentRef.id,
                recordedBy: userId,
                recordedAt: new Date().toISOString(),
              }),
              updatedAt: now,
            })
            batch.set(paymentRef, pendingPayment)
            await batch.commit()
            setPayments((currentRows) => [
              normalizePayment({
                ...pendingPayment,
                paymentSubmittedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
              ...currentRows.filter((payment) => payment.id !== paymentRef.id),
            ])
            patchLoadedInvoice(id, {
              status: 'pending_approval',
              paymentStatus: 'pending_verification',
              approvalStatus: 'pending',
              requiresApproval: true,
              ...approvalMeta,
              approvalAmount: appliedAmount,
              approvalCustomerName: invoice.customerName || '',
              submittedForApprovalBy: userId,
              submittedForApprovalAt: new Date().toISOString(),
              lastPaymentAt: new Date().toISOString(),
              lastPaymentDate: new Date().toISOString(),
            })
            await logActivity({
              workspaceId,
              userId,
              businessType,
              ...userActivityInfo(userDoc, firebaseUser),
              action: 'Fee payment sent for approval',
              module: 'Invoices',
              description: `${appliedAmount} ${invoice.currency || 'PKR'} was sent for approval on ${invoice.invoiceNumber || id}.`,
              targetId: id,
              targetName: invoice.invoiceNumber || id,
              metadata: {
                amount: appliedAmount,
                attemptedAmount: amount,
                currency: invoice.currency,
                paymentMethod,
                oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
                newValue: { status: 'pending_approval', paymentStatus: 'pending_verification', amountPaid: currentPaid },
            },
          })
            await createWorkspaceNotification({
              workspaceId,
              userId,
              businessType,
              type: 'Approvals',
              priority: 'high',
              title: 'Partial payment approval needed',
              message: `${appliedAmount} ${invoice.currency || 'PKR'} on ${invoice.invoiceNumber || id} is waiting for approval.`,
              relatedId: paymentRef.id,
              route: '/app/approvals',
              createdBy: userId,
              createdByEmail: firebaseUser?.email || userDoc?.email || '',
              metadata: { invoiceId: id, amount: appliedAmount, currency: invoice.currency },
            })
            return { ok: true, pendingApproval: true }
          }
          const canEditAllInvoiceFields = permissions.canEditAllInvoiceFields
          const stockAdjusted = fullyPaid && canEditAllInvoiceFields ? await addInventoryAdjustments(batch, workspaceId, invoice, now, businessType) : false
          batch.update(invoiceRef, {
            paymentStatus: fullyPaid ? 'paid' : 'partial_paid',
            approvalStatus: fullyPaid ? 'approved' : invoice.approvalStatus || 'pending',
            businessType,
            requiresApproval: fullyPaid ? false : invoice.requiresApproval ?? true,
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: calculateBalanceDue(total, nextPaid),
            paidAt: fullyPaid ? now : invoice.paidAt || null,
            approvedBy: fullyPaid ? userId : invoice.approvedBy || null,
            approvedAt: fullyPaid ? now : invoice.approvedAt || null,
            lastPaymentAt: now,
            lastPaymentDate: now,
            paymentHistory: arrayUnion({
              amount: appliedAmount,
              attemptedAmount: amount,
              appliedAmount,
              paymentMethod,
              status: fullyPaid ? 'paid' : 'partial_paid',
              recordedBy: userId,
              recordedAt: new Date().toISOString(),
            }),
            ...(canEditAllInvoiceFields ? { status: fullyPaid ? 'paid' : 'partial_paid', lastPaymentBy: userId } : {}),
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'payments')))
          const transactionId = `${workspaceId}-income-${id}-${Date.now()}`
          batch.set(paymentRef, {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount: appliedAmount,
            amountUsd: appliedAmount,
            appliedAmount,
            attemptedAmount: amount,
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
              amount: total,
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
                newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: total },
              },
            })
          }
          await batch.commit()
          patchLoadedInvoice(id, {
            paymentStatus: fullyPaid ? 'paid' : 'partial_paid',
            approvalStatus: fullyPaid ? 'approved' : invoice.approvalStatus || 'pending',
            requiresApproval: fullyPaid ? false : invoice.requiresApproval ?? true,
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: calculateBalanceDue(total, nextPaid),
            paidAt: fullyPaid ? new Date().toISOString() : invoice.paidAt || null,
            approvedBy: fullyPaid ? userId : invoice.approvedBy || null,
            approvedAt: fullyPaid ? new Date().toISOString() : invoice.approvedAt || null,
            lastPaymentAt: new Date().toISOString(),
            lastPaymentDate: new Date().toISOString(),
            ...(canEditAllInvoiceFields ? { status: fullyPaid ? 'paid' : 'partial_paid', lastPaymentBy: userId } : {}),
            ...(stockAdjusted ? { inventoryAdjustedAt: new Date().toISOString() } : {}),
          })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: fullyPaid ? 'Invoice paid' : 'Partial payment recorded',
            module: 'Invoices',
            description: `${appliedAmount} ${invoice.currency || 'PKR'} was recorded for ${invoice.invoiceNumber || id}.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              amount: appliedAmount,
              appliedAmount,
              attemptedAmount: amount,
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
                amount: total,
                currency: invoice.currency,
                paymentMethod,
                oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: currentPaid },
                newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: total },
              },
            })
          }
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Payments',
            priority: fullyPaid ? 'medium' : 'low',
            title: fullyPaid ? 'Invoice fully paid' : 'Partial payment recorded',
            message: `${appliedAmount} ${invoice.currency || 'PKR'} was recorded for ${invoice.invoiceNumber || id}.`,
            relatedId: id,
            route: '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { amount: appliedAmount, currency: invoice.currency, fullyPaid },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record partial payment.') }
        }
      },
      async updateInvoice(id, patch) {
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        const changedPatch = changedInvoicePatch(invoice, patch)
        const roleName = permissions.invoiceActionRole || permissions.role
        const isOwnerAdmin = roleName === 'owner' || roleName === 'admin'
        const isManager = roleName === 'manager'
        const isSales = roleName === 'sales'
        const isAccountant = roleName === 'accountant'
        let safePatch

        if (isOwnerAdmin) {
          safePatch = changedPatch
        } else if (isManager) {
          safePatch = filterInvoicePatch(changedPatch, INVOICE_BUSINESS_EDIT_FIELDS)
          if (hasUnsafeBusinessStatus(safePatch)) return { ok: false, error: 'Managers can only set draft or pending invoice status.' }
        } else if (isSales) {
          if (!isDraftInvoice(invoice)) return { ok: false, error: 'Sales can only edit draft invoices.' }
          safePatch = filterInvoicePatch(changedPatch, INVOICE_BUSINESS_EDIT_FIELDS)
          if (hasUnsafeBusinessStatus(safePatch)) return { ok: false, error: 'Sales can only set draft or pending invoice status.' }
        } else if (isAccountant) {
          safePatch = filterInvoicePatch(changedPatch, INVOICE_PAYMENT_EDIT_FIELDS)
        } else {
          return { ok: false, error: 'You do not have permission to edit invoices.' }
        }

        if (!Object.keys(safePatch).length) return { ok: false, error: 'No permitted invoice fields to update.' }
        if (!db || !workspaceId || source !== 'firestore') {
          patchLoadedInvoice(id, safePatch)
          return { ok: true }
        }
        await patchUserDoc(workspaceId, 'invoices', id, safePatch, { businessType })
        patchLoadedInvoice(id, safePatch)
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Invoices',
          priority: 'low',
          title: 'Invoice updated',
          message: `${invoice.invoiceNumber || id} was updated.`,
          relatedId: id,
          route: '/app/invoices',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      },
      async sendForApproval(id) {
        if (!permissions.canApprove) return { ok: false, error: 'Only owner or admin can send invoices for approval.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          const approvalMeta = approvalMetaForBusiness(businessType)
          const amount = toNumber(invoice.total ?? invoice.totalUsd, 0)
          const now = serverTimestamp()
          const approvalRecordId = `invoice-${id}`
          const customerName = invoice.customerName || invoice.studentName || invoice.tenantName || invoice.customerEmail || ''
          const requesterName = userDoc?.name || userDoc?.fullName || firebaseUser?.displayName || firebaseUser?.email || userId
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id)
          const approvalRef = doc(db, workspaceCollectionPath(workspaceId, 'approvals'), approvalRecordId)
          const batch = writeBatch(db)
          batch.set(invoiceRef, {
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
            customerName,
            approvalCustomerName: customerName,
            route: approvalMeta.sourceRoute,
            sourceRoute: approvalMeta.sourceRoute,
            approvalRecordId,
            submittedForApprovalBy: userId,
            submittedForApprovalAt: now,
            updatedAt: now,
          }, { merge: true })
          batch.set(approvalRef, {
            workspaceId,
            ownerId: workspaceId,
            userId: workspaceId,
            businessType,
            sourceModule: 'Invoices',
            sourceCollection: 'invoices',
            sourceRoute: approvalMeta.sourceRoute,
            sourceId: id,
            source: invoice.source || '',
            seedBatchId: invoice.seedBatchId || '',
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || '',
            approvalType: approvalMeta.approvalType,
            approvalLabel: approvalMeta.approvalLabel,
            title: `${approvalMeta.approvalLabel} - ${invoice.invoiceNumber || id}`,
            requesterName,
            customerName,
            approvalCustomerName: customerName,
            amount,
            approvalAmount: amount,
            currency: invoice.currency || 'PKR',
            status: 'pending',
            approvalStatus: 'pending',
            paymentStatus: invoice.amountPaid > 0 ? 'partial_paid' : 'pending',
            createdBy: userId,
            submittedForApprovalBy: userId,
            createdAt: now,
            updatedAt: now,
          }, { merge: true })
          await batch.commit()
          patchLoadedInvoice(id, {
            status: 'pending_approval',
            approvalStatus: 'pending',
            paymentStatus: invoice.amountPaid > 0 ? 'partial_paid' : 'pending',
            requiresApproval: true,
            ...approvalMeta,
            amount,
            approvalAmount: amount,
            approvalCustomerName: customerName,
            approvalRecordId,
            submittedForApprovalBy: userId,
            submittedForApprovalAt: new Date().toISOString(),
          })
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
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Approvals',
            priority: 'high',
            title: 'Invoice sent for approval',
            message: `${invoice.invoiceNumber || id} was sent to Approval Center.`,
            relatedId: approvalRecordId,
            route: '/app/approvals',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { invoiceId: id, amount },
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
        patchLoadedInvoice(id, {
          status: 'approved',
          approvalStatus: 'approved',
          requiresApproval: false,
          approvedBy: userId,
          approvedAt: new Date().toISOString(),
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Approvals',
          priority: 'medium',
          title: 'Invoice approved',
          message: `${invoice.invoiceNumber || id} was approved.`,
          relatedId: id,
          route: '/app/invoices',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      },
      async markInvoiceSent(id) {
        if (!permissions.canEmailInvoice) return { ok: false, error: 'You do not have permission to email invoices.' }
        if (!permissions.canEditAllInvoiceFields) return { ok: true }
        await patchUserDoc(workspaceId, 'invoices', id, {
          status: 'sent',
          sentAt: serverTimestamp(),
          sentBy: userId,
        }, { businessType })
        patchLoadedInvoice(id, {
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentBy: userId,
        })
        const invoice = invoices.find((item) => item.id === id)
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Invoices',
          priority: 'low',
          title: 'Invoice sent',
          message: `${invoice?.invoiceNumber || id} was marked as sent.`,
          relatedId: id,
          route: '/app/invoices',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      },
      async markInvoiceUnpaid(id) {
        if (!permissions.canRecordPayment) return { ok: false, error: 'Only owner, admin, or accountant can record invoice payments.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          const total = invoiceTotalAmount(invoice)
          const paidBefore = invoicePaidAmount(invoice)
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const reversed = await cancelInvoiceFinanceDocs({
            batch,
            workspaceId,
            invoice,
            now,
            userId,
          })
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'invoices'), id), {
            ...(permissions.canEditAllInvoiceFields ? { status: 'sent' } : {}),
            paymentStatus: 'pending',
            amountPaid: 0,
            partialPaidAmount: 0,
            balanceDue: total,
            paidAt: null,
            lastPaymentAt: null,
            lastPaymentDate: null,
            paymentHistory: arrayUnion({
              amount: paidBefore,
              appliedAmount: 0,
              status: 'payment_reversed',
              reversedPayments: reversed.payments,
              reversedTransactions: reversed.transactions,
              recordedBy: userId,
              recordedAt: new Date().toISOString(),
            }),
            updatedAt: now,
          })
          await batch.commit()
          patchLoadedInvoice(id, {
            ...(permissions.canEditAllInvoiceFields ? { status: 'sent' } : {}),
            paymentStatus: 'pending',
            amountPaid: 0,
            partialPaidAmount: 0,
            balanceDue: total,
            paidAt: null,
            lastPaymentAt: null,
            lastPaymentDate: null,
          })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice payment reversed',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} was marked unpaid and linked finance records were cancelled.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: {
              amount: paidBefore,
              reversedPayments: reversed.payments,
              reversedTransactions: reversed.transactions,
              oldValue: { status: invoice.status, paymentStatus: invoice.paymentStatus, amountPaid: paidBefore },
              newValue: { status: permissions.canEditAllInvoiceFields ? 'sent' : invoice.status, paymentStatus: 'pending', amountPaid: 0 },
            },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Payments',
            priority: 'medium',
            title: 'Invoice marked unpaid',
            message: `${invoice.invoiceNumber || id} payment was reversed.`,
            relatedId: id,
            route: '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to mark invoice as unpaid.') }
        }
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
          const ref = await createUserDoc(workspaceId, 'invoices', payload, { businessType })
          prependLoadedInvoice({
            id: ref.id,
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Invoices',
            priority: 'low',
            title: 'Invoice duplicated',
            message: `${copyNumber} was created from ${invoice.invoiceNumber || id}.`,
            relatedId: ref.id,
            route: '/app/invoices',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to duplicate invoice.') }
        }
      },
      async deleteInvoice(id) {
        if (!permissions.canDelete) return { ok: false, error: 'Only owner or admin can delete invoices.' }
        if (!workspaceId) return { ok: false, error: 'Please login first' }
        const invoice = invoices.find((item) => item.id === id)
        await removeUserDoc(workspaceId, 'invoices', id)
        removeLoadedInvoice(id)
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Invoices',
          priority: 'low',
          title: 'Invoice deleted',
          message: `${invoice?.invoiceNumber || id} was deleted.`,
          relatedId: id,
          route: '/app/invoices',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      },
    }),
    [invoices, payments, loading, paginationLoading, hasMoreInvoices, invoicePage, invoiceListLimit, loadMoreInvoices, source, error, stats, canApprovePayments, permissions, businessType, firebaseUser, userDoc, userId, workspaceId, patchLoadedInvoice, prependLoadedInvoice, removeLoadedInvoice],
  )

  return api
}
