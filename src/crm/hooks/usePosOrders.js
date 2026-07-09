import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { createUserDoc, removeUserDoc, subscribeUserCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { db } from '../lib/firebase.js'
import { restoreInventoryItems } from '../lib/inventoryRestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const POS_BUSINESS_TYPE = 'Retail / POS'
const MAX_RETRY_COUNT = 3

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
  const id = order.id || ''
  const isLocal = String(id).startsWith('local-')
  return {
    id,
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
    // Sync fields — preserved through normalize
    syncStatus: order.syncStatus || (isLocal ? 'pending' : 'synced'),
    syncError: order.syncError || '',
    retryCount: order.retryCount ?? 0,
    localOnly: isLocal || order.syncStatus === 'pending' || order.syncStatus === 'failed' || order.syncStatus === 'syncing',
  }
}

/**
 * Attempt to sync a single pending/failed local order to Firestore.
 * Returns { ok, id, error }.
 */
async function syncOneOrder(workspaceId, userId, order) {
  const payload = { ...order }
  // Strip sync-only fields before sending to Firestore
  delete payload.syncStatus
  delete payload.syncError
  delete payload.retryCount
  delete payload.localOnly

  try {
    const ref = await createUserDoc(workspaceId, 'posOrders', payload, {
      businessType: order.businessType || POS_BUSINESS_TYPE,
    })
    return { ok: true, id: ref.id }
  } catch (err) {
    return { ok: false, error: err?.message || 'Firestore sync failed.' }
  }
}

/**
 * Scan localStorage for failed orders and retry them (up to MAX_RETRY_COUNT each).
 */
async function retryFailedOrders(workspaceId, userId, ordersRef, limitCount) {
  if (!workspaceId || !userId || !window?.navigator?.onLine) return
  const localOrders = readLocalOrders(workspaceId)
  let changed = false

  for (const order of localOrders) {
    if (order.syncStatus !== 'failed') continue
    const retryCount = Number(order.retryCount ?? 0)
    if (retryCount >= MAX_RETRY_COUNT) continue

    changed = true

    // Mark as syncing
    const syncingOrder = {
      ...order,
      syncStatus: 'syncing',
      updatedAt: new Date().toISOString(),
    }
    rememberLocalOrder(workspaceId, syncingOrder)
    ordersRef.current?.((current) => mergeOrders(current, [syncingOrder], limitCount))

    const result = await syncOneOrder(workspaceId, userId, order)
    if (result.ok) {
      const syncedOrder = {
        ...order,
        id: result.id,
        syncStatus: 'synced',
        syncError: '',
        retryCount: retryCount + 1,
        updatedAt: new Date().toISOString(),
      }
      forgetLocalOrder(workspaceId, order.id)
      rememberLocalOrder(workspaceId, syncedOrder)
      ordersRef.current?.((current) =>
        mergeOrders(current.filter((o) => o.id !== order.id), [syncedOrder], limitCount),
      )
    } else {
      const failedOrder = {
        ...order,
        syncStatus: 'failed',
        syncError: result.error || 'Retry sync failed.',
        retryCount: retryCount + 1,
        updatedAt: new Date().toISOString(),
      }
      rememberLocalOrder(workspaceId, failedOrder)
      ordersRef.current?.((current) => mergeOrders(current, [failedOrder], limitCount))
    }
  }

  if (changed) {
    window.dispatchEvent(new CustomEvent('nexora:pos-orders-updated', { detail: { workspaceId } }))
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
  const submittingRef = useRef(false)
  const ordersRef = useRef(null)
  ordersRef.current = setOrders

  // Sync failed orders on mount (once Firestore subscription is active)
  const initialRetryDone = useRef(false)
  useEffect(() => {
    if (!enabled || !db || !workspaceId || !userId) return
    if (initialRetryDone.current) return
    // Wait a beat for the Firestore subscription to settle, then retry
    const timer = setTimeout(() => {
      initialRetryDone.current = true
      retryFailedOrders(workspaceId, userId, ordersRef, limitCount)
    }, 2000)
    return () => clearTimeout(timer)
  }, [enabled, workspaceId, userId, limitCount])

  // Retry failed orders when browser comes online
  useEffect(() => {
    if (!enabled || !workspaceId || !userId) return
    function handleOnline() {
      retryFailedOrders(workspaceId, userId, ordersRef, limitCount)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [enabled, workspaceId, userId, limitCount])

  // Firestore subscription
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
        setOrders((current) => mergeOrders(Array.isArray(rows) ? rows : [], readLocalOrders(workspaceId), limitCount))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load POS orders.'))
        setOrders(mergeOrders([], readLocalOrders(workspaceId), limitCount))
        setLoading(false)
      },
      {
        businessType: readBusinessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount,
      },
    )
    return () => unsub?.()
  }, [effectiveBusinessType, enabled, limitCount, readBusinessType, workspaceId])

  // Listen for localStorage changes from other tabs
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

  const createOrder = useCallback(async (payload) => {
    if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
    if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
    if (!window.navigator.onLine) return { ok: false, error: 'You are offline. The order will sync when you are back online.' }

    const canCreate = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'create') || access.hasModulePermission('pos', 'create')
    if (!canCreate) return { ok: false, error: 'You do not have permission to perform this action.' }

    // Double-click prevention: if a submit is already in flight, reject
    if (submittingRef.current) {
      console.warn('[Retail POS] duplicate createOrder call blocked (already submitting)')
      return { ok: false, error: 'Order is already being saved. Please wait.' }
    }
    submittingRef.current = true

    try {
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
      const firestorePayload = {
        ...payload,
        ...orderMeta,
        status: payload.status || 'completed',
        paymentStatus: payload.paymentStatus || 'paid',
      }

      // Optimistic local save
      const localOrder = {
        ...firestorePayload,
        id: localId,
        syncStatus: 'pending',
        retryCount: 0,
        syncError: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      rememberLocalOrder(workspaceId, localOrder)
      setOrders((current) => mergeOrders(current, [localOrder], limitCount))

      // Firestore write
      try {
        const ref = await createUserDoc(workspaceId, 'posOrders', firestorePayload, {
          businessType: effectiveBusinessType,
        })
        const syncedOrder = {
          ...localOrder,
          id: ref.id,
          syncStatus: 'synced',
          retryCount: 0,
          syncError: '',
          updatedAt: new Date().toISOString(),
        }
        forgetLocalOrder(workspaceId, localId)
        rememberLocalOrder(workspaceId, syncedOrder)
        setOrders((current) =>
          mergeOrders(current.filter((o) => o.id !== localId), [syncedOrder], limitCount),
        )
        console.log('[Retail POS] order synced to Firestore', {
          orderNumber: payload.orderNumber || '',
          orderId: ref.id,
          path: `workspaces/${workspaceId}/posOrders/${ref.id}`,
        })
        return { ok: true, id: ref.id }
      } catch (writeError) {
        const failedOrder = {
          ...localOrder,
          syncStatus: 'failed',
          retryCount: 1,
          syncError: writeError?.message || 'Firestore sync failed.',
          updatedAt: new Date().toISOString(),
        }
        rememberLocalOrder(workspaceId, failedOrder)
        setOrders((current) => mergeOrders(current, [failedOrder], limitCount))
        console.warn('[Retail POS] order kept locally; Firestore sync failed', {
          orderNumber: payload.orderNumber || '',
          code: writeError?.code || '',
          message: writeError?.message || String(writeError || ''),
          path: `workspaces/${workspaceId}/posOrders`,
        })
        return { ok: true, id: localId, local: true, error: 'Saved offline. Will sync when connection restores.' }
      }
    } finally {
      submittingRef.current = false
    }
  }, [access, effectiveBusinessType, firebaseUser, isAdmin, isOwner, isStaff, role, staffId, userDoc, userId, workspaceId])

  const deleteOrder = useCallback(async (id) => {
    if (!id) return { ok: false, error: 'Order ID is required.' }
    if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
    if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
    const canDelete = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'delete') || access.hasModulePermission('pos', 'delete')
    if (!canDelete) return { ok: false, error: 'You do not have permission to perform this action.' }
    try {
      // ── Restore inventory before deletion ──
      const order = orders.find((o) => o.id === id)
      const orderSource = String(order?.orderSource || order?.source || '').toLowerCase()
      const isKotOrUnbilled = orderSource.includes('kot') || order?.status === 'draft'
      const isRefunded = order?.refundStatus === 'refunded' || order?.refundedAt
      const restoreNeeded = order?.items?.length && !isKotOrUnbilled && !isRefunded

      if (restoreNeeded) {
        const restoreRs = await restoreInventoryItems({
          db,
          workspaceId,
          businessType: effectiveBusinessType,
          userId,
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            productName: item.productName || item.name || '',
            sku: item.sku || '',
          })),
          referenceId: id,
          reference: order.orderNumber || id,
        })
        if (!restoreRs.ok) {
          return { ok: false, error: 'Unable to restore inventory before deletion. The order was not deleted.' }
        }
      }

      await removeUserDoc(workspaceId, 'posOrders', id)
      forgetLocalOrder(workspaceId, id)
      setOrders((current) => current.filter((order) => order.id !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: clientSafeMessage(error, 'Unable to delete POS order.') }
    }
  }, [access, userId, workspaceId, orders, effectiveBusinessType])

  const refundOrder = useCallback(async (id) => {
    if (!id) return { ok: false, error: 'Order ID is required.' }
    if (!workspaceId || !userId) return { ok: false, error: 'Please login first.' }
    if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
    const canRefund = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'create') || access.hasModulePermission('pos', 'create')
    if (!canRefund) return { ok: false, error: 'You do not have permission to perform this action.' }

    const order = orders.find((o) => o.id === id)
    if (!order) return { ok: false, error: 'Order not found.' }

    // ── Duplicate protection: already refunded ──
    if (order.refundStatus === 'refunded' || order.refundedAt) {
      return { ok: false, error: 'This order has already been refunded.' }
    }

    const orderSource = String(order?.orderSource || order?.source || '').toLowerCase()
    const isKotOrUnbilled = orderSource.includes('kot') || order?.status === 'draft'
    if (isKotOrUnbilled) {
      return { ok: false, error: 'KOT/draft orders cannot be refunded. Delete the order instead.' }
    }

    const refundAmount = Number(order.paidAmount || order.total || 0)
    if (refundAmount <= 0) {
      return { ok: false, error: 'No paid amount to refund on this order.' }
    }

    try {
      const refundId = `refund_${id}_${Date.now()}`
      const orderRef = doc(db, workspaceCollectionPath(workspaceId, 'posOrders'), id)
      const refundTxnRef = doc(db, workspaceCollectionPath(workspaceId, 'accountTransactions'), `refund-pos-${id}`)
      const customerRef = order.customerId ? doc(db, workspaceCollectionPath(workspaceId, 'customers'), order.customerId) : null
      const refundItems = (order.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName || item.name || '',
        sku: item.sku || '',
      }))

      await runTransaction(db, async (txn) => {
        // ── Refund transaction duplicate check (idempotency) ──
        const existingTxn = await txn.get(refundTxnRef)
        if (existingTxn.exists()) {
          throw new Error('Refund transaction already recorded for this order.')
        }

        // ── Order duplicate check ──
        const orderSnap = await txn.get(orderRef)
        if (!orderSnap.exists()) throw new Error('Order not found.')
        const currentOrder = orderSnap.data()
        if (currentOrder.refundStatus === 'refunded' || currentOrder.refundedAt) {
          throw new Error('This order has already been refunded.')
        }

        // ── Mark order as refunded ──
        txn.update(orderRef, {
          refundStatus: 'refunded',
          refundedAt: serverTimestamp(),
          refundedBy: userId,
          refundAmount,
          refundId,
          refundNote: `Refund — ${refundAmount} refunded`,
          status: 'refunded',
          paymentStatus: 'refunded',
          updatedAt: serverTimestamp(),
        })

        // ── Reverse customer ledger ──
        if (customerRef && order.customerId) {
          const cSnap = await txn.get(customerRef)
          if (cSnap.exists()) {
            const customer = cSnap.data()
            txn.update(customerRef, {
              lifetimeSpend: Math.max(0, Number(customer.lifetimeSpend || 0) - refundAmount),
              posOrdersCount: Math.max(0, Number(customer.posOrdersCount || 0) - 1),
              updatedAt: serverTimestamp(),
            })
          }
        }

        // ── Create refund accountTransaction (outflow) ──
        txn.set(refundTxnRef, {
          transactionId: refundId,
          type: 'refund',
          source: 'pos_refund',
          amount: refundAmount,
          currency: order.currency || 'PKR',
          method: order.paymentMethod || 'Cash',
          status: 'approved',
          approvalStatus: 'approved',
          title: `POS refund — ${order.orderNumber || id}`,
          description: `Refund for ${order.customerName || 'Walk-in Customer'} — ${order.orderNumber || id}`,
          relatedId: id,
          orderId: id,
          orderNumber: order.orderNumber || '',
          customerName: order.customerName || '',
          createdBy: userId,
          approvedBy: userId,
          approvedAt: serverTimestamp(),
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType: effectiveBusinessType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          metadata: {
            oldValue: { status: order.status, paymentStatus: order.paymentStatus },
            newValue: { status: 'refunded', paymentStatus: 'refunded', refundAmount },
          },
        })
      })

      // ── Restore inventory (duplicate-protected inside restoreInventoryItems) ──
      if (refundItems.length) {
        const restoreRs = await restoreInventoryItems({
          db,
          workspaceId,
          businessType: effectiveBusinessType,
          userId,
          items: refundItems,
          referenceId: id,
          reference: order.orderNumber || id,
        })
        if (!restoreRs.ok) {
          // Inventory restore failed but refund is recorded — log but don't fail
          console.warn('[POS Refund] inventory restore had errors', restoreRs.errors)
        }
      }

      // ── Optimistic UI update ──
      setOrders((current) =>
        current.map((o) =>
          o.id === id
            ? {
                ...o,
                refundStatus: 'refunded',
                refundedAt: new Date().toISOString(),
                refundedBy: userId,
                refundAmount,
                refundId,
                status: 'refunded' ,
                paymentStatus: 'refunded',
              }
            : o,
        ),
      )

      // ── Activity log ──
      await logActivity({
        workspaceId,
        userId,
        businessType: effectiveBusinessType,
        ...userActivityInfo(userDoc, firebaseUser),
        action: 'POS refund',
        module: 'Retail POS',
        description: `${order.orderNumber || id} was refunded (${refundAmount} ${order.currency || 'PKR'}).`,
        targetId: id,
        targetName: order.orderNumber || id,
        metadata: { refundAmount, itemCount: refundItems.length },
      }).catch(() => {})

      return { ok: true, refundAmount }
    } catch (e) {
      return { ok: false, error: clientSafeMessage(e, 'Unable to refund order.') }
    }
  }, [access, db, effectiveBusinessType, firebaseUser, orders, userDoc, userId, workspaceId])

  return useMemo(() => ({
    orders,
    loading,
    error,
    createOrder,
    deleteOrder,
    refundOrder,
  }), [orders, loading, error, createOrder, deleteOrder, refundOrder])
}
