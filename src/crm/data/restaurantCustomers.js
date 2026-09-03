export const restaurantCustomersStorageKey = 'nexora.restaurant.customers.v2'

export const restaurantCustomersSeed = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Guest',
    phone: '',
    address: '',
    creditBalance: 0,
    paidAmount: 0,
    lastVisit: '2026-06-12',
    notes: 'Default counter customer.',
    orderHistory: [],
  },
]

import { migrateKey, notifyLocalDataChanged, scopedKey } from '../lib/localDataEvents.js'

let _customerCache = null

const _BASE = 'nexora.restaurant.customers.v2'

function _key() {
  const k = scopedKey(_BASE)
  if (k !== _BASE) {
    migrateKey(_BASE, k)
  }
  return k
}

// See restaurantOrders.js for why this exists: switching workspaces without
// a page reload (the in-app "Switch Product" modal) changes what
// scopedKey() resolves to, but nothing invalidated _customerCache on that
// change — so a second Restaurant POS workspace kept showing the first
// workspace's cached customers. Must run unconditionally before the cache
// short-circuits in loadRestaurantCustomers, since _key() is only reached
// on a cache miss.
let _lastKey = null

function _checkScopeChange() {
  const k = _key()
  if (_lastKey !== null && _lastKey !== k) _customerCache = null
  _lastKey = k
}

export function loadRestaurantCustomers() {
  if (typeof window === 'undefined') return restaurantCustomersSeed
  _checkScopeChange()
  if (_customerCache) return _customerCache
  try {
    const stored = window.localStorage.getItem(_key())
    const parsed = stored ? JSON.parse(stored) : null
    _customerCache = Array.isArray(parsed) && parsed.length ? parsed : restaurantCustomersSeed
    return _customerCache
  } catch {
    return restaurantCustomersSeed
  }
}

export function saveRestaurantCustomers(customers, workspaceId, userId) {
  if (typeof window === 'undefined') return
  const k = _key()
  _customerCache = null
  window.localStorage.setItem(k, JSON.stringify(customers))
  notifyLocalDataChanged(k)

  // Phase 1 dual-write: sync restaurant customers to Firestore CRM customers
  if (workspaceId && userId) {
    import('./restaurantFirestoreSync.js').then(({ syncCustomersToFirestore }) => {
      syncCustomersToFirestore(workspaceId, userId, customers)
    }).catch(() => { /* dynamic import failed — silently skip */ })
  }
}

export function applyRestaurantCustomerPayment(customers, customerId, payment) {
  const paid = Math.max(0, Number(payment?.paidAmount || 0))
  const total = Math.max(0, Number(payment?.total || 0))
  const due = Math.max(0, total - paid)
  const today = new Date().toISOString().slice(0, 10)
  return customers.map((customer) => {
    if (customer.id !== customerId) return customer
    return {
      ...customer,
      creditBalance: Math.max(0, Number(customer.creditBalance || 0) + due),
      paidAmount: Math.max(0, Number(customer.paidAmount || 0) + Math.min(paid, total)),
      lastVisit: today,
      orderHistory: [
        {
          orderNumber: payment?.orderNumber || '#45266',
          total,
          paid: Math.min(paid, total),
          due,
          method: payment?.paymentMethod || 'Cash',
          date: today,
        },
        ...(customer.orderHistory || []),
      ],
    }
  })
}
