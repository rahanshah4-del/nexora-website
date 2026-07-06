import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function numberValue(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function normalizePosWalletPayment(payment = {}) {
  return {
    id: payment.id || '',
    customerId: payment.customerId || '',
    customerName: payment.customerName || 'Customer',
    customerEmail: payment.customerEmail || '',
    customerPhone: payment.customerPhone || '',
    amount: numberValue(payment.amount),
    paymentMethod: payment.paymentMethod || 'Cash',
    note: payment.note || '',
    type: payment.type || 'wallet_settlement',
    status: payment.status || 'paid',
    source: payment.source || 'customer_wallet',
    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
  }
}

export function usePosWalletPayments(options = {}) {
  const { workspaceId, businessType } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : 50
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setPayments([])
        setLoading(false)
        setError('')
      })
      return undefined
    }
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setPayments([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }
    setLoading(true)
    setError('')
    const unsub = subscribeUserCollection(
      workspaceId,
      'posWalletPayments',
      (rows) => {
        setPayments((Array.isArray(rows) ? rows : []).map(normalizePosWalletPayment))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load wallet payments.'))
        setPayments([])
        setLoading(false)
      },
      {
        businessType,
        businessTypeFallbacks: ['Retail / POS', 'General CRM'],
        includeMissingBusinessType: true,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount,
      },
    )
    return () => unsub?.()
  }, [businessType, enabled, limitCount, workspaceId])

  return useMemo(() => ({ payments, loading, error }), [payments, loading, error])
}
