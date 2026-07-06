import { useEffect, useMemo, useState } from 'react'
import { createUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { db } from '../lib/firebase.js'

const POS_BUSINESS_TYPE = 'Retail / POS'

function localOrdersKey(workspaceId) {
  return `nexora.posOrders.${workspaceId || 'local'}`
}

function timestampValue(value) {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function readLocalOrders(workspaceId) {
  if (typeof window === 'undefined' || !workspaceId) return []
  try {
    const raw = window.localStorage.getItem(localOrdersKey(workspaceId))
    const rows = raw ? JSON.parse(raw) : []
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function writeLocalOrders(workspaceId, rows) {
  if (typeof window === 'undefined' || !workspaceId) return
  try {
    window.localStorage.setItem(localOrdersKey(workspaceId), JSON.stringify(rows.slice(0, 200)))
    window.dispatchEvent(new CustomEvent('nexora:pos-orders-updated', { detail: { workspaceId } }))
  } catch {
    /* local backup is best effort */
  }
}

function rememberLocalOrder(workspaceId, order) {
  if (!workspaceId || !order?.id) return
  const current = readLocalOrders(workspaceId).filter((item) => item.id !== order.id)
  writeLocalOrders(workspaceId, [order, ...current])
}

function forgetLocalOrder(workspaceId, id) {
  if (!workspaceId || !id) return
  writeLocalOrders(workspaceId, readLocalOrders(workspaceId).filter((item) => item.id !== id))
}

function mergeOrders(remoteRows, localRows, limitCount) {
  const merged = new Map()
  ;[...localRows, ...remoteRows].forEach((row) => {
    const normalized = normalizePosOrder(row)
    const key = normalized.orderNumber || normalized.id
    if (key) merged.set(key, normalized)
  })
  return Array.from(merged.values())
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))
    .slice(0, limitCount)
}

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
    orderSource: order.orderSource || order.source || 'pos_front_till',
    moduleKey: order.moduleKey || 'retail_pos',
    cashierId: order.cashierId || order.staffId || '',
    staffId: order.staffId || order.cashierId || '',
    cashierName: order.cashierName || order.cashier || order.createdByName || '',
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
  const { workspaceId, userId, staffId, role, userDoc, firebaseUser, isOwner, isAdmin, isStaff } = useUser()
  const access = useWorkspaceAccess()
  const enabled = options.enabled !== false
  const effectiveBusinessType = options.businessType || POS_BUSINESS_TYPE
  const readBusinessType = options.readBusinessType === false ? '' : effectiveBusinessType
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
        setOrders(mergeOrders([], readLocalOrders(workspaceId), limitCount))
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }
    setLoading(true)
    setError('')
    setOrders(mergeOrders([], readLocalOrders(workspaceId), limitCount))
    const unsub = subscribeUserCollection(
      workspaceId,
      'posOrders',
      (rows) => {
        setOrders(mergeOrders(Array.isArray(rows) ? rows : [], readLocalOrders(workspaceId), limitCount))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load POS orders.'))
        setOrders(mergeOrders([], readLocalOrders(workspaceId), limitCount))
        setLoading(false)
      },
      {
        businessType: readBusinessType,
        businessTypeFallbacks: ['General CRM'],
        includeMissingBusinessType: true,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount,
      },
    )
    return () => unsub?.()
  }, [effectiveBusinessType, enabled, limitCount, readBusinessType, workspaceId])

  useEffect(() => {
    if (!enabled || !workspaceId) return undefined
    function refreshLocalOrders(event) {
      if (event?.detail?.workspaceId && event.detail.workspaceId !== workspaceId) return
      setOrders((current) => mergeOrders(current, readLocalOrders(workspaceId), limitCount))
      setLoading(false)
    }
    function refreshStorageOrders(event) {
      if (event?.key && event.key !== localOrdersKey(workspaceId)) return
      setOrders((current) => mergeOrders(current, readLocalOrders(workspaceId), limitCount))
      setLoading(false)
    }
    window.addEventListener('nexora:pos-orders-updated', refreshLocalOrders)
    window.addEventListener('storage', refreshStorageOrders)
    return () => {
      window.removeEventListener('nexora:pos-orders-updated', refreshLocalOrders)
      window.removeEventListener('storage', refreshStorageOrders)
    }
  }, [enabled, limitCount, workspaceId])

  return useMemo(() => ({
    orders,
    loading,
    error,
    async createOrder(payload) {
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      const canCreate = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'create') || access.hasModulePermission('pos', 'create')
      if (!canCreate) return { ok: false, error: 'You do not have permission to perform this action.' }
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const nowIso = new Date().toISOString()
      const ownerSale = Boolean(isOwner || isAdmin || userId === workspaceId || firebaseUser?.uid === workspaceId)
      const staffSale = Boolean(isStaff && !ownerSale)
      const cashierId = staffSale ? String(staffId || userDoc?.staffId || userId || '') : ''
      const cashierName = payload.cashierName || payload.cashier || payload.createdByName || userDoc?.displayName || userDoc?.fullName || userDoc?.name || firebaseUser?.displayName || firebaseUser?.email || 'Cashier'
      const createdByRole = payload.createdByRole || (ownerSale ? 'owner' : role || userDoc?.role || 'staff')
      const orderMeta = {
        ownerId: workspaceId,
        userId: workspaceId,
        workspaceId,
        businessType: effectiveBusinessType,
        moduleKey: 'retail_pos',
        orderSource: 'pos_front_till',
        source: 'pos_front_till',
        cashierId,
        staffId: cashierId,
        cashierName,
        cashier: cashierName,
        createdBy: userId,
        createdByName: payload.createdByName || cashierName,
        createdByEmail: payload.createdByEmail || firebaseUser?.email || userDoc?.email || '',
        createdByRole,
        createdByStaff: staffSale,
        registerId: payload.registerId || payload.shiftId || '',
        branchId: payload.branchId || '',
      }
      const localOrder = {
        ...payload,
        ...orderMeta,
        id: localId,
        status: payload.status || 'completed',
        paymentStatus: payload.paymentStatus || 'paid',
        localOnly: true,
        syncStatus: 'pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      rememberLocalOrder(workspaceId, localOrder)
      setOrders((current) => mergeOrders(current, [localOrder], limitCount))

      createUserDoc(workspaceId, 'posOrders', {
        ...payload,
        ...orderMeta,
        status: payload.status || 'completed',
        paymentStatus: payload.paymentStatus || 'paid',
      }, { businessType: effectiveBusinessType })
        .then((ref) => {
          const syncedOrder = {
            ...localOrder,
            id: ref.id,
            localOnly: false,
            syncStatus: 'synced',
            updatedAt: new Date().toISOString(),
          }
          forgetLocalOrder(workspaceId, localId)
          rememberLocalOrder(workspaceId, syncedOrder)
          setOrders((current) => mergeOrders(current.filter((order) => order.id !== localId), [syncedOrder], limitCount))
          console.log('[Retail POS] order synced to Firestore', {
            orderNumber: payload.orderNumber || '',
            orderId: ref.id,
            path: `workspaces/${workspaceId}/posOrders/${ref.id}`,
          })
        })
        .catch((error) => {
          const pendingOrder = {
            ...localOrder,
            syncStatus: 'failed',
            syncError: error?.message || 'Firestore sync failed.',
            updatedAt: new Date().toISOString(),
          }
          rememberLocalOrder(workspaceId, pendingOrder)
          setOrders((current) => mergeOrders(current, [pendingOrder], limitCount))
          console.warn('[Retail POS] order kept locally; Firestore sync failed', {
            orderNumber: payload.orderNumber || '',
            code: error?.code || '',
            message: error?.message || String(error || ''),
            path: `workspaces/${workspaceId}/posOrders`,
          })
        })

      return { ok: true, id: localId, local: true }
      /*
      try {
        const ref = await createUserDoc(workspaceId, 'posOrders', {
          ...payload,
          source: 'pos',
          status: payload.status || 'completed',
          paymentStatus: payload.paymentStatus || 'paid',
          createdBy: userId,
        }, { businessType: effectiveBusinessType })
        const createdOrder = {
          ...payload,
          id: ref.id,
          source: 'pos',
          status: payload.status || 'completed',
          paymentStatus: payload.paymentStatus || 'paid',
          createdBy: userId,
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType: effectiveBusinessType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        rememberLocalOrder(workspaceId, createdOrder)
        setOrders((current) => mergeOrders(current, [createdOrder], limitCount))
        return { ok: true, id: ref.id }
      } catch (error) {
        return { ok: false, error: clientSafeMessage(error, 'Unable to save POS order.') }
      }
      */
    },
    async deleteOrder(id) {
      if (!id) return { ok: false, error: 'Order ID is required.' }
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      const canDelete = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'delete') || access.hasModulePermission('pos', 'delete')
      if (!canDelete) return { ok: false, error: 'You do not have permission to perform this action.' }
      try {
        await removeUserDoc(workspaceId, 'posOrders', id)
        forgetLocalOrder(workspaceId, id)
        setOrders((current) => current.filter((order) => order.id !== id))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: clientSafeMessage(error, 'Unable to delete POS order.') }
      }
    },
  }), [access, effectiveBusinessType, error, firebaseUser, isAdmin, isOwner, isStaff, loading, orders, role, staffId, userDoc, userId, workspaceId])
}
