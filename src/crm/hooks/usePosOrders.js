import { useEffect, useMemo, useState } from 'react'
import { createUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { db } from '../lib/firebase.js'

function numberValue(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function normalizePosOrder(order = {}) {
  const items = Array.isArray(order.items) ? order.items : []
  return {
    id: order.id || '',
    orderNumber: order.orderNumber || order.billNumber || '',
    customerId: order.customerId || '',
    customerName: order.customerName || 'Walk-in Customer',
    customerPhone: order.customerPhone || '',
    branch: order.branch || 'Main Branch',
    cashier: order.cashier || '',
    paymentMethod: order.paymentMethod || 'Cash',
    paymentStatus: order.paymentStatus || 'paid',
    status: order.status || 'completed',
    items,
    itemCount: numberValue(order.itemCount, items.reduce((sum, item) => sum + numberValue(item.quantity), 0)),
    subtotal: numberValue(order.subtotal),
    discount: numberValue(order.discount),
    tax: numberValue(order.tax),
    total: numberValue(order.total),
    cost: numberValue(order.cost),
    profit: numberValue(order.profit),
    paidAmount: numberValue(order.paidAmount ?? order.total),
    changeAmount: numberValue(order.changeAmount),
    dueAmount: numberValue(order.dueAmount),
    shiftId: order.shiftId || '',
    shiftOpeningCash: numberValue(order.shiftOpeningCash),
    shiftStartedAt: order.shiftStartedAt || null,
    notes: order.notes || '',
    source: order.source || 'pos',
    createdBy: order.createdBy || '',
    createdByName: order.createdByName || order.cashier || '',
    createdByEmail: order.createdByEmail || '',
    createdByRole: order.createdByRole || '',
    createdByStaff: order.createdByStaff === true,
    staffTag: order.staffTag || (order.createdByStaff ? 'Sales Staff' : ''),
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  }
}

export function usePosOrders(options = {}) {
  const { workspaceId, businessType, userId } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : 50
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setOrders([])
        setLoading(false)
        setError('')
      })
      return undefined
    }
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setOrders([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }
    setLoading(true)
    setError('')
    const unsub = subscribeUserCollection(
      workspaceId,
      'posOrders',
      (rows) => {
        setOrders((Array.isArray(rows) ? rows : []).map(normalizePosOrder))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load POS orders.'))
        setOrders([])
        setLoading(false)
      },
      { businessType, orderByField: 'createdAt', orderDirection: 'desc', limitCount },
    )
    return () => unsub?.()
  }, [businessType, enabled, limitCount, workspaceId])

  return useMemo(() => ({
    orders,
    loading,
    error,
    async createOrder(payload) {
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      try {
        const ref = await createUserDoc(workspaceId, 'posOrders', {
          ...payload,
          source: 'pos',
          status: payload.status || 'completed',
          paymentStatus: payload.paymentStatus || 'paid',
          createdBy: userId,
        }, { businessType })
        return { ok: true, id: ref.id }
      } catch (error) {
        return { ok: false, error: clientSafeMessage(error, 'Unable to save POS order.') }
      }
    },
    async deleteOrder(id) {
      if (!id) return { ok: false, error: 'Order ID is required.' }
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      try {
        await removeUserDoc(workspaceId, 'posOrders', id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: clientSafeMessage(error, 'Unable to delete POS order.') }
      }
    },
  }), [businessType, orders, loading, error, userId, workspaceId])
}
