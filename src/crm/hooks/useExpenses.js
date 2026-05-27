import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, subscribeUserCollection } from '../lib/firestore.js'
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
    status: statusValue(expense.status || expense.approvalStatus, 'pending'),
    approvalStatus: statusValue(expense.approvalStatus || expense.status, 'pending'),
    notes: expense.notes || '',
    createdBy: expense.createdBy || expense.userId || '',
    createdAt: expense.createdAt || null,
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
            status: 'pending',
            approvalStatus: 'pending',
            requiresApproval: true,
            notes: String(payload.notes || '').trim(),
            createdBy: userId,
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Expense added',
            module: 'Expenses',
            description: `${title} was submitted for approval.`,
            targetId: ref.id,
            targetName: title,
            metadata: { amount, currency: normalizeCurrency(payload.currency) },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create expense.') }
        }
      },
    }),
    [expenses, loading, source, error, firebaseUser, userDoc, userId, workspaceId],
  )
}
