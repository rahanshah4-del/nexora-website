import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeCurrency, statusValue, toNumber } from '../lib/calculations.js'
import { isPendingTransaction, transactionAmount } from '../lib/financeCalculations.js'
import { financePermissions, outflowTransaction } from '../lib/financeAccess.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

function normalizeTransaction(transaction = {}) {
  return {
    id: transaction.id,
    transactionId: transaction.transactionId || transaction.id,
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
    expenseId: transaction.expenseId || '',
    invoiceNumber: transaction.invoiceNumber || '',
    reference: transaction.reference || transaction.receiptReference || transaction.transactionReference || '',
    customerName: transaction.customerName || '',
    createdBy: transaction.createdBy || '',
    submittedBy: transaction.submittedBy || transaction.createdBy || '',
    submittedByName: transaction.submittedByName || '',
    submittedByEmail: transaction.submittedByEmail || '',
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

function actionLabel(type, approved = false) {
  const value = statusValue(type, 'adjustment')
  if (value === 'bank_transfer') return approved ? 'Bank transfer approved' : 'Bank transfer requested'
  if (value === 'cash_withdrawal') return approved ? 'Cash withdrawal approved' : 'Cash withdrawal requested'
  if (value === 'cash_payment') return approved ? 'Cash payment approved' : 'Cash payment made'
  if (value === 'expense') return approved ? 'Expense payment approved' : 'Expense payment requested'
  if (value === 'income') return 'Invoice payment added to wallet'
  return approved ? 'Wallet transaction approved' : 'Wallet transaction requested'
}

export function useAccountTransactions({ enabled = true, limitCount = null } = {}) {
  const { userId, workspaceId, businessType, role, userDoc, firebaseUser } = useUser()
  const permissions = useMemo(() => financePermissions(userDoc?.role || role), [role, userDoc?.role])
  const canApprove = permissions.canApproveStandard
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setTransactions([])
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
      })
      return
    }
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
      { businessType, orderByField: limitCount ? 'createdAt' : '', orderDirection: 'desc', limitCount },
    )

    return () => unsub?.()
  }, [businessType, enabled, limitCount, workspaceId])

  const createTransaction = useCallback(
    async (payload = {}) => {
      if (!permissions.canManageAccounts) return { ok: false, error: 'You do not have permission to manage account transactions.' }
      if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
      const amount = Math.max(toNumber(payload.amount, 0), 0)
      if (amount <= 0) return { ok: false, error: 'Amount is required' }
      const type = statusValue(payload.type, 'adjustment')
      const title = String(payload.title || actionLabel(type)).trim()
      const availableBalance = toNumber(payload.availableBalance, 0)
      const allowNegativeBalance = Boolean(payload.allowNegativeBalance && permissions.canAllowNegativeWallet)
      if (outflowTransaction(type) && amount > availableBalance && !allowNegativeBalance) {
        return { ok: false, error: 'Insufficient wallet balance for this transaction.' }
      }
      const duplicate = transactions.some((transaction) => {
        if (!isPendingTransaction(transaction)) return false
        if (transaction.type !== type) return false
        if (transactionAmount(transaction) !== amount) return false
        const existingTarget = transaction.relatedId || transaction.accountNumber || transaction.receiverName || transaction.paidTo || transaction.title
        const nextTarget = payload.relatedId || payload.expenseId || payload.accountNumber || payload.receiverName || payload.paidTo || title
        return String(existingTarget || '').trim().toLowerCase() === String(nextTarget || '').trim().toLowerCase()
      })
      if (duplicate) return { ok: false, error: 'A similar transaction is already pending approval.' }
      const transactionId = `${workspaceId}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const submitter = userActivityInfo(userDoc, firebaseUser)
      try {
        const ref = await createUserDoc(workspaceId, 'accountTransactions', {
          transactionId,
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
          expenseId: payload.expenseId || '',
          invoiceId: payload.invoiceId || '',
          invoiceNumber: payload.invoiceNumber || '',
          paymentId: payload.paymentId || '',
          reference: payload.reference || payload.receiptReference || payload.transactionReference || '',
          customerName: payload.customerName || '',
          bankName: payload.bankName || '',
          accountTitle: payload.accountTitle || '',
          accountNumber: payload.accountNumber || '',
          receiverName: payload.receiverName || '',
          paidTo: payload.paidTo || '',
          reason: payload.reason || '',
          notes: payload.notes || '',
          submittedBy: userId,
          submittedByName: submitter.userName,
          submittedByEmail: submitter.userEmail,
          metadata: {
            ...(payload.metadata || {}),
            oldValue: null,
            newValue: { type, amount, status: payload.status || 'pending' },
            createdByRole: permissions.role,
          },
          createdBy: userId,
        }, { businessType })
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: actionLabel(type),
          module: 'Account Management',
          description: `${title} for ${normalizeCurrency(payload.currency || 'PKR')} ${amount} was submitted.`,
          targetId: ref.id,
          targetName: title,
          metadata: {
            type,
            amount,
            currency: normalizeCurrency(payload.currency || 'PKR'),
            oldValue: null,
            newValue: { type, amount, status: payload.status || 'pending' },
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Account',
          priority: 'high',
          title: 'Wallet transaction submitted',
          message: `${title} for ${normalizeCurrency(payload.currency || 'PKR')} ${amount} was submitted.`,
          relatedId: ref.id,
          route: '/app/approvals',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
          metadata: { type, amount, currency: normalizeCurrency(payload.currency || 'PKR') },
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to save transaction.') }
      }
    },
    [businessType, firebaseUser, permissions, transactions, userDoc, userId, workspaceId],
  )

  const approveTransaction = useCallback(
    async (transaction) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to approve requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (!isPendingTransaction(transaction)) return { ok: false, error: 'This transaction has already been reviewed.' }
      try {
        await patchUserDoc(workspaceId, 'accountTransactions', transaction.id, {
          status: 'approved',
          approvalStatus: 'approved',
          approvedBy: userId,
          approvedAt: serverTimestamp(),
          requiresApproval: false,
        }, { businessType })
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: actionLabel(transaction.type, true),
          module: 'Account Management',
          description: `${transaction.title} was approved.`,
          targetId: transaction.id,
          targetName: transaction.title,
          metadata: {
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            oldValue: { status: transaction.status, approvalStatus: transaction.approvalStatus },
            newValue: { status: 'approved', approvalStatus: 'approved' },
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Account',
          priority: 'medium',
          title: 'Wallet transaction approved',
          message: `${transaction.title} was approved.`,
          relatedId: transaction.id,
          route: '/app/accounts',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to approve transaction.') }
      }
    },
    [businessType, canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const rejectTransaction = useCallback(
    async (transaction) => {
      if (!canApprove) return { ok: false, error: 'You do not have permission to reject requests.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (!isPendingTransaction(transaction)) return { ok: false, error: 'This transaction has already been reviewed.' }
      try {
        await patchUserDoc(workspaceId, 'accountTransactions', transaction.id, {
          status: 'rejected',
          approvalStatus: 'rejected',
          rejectedBy: userId,
          rejectedAt: serverTimestamp(),
          requiresApproval: false,
        }, { businessType })
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Wallet transaction rejected',
          module: 'Account Management',
          description: `${transaction.title} was rejected.`,
          targetId: transaction.id,
          targetName: transaction.title,
          metadata: {
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            oldValue: { status: transaction.status, approvalStatus: transaction.approvalStatus },
            newValue: { status: 'rejected', approvalStatus: 'rejected' },
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Account',
          priority: 'high',
          title: 'Wallet transaction rejected',
          message: `${transaction.title} was rejected.`,
          relatedId: transaction.id,
          route: '/app/accounts',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to reject transaction.') }
      }
    },
    [businessType, canApprove, firebaseUser, userDoc, userId, workspaceId],
  )

  const deleteTransaction = useCallback(
    async (transaction) => {
      if (!permissions.canDeleteTransactions) return { ok: false, error: 'Only the owner can delete account transactions.' }
      if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      try {
        await removeUserDoc(workspaceId, 'accountTransactions', transaction.id)
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Wallet transaction deleted',
          module: 'Account Management',
          description: `${transaction.title} was deleted.`,
          targetId: transaction.id,
          targetName: transaction.title,
          metadata: {
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            oldValue: { status: transaction.status, approvalStatus: transaction.approvalStatus },
            newValue: null,
          },
        })
        await createWorkspaceNotification({
          workspaceId,
          userId,
          businessType,
          type: 'Account',
          priority: 'low',
          title: 'Wallet transaction deleted',
          message: `${transaction.title} was deleted.`,
          relatedId: transaction.id,
          route: '/app/accounts',
          createdBy: userId,
          createdByEmail: firebaseUser?.email || userDoc?.email || '',
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to delete transaction.') }
      }
    },
    [businessType, firebaseUser, permissions.canDeleteTransactions, userDoc, userId, workspaceId],
  )

  return useMemo(
    () => ({
      transactions,
      loading,
      source,
      error,
      canApprove,
      permissions,
      createTransaction,
      approveTransaction,
      rejectTransaction,
      deleteTransaction,
    }),
    [approveTransaction, canApprove, createTransaction, deleteTransaction, error, loading, permissions, rejectTransaction, source, transactions],
  )
}
