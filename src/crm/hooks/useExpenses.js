import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { expenseValue, normalizeCurrency, statusValue } from '../lib/calculations.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

function normalizeExpense(expense) {
  return {
    id: expense.id,
    title: expense.title || expense.name || expense.category || 'Expense',
    category: expense.category || 'General',
    amount: expenseValue(expense),
    currency: normalizeCurrency(expense.currency),
    paymentMethod: expense.paymentMethod || 'Cash',
    paidBy: expense.paidBy || expense.createdByName || '',
    status: statusValue(expense.status || expense.approvalStatus, 'pending'),
    approvalStatus: statusValue(expense.approvalStatus || expense.status, 'pending'),
    notes: expense.notes || '',
    receiptReference: expense.receiptReference || expense.receipt || '',
    createdBy: expense.createdBy || expense.userId || '',
    approvedBy: expense.approvedBy || '',
    rejectedBy: expense.rejectedBy || '',
    createdAt: expense.createdAt || null,
    approvedAt: expense.approvedAt || null,
    rejectedAt: expense.rejectedAt || null,
  }
}

function safeRecentLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return null
  return Math.floor(next)
}

export function useExpenses({ limitCount = null, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const recentLimit = safeRecentLimit(limitCount)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setExpenses([])
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setExpenses([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setExpenses([])
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

    const handleRows = (rows) => {
      setExpenses((Array.isArray(rows) ? rows : []).map(normalizeExpense))
      setLoading(false)
    }
    const handleError = (err) => {
      setError(clientSafeMessage(err, 'Unable to load expenses.'))
      setExpenses([])
      setLoading(false)
    }

    const unsub = recentLimit
      ? listenToWorkspaceCollection({
          workspaceId,
          collectionName: 'expenses',
          businessType,
          limitCount: recentLimit,
          onData: handleRows,
          onError: handleError,
        })
      : subscribeUserCollection(workspaceId, 'expenses', handleRows, handleError, {
          businessType,
        })

    return () => unsub?.()
  }, [businessType, enabled, recentLimit, workspaceId])

  return useMemo(
    () => ({
      expenses,
      loading,
      source,
      error,
      async createExpense(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const title = String(payload.title || payload.name || payload.category || '').trim()
        const amount = expenseValue(payload)
        if (!title) return { ok: false, error: 'Expense title is required' }
        if (amount <= 0) return { ok: false, error: 'Expense amount is required' }

        try {
          const ref = await createUserDoc(workspaceId, 'expenses', {
            title,
            category: String(payload.category || 'General').trim() || 'General',
            amount,
            currency: normalizeCurrency(payload.currency),
            paymentMethod: String(payload.paymentMethod || 'Cash').trim() || 'Cash',
            paidBy: String(payload.paidBy || userDoc?.name || userDoc?.email || '').trim(),
            status: 'pending',
            approvalStatus: 'pending',
            requiresApproval: true,
            notes: String(payload.notes || '').trim(),
            receiptReference: String(payload.receiptReference || '').trim(),
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense created',
            module: 'Expenses',
            description: `${title} was submitted for approval.`,
            targetId: ref.id,
            targetName: title,
            metadata: { amount, currency: normalizeCurrency(payload.currency), category: payload.category },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Expenses',
            priority: 'high',
            title: 'Expense approval needed',
            message: `${title} was submitted for approval.`,
            relatedId: ref.id,
            route: '/app/approvals',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { amount, currency: normalizeCurrency(payload.currency), category: payload.category },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create expense.') }
        }
      },
      async updateExpense(id, payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const title = String(payload.title || '').trim()
        const amount = expenseValue(payload)
        if (!id) return { ok: false, error: 'Expense not found' }
        if (!title) return { ok: false, error: 'Expense title is required' }
        if (amount <= 0) return { ok: false, error: 'Expense amount is required' }
        try {
          await patchUserDoc(workspaceId, 'expenses', id, {
            title,
            category: String(payload.category || 'Other').trim() || 'Other',
            amount,
            currency: normalizeCurrency(payload.currency),
            paymentMethod: String(payload.paymentMethod || 'Cash').trim() || 'Cash',
            paidBy: String(payload.paidBy || '').trim(),
            notes: String(payload.notes || '').trim(),
            receiptReference: String(payload.receiptReference || '').trim(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense updated',
            module: 'Expenses',
            description: `${title} was updated.`,
            targetId: id,
            targetName: title,
            metadata: { amount, currency: normalizeCurrency(payload.currency), category: payload.category },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Expenses',
            priority: 'low',
            title: 'Expense updated',
            message: `${title} was updated.`,
            relatedId: id,
            route: '/app/expenses',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update expense.') }
        }
      },
      async deleteExpense(expense) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!expense?.id) return { ok: false, error: 'Expense not found' }
        try {
          await removeUserDoc(workspaceId, 'expenses', expense.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense deleted',
            module: 'Expenses',
            description: `${expense.title || 'Expense'} was removed.`,
            targetId: expense.id,
            targetName: expense.title || 'Expense',
            metadata: { amount: expense.amount, currency: expense.currency },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Expenses',
            priority: 'low',
            title: 'Expense deleted',
            message: `${expense.title || 'Expense'} was removed.`,
            relatedId: expense.id,
            route: '/app/expenses',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete expense.') }
        }
      },
    }),
    [expenses, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
