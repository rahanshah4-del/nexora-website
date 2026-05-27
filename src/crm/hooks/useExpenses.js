import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { expenseValue, normalizeCurrency, statusValue } from '../lib/calculations.js'

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

export function useExpenses() {
  const { userId, workspaceId, userDoc, firebaseUser } = useUser()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
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

    const unsub = subscribeUserCollection(
      workspaceId,
      'expenses',
      (rows) => {
        setExpenses((Array.isArray(rows) ? rows : []).map(normalizeExpense))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load expenses.'))
        setExpenses([])
        setLoading(false)
      },
    )

    return () => unsub?.()
  }, [workspaceId])

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
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense created',
            module: 'Expenses',
            description: `${title} was submitted for approval.`,
            targetId: ref.id,
            targetName: title,
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
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense updated',
            module: 'Expenses',
            description: `${title} was updated.`,
            targetId: id,
            targetName: title,
            metadata: { amount, currency: normalizeCurrency(payload.currency), category: payload.category },
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
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense deleted',
            module: 'Expenses',
            description: `${expense.title || 'Expense'} was removed.`,
            targetId: expense.id,
            targetName: expense.title || 'Expense',
            metadata: { amount: expense.amount, currency: expense.currency },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete expense.') }
        }
      },
    }),
    [expenses, loading, source, error, firebaseUser, userDoc, userId, workspaceId],
  )
}
