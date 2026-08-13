/**
 * Restaurant POS Firestore Dual-Write Sync Helpers (Phase 1)
 *
 * Writes menu items and tables to Firestore alongside existing localStorage writes.
 * localStorage remains the source of truth for reads — these writes are additive.
 * All writes fail silently; errors are logged to console and never thrown.
 *
 * Menu items: debounced diff-based sync. Only changed/new/deleted items are written.
 * Tables:      immediate sync for discrete actions, debounced for full floors sync.
 *              OrdersKot sites are strict fire-and-forget (non-blocking).
 */

import { db } from '../lib/firebase.js'
import {
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Only sync when Firebase + workspace + user are all available. */
function canSync(workspaceId, userId) {
  return Boolean(db && workspaceId && userId)
}

// ── Menu Item Mapping ──────────────────────────────────────────────────────────

/**
 * Map a UI menu item to the Firestore document shape.
 * Mirrors ALL fields the UI collects, not just the desktop subset.
 * Maps UI's costPrice → Firestore's cost (key mismatch fix).
 */
function menuItemToFirestore(item, workspaceId, userId) {
  return {
    name: String(item.name || ''),
    category: String(item.category || ''),
    price: safeMoney(item.price),
    cost: safeMoney(item.costPrice),              // costPrice → cost mapping
    status: item.status === 'Inactive' ? 'Inactive' : 'Active',
    description: String(item.description || ''),
    image: String(item.image || ''),
    // Extended fields the UI collects
    itemType: String(item.itemType || 'Food'),
    sku: String(item.sku || ''),
    preparationTime: String(item.preparationTime || ''),
    availability: String(item.availability || 'Available'),
    taxEnabled: Boolean(item.taxEnabled),
    serviceChargeEnabled: Boolean(item.serviceChargeEnabled),
    discountType: String(item.discountType || 'none'),
    discountValue: safeMoney(item.discountValue),
    offerTitle: String(item.offerTitle || ''),
    offerStartDate: String(item.offerStartDate || ''),
    offerEndDate: String(item.offerEndDate || ''),
    happyHour: Boolean(item.happyHour),
    buyOneGetOne: Boolean(item.buyOneGetOne),
    comboOffer: Boolean(item.comboOffer),
    tone: String(item.tone || 'from-sky-600 to-indigo-500'),
    // Auto fields (required by Firestore rules safeCreate/safeUpdate)
    workspaceId,
    createdBy: userId,
    ownerId: workspaceId,
    updatedAt: serverTimestamp(),
  }
}

// ── Table Mapping ──────────────────────────────────────────────────────────────

/**
 * Map a local table object to the Firestore document shape.
 * Only STATIC properties — no runtime order-derived fields.
 * The table's local id (e.g. "T-01") becomes the Firestore document ID.
 */
function tableToFirestore(table, workspaceId, userId) {
  return {
    name: String(table.id || ''),
    floor: String(table.floor || ''),
    seats: Math.max(1, Number(table.seats) || 1),
    status: ['available', 'occupied', 'reserved', 'cleaning'].includes(table.status)
      ? table.status
      : 'available',
    workspaceId,
    createdBy: userId,
    ownerId: workspaceId,
    updatedAt: serverTimestamp(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU ITEMS — Debounced Diff-Based Sync
// ═══════════════════════════════════════════════════════════════════════════════

const MENU_DEBOUNCE_MS = 2500
let _menuDebounceTimer = null
let _lastSyncedMenuItems = null  // JSON-stringified for fast deep comparison

/**
 * Debounced menu sync. Call on every items change — it will only fire
 * after MENU_DEBOUNCE_MS of inactivity. Diffs against last synced state
 * so only changed/new/deleted items are written.
 *
 * @param {string} workspaceId
 * @param {string} userId
 * @param {Array}  items — full current items array from localStorage
 */
export function syncMenuItemsToFirestore(workspaceId, userId, items) {
  if (!canSync(workspaceId, userId)) return
  if (!Array.isArray(items)) return

  if (_menuDebounceTimer) clearTimeout(_menuDebounceTimer)

  _menuDebounceTimer = setTimeout(() => {
    _menuDebounceTimer = null
    _performMenuSync(workspaceId, userId, items)
  }, MENU_DEBOUNCE_MS)
}

async function _performMenuSync(workspaceId, userId, items) {
  if (!canSync(workspaceId, userId)) return

  const currSnapshot = JSON.stringify(items.map((i) => i.id).sort())
  if (currSnapshot === _lastSyncedMenuItems) return

  try {
    // Build the diff
    const prevItems = _menuPrevItems || []
    const prevMap = new Map(prevItems.map((i) => [i.id, i]))
    const currMap = new Map(items.map((i) => [i.id, i]))

    const changed = []
    const deleted = []

    // Find changed/new
    for (const [id, item] of currMap) {
      const prev = prevMap.get(id)
      if (!prev || _itemChanged(prev, item)) {
        changed.push(item)
      }
    }

    // Find deleted
    for (const [id] of prevMap) {
      if (!currMap.has(id)) {
        deleted.push(id)
      }
    }

    if (changed.length === 0 && deleted.length === 0) {
      _menuPrevItems = items
      _lastSyncedMenuItems = currSnapshot
      return
    }

    const BATCH_LIMIT = 500
    let batch = writeBatch(db)
    let ops = 0

    const collectionPath = `workspaces/${workspaceId}/menuItems`

    // Write changed/new items
    for (const item of changed) {
      const ref = doc(db, collectionPath, String(item.id))
      const data = menuItemToFirestore(item, workspaceId, userId)
      batch.set(ref, data, { merge: true })
      ops++
      if (ops >= BATCH_LIMIT) {
        await _safeCommit(batch, 'menuItems')
        batch = writeBatch(db)
        ops = 0
      }
    }

    // Delete removed items
    for (const id of deleted) {
      const ref = doc(db, collectionPath, String(id))
      batch.delete(ref)
      ops++
      if (ops >= BATCH_LIMIT) {
        await _safeCommit(batch, 'menuItems')
        batch = writeBatch(db)
        ops = 0
      }
    }

    if (ops > 0) {
      await _safeCommit(batch, 'menuItems')
    }

    _menuPrevItems = items
    _lastSyncedMenuItems = currSnapshot
  } catch (err) {
    console.warn('[restaurantFirestoreSync] menu sync error:', err?.message || err)
  }
}

// Track previous items for diffing (reset when items are reloaded)
let _menuPrevItems = null

/** Simple shallow comparison of item keys that matter for Firestore. */
function _itemChanged(prev, curr) {
  const keys = [
    'name', 'category', 'price', 'costPrice', 'status', 'description', 'image',
    'itemType', 'sku', 'preparationTime', 'availability',
    'taxEnabled', 'serviceChargeEnabled',
    'discountType', 'discountValue',
    'offerTitle', 'offerStartDate', 'offerEndDate',
    'happyHour', 'buyOneGetOne', 'comboOffer', 'tone',
  ]
  for (const k of keys) {
    if (String(prev[k] || '') !== String(curr[k] || '')) return true
  }
  return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLES — Full Floors Sync (debounced)
// ═══════════════════════════════════════════════════════════════════════════════

const TABLES_DEBOUNCE_MS = 2000
let _tablesDebounceTimer = null
let _lastSyncedTablesSnapshot = null

/**
 * Debounced full floors sync. Call from saveRestaurantFloors.
 * Flattens floors→tables, diffs against last state, batch-writes changes.
 *
 * @param {string} workspaceId
 * @param {string} userId
 * @param {Array}  floors — the full floors array [{name, tables: [...]}, ...]
 */
export function syncFloorsToFirestore(workspaceId, userId, floors) {
  if (!canSync(workspaceId, userId)) return
  if (!Array.isArray(floors)) return

  if (_tablesDebounceTimer) clearTimeout(_tablesDebounceTimer)

  _tablesDebounceTimer = setTimeout(() => {
    _tablesDebounceTimer = null
    _performTablesSync(workspaceId, userId, floors)
  }, TABLES_DEBOUNCE_MS)
}

async function _performTablesSync(workspaceId, userId, floors) {
  if (!canSync(workspaceId, userId)) return

  // Flatten floors → table array with floor assigned from parent
  const currentTables = []
  for (const floor of floors) {
    if (!floor || !Array.isArray(floor.tables)) continue
    for (const table of floor.tables) {
      if (!table || !table.id) continue
      currentTables.push({ ...table, floor: table.floor || floor.name })
    }
  }

  const currSnapshot = JSON.stringify(currentTables.map((t) => `${t.id}:${t.status}`).sort())
  if (currSnapshot === _lastSyncedTablesSnapshot) return

  try {
    const prevMap = new Map((_prevTables || []).map((t) => [t.id, t]))
    const currMap = new Map(currentTables.map((t) => [t.id, t]))

    const collectionPath = `workspaces/${workspaceId}/tables`
    const BATCH_LIMIT = 500
    let batch = writeBatch(db)
    let ops = 0

    // Changed/new
    for (const [id, table] of currMap) {
      const prev = prevMap.get(id)
      if (!prev || _tableChanged(prev, table)) {
        const ref = doc(db, collectionPath, String(id))
        batch.set(ref, tableToFirestore(table, workspaceId, userId), { merge: true })
        ops++
        if (ops >= BATCH_LIMIT) {
          await _safeCommit(batch, 'tables')
          batch = writeBatch(db)
          ops = 0
        }
      }
    }

    // Deleted
    for (const [id] of prevMap) {
      if (!currMap.has(id)) {
        const ref = doc(db, collectionPath, String(id))
        batch.delete(ref)
        ops++
        if (ops >= BATCH_LIMIT) {
          await _safeCommit(batch, 'tables')
          batch = writeBatch(db)
          ops = 0
        }
      }
    }

    if (ops > 0) {
      await _safeCommit(batch, 'tables')
    }

    _prevTables = currentTables
    _lastSyncedTablesSnapshot = currSnapshot
  } catch (err) {
    console.warn('[restaurantFirestoreSync] tables sync error:', err?.message || err)
  }
}

let _prevTables = null

function _tableChanged(prev, curr) {
  return (
    String(prev.floor || '') !== String(curr.floor || '') ||
    Number(prev.seats) !== Number(curr.seats) ||
    String(prev.status || '') !== String(curr.status || '') ||
    String(prev.id || '') !== String(curr.id || '')
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE-TABLE FIRE-AND-FORGET (for OrdersKot.jsx)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update a single table's status in Firestore.
 * FIRE-AND-FORGET: does not return a promise the caller must await.
 * Errors are silently swallowed — exactly matching the existing
 * "best-effort" pattern in releaseRestaurantTable / occupyRestaurantTable.
 *
 * @param {string} workspaceId
 * @param {string} userId
 * @param {string} tableId  — the table's local id (e.g. "T-01")
 * @param {object} patch    — { status?, floor?, seats? }
 */
export function syncSingleTableToFirestore(workspaceId, userId, tableId, patch) {
  if (!canSync(workspaceId, userId)) return
  if (!tableId) return

  const ref = doc(db, `workspaces/${workspaceId}/tables`, String(tableId))

  // Fire-and-forget: catch errors silently, never block the caller
  setDoc(ref, {
    ...patch,
    workspaceId,
    createdBy: userId,
    ownerId: workspaceId,
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch((err) => {
    console.warn('[restaurantFirestoreSync] single-table update skipped:', err?.code || err?.message || err)
  })
}

/**
 * Delete a single table document from Firestore (fire-and-forget).
 */
export function deleteTableFromFirestore(workspaceId, userId, tableId) {
  if (!canSync(workspaceId, userId)) return
  if (!tableId) return

  const ref = doc(db, `workspaces/${workspaceId}/tables`, String(tableId))
  deleteDoc(ref).catch((err) => {
    console.warn('[restaurantFirestoreSync] table delete skipped:', err?.code || err?.message || err)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO TABLES BATCH WRITE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write a batch of demo tables to Firestore. Used by the "Load Demo Menu" button
 * which seeds demo floors/tables into localStorage and now also Firestore.
 * Fire-and-forget — does not block the demo load flow.
 *
 * @param {string} workspaceId
 * @param {string} userId
 * @param {Array}  floors — demo floors array [{name, tables: [...]}, ...]
 */
export function syncDemoTablesToFirestore(workspaceId, userId, floors) {
  if (!canSync(workspaceId, userId)) return
  if (!Array.isArray(floors)) return

  // Fire-and-forget: don't block the demo load UX
  ;(async () => {
    const collectionPath = `workspaces/${workspaceId}/tables`
    const BATCH_LIMIT = 500
    let batch = writeBatch(db)
    let ops = 0

    try {
      for (const floor of floors) {
        if (!floor || !Array.isArray(floor.tables)) continue
        for (const table of floor.tables) {
          if (!table || !table.id) continue
          const ref = doc(db, collectionPath, String(table.id))
          const data = tableToFirestore(
            { ...table, floor: table.floor || floor.name },
            workspaceId,
            userId,
          )
          batch.set(ref, data, { merge: true })
          ops++
          if (ops >= BATCH_LIMIT) {
            await _safeCommit(batch, 'demoTables')
            batch = writeBatch(db)
            ops = 0
          }
        }
      }
      if (ops > 0) {
        await _safeCommit(batch, 'demoTables')
      }
    } catch (err) {
      console.warn('[restaurantFirestoreSync] demo tables sync error:', err?.message || err)
    }
  })()
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS — Firestore ↔ Website Mapping & Sync
// ═══════════════════════════════════════════════════════════════════════════════

const ORDERS_DEBOUNCE_MS = 2000
let _ordersDebounceTimer = null
let _lastSyncedOrdersSnapshot = null

/**
 * Map a website order to the Firestore orders document shape.
 * Excludes website-derived fields (id, items, itemsCount, date, time, due,
 * prepTime, sourceKind, sourceLabel, invoice, raw).
 * Uses 'W-' prefix for website-originated orders to avoid collision with
 * desktop 'D-' orders.
 */
/**
 * Ensure an orderNumber has the website prefix. Local orderNumbers are
 * e.g. '#45266' — Firestore needs 'W-#45266' for doc ID and field.
 */
function ensureWebsiteOrderNumber(orderNumber) {
  const num = String(orderNumber || '').replace(/^#/, '')
  if (!num) return ''
  return num.startsWith('W-') ? num : `W-#${num.replace(/^[DW]-/, '')}`
}

function websiteOrderToFirestore(order, workspaceId, userId) {
  return {
    orderNumber: ensureWebsiteOrderNumber(order.orderNumber),
    billNumber: String(order.billNumber || ''),
    kotNumber: String(order.kotNumber || ''),
    orderType: String(order.orderType || 'Dine-in'),
    table: String(order.table || ''),
    source: 'website',
    notes: String(order.notes || ''),
    cancelReason: String(order.cancelReason || ''),
    cancelledAt: order.cancelledAt || '',
    customer: String(order.customer || 'Walk-in Guest'),
    customerId: String(order.customerId || 'cust-walkin'),
    phone: String(order.phone || ''),
    deliveryAddress: String(order.deliveryAddress || ''),
    riderNotes: String(order.riderNotes || ''),
    cartRows: Array.isArray(order.cartRows)
      ? order.cartRows.map((row) => ({
          itemId: String(row.itemId || row.item?.id || ''),
          itemName: String(row.item?.name || ''),
          itemPrice: Number(row.item?.price || row.unitPrice || 0),
          qty: Math.max(0, Number(row.qty || 0)),
          note: String(row.note || ''),
        }))
      : [],
    totals: order.totals && typeof order.totals === 'object'
      ? {
          subtotal: Number(order.totals.subtotal || 0),
          discount: Number(order.totals.discount || 0),
          netSubtotal: Number(order.totals.netSubtotal || 0),
          serviceCharges: Number(order.totals.serviceCharges || 0),
          tax: Number(order.totals.tax || 0),
          total: Number(order.totals.total || 0),
        }
      : { subtotal: 0, discount: 0, netSubtotal: 0, serviceCharges: 0, tax: 0, total: 0 },
    total: Number(order.total || 0),
    paidAmount: Number(order.paidAmount || 0),
    dueAmount: Number(order.dueAmount || 0),
    orderStatus: String(order.orderStatus || 'pending'),
    paymentStatus: String(order.paymentStatus || 'due'),
    paymentMethod: String(order.paymentMethod || 'Cash'),
    createdBy: userId,
    staffName: '',
    staffId: '',
    workspaceId,
    businessType: 'restaurant',
    ownerId: workspaceId,
    updatedAt: serverTimestamp(),
  }
}

/**
 * Map a Firestore order document back to the website's localStorage order shape
 * (what normalizeRestaurantOrder produces). Derived fields are computed here
 * so they don't need to be stored in Firestore.
 */
export function firestoreOrderToLocalShape(doc) {
  const createdAt = doc.createdAt
    ? (typeof doc.createdAt.toDate === 'function' ? doc.createdAt.toDate().toISOString() : String(doc.createdAt))
    : new Date().toISOString()
  const createdDate = new Date(createdAt)
  const total = Number(doc.total || doc.totals?.total || 0)
  const paidAmount = Number(doc.paidAmount || 0)
  const dueAmount = Number(doc.dueAmount || Math.max(0, total - paidAmount))

  return {
    id: `ORD-${String(doc.orderNumber || '').replace(/^[DW]-/, '')}`,
    orderNumber: doc.orderNumber,
    billNumber: doc.billNumber || `BILL-${String(doc.orderNumber || '').replace(/^[DW]-/, '')}`,
    kotNumber: doc.kotNumber || `KOT-${String(doc.orderNumber || '').replace(/^[DW]-/, '')}`,
    orderType: doc.orderType || 'Dine-in',
    table: doc.table || '',
    customerId: doc.customerId || 'cust-walkin',
    customer: doc.customer || 'Walk-in Guest',
    phone: doc.phone || '',
    paymentMethod: doc.paymentMethod || 'Cash',
    paymentStatus: doc.paymentStatus || (dueAmount > 0 ? (paidAmount > 0 ? 'partial' : 'due') : 'paid'),
    orderStatus: doc.orderStatus || 'pending',
    dueAmount,
    paidAmount,
    walletAmountUsed: Number(doc.walletAmountUsed || 0),
    prepTime: 0,
    notes: doc.notes || '',
    deliveryAddress: doc.deliveryAddress || '',
    riderNotes: doc.riderNotes || '',
    cancelReason: doc.cancelReason || '',
    cancelledAt: doc.cancelledAt || '',
    createdAt,
    date: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toISOString().slice(0, 10),
    time: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cartRows: Array.isArray(doc.cartRows)
      ? doc.cartRows.map((row) => ({
          itemId: row.itemId || '',
          item: { id: row.itemId || '', name: row.itemName || '', price: row.itemPrice || 0 },
          qty: Math.max(0, Number(row.qty || 0)),
          note: row.note || '',
        }))
      : [],
    items: Array.isArray(doc.cartRows)
      ? doc.cartRows.map((row) => `${row.qty || 0}x ${row.itemName || 'Menu item'}`)
      : [],
    itemsCount: Array.isArray(doc.cartRows)
      ? doc.cartRows.reduce((sum, row) => sum + Math.max(0, Number(row.qty || 0)), 0)
      : 0,
    total,
    due: dueAmount,
    totals: doc.totals && typeof doc.totals === 'object'
      ? {
          subtotal: Number(doc.totals.subtotal || 0),
          discount: Number(doc.totals.discount || 0),
          netSubtotal: Number(doc.totals.netSubtotal || 0),
          serviceCharges: Number(doc.totals.serviceCharges || 0),
          tax: Number(doc.totals.tax || 0),
          total: Number(doc.totals.total || total),
        }
      : { subtotal: 0, discount: 0, netSubtotal: 0, serviceCharges: 0, tax: 0, total },
    sourceKind: 'restaurant',
  }
}

/**
 * Load all orders from the Firestore orders collection for a workspace.
 * Returns an array normalized to the website's localStorage order shape.
 * Silently returns [] on any error (permission-denied, network, etc.).
 */
export async function loadFirestoreOrders(workspaceId) {
  if (!db || !workspaceId) return []
  try {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore')
    const collectionPath = `workspaces/${workspaceId}/orders`
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const orders = []
    snap.forEach((d) => {
      const data = d.data()
      if (data && data.orderNumber) {
        orders.push(firestoreOrderToLocalShape(data))
      }
    })
    return orders
  } catch (err) {
    console.warn('[restaurantFirestoreSync] loadFirestoreOrders failed:', err?.code || err?.message || err)
    return []
  }
}

/**
 * Debounced full-array orders sync. Called from saveRestaurantOrders.
 * Only writes website-originated orders (orderNumber starts with 'W-').
 * Diffs against last synced state so only changed orders are written.
 */
export function syncOrdersToFirestore(workspaceId, userId, orders) {
  if (!canSync(workspaceId, userId)) return
  if (!Array.isArray(orders)) return

  if (_ordersDebounceTimer) clearTimeout(_ordersDebounceTimer)

  _ordersDebounceTimer = setTimeout(() => {
    _ordersDebounceTimer = null
    _performOrdersSync(workspaceId, userId, orders)
  }, ORDERS_DEBOUNCE_MS)
}

async function _performOrdersSync(workspaceId, userId, orders) {
  if (!canSync(workspaceId, userId)) return

  // All localStorage orders are website-originated — sync all of them
  // (desktop D- orders don't exist in localStorage)
  const websiteOrders = orders.filter((o) =>
    o && o.orderNumber,
  )

  const currSnapshot = JSON.stringify(websiteOrders.map((o) => o.orderNumber).sort())
  if (currSnapshot === _lastSyncedOrdersSnapshot) return

  try {
    const prevMap = new Map((_prevOrders || []).map((o) => [o.orderNumber, o]))
    const currMap = new Map(websiteOrders.map((o) => [o.orderNumber, o]))
    const changed = []

    for (const [num, order] of currMap) {
      const prev = prevMap.get(num)
      if (!prev || _orderChanged(prev, order)) {
        changed.push(order)
      }
    }

    const collectionPath = `workspaces/${workspaceId}/orders`
    const BATCH_LIMIT = 500
    let batch = writeBatch(db)
    let ops = 0

    for (const order of changed) {
      const ref = doc(db, collectionPath, String(order.orderNumber))
      const data = websiteOrderToFirestore(order, workspaceId, userId)
      // Only set createdAt on first write
      if (!prevMap.has(order.orderNumber)) {
        data.createdAt = serverTimestamp()
      }
      batch.set(ref, data, { merge: true })
      ops++
      if (ops >= BATCH_LIMIT) {
        await _safeCommit(batch, 'orders')
        batch = writeBatch(db)
        ops = 0
      }
    }

    if (ops > 0) {
      await _safeCommit(batch, 'orders')
    }

    _prevOrders = websiteOrders
    _lastSyncedOrdersSnapshot = currSnapshot
  } catch (err) {
    console.warn('[restaurantFirestoreSync] orders sync error:', err?.message || err)
  }
}

let _prevOrders = null

function _orderChanged(prev, curr) {
  const keys = [
    'orderStatus', 'paymentStatus', 'paidAmount', 'dueAmount', 'total',
    'table', 'orderType', 'customer', 'phone', 'notes', 'paymentMethod',
    'cancelReason', 'cancelledAt', 'deliveryAddress', 'riderNotes',
  ]
  for (const k of keys) {
    if (String(prev[k] || '') !== String(curr[k] || '')) return true
  }
  // Compare cartRows
  const prevCart = JSON.stringify((prev.cartRows || []).map((r) => ({ id: r.itemId, qty: r.qty, note: r.note })))
  const currCart = JSON.stringify((curr.cartRows || []).map((r) => ({ id: r.itemId, qty: r.qty, note: r.note })))
  if (prevCart !== currCart) return true
  // Compare totals
  if (JSON.stringify(prev.totals || {}) !== JSON.stringify(curr.totals || {})) return true
  return false
}

/**
 * Sync a single order to Firestore immediately (fire-and-forget).
 * Used for status changes from KitchenDisplay and OrdersKot.
 * The orderNumber must already be 'W-' prefixed for website orders.
 */
export function syncSingleOrderToFirestore(workspaceId, userId, order) {
  if (!canSync(workspaceId, userId)) return
  if (!order || !order.orderNumber) return

  const ref = doc(db, `workspaces/${workspaceId}/orders`, String(order.orderNumber))
  const data = websiteOrderToFirestore(order, workspaceId, userId)

  setDoc(ref, data, { merge: true }).catch((err) => {
    console.warn('[restaurantFirestoreSync] single-order sync skipped:', err?.code || err?.message || err)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS — Restaurant Customers → Firestore CRM customers Sync
// ═══════════════════════════════════════════════════════════════════════════════

const CUSTOMERS_DEBOUNCE_MS = 2000
let _customersDebounceTimer = null
let _lastSyncedCustomersSnapshot = null
let _prevCustomers = null

/**
 * Map a restaurant localStorage customer to the Firestore CRM customer shape.
 * Uses the local id as the Firestore document ID for idempotent upserts.
 * Skips the 'cust-walkin' placeholder — it's not a real customer.
 *
 * Field mapping:
 *   name          → name
 *   phone         → phone
 *   address       → address (Firestore free-form field)
 *   notes         → notes
 *   creditBalance → walletDue (outstanding balance)
 *   paidAmount    → lifetimeSpend
 *   lastVisit     → lastPosOrderAt
 */
function restaurantCustomerToFirestore(customer, workspaceId, userId) {
  return {
    name: String(customer.name || 'Restaurant Customer'),
    phone: String(customer.phone || ''),
    address: String(customer.address || ''),
    notes: String(customer.notes || ''),
    walletDue: Math.max(0, Number(customer.creditBalance || 0)),
    lifetimeSpend: Math.max(0, Number(customer.paidAmount || 0)),
    lastPosOrderAt: customer.lastVisit || null,
    customerType: 'General',
    status: 'Active',
    workspaceId,
    ownerId: workspaceId,
    createdBy: userId,
    updatedAt: serverTimestamp(),
  }
}

function _customerChanged(prev, curr) {
  const keys = ['name', 'phone', 'address', 'notes', 'creditBalance', 'paidAmount', 'lastVisit']
  for (const k of keys) {
    if (String(prev[k] || '') !== String(curr[k] || '')) return true
  }
  return false
}

/**
 * Debounced restaurant customer sync. Skips the walk-in placeholder.
 */
export function syncCustomersToFirestore(workspaceId, userId, customers) {
  if (!canSync(workspaceId, userId)) return
  if (!Array.isArray(customers)) return

  if (_customersDebounceTimer) clearTimeout(_customersDebounceTimer)

  _customersDebounceTimer = setTimeout(() => {
    _customersDebounceTimer = null
    _performCustomersSync(workspaceId, userId, customers)
  }, CUSTOMERS_DEBOUNCE_MS)
}

async function _performCustomersSync(workspaceId, userId, customers) {
  if (!canSync(workspaceId, userId)) return

  // Exclude the walk-in placeholder — never sync it to Firestore
  const realCustomers = customers.filter((c) => c && c.id && c.id !== 'cust-walkin')

  const currSnapshot = JSON.stringify(realCustomers.map((c) => c.id).sort())
  if (currSnapshot === _lastSyncedCustomersSnapshot) return

  try {
    const prevMap = new Map((_prevCustomers || []).map((c) => [c.id, c]))
    const currMap = new Map(realCustomers.map((c) => [c.id, c]))
    const changed = []
    const deleted = []

    for (const [id, customer] of currMap) {
      const prev = prevMap.get(id)
      if (!prev || _customerChanged(prev, customer)) {
        changed.push(customer)
      }
    }

    for (const [id] of prevMap) {
      if (!currMap.has(id)) {
        deleted.push(id)
      }
    }

    const collectionPath = `workspaces/${workspaceId}/customers`
    const BATCH_LIMIT = 500
    let batch = writeBatch(db)
    let ops = 0

    for (const customer of changed) {
      const ref = doc(db, collectionPath, String(customer.id))
      const data = restaurantCustomerToFirestore(customer, workspaceId, userId)
      if (!prevMap.has(customer.id)) {
        data.createdAt = serverTimestamp()
      }
      batch.set(ref, data, { merge: true })
      ops++
      if (ops >= BATCH_LIMIT) {
        await _safeCommit(batch, 'customers')
        batch = writeBatch(db)
        ops = 0
      }
    }

    // Soft-delete: set status to 'Inactive' rather than hard-deleting
    for (const id of deleted) {
      const ref = doc(db, collectionPath, String(id))
      batch.set(ref, { status: 'Inactive', updatedAt: serverTimestamp() }, { merge: true })
      ops++
      if (ops >= BATCH_LIMIT) {
        await _safeCommit(batch, 'customers')
        batch = writeBatch(db)
        ops = 0
      }
    }

    if (ops > 0) {
      await _safeCommit(batch, 'customers')
    }

    _prevCustomers = realCustomers
    _lastSyncedCustomersSnapshot = currSnapshot
  } catch (err) {
    console.warn('[restaurantFirestoreSync] customers sync error:', err?.message || err)
  }
}

// ── Internal Helpers ───────────────────────────────────────────────────────────

async function _safeCommit(batch, label) {
  try {
    await batch.commit()
  } catch (err) {
    console.warn(`[restaurantFirestoreSync] ${label} batch commit failed:`, err?.code || err?.message || err)
  }
}
