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

const pendingPaymentStatuses = ['pending', 'pending_verification', 'pending_partial', 'partial_pending']
const pendingRecordStatuses = ['pending', 'Pending', 'pending_approval', 'requested', 'Requested', 'invited', 'Invited']

function toMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

function dateLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

function statusValue(value, fallback = 'pending') {
  return String(value || fallback).trim().toLowerCase()
}

function amountValue(row) {
  return Number(row?.amount ?? row?.amountPaid ?? row?.total ?? row?.totalUsd ?? row?.planPrice ?? 0) || 0
}

function isApproverRole(role) {
  return ['owner', 'admin', 'accountant'].includes(String(role || '').toLowerCase())
}

function createApproval(type, sourceCollection, row) {
  const amount = amountValue(row)
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
    currency: row.currency || 'PKR',
    status: statusValue(row.paymentStatus || row.approvalStatus || row.status, 'pending'),
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

function subscribeWorkspaceQuery(workspaceId, collectionName, filterField, statuses, onData, onError) {
  if (!db || !workspaceId) {
    onData([])
    return () => {}
  }
  const ref = collection(db, workspaceCollectionPath(workspaceId, collectionName))
  const q = query(ref, where(filterField, 'in', statuses))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError?.(error),
  )
}

export function useApprovals() {
  const { userId, workspaceId, role, userDoc, firebaseUser } = useUser()
  const canApprove = isApproverRole(role)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [clients, setClients] = useState([])
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
        setLoading(false)
        setError(db ? '' : 'Firestore is not configured.')
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
      if (loaded >= 5) setLoading(false)
    }
    function onError(err) {
      setError(err?.message || 'Failed to load approvals.')
      setLoading(false)
    }

    const unsubInvoices = subscribeWorkspaceQuery(
      workspaceId,
      'invoices',
      'paymentStatus',
      pendingPaymentStatuses,
      (rows) => {
        setInvoices(rows)
        markLoaded()
      },
      onError,
    )

    const unsubPayments = subscribeWorkspaceQuery(
      workspaceId,
      'payments',
      'paymentStatus',
      pendingPaymentStatuses,
      (rows) => {
        setPayments(rows)
        markLoaded()
      },
      onError,
    )

    const unsubTeam = subscribeWorkspaceQuery(
      workspaceId,
      'teamMembers',
      'status',
      pendingRecordStatuses,
      (rows) => {
        setTeamMembers(rows)
        markLoaded()
      },
      onError,
    )

    const unsubClients = subscribeWorkspaceQuery(
      workspaceId,
      'clients',
      'status',
      pendingRecordStatuses,
      (rows) => {
        setClients(rows)
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
            .filter((item) => statusValue(item.approvalStatus, 'pending') === 'pending'),
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
      unsubUpgrades?.()
    }
  }, [canApprove, userId, workspaceId])

  const approvals = useMemo(() => {
    const rows = [
      ...invoices.map((row) => createApproval('Invoice payment', 'invoices', row)),
      ...payments.map((row) => createApproval('Client payment reference', 'payments', row)),
      ...upgradeRequests.map((row) => createApproval('Subscription upgrade', 'upgradeRequests', row)),
      ...teamMembers.map((row) => createApproval('Staff access request', 'teamMembers', row)),
      ...clients.map((row) => createApproval('Client approval', 'clients', row)),
    ]
    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [clients, invoices, payments, teamMembers, upgradeRequests])

  const summary = useMemo(
    () => ({
      pendingPayments: payments.length,
      pendingInvoices: invoices.length,
      upgradeRequests: upgradeRequests.length,
      staffRequests: teamMembers.length,
      total: approvals.length,
    }),
    [approvals.length, invoices.length, payments.length, teamMembers.length, upgradeRequests.length],
  )

  const approve = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Firestore is not configured.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()
        const row = approval.row || {}

        if (approval.sourceCollection === 'invoices') {
          const invoiceRef = doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId)
          batch.update(invoiceRef, {
            status: 'paid',
            paymentStatus: 'paid',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            amountPaid: amountValue(row),
            balanceDue: 0,
            updatedAt: now,
          })

          const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'payments')))
          batch.set(paymentRef, {
            invoiceId: approval.sourceId,
            invoiceNumber: row.invoiceNumber || approval.sourceId,
            customerName: row.customerName || approval.customer,
            amount: amountValue(row),
            amountUsd: amountValue(row),
            currency: row.currency || 'PKR',
            paymentMethod: 'Approval Center',
            paymentStatus: 'paid',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            createdAt: now,
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
              const invoiceAmount = amountValue(invoiceSnap.data()) || amountValue(row)
              batch.update(invoiceRef, {
                status: 'paid',
                paymentStatus: 'paid',
                approvedBy: userId,
                approvedAt: now,
                paidAt: now,
                amountPaid: invoiceAmount,
                balanceDue: 0,
                updatedAt: now,
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

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: approval.sourceCollection === 'upgradeRequests' ? 'Upgrade approved' : 'Approval approved',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was approved.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: { type: approval.type, sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err?.message || 'Failed to approve request.' }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const reject = useCallback(
    async (approval) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Firestore is not configured.' }

      try {
        const batch = writeBatch(db)
        const now = serverTimestamp()

        if (approval.sourceCollection === 'invoices') {
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'invoices'), approval.sourceId), {
            status: 'rejected',
            paymentStatus: 'rejected',
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

        await batch.commit()
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Approval rejected',
          module: 'Approvals',
          description: `${approval.type} for ${approval.customer} was rejected.`,
          targetId: approval.sourceId,
          targetName: approval.customer,
          metadata: { type: approval.type, sourceCollection: approval.sourceCollection, amount: approval.amount, currency: approval.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err?.message || 'Failed to reject request.' }
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
      reject,
    }),
    [approvals, approve, canApprove, error, loading, reject, summary],
  )
}
