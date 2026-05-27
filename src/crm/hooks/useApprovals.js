import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { amountValue, calculateBalanceDue, invoiceValue, statusValue, toNumber } from '../lib/calculations.js'

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

function isApproverRole(role) {
  return ['owner', 'admin', 'accountant'].includes(String(role || '').toLowerCase())
}

function isClosedStatus(status) {
  return ['paid', 'rejected', 'cancelled', 'canceled'].includes(statusValue(status, ''))
}

function isPendingInvoice(row) {
  const status = statusValue(row?.status, '')
  const paymentStatus = statusValue(row?.paymentStatus, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  if ([status, paymentStatus, approvalStatus].some((value) => ['rejected', 'cancelled', 'canceled'].includes(value))) return false
  if (status === 'paid' || paymentStatus === 'paid') return false
  return (
    row?.requiresApproval === true ||
    status === 'pending' ||
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

function isPendingRecord(row) {
  const status = statusValue(row?.status, '')
  const approvalStatus = statusValue(row?.approvalStatus, '')
  if ([status, approvalStatus].some((value) => ['approved', 'active', 'rejected', 'cancelled', 'canceled'].includes(value))) {
    return false
  }
  return row?.requiresApproval === true || pendingRecordStatuses.includes(status) || pendingRecordStatuses.includes(approvalStatus)
}

function createApproval(type, sourceCollection, row) {
  const amount = sourceCollection === 'invoices' ? invoiceValue(row) : amountValue(row)
  const amountPaid = amountPaidValue(row)
  const customer =
    row.customerName ||
    row.clientName ||
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
    id: `${type}:${row.id}`,
    sourceId: row.id,
    type,
    sourceCollection,
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
    row,
  }
}

function subscribeWorkspaceCollection(workspaceId, collectionName, onData, onError) {
  if (!db || !workspaceId) {
    onData([])
    return () => {}
  }
  const ref = collection(db, workspaceCollectionPath(workspaceId, collectionName))
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError?.(new Error(clientSafeMessage(error, 'Unable to load approvals.'))),
  )
}

async function addInventoryAdjustments(batch, workspaceId, invoice, now) {
  if (!db || !workspaceId || invoice?.inventoryAdjustedAt || invoice?.stockAdjustedAt) return false
  const productItems = (invoice?.items || []).filter((item) => item.productId && toNumber(item.quantity ?? item.qty, 0) > 0)
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

export function useApprovals() {
  const { userId, workspaceId, role, userDoc, firebaseUser } = useUser()
  const canApprove = isApproverRole(role)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [clients, setClients] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !userId || !canApprove) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setUpgradeRequests([])
        setTeamMembers([])
        setClients([])
        setExpenses([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    let loaded = 0
    function markLoaded() {
      loaded += 1
      if (loaded >= 6) setLoading(false)
    }
    function onError(err) {
      setError(clientSafeMessage(err, 'Unable to load approvals.'))
      setLoading(false)
    }

    const unsubInvoices = subscribeWorkspaceCollection(
      workspaceId,
      'invoices',
      (rows) => {
        setInvoices(rows.filter(isPendingInvoice))
        markLoaded()
      },
      onError,
    )

    const unsubPayments = subscribeWorkspaceCollection(
      workspaceId,
      'payments',
      (rows) => {
        setPayments(rows.filter(isPendingPayment))
        markLoaded()
      },
      onError,
    )

    const unsubTeam = subscribeWorkspaceCollection(
      workspaceId,
      'teamMembers',
      (rows) => {
        setTeamMembers(rows.filter(isPendingRecord))
        markLoaded()
      },
      onError,
    )

    const unsubClients = subscribeWorkspaceCollection(
      workspaceId,
      'clients',
      (rows) => {
        setClients(rows.filter(isPendingRecord))
        markLoaded()
      },
      onError,
    )

    const unsubExpenses = subscribeWorkspaceCollection(
      workspaceId,
      'expenses',
      (rows) => {
        setExpenses(rows.filter(isPendingRecord))
        markLoaded()
      },
      onError,
    )

    const upgradeRef = collection(db, 'upgradeRequests')
    const upgradeQuery = query(upgradeRef, where('workspaceId', '==', workspaceId))
    const unsubUpgrades = onSnapshot(
      upgradeQuery,
      (snap) => {
        setUpgradeRequests(
          snap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter((item) => isPendingRecord(item) || statusValue(item.paymentStatus, '') === 'pending'),
        )
        markLoaded()
      },
      onError,
    )

    return () => {
      unsubInvoices?.()
      unsubPayments?.()
      unsubTeam?.()
      unsubClients?.()
      unsubExpenses?.()
      unsubUpgrades?.()
    }
  }, [canApprove, userId, workspaceId])

  const approvals = useMemo(() => {
    const rows = [
      ...invoices.map((row) => createApproval('Invoice', 'invoices', row)),
      ...payments.map((row) => createApproval('Client payment reference', 'payments', row)),
      ...upgradeRequests.map((row) => createApproval('Subscription upgrade', 'upgradeRequests', row)),
      ...teamMembers.map((row) => createApproval('Staff access request', 'teamMembers', row)),
      ...clients.map((row) => createApproval('Client approval', 'clients', row)),
      ...expenses.map((row) => createApproval('Expense approval', 'expenses', row)),
    ]
    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [clients, expenses, invoices, payments, teamMembers, upgradeRequests])

  const summary = useMemo(
    () => ({
      pendingPayments: payments.length,
      pendingInvoices: invoices.length,
      upgradeRequests: upgradeRequests.length,
      staffRequests: teamMembers.length,
      expenseRequests: expenses.length,
      total: approvals.length,
    }),
    [approvals.length, expenses.length, invoices.length, payments.length, teamMembers.length, upgradeRequests.length],
  )

  const approve = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()
        const row = approval.row || {}

        if (approval.sourceCollection === 'invoices') {
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
          batch.update(invoiceRef, {
            approvalStatus: 'approved',
            approvedBy: userId,
            approvedAt: now,
            updatedAt: now,
          })
        }

        if (approval.sourceCollection === 'payments') {
          const paymentRef = doc(db, workspaceCollectionPath(workspaceId, 'payments'), approval.sourceId)
          batch.update(paymentRef, {
            status: 'paid',
            paymentStatus: 'paid',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            updatedAt: now,
          })

          if (approval.invoiceId) {
            const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.invoiceId)
            const invoiceSnap = await getDoc(invoiceRef)
            if (invoiceSnap.exists()) {
              const invoiceData = { id: approval.invoiceId, ...invoiceSnap.data() }
              const invoiceAmount = invoiceValue(invoiceData) || amountValue(row)
              const stockAdjusted = await addInventoryAdjustments(batch, workspaceId, invoiceData, now)
              batch.update(invoiceRef, {
                status: 'paid',
                paymentStatus: 'paid',
                approvalStatus: 'approved',
                requiresApproval: false,
                approvedBy: userId,
                approvedAt: now,
                paidAt: now,
                amountPaid: invoiceAmount,
                balanceDue: 0,
                updatedAt: now,
                ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
              })
            }
          }
        }

        if (approval.sourceCollection === 'upgradeRequests') {
          const plan = row.requestedPlan || row.selectedPlan || 'Business'
          const billingCycle = row.billingCycle || 'monthly'
          batch.update(doc(db, 'upgradeRequests', approval.sourceId), {
            approvalStatus: 'approved',
            paymentStatus: 'paid',
            approvedBy: userId,
            approvedAt: now,
          })
          if (row.userId) {
            batch.set(
              doc(db, 'users', row.userId),
              {
                plan,
                planStatus: 'active',
                billingCycle,
                upgradedAt: now,
                updatedAt: now,
              },
              { merge: true },
            )
          }
        }

        if (approval.sourceCollection === 'teamMembers') {
          const patch = {
            status: 'active',
            approvalStatus: 'approved',
            approvedBy: userId,
            approvedAt: now,
            updatedAt: now,
          }
          batch.set(doc(db, workspaceCollectionPath(workspaceId, 'teamMembers'), approval.sourceId), patch, { merge: true })
        }

        if (approval.sourceCollection === 'clients') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'clients'), approval.sourceId), {
            status: 'Active',
            approvalStatus: 'approved',
            approvedBy: userId,
            approvedAt: now,
            updatedAt: now,
          })
        }

        if (approval.sourceCollection === 'expenses') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'expenses'), approval.sourceId), {
            approvalStatus: 'approved',
            status: 'approved',
            approvedBy: userId,
            approvedAt: now,
            updatedAt: now,
          })
        }

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action:
            approval.sourceCollection === 'invoices'
              ? 'Invoice approved'
              : approval.sourceCollection === 'upgradeRequests'
                ? 'Subscription upgraded'
                : approval.sourceCollection === 'payments'
                  ? 'Payment approved'
                  : 'Approval approved',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was approved.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: { type: approval.type, sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to approve request.') }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const markPaid = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (approval?.sourceCollection !== 'invoices') return { ok: false, error: 'Only invoices can be marked paid from here.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()
        const row = approval.row || {}
        const invoiceTotal = invoiceValue(row)
        const stockAdjusted = await addInventoryAdjustments(batch, workspaceId, row, now)

        const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
        batch.update(invoiceRef, {
          status: 'paid',
          paymentStatus: 'paid',
          approvalStatus: 'approved',
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

        const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'payments')))
        batch.set(paymentRef, {
          invoiceId: approval.sourceId,
          invoiceNumber: row.invoiceNumber || approval.sourceId,
          customerName: row.customerName || approval.customer,
          customerEmail: row.customerEmail || '',
          clientId: row.clientId || '',
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
          createdAt: now,
          updatedAt: now,
        })

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Invoice marked paid',
          module: 'Approvals',
          description: `${row.invoiceNumber || approval.sourceId} was marked as paid.`,
          targetId: approval.sourceId,
          targetName: row.invoiceNumber || approval.customer,
          metadata: { amount: invoiceTotal, currency: row.currency || 'PKR', sourceCollection: approval.sourceCollection },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to mark invoice as paid.') }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const reject = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()

        if (approval.sourceCollection === 'invoices') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId), {
            approvalStatus: 'rejected',
            status: 'rejected',
            paymentStatus: 'rejected',
            requiresApproval: false,
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          })
        }

        if (approval.sourceCollection === 'payments') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'payments'), approval.sourceId), {
            status: 'rejected',
            paymentStatus: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          })
          if (approval.invoiceId) {
            const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.invoiceId)
            const invoiceSnap = await getDoc(invoiceRef)
            if (invoiceSnap.exists()) {
              batch.update(invoiceRef, {
                status: 'rejected',
                paymentStatus: 'rejected',
                approvalStatus: 'rejected',
                requiresApproval: false,
                rejectedBy: userId,
                rejectedAt: now,
                updatedAt: now,
              })
            }
          }
        }

        if (approval.sourceCollection === 'upgradeRequests') {
          batch.update(doc(db, 'upgradeRequests', approval.sourceId), {
            approvalStatus: 'rejected',
            paymentStatus: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
          })
        }

        if (approval.sourceCollection === 'teamMembers') {
          const patch = {
            status: 'rejected',
            approvalStatus: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          }
          batch.set(doc(db, workspaceCollectionPath(workspaceId, 'teamMembers'), approval.sourceId), patch, { merge: true })
        }

        if (approval.sourceCollection === 'clients') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'clients'), approval.sourceId), {
            status: 'rejected',
            approvalStatus: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          })
        }

        if (approval.sourceCollection === 'expenses') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'expenses'), approval.sourceId), {
            approvalStatus: 'rejected',
            status: 'rejected',
            rejectedBy: userId,
            rejectedAt: now,
            updatedAt: now,
          })
        }

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: approval.sourceCollection === 'invoices' ? 'Invoice rejected' : 'Approval rejected',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was rejected.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: { type: approval.type, sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reject request.') }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  return useMemo(
    () => ({
      approvals,
      canApprove,
      error,
      loading,
      summary,
      approve,
      markPaid,
      reject,
    }),
    [approvals, approve, canApprove, error, loading, markPaid, reject, summary],
  )
}
