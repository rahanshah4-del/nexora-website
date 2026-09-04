import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { amountValue, calculateBalanceDue, invoiceValue, isRejectedRecord, statusValue, toNumber } from '../lib/calculations.js'
import { canApproveFinance } from '../lib/financeAccess.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'
import { openPaymentInvoiceIds } from '../lib/approvalQueue.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'

const pendingPaymentStatuses = ['pending', 'pending_verification', 'pending_partial', 'partial_pending']
const pendingRecordStatuses = ['pending', 'pending_approval', 'requested', 'invited']

function toMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

function dateLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

function amountPaidValue(row) {
  return toNumber(row?.amountPaid ?? row?.partialPaidAmount, 0)
}

function balanceDueValue(row, amount) {
  if (row?.balanceDue !== undefined && row?.balanceDue !== null) return Math.max(toNumber(row.balanceDue, 0), 0)
  return calculateBalanceDue(amount, amountPaidValue(row))
}

function isClosedStatus(status) {
  return ['paid', 'rejected', 'cancelled', 'canceled'].includes(statusValue(status, ''))
}

function approvalStatusValues(approval = {}) {
  const row = approval.row || approval || {}
  return [
    row.approvalStatus,
    row.paymentStatus,
    row.status,
    approval.approvalStatus,
    approval.paymentStatus,
    approval.status,
  ].map((value) => statusValue(value, '')).filter(Boolean)
}

function hasAnyStatus(approval, statuses = []) {
  const statusSet = new Set(statuses)
  return approvalStatusValues(approval).some((status) => statusSet.has(status))
}

function isReviewableApproval(approval = {}) {
  return !hasAnyStatus(approval, ['approved', 'paid', 'rejected', 'cancelled', 'canceled', 'active'])
}

function belongsToBusiness(row, businessType) {
  const currentBusinessType = normalizeBusinessType(businessType)
  if (!row?.businessType && !row?.selectedBusinessType) return false
  const rowBusinessType = normalizeBusinessType(row.businessType || row.selectedBusinessType)
  return rowBusinessType === currentBusinessType
}

function isApprovalInvoice(row) {
  const status = statusValue(row?.status, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  return (
    row?.requiresApproval === true ||
    Boolean(row?.approvalType) ||
    Boolean(row?.submittedForApprovalAt) ||
    ['pending', 'pending_approval', 'approved', 'rejected', 'paid'].includes(status) ||
    ['pending', 'pending_approval', 'approved', 'rejected'].includes(approvalStatus) ||
    ['pending', 'pending_approval', 'paid', 'partial_paid', 'rejected'].includes(paymentStatus)
  )
}

function isPendingInvoice(row) {
  const status = statusValue(row?.status, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  if ([status, paymentStatus, approvalStatus].some((value) => ['approved', 'paid', 'rejected', 'cancelled', 'canceled'].includes(value))) return false
  return (
    row?.requiresApproval === true ||
    status === 'pending' ||
    status === 'pending_approval' ||
    paymentStatus === 'pending' ||
    approvalStatus === 'pending'
  )
}

function isPendingPayment(row) {
  const status = statusValue(row?.status, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  if ([status, paymentStatus, approvalStatus].some(isClosedStatus)) return false
  return (
    row?.requiresApproval === true ||
    pendingPaymentStatuses.includes(status) ||
    pendingPaymentStatuses.includes(paymentStatus) ||
    approvalStatus === 'pending'
  )
}

function isApprovalPayment(row) {
  const status = statusValue(row?.status, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  return (
    row?.requiresApproval === true ||
    Boolean(row?.approvalType) ||
    Boolean(row?.approvedAt) ||
    Boolean(row?.rejectedAt) ||
    ['pending', 'pending_verification', 'pending_partial', 'partial_pending', 'paid', 'approved', 'rejected'].includes(status) ||
    ['pending', 'pending_verification', 'pending_partial', 'partial_pending', 'paid', 'approved', 'rejected'].includes(paymentStatus) ||
    ['pending', 'approved', 'rejected'].includes(approvalStatus)
  )
}

function isPendingRecord(row) {
  const status = statusValue(row?.status, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  if ([status, approvalStatus].some((value) => ['approved', 'active', 'rejected', 'cancelled', 'canceled'].includes(value))) {
    return false
  }
  return row?.requiresApproval === true || pendingRecordStatuses.includes(status) || pendingRecordStatuses.includes(approvalStatus)
}

function isApprovalRecord(row) {
  const status = statusValue(row?.status, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  return (
    row?.requiresApproval === true ||
    Boolean(row?.approvalType) ||
    Boolean(row?.approvedAt) ||
    Boolean(row?.rejectedAt) ||
    pendingRecordStatuses.includes(status) ||
    pendingRecordStatuses.includes(approvalStatus) ||
    ['pending', 'approved', 'paid', 'rejected', 'cancelled', 'canceled'].includes(status) ||
    ['pending', 'approved', 'paid', 'rejected'].includes(paymentStatus) ||
    ['pending', 'approved', 'rejected'].includes(approvalStatus)
  )
}

function createApproval(type, sourceCollection, row) {
  const isApprovalRecordSource = sourceCollection === 'approvals'
  const targetCollection = isApprovalRecordSource ? row.sourceCollection || 'invoices' : sourceCollection
  const sourceId = isApprovalRecordSource ? row.sourceId || row.invoiceId || row.id : row.id
  const amount = row.approvalAmount ?? (targetCollection === 'invoices' ? invoiceValue(row) : amountValue(row))
  const amountPaid = amountPaidValue(row)
  const customer =
    row.customerName ||
    row.approvalCustomerName ||
    row.studentName ||
    row.tenantName ||
    row.clientName ||
    row.staffName ||
    row.title ||
    row.name ||
    row.userName ||
    row.businessName ||
    row.customerEmail ||
    row.userEmail ||
    '—'
  const submittedBy =
    row.submittedByName ||
    row.submittedByEmail ||
    row.userEmail ||
    row.createdBy ||
    row.submittedBy ||
    row.email ||
    '—'

  return {
    id: `${isApprovalRecordSource ? 'approval' : type}:${row.id}`,
    sourceId,
    type: row.approvalLabel || type,
    approvalType: row.approvalType || '',
    sourceCollection: targetCollection,
    approvalRecordId: isApprovalRecordSource ? row.id : row.approvalRecordId || '',
    customer,
    amount,
    amountPaid,
    balanceDue: balanceDueValue(row, amount),
    currency: row.currency || 'PKR',
    status: statusValue(
      sourceCollection === 'invoices' ? row.approvalStatus || row.paymentStatus || row.status : row.paymentStatus || row.approvalStatus || row.status,
      'pending',
    ),
    submittedBy,
    date: row.createdAt || row.paymentSubmittedAt || row.updatedAt || null,
    dateLabel: dateLabel(row.createdAt || row.paymentSubmittedAt || row.updatedAt),
    sortAt: toMillis(row.createdAt || row.paymentSubmittedAt || row.updatedAt),
    invoiceId: row.invoiceId || '',
    invoiceNumber: row.invoiceNumber || '',
    userId: row.userId || '',
    businessType: row.businessType || '',
    route: row.route || row.sourceRoute || '',
    row,
  }
}

function invoiceApprovalTypeForBusiness(businessType) {
  const type = normalizeBusinessType(businessType)
  if (type === 'School ERP') return { type: 'fee', label: 'Fee Approval' }
  if (type === 'Property ERP') return { type: 'rent', label: 'Rent Approval' }
  if (type === 'Restaurant POS') return { type: 'bill', label: 'Bill Approval' }
  if (type === 'Retail / POS') return { type: 'bill', label: 'Sales Bill Approval' }
  return { type: 'invoice', label: 'Invoice Approval' }
}

function transactionApprovalType(row = {}) {
  const type = statusValue(row.type, 'adjustment')
  if (type === 'bank_transfer') return 'Bank transfer'
  if (type === 'cash_withdrawal') return 'Cash withdrawal'
  if (type === 'cash_payment') return 'Cash payment'
  if (type === 'expense') return 'Expense payment'
  if (type === 'income') return 'Income verification'
  return 'Account transaction'
}

function accountActionLabel(row = {}, approved = true) {
  const type = statusValue(row.type, 'adjustment')
  if (type === 'bank_transfer') return approved ? 'Bank transfer approved' : 'Bank transfer rejected'
  if (type === 'cash_withdrawal') return approved ? 'Cash withdrawal approved' : 'Cash withdrawal rejected'
  if (type === 'cash_payment') return approved ? 'Cash payment approved' : 'Cash payment rejected'
  if (type === 'expense') return approved ? 'Expense payment approved' : 'Expense payment rejected'
  if (type === 'income') return approved ? 'Invoice payment added to wallet' : 'Income verification rejected'
  return approved ? 'Wallet transaction approved' : 'Wallet transaction rejected'
}

function subscribeWorkspaceCollection(workspaceId, collectionName, businessType, onData, onError) {
  if (!db || !workspaceId) {
    onData([])
    return () => {}
  }
  const ref = collection(db, workspaceCollectionPath(workspaceId, collectionName))
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((row) => belongsToBusiness(row, businessType))),
    (error) => onError?.(new Error(clientSafeMessage(error, 'Unable to load approvals.'))),
  )
}

async function addInventoryAdjustments(batch, workspaceId, invoice, now, businessType) {
  if (!db || !workspaceId || invoice?.inventoryAdjustedAt || invoice?.stockAdjustedAt) return false
  const productItems = (invoice?.items || []).filter((item) => item.productId && toNumber(item.quantity ?? item.qty, 0) > 0)
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
          type: 'invoice_approved',
          invoiceId: invoice.id || invoice.invoiceNumber || '',
          invoiceNumber: invoice.invoiceNumber || '',
          previousQuantity: currentStock,
          quantity: Math.max(0, currentStock - quantity),
          delta: -quantity,
          note: 'Approval payment stock deduction',
          createdAt: new Date().toISOString(),
        }),
        updatedAt: now,
      })
    }),
  )

  return true
}

export function useApprovals() {
  const { userId, workspaceId, businessType, role, userDoc, firebaseUser, isAdmin, isOwner } = useUser()
  const workspaceAccess = useWorkspaceAccess()
  const canApprove = Boolean(
    isOwner ||
    isAdmin ||
    workspaceAccess.hasModulePermission('approvals', 'approve') ||
    workspaceAccess.hasModulePermission('invoices', 'approve') ||
    workspaceAccess.hasModulePermission('payments', 'approve') ||
    workspaceAccess.hasModulePermission('expenses', 'approve') ||
    workspaceAccess.hasModulePermission('accounts', 'approve') ||
    (canApproveFinance(userDoc?.role || role) && workspaceAccess.hasModulePermission('approvals', 'view'))
  )
  const canApproveSubscription = false
  const [invoices, setInvoices] = useState([])
  const [approvalRecords, setApprovalRecords] = useState([])
  const [payments, setPayments] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [clients, setClients] = useState([])
  const [expenses, setExpenses] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [accountTransactions, setAccountTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !userId || !canApprove) {
      Promise.resolve().then(() => {
        setInvoices([])
        setApprovalRecords([])
        setPayments([])
        setTeamMembers([])
        setClients([])
        setExpenses([])
        setSalaryPayments([])
        setAccountTransactions([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const expectedLoads = 8
    let loaded = 0
    function markLoaded() {
      loaded += 1
      if (loaded >= expectedLoads) setLoading(false)
    }
    function onCollectionError(collectionName, critical = false) {
      return (err) => {
        console.warn('[Approval Center] collection read failed', {
          collectionName,
          workspaceId,
          role: userDoc?.role || role || '',
          businessType,
          code: err?.code || '',
          message: err?.message || '',
        })
        if (critical) setError(clientSafeMessage(err, 'Unable to load invoice approvals.'))
        markLoaded()
      }
    }

    function onCriticalError(err) {
      setError(clientSafeMessage(err, 'Unable to load invoice approvals.'))
      setLoading(false)
    }

    const unsubInvoices = subscribeWorkspaceCollection(
      workspaceId,
      'invoices',
      businessType,
      (rows) => {
        setInvoices(rows.filter(isApprovalInvoice))
        markLoaded()
      },
      onCriticalError,
    )

    const unsubApprovalRecords = subscribeWorkspaceCollection(
      workspaceId,
      'approvals',
      businessType,
      (rows) => {
        setApprovalRecords(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('approvals'),
    )

    const unsubPayments = subscribeWorkspaceCollection(
      workspaceId,
      'payments',
      businessType,
      (rows) => {
        setPayments(rows.filter(isApprovalPayment))
        markLoaded()
      },
      onCollectionError('payments'),
    )

    const unsubTeam = subscribeWorkspaceCollection(
      workspaceId,
      'teamMembers',
      businessType,
      (rows) => {
        setTeamMembers(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('teamMembers'),
    )

    const unsubClients = subscribeWorkspaceCollection(
      workspaceId,
      'clients',
      businessType,
      (rows) => {
        setClients(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('clients'),
    )

    const unsubExpenses = subscribeWorkspaceCollection(
      workspaceId,
      'expenses',
      businessType,
      (rows) => {
        setExpenses(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('expenses'),
    )

    const unsubSalaryPayments = subscribeWorkspaceCollection(
      workspaceId,
      'staffSalaryPayments',
      businessType,
      (rows) => {
        setSalaryPayments(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('staffSalaryPayments'),
    )

    const unsubAccountTransactions = subscribeWorkspaceCollection(
      workspaceId,
      'accountTransactions',
      businessType,
      (rows) => {
        setAccountTransactions(rows.filter(isApprovalRecord))
        markLoaded()
      },
      onCollectionError('accountTransactions'),
    )

    return () => {
      unsubInvoices?.()
      unsubApprovalRecords?.()
      unsubPayments?.()
      unsubTeam?.()
      unsubClients?.()
      unsubExpenses?.()
      unsubSalaryPayments?.()
      unsubAccountTransactions?.()
    }
  }, [businessType, canApprove, userId, workspaceId])

  const approvals = useMemo(() => {
    const invoiceLabel = invoiceApprovalTypeForBusiness(businessType).label
    const approvalRecordSourceIds = new Set(approvalRecords.map((row) => row.sourceId || row.invoiceId).filter(Boolean))
    const invoicesWithOpenPayments = openPaymentInvoiceIds(payments)
    const rows = [
      ...approvalRecords
        .filter((row) => !(String(row.sourceCollection || 'invoices') === 'invoices' && invoicesWithOpenPayments.has(String(row.sourceId || row.invoiceId || ''))))
        .map((row) => createApproval(row.approvalLabel || invoiceLabel, 'approvals', row)),
      ...invoices
        .filter((row) => !approvalRecordSourceIds.has(row.id) && !invoicesWithOpenPayments.has(String(row.id)))
        .map((row) => createApproval(row.approvalLabel || invoiceLabel, 'invoices', row)),
      ...payments.map((row) => createApproval('Client payment reference', 'payments', row)),
      ...teamMembers.map((row) => createApproval('Staff access request', 'teamMembers', row)),
      ...clients.map((row) => createApproval('Client approval', 'clients', row)),
      ...expenses.map((row) => createApproval('Expense approval', 'expenses', row)),
      ...salaryPayments.map((row) => createApproval('Salary payment approval', 'staffSalaryPayments', row)),
      ...accountTransactions.map((row) => createApproval(transactionApprovalType(row), 'accountTransactions', row)),
    ]
    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [accountTransactions, approvalRecords, businessType, clients, expenses, invoices, payments, salaryPayments, teamMembers])

  const pendingApprovals = useMemo(() => approvals.filter(isReviewableApproval), [approvals])
  const approvedApprovals = useMemo(
    () =>
      approvals.filter((approval) => hasAnyStatus(approval, ['approved', 'paid', 'active'])),
    [approvals],
  )
  const rejectedApprovals = useMemo(
    () =>
      approvals.filter((approval) => hasAnyStatus(approval, ['rejected', 'cancelled', 'canceled'])),
    [approvals],
  )

  const summary = useMemo(
    () => {
      const invoicesWithOpenPayments = openPaymentInvoiceIds(payments)
      return ({
      pendingPayments: payments.filter((row) => isPendingPayment(row)).length,
      pendingInvoices: approvalRecords.filter((row) => statusValue(row.status || row.approvalStatus, '') === 'pending' && !invoicesWithOpenPayments.has(String(row.sourceId || row.invoiceId || ''))).length || invoices.filter((row) => isPendingInvoice(row) && !invoicesWithOpenPayments.has(String(row.id))).length,
      upgradeRequests: 0,
      staffRequests: teamMembers.filter((row) => isPendingRecord(row)).length,
      expenseRequests: expenses.filter((row) => isPendingRecord(row)).length,
      salaryRequests: salaryPayments.filter((row) => isPendingRecord(row)).length,
      accountRequests: accountTransactions.filter((row) => isPendingRecord(row)).length,
      pending: pendingApprovals.length,
      approved: approvedApprovals.length,
      rejected: rejectedApprovals.length,
      total: pendingApprovals.length,
      })
    },
    [accountTransactions, approvalRecords, approvedApprovals.length, expenses, invoices, payments, pendingApprovals.length, rejectedApprovals.length, salaryPayments, teamMembers],
  )

  const approve = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (!isReviewableApproval(approval)) return { ok: false, error: 'This request has already been reviewed.' }
      if (approval?.sourceCollection === 'upgradeRequests' && !canApproveSubscription) {
        return { ok: false, error: 'Only a platform admin can approve subscription upgrades.' }
      }

      try {
        const row = approval.row || {}

        if (approval.sourceCollection === 'payments') {
          // ── Payment approval — wrapped in runTransaction ──
          const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), approval.sourceId)
          const invoiceRef = approval.invoiceId ? doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.invoiceId) : null
          const transactionRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), `income-payment-${approval.sourceId}`)
          const txnId = `${workspaceId}-income-${approval.sourceId}-${Date.now()}`

          await runTransaction(db, async (transaction) => {
            // Read payment inside txn
            const paySnap = await transaction.get(paymentRef)
            if (!paySnap.exists()) throw new Error('Payment record not found.')
            const payData = paySnap.data()

            // Idempotency: skip if already reviewed
            if (isClosedStatus(statusValue(payData.paymentStatus || payData.status, ''))) {
              throw new Error('This payment has already been reviewed.')
            }

            // Read income transaction — skip if already exists
            const incSnap = await transaction.get(transactionRef)
            if (incSnap.exists()) throw new Error('Income transaction already recorded for this payment.')

            let walletAmount = amountValue(row)
            let nextPaid = 0
            let nextBalance = 0
            let fullyPaid = false
            let invoiceAmount = 0

            if (invoiceRef) {
              const invSnap = await transaction.get(invoiceRef)
              if (invSnap.exists()) {
                const invData = { id: approval.invoiceId, ...invSnap.data() }
                invoiceAmount = invoiceValue(invData) || amountValue(row)
                const currentPaid = amountPaidValue(invData)
                const remainingDue = balanceDueValue(invData, invoiceAmount)
                walletAmount = Math.min(walletAmount, remainingDue > 0 ? remainingDue : invoiceAmount)
                nextPaid = Math.min(invoiceAmount, currentPaid + walletAmount)
                nextBalance = calculateBalanceDue(invoiceAmount, nextPaid)
                fullyPaid = nextBalance <= 0.005
              }
            }

            // Update payment doc
            transaction.update(paymentRef, {
              status: 'paid',
              paymentStatus: 'paid',
              approvalStatus: 'approved',
              businessType,
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              paidAt: serverTimestamp(),
              amountPaid: walletAmount,
              appliedAmount: walletAmount,
              requiresApproval: false,
              updatedAt: serverTimestamp(),
            })

            // Update invoice if linked
            if (invoiceRef && invoiceAmount > 0) {
              const updatePayload = {
                status: fullyPaid ? 'paid' : 'partial_paid',
                paymentStatus: fullyPaid ? 'paid' : 'partial_paid',
                approvalStatus: 'approved',
                businessType,
                requiresApproval: !fullyPaid,
                approvedBy: userId,
                approvedAt: serverTimestamp(),
                paidAt: fullyPaid ? serverTimestamp() : null,
                amountPaid: nextPaid,
                partialPaidAmount: nextPaid,
                balanceDue: nextBalance,
                lastPaymentAt: serverTimestamp(),
                lastPaymentDate: serverTimestamp(),
                paymentHistory: arrayUnion({
                  amount: walletAmount,
                  appliedAmount: walletAmount,
                  paymentMethod: row.paymentMethod || 'Approval Center',
                  status: fullyPaid ? 'paid' : 'partial_paid',
                  approvalPaymentId: approval.sourceId,
                  approvedBy: userId,
                  approvedAt: new Date().toISOString(),
                }),
                updatedAt: serverTimestamp(),
              }
              transaction.update(invoiceRef, updatePayload)
            }

            // Create income transaction
            transaction.set(transactionRef, {
              transactionId: txnId,
              type: 'income',
              source: row.source || 'invoice',
              sourceModule: 'invoice',
              seedBatchId: row.seedBatchId || '',
              amount: walletAmount,
              currency: row.currency || approval.currency || 'PKR',
              method: row.paymentMethod || 'Manual Approval',
              status: 'approved',
              approvalStatus: 'approved',
              title: `Invoice payment - ${row.invoiceNumber || approval.invoiceId || approval.sourceId}`,
              description: `${approval.customer} payment approved.`,
              relatedId: approval.invoiceId || row.invoiceId || approval.sourceId,
              invoiceId: approval.invoiceId || row.invoiceId || '',
              paymentId: approval.sourceId,
              customerName: approval.customer,
              createdBy: userId,
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              metadata: {
                oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '' },
                newValue: { status: 'approved', paymentStatus: 'paid' },
              },
            })

            // Update approval record if exists
            if (approval.approvalRecordId) {
              transaction.set(doc(db, workspaceCollectionPath(workspaceId, 'approvals'), approval.approvalRecordId), {
                status: 'approved',
                approvalStatus: 'approved',
                businessType,
                approvedBy: userId,
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }, { merge: true })
            }
          })
        }

        if (approval.sourceCollection === 'invoices') {
          const invRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
          const invNow = serverTimestamp()
          await runTransaction(db, async (txn) => {
            const snap = await txn.get(invRef)
            if (!snap.exists()) throw new Error('Invoice not found.')
            const invData = snap.data()
            // Idempotency: skip if already approved
            if (invData.approvalStatus === 'approved' || invData.status === 'approved' || isClosedStatus(statusValue(invData.approvalStatus || invData.status, ''))) {
              throw new Error('This invoice has already been approved.')
            }
            if (isRejectedRecord(invData)) throw new Error('Cancelled or rejected invoices cannot be approved.')
            txn.update(invRef, {
              status: 'approved',
              approvalStatus: 'approved',
              businessType,
              requiresApproval: false,
              approvedBy: userId,
              approvedAt: invNow,
              updatedAt: invNow,
            })
          })
        }

        if (approval.sourceCollection === 'upgradeRequests') {
          const upBatch = writeBatch(db)
          const now = serverTimestamp()
          const plan = row.requestedPlan || row.selectedPlan || row.plan || 'Business'
          const subscriptionPayload = buildApprovedSubscriptionPayload({
            plan,
            billingCycle: row.billingCycle || 'monthly',
            amount: amountValue(row),
            currency: row.billingCurrency || row.currency || 'PKR',
            approvedBy: userId,
            approvedByEmail: firebaseUser?.email || '',
          })
          upBatch.update(doc(db, 'upgradeRequests', approval.sourceId), {
            approvalStatus: 'approved',
            paymentStatus: 'paid',
            approvedBy: subscriptionPayload.approvedBy,
            approvedByEmail: subscriptionPayload.approvedByEmail,
            approvedAt: subscriptionPayload.approvedAt,
            subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
            nextBillingDate: subscriptionPayload.nextBillingDate,
            updatedAt: subscriptionPayload.updatedAt,
          })
          if (row.userId) {
            const planPatch = {
              ...subscriptionPayload,
              paidAt: subscriptionPayload.approvedAt,
            }
            upBatch.set(doc(db, 'users', row.userId), planPatch, { merge: true })
            upBatch.set(
              doc(db, 'workspaces', row.workspaceId || row.userId),
              {
                ...planPatch,
                ownerId: row.ownerId || row.userId,
                userId: row.workspaceId || row.userId,
                workspaceId: row.workspaceId || row.userId,
              },
              { merge: true },
            )
          }
          await upBatch.commit()
        }

        if (approval.sourceCollection === 'teamMembers') {
          const tmRef = doc(db, workspaceCollectionPath(workspaceId, 'teamMembers'), approval.sourceId)
          const tmNow = serverTimestamp()
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(tmRef)
            if (!snap.exists()) throw new Error('Staff record not found.')
            // Idempotency: skip if already approved/rejected by someone else since this was loaded
            if (!isPendingRecord(snap.data())) throw new Error('This staff request has already been reviewed.')
            transaction.set(tmRef, {
              status: 'active',
              approvalStatus: 'approved',
              businessType,
              approvedBy: userId,
              approvedAt: tmNow,
              updatedAt: tmNow,
            }, { merge: true })
          })
        }

        if (approval.sourceCollection === 'clients') {
          const clRef = doc(db, workspaceCollectionPath(workspaceId, 'clients'), approval.sourceId)
          const clNow = serverTimestamp()
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(clRef)
            if (!snap.exists()) throw new Error('Client record not found.')
            if (!isPendingRecord(snap.data())) throw new Error('This client request has already been reviewed.')
            transaction.update(clRef, {
              status: 'Active',
              approvalStatus: 'approved',
              businessType,
              approvedBy: userId,
              approvedAt: clNow,
              updatedAt: clNow,
            })
          })
        }

        if (approval.sourceCollection === 'expenses') {
          const expenseRef = doc(db, workspaceCollectionPath(workspaceId, 'expenses'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(expenseRef)
            if (!snap.exists()) throw new Error('Expense not found.')
            const data = snap.data()
            // Idempotency: skip if already reviewed
            if (isClosedStatus(statusValue(data.approvalStatus || data.status, ''))) {
              throw new Error('This expense has already been reviewed.')
            }
            transaction.update(expenseRef, {
              approvalStatus: 'approved',
              status: 'paid',
              paymentStatus: 'paid',
              businessType,
              requiresApproval: false,
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              paidAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          })
        }

        if (approval.sourceCollection === 'staffSalaryPayments') {
          const salaryAmount = amountValue(row)
          const salaryRef = doc(db, workspaceCollectionPath(workspaceId, 'staffSalaryPayments'), approval.sourceId)
          const salaryExpenseRef = doc(db, workspaceCollectionPath(workspaceId, 'expenses'), `salary-${approval.sourceId}`)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(salaryRef)
            if (!snap.exists()) throw new Error('Salary payment not found.')
            // Idempotency: skip if already reviewed
            if (isClosedStatus(statusValue(snap.data().approvalStatus || snap.data().status, ''))) {
              throw new Error('This salary payment has already been reviewed.')
            }
            transaction.update(salaryRef, {
              approvalStatus: 'approved',
              status: 'paid',
              paymentStatus: 'paid',
              businessType,
              requiresApproval: false,
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              paidAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            transaction.set(salaryExpenseRef, {
              title: `Salary - ${row.staffName || approval.customer}`,
              category: 'Salary',
              amount: salaryAmount,
              currency: row.currency || approval.currency || 'PKR',
              paymentMethod: row.paymentMethod || 'Payroll',
              paidBy: row.staffName || approval.customer,
              status: 'paid',
              approvalStatus: 'approved',
              paymentStatus: 'paid',
              requiresApproval: false,
              notes: row.remarks || `Payroll salary for ${row.salaryMonth || ''}`.trim(),
              receiptReference: row.transactionRef || approval.sourceId,
              source: 'school_payroll',
              sourceModule: 'payroll',
              payrollPaymentId: approval.sourceId,
              staffId: row.staffId || '',
              staffName: row.staffName || approval.customer,
              salaryMonth: row.salaryMonth || '',
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              paidAt: serverTimestamp(),
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType,
              createdBy: row.createdBy || userId,
              createdAt: row.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true })
          })
        }

        if (approval.sourceCollection === 'accountTransactions') {
          const txnRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), approval.sourceId)
          const expenseRef = statusValue(row.type, '') === 'expense' && row.relatedId
            ? doc(db, workspaceCollectionPath(workspaceId, 'expenses'), row.relatedId)
            : null
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(txnRef)
            if (!snap.exists()) throw new Error('Transaction not found.')
            const data = snap.data()
            // Idempotency: skip if already reviewed
            if (isClosedStatus(statusValue(data.approvalStatus || data.status, ''))) {
              throw new Error('This transaction has already been reviewed.')
            }
            transaction.update(txnRef, {
              approvalStatus: 'approved',
              status: 'paid',
              businessType,
              requiresApproval: false,
              approvedBy: userId,
              approvedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            if (expenseRef) {
              transaction.set(expenseRef, {
                approvalStatus: 'approved',
                status: 'paid',
                businessType,
                approvedBy: userId,
                approvedAt: serverTimestamp(),
                paidAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }, { merge: true })
            }
          })
        }

        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action:
            approval.sourceCollection === 'invoices'
              ? 'Invoice approved'
              : approval.sourceCollection === 'upgradeRequests'
                ? 'Subscription upgraded'
                : approval.sourceCollection === 'payments'
                  ? 'Payment approved'
                  : approval.sourceCollection === 'staffSalaryPayments'
                    ? 'Salary payment approved'
                  : approval.sourceCollection === 'expenses'
                    ? 'Expense approved'
                    : approval.sourceCollection === 'accountTransactions'
                      ? accountActionLabel(row, true)
                      : 'Approval approved',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was approved.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: {
            type: approval.type,
            sourceCollection: approval.sourceCollection,
            amount: approval.amount,
            currency: approval.currency,
            oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '', approvalStatus: row.approvalStatus || '' },
            newValue: { status: approval.sourceCollection === 'payments' ? 'paid' : 'approved', approvalStatus: 'approved' },
          },
        })
        if (approval.sourceCollection === 'payments') {
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice payment added to wallet',
            module: 'Account Management',
            description: `${approval.customer} payment was added to wallet.`,
            targetId: approval.sourceId,
            targetName: approval.customer,
            metadata: {
              type: approval.type,
              sourceCollection: approval.sourceCollection,
              amount: approval.amount,
              currency: approval.currency,
              oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '' },
              newValue: { status: 'paid', paymentStatus: 'paid' },
            },
          })
        }
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Approvals',
          priority: 'medium',
          title:
            approval.sourceCollection === 'payments'
              ? 'Payment approved'
              : approval.sourceCollection === 'staffSalaryPayments'
                ? 'Salary payment approved'
              : approval.sourceCollection === 'expenses'
                ? 'Expense approved'
                : 'Request approved',
          message: `${approval.type} for ${approval.customer} was approved.`,
          relatedId: approval.sourceId,
          route: approval.sourceCollection === 'payments' || approval.sourceCollection === 'invoices' ? '/app/invoices' : approval.sourceCollection === 'staffSalaryPayments' ? '/app/payroll' : '/app/approvals',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
          metadata: { sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to approve request.') }
      }
    },
    [businessType, canApprove, canApproveSubscription, firebaseUser, userDoc, userId, workspaceId],
  )

  const markPaid = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (approval?.sourceCollection !== 'invoices') return { ok: false, error: 'Only invoices can be marked paid from here.' }
      if (!isReviewableApproval(approval)) return { ok: false, error: 'This invoice has already been reviewed.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()
        const row = approval.row || {}
        const invoiceTotal = invoiceValue(row)
        if (isClosedStatus(row.paymentStatus || row.status)) return { ok: false, error: 'This invoice is already closed.' }
        const stockAdjusted = await addInventoryAdjustments(batch, workspaceId, row, now, businessType)

        if (approval.approvalRecordId) {
          batch.set(doc(db, workspaceCollectionPath(workspaceId, 'approvals'), approval.approvalRecordId), {
            status: 'approved',
            approvalStatus: 'approved',
            paymentStatus: 'paid',
            businessType,
            approvedBy: userId,
            approvedAt: now,
            updatedAt: now,
          }, { merge: true })
        }

        const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
        batch.update(invoiceRef, {
          status: 'paid',
          paymentStatus: 'paid',
          approvalStatus: 'approved',
          businessType,
          requiresApproval: false,
          amountPaid: invoiceTotal,
          partialPaidAmount: invoiceTotal,
          balanceDue: 0,
          paidAt: now,
          approvedBy: userId,
          approvedAt: now,
          updatedAt: now,
          ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
        })

        const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), `invoice-${approval.sourceId}-approval-center`)
        batch.set(paymentRef, {
          invoiceId: approval.sourceId,
          invoiceNumber: row.invoiceNumber || approval.sourceId,
          customerName: row.customerName || approval.customer,
          customerEmail: row.customerEmail || '',
          clientId: row.clientId || '',
          source: row.source || 'invoice',
          sourceModule: 'invoice',
          seedBatchId: row.seedBatchId || '',
          amount: invoiceTotal,
          amountPaid: invoiceTotal,
          amountUsd: invoiceTotal,
          currency: row.currency || 'PKR',
          paymentMethod: 'Approval Center',
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

        const transactionRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), `income-invoice-${approval.sourceId}`)
        const transactionId = `${workspaceId}-income-${approval.sourceId}-${Date.now()}`
        batch.set(transactionRef, {
          transactionId,
          type: 'income',
          source: row.source || 'invoice',
          sourceModule: 'invoice',
          seedBatchId: row.seedBatchId || '',
          amount: invoiceTotal,
          currency: row.currency || 'PKR',
          method: 'Approval Center',
          status: 'approved',
          approvalStatus: 'approved',
          title: `Invoice payment - ${row.invoiceNumber || approval.sourceId}`,
          description: `${approval.customer} invoice payment was added to wallet.`,
          relatedId: approval.sourceId,
          invoiceId: approval.sourceId,
          paymentId: paymentRef.id,
          customerName: row.customerName || approval.customer,
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
            oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '' },
            newValue: { status: 'paid', paymentStatus: 'paid' },
          },
        })

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Invoice marked paid',
          module: 'Approvals',
          description: `${row.invoiceNumber || approval.sourceId} was marked as paid.`,
          targetId: approval.sourceId,
          targetName: row.invoiceNumber || approval.customer,
          metadata: {
            amount: invoiceTotal,
            currency: row.currency || 'PKR',
            sourceCollection: approval.sourceCollection,
            oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '', amountPaid: row.amountPaid || 0 },
            newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoiceTotal },
          },
        })
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Invoice payment added to wallet',
          module: 'Account Management',
          description: `${row.invoiceNumber || approval.sourceId} payment was added to wallet.`,
          targetId: approval.sourceId,
          targetName: row.invoiceNumber || approval.customer,
          metadata: {
            amount: invoiceTotal,
            currency: row.currency || 'PKR',
            sourceCollection: approval.sourceCollection,
            oldValue: { status: row.status || '', paymentStatus: row.paymentStatus || '', amountPaid: row.amountPaid || 0 },
            newValue: { status: 'paid', paymentStatus: 'paid', amountPaid: invoiceTotal },
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Approvals',
          priority: 'medium',
          title: 'Invoice marked paid',
          message: `${row.invoiceNumber || approval.sourceId} was marked as paid.`,
          relatedId: approval.sourceId,
          route: '/app/invoices',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
          metadata: { amount: invoiceTotal, currency: row.currency || 'PKR' },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to mark invoice as paid.') }
      }
    },
    [businessType, canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const reject = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (!isReviewableApproval(approval)) return { ok: false, error: 'This request has already been reviewed.' }
      if (approval?.sourceCollection === 'upgradeRequests' && !canApproveSubscription) {
        return { ok: false, error: 'Only a platform admin can reject subscription upgrades.' }
      }

      try {
        const now = serverTimestamp()

        // Each branch re-reads its source record inside a transaction and
        // checks it is still pending before writing — this closes the gap
        // where two reviewers (or a stale UI + a retry) could both act on
        // the same request and silently overwrite each other's decision.
        if (approval.sourceCollection === 'invoices') {
          const invRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(invRef)
            if (!snap.exists()) throw new Error('Invoice not found.')
            const invData = snap.data()
            if (invData.approvalStatus === 'approved' || invData.status === 'approved' || isClosedStatus(statusValue(invData.approvalStatus || invData.status, ''))) {
              throw new Error('This invoice has already been reviewed.')
            }
            transaction.update(invRef, {
              approvalStatus: 'rejected',
              status: 'rejected',
              paymentStatus: 'rejected',
              businessType,
              requiresApproval: false,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
          })
        }

        if (approval.sourceCollection === 'payments') {
          const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), approval.sourceId)
          const invoiceRef = approval.invoiceId ? doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.invoiceId) : null
          await runTransaction(db, async (transaction) => {
            const paySnap = await transaction.get(paymentRef)
            if (!paySnap.exists()) throw new Error('Payment record not found.')
            const payData = paySnap.data()
            if (isClosedStatus(statusValue(payData.paymentStatus || payData.status, ''))) {
              throw new Error('This payment has already been reviewed.')
            }
            const invoiceSnap = invoiceRef ? await transaction.get(invoiceRef) : null
            transaction.update(paymentRef, {
              status: 'rejected',
              paymentStatus: 'rejected',
              approvalStatus: 'rejected',
              businessType,
              requiresApproval: false,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
            if (invoiceRef && invoiceSnap?.exists()) {
              transaction.update(invoiceRef, {
                status: 'rejected',
                paymentStatus: 'rejected',
                approvalStatus: 'rejected',
                businessType,
                requiresApproval: false,
                rejectedBy: userId,
                rejectedAt: now,
                updatedAt: now,
              })
            }
          })
        }

        if (approval.sourceCollection === 'upgradeRequests') {
          const upBatch = writeBatch(db)
          upBatch.update(doc(db, 'upgradeRequests', approval.sourceId), {
            approvalStatus: 'rejected',
            paymentStatus: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
          })
          await upBatch.commit()
        }

        if (approval.sourceCollection === 'teamMembers') {
          const tmRef = doc(db, workspaceCollectionPath(workspaceId, 'teamMembers'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(tmRef)
            if (!snap.exists()) throw new Error('Staff record not found.')
            if (!isPendingRecord(snap.data())) throw new Error('This staff request has already been reviewed.')
            transaction.set(tmRef, {
              status: 'rejected',
              approvalStatus: 'rejected',
              businessType,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            }, { merge: true })
          })
        }

        if (approval.sourceCollection === 'clients') {
          const clRef = doc(db, workspaceCollectionPath(workspaceId, 'clients'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(clRef)
            if (!snap.exists()) throw new Error('Client record not found.')
            if (!isPendingRecord(snap.data())) throw new Error('This client request has already been reviewed.')
            transaction.update(clRef, {
              status: 'rejected',
              approvalStatus: 'rejected',
              businessType,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
          })
        }

        if (approval.sourceCollection === 'expenses') {
          const expenseRef = doc(db, workspaceCollectionPath(workspaceId, 'expenses'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(expenseRef)
            if (!snap.exists()) throw new Error('Expense not found.')
            if (isClosedStatus(statusValue(snap.data().approvalStatus || snap.data().status, ''))) {
              throw new Error('This expense has already been reviewed.')
            }
            transaction.update(expenseRef, {
              approvalStatus: 'rejected',
              status: 'rejected',
              businessType,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
          })
        }

        if (approval.sourceCollection === 'staffSalaryPayments') {
          const salaryRef = doc(db, workspaceCollectionPath(workspaceId, 'staffSalaryPayments'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(salaryRef)
            if (!snap.exists()) throw new Error('Salary payment not found.')
            if (isClosedStatus(statusValue(snap.data().approvalStatus || snap.data().status, ''))) {
              throw new Error('This salary payment has already been reviewed.')
            }
            transaction.update(salaryRef, {
              approvalStatus: 'rejected',
              status: 'rejected',
              paymentStatus: 'rejected',
              businessType,
              requiresApproval: false,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
          })
        }

        if (approval.sourceCollection === 'accountTransactions') {
          const txnRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), approval.sourceId)
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(txnRef)
            if (!snap.exists()) throw new Error('Transaction not found.')
            if (isClosedStatus(statusValue(snap.data().approvalStatus || snap.data().status, ''))) {
              throw new Error('This transaction has already been reviewed.')
            }
            transaction.update(txnRef, {
              approvalStatus: 'rejected',
              status: 'rejected',
              businessType,
              requiresApproval: false,
              rejectedBy: userId,
              rejectedAt: now,
              updatedAt: now,
            })
          })
        }

        // Supplementary approval-queue record — mirrors the source record's
        // new status for the Approval Center list; not the source of truth,
        // so a failure here shouldn't undo the rejection above.
        if (approval.approvalRecordId) {
          const arBatch = writeBatch(db)
          arBatch.set(doc(db, workspaceCollectionPath(workspaceId, 'approvals'), approval.approvalRecordId), {
            status: 'rejected',
            approvalStatus: 'rejected',
            businessType,
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          }, { merge: true })
          await arBatch.commit().catch((err) => console.warn('[Approvals] approval record update failed', err?.message || err))
        }

        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action:
            approval.sourceCollection === 'invoices'
              ? 'Invoice rejected'
              : approval.sourceCollection === 'staffSalaryPayments'
                ? 'Salary payment rejected'
              : approval.sourceCollection === 'accountTransactions'
                ? accountActionLabel(approval.row, false)
                : 'Approval rejected',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was rejected.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: {
            type: approval.type,
            sourceCollection: approval.sourceCollection,
            amount: approval.amount,
            currency: approval.currency,
            oldValue: {
              status: approval.row?.status || '',
              paymentStatus: approval.row?.paymentStatus || '',
              approvalStatus: approval.row?.approvalStatus || '',
            },
            newValue: { status: 'rejected', approvalStatus: 'rejected' },
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Approvals',
          priority: 'high',
          title: 'Request rejected',
          message: `${approval.type} for ${approval.customer} was rejected.`,
          relatedId: approval.sourceId,
          route: approval.sourceCollection === 'staffSalaryPayments' ? '/app/payroll' : '/app/approvals',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
          metadata: { sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reject request.') }
      }
    },
    [businessType, canApprove, canApproveSubscription, firebaseUser, userDoc, userId, workspaceId],
  )

  return useMemo(
    () => ({
      approvals,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
      canApprove,
      canApproveSubscription,
      error,
      loading,
      summary,
      approve,
      markPaid,
      reject,
    }),
    [approvedApprovals, approvals, approve, canApprove, canApproveSubscription, error, loading, markPaid, pendingApprovals, reject, rejectedApprovals, summary],
  )
}
