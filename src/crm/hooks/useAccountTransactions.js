import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeCurrency, statusValue, toNumber } from '../lib/calculations.js'
import { transactionAmount } from '../lib/financeCalculations.js'

function normalizeTransaction(transaction = {}) {
  return {
    id: transaction.id,
    type: statusValue(transaction.type, 'adjustment'),
    amount: transactionAmount(transaction),
    currency: normalizeCurrency(transaction.currency),
    method: transaction.method || transaction.paymentMethod || 'Manual',
    status: statusValue(transaction.status || transaction.approvalStatus, 'pending'),
    approvalStatus: statusValue(transaction.approvalStatus || transaction.status, 'pending'),
    title: transaction.title || transaction.description || 'Account transaction',
    description: transaction.description || transaction.notes || '',
    relatedId: transaction.relatedId || transaction.invoiceId || transaction.expenseId || '',
    invoiceId: transaction.invoiceId || '',
    paymentId: transaction.paymentId || '',
    customerName: transaction.customerName || '',
    createdBy: transaction.createdBy || '',
    approvedBy: transaction.approvedBy || '',
    rejectedBy: transaction.rejectedBy || '',
    createdAt: transaction.createdAt || null,
    approvedAt: transaction.approvedAt || null,
    rejectedAt: transaction.rejectedAt || null,
    metadata: transaction.metadata || {},
    bankName: transaction.bankName || '',
    accountTitle: transaction.accountTitle || '',
    accountNumber: transaction.accountNumber || '',
    receiverName: transaction.receiverName || '',
    paidTo: transaction.paidTo || '',
    reason: transaction.reason || '',
    notes: transaction.notes || '',
  }
}

function approverRole(role) {
  return ['owner', 'admin', 'accountant'].includes(String(role || '').toLowerCase())
}

function actionLabel(type, approved = false) {
  const value = statusValue(type, 'adjustment')
  if (value === 'bank_transfer') return approved ? 'Bank transfer approved' : 'Bank transfer requested'
  if (value === 'cash_withdrawal') return approved ? 'Cash withdrawal approved' : 'Cash withdrawal requested'
  if (value === 'cash_payment') return approved ? 'Cash payment approved' : 'Cash payment made'
  if (value === 'expense') return approved ? 'Expense payment approved' : 'Expense payment requested'
  if (value === 'income') return 'Invoice payment added to wallet'
  return approved ? 'Wallet transaction approved' : 'Wallet transaction requested'
}

export function useAccountTransactions() {
  const { userId, workspaceId, role, userDoc, firebaseUser } = useUser()
  const canApprove = approverRole(userDoc?.role || role)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setTransactions([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setTransactions([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      'accountTransactions',
      (rows) => {
        const list = (Array.isArray(rows) ? rows : []).map(normalizeTransaction).sort((a, b) => {
          const at = a.createdAt?.toDate?.()?.getTime?.() || new Date(a.createdAt || 0).getTime() || 0
          const bt = b.createdAt?.toDate?.()?.getTime?.() || new Date(b.createdAt || 0).getTime() || 0
          return bt - at
        })
        setTransactions(list)
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load account transactions.'))
        setTransactions([])
        setLoading(false)
      },
    )

    return () => unsub?.()
  }, [workspaceId])

  const createTransaction = useCallback(
    async (payload = {}) => {
      if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
      const amount = Math.max(toNumber(payload.amount, 0), 0)
      if (amount <= 0) return { ok: false, error: 'Amount is required' }
      const type = statusValue(payload.type, 'adjustment')
      const title = String(payload.title || actionLabel(type)).trim()
      try {
        const ref = await createUserDoc(workspaceId, 'accountTransactions', {
          type,
          amount,
          currency: normalizeCurrency(payload.currency || 'PKR'),
          method: payload.method || payload.paymentMethod || 'Manual',
          status: payload.status || 'pending',
          approvalStatus: payload.approvalStatus || payload.status || 'pending',
          requiresApproval: payload.requiresApproval ?? true,
          title,
          description: String(payload.description || payload.notes || '').trim(),
          relatedId: payload.relatedId || payload.expenseId || payload.invoiceId || '',
          invoiceId: payload.invoiceId || '',
          paymentId: payload.paymentId || '',
          customerName: payload.customerName || '',
          bankName: payload.bankName || '',
          accountTitle: payload.accountTitle || '',
          accountNumber: payload.accountNumber || '',
          receiverName: payload.receiverName || '',
          paidTo: payload.paidTo || '',
          reason: payload.reason || '',
          notes: payload.notes || '',
          metadata: payload.metadata || {},
          createdBy: userId,
        })
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: actionLabel(type),
          module: 'Account Management',
          description: `${title} for ${normalizeCurrency(payload.currency || 'PKR')} ${amount} was submitted.`,
          targetId: ref.id,
          targetName: title,
          metadata: { type, amount, currency: normalizeCurrency(payload.currency || 'PKR') },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to save transaction.') }
      }
    },
    [firebaseUser, userDoc, userId, workspaceId],
  )

  const approveTransaction = useCallback(
    async (transaction) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      try {
        await patchUserDoc(workspaceId, 'accountTransactions', transaction.id, {
          status: 'approved',
          approvalStatus: 'approved',
          approvedBy: userId,
          approvedAt: serverTimestamp(),
          requiresApproval: false,
        })
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: actionLabel(transaction.type, true),
          module: 'Account Management',
          description: `${transaction.title} was approved.`,
          targetId: transaction.id,
          targetName: transaction.title,
          metadata: { type: transaction.type, amount: transaction.amount, currency: transaction.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to approve transaction.') }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const rejectTransaction = useCallback(
    async (transaction) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to reject requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      try {
        await patchUserDoc(workspaceId, 'accountTransactions', transaction.id, {
          status: 'rejected',
          approvalStatus: 'rejected',
          rejectedBy: userId,
          rejectedAt: serverTimestamp(),
          requiresApproval: false,
        })
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Wallet transaction rejected',
          module: 'Account Management',
          description: `${transaction.title} was rejected.`,
          targetId: transaction.id,
          targetName: transaction.title,
          metadata: { type: transaction.type, amount: transaction.amount, currency: transaction.currency },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reject transaction.') }
      }
    },
    [canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  return useMemo(
    () => ({
      transactions,
      loading,
      source,
      error,
      canApprove,
      createTransaction,
      approveTransaction,
      rejectTransaction,
    }),
    [approveTransaction, canApprove, createTransaction, error, loading, rejectTransaction, source, transactions],
  )
}
