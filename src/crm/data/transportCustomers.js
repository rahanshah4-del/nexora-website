import { safeMoney } from '../lib/transportCalculations.js'
import { migrateKey, notifyLocalDataChanged, scopedKey } from '../lib/localDataEvents.js'

const _CUST_BASE = 'nexora.transport.customers.v1'
const _BOOK_BASE = 'nexora.transport.bookings.v1'
/** @deprecated Use scopedKey() from localDataEvents instead. Kept for backward compat. */
export const transportCustomersStorageKey = _CUST_BASE

function _custKey() {
  const k = scopedKey(_CUST_BASE)
  if (k !== _CUST_BASE) {
    migrateKey(_CUST_BASE, k)
  }
  return k
}

function _bookKey() {
  const k = scopedKey(_BOOK_BASE)
  if (k !== _BOOK_BASE) {
    migrateKey(_BOOK_BASE, k)
  }
  return k
}

const seedCustomers = [
  {
    id: 'tcust-walkin',
    name: 'Walk-in Customer',
    phone: '',
    cnic: '',
    licenseNumber: '',
    address: '',
    creditBalance: 0,
    paidAmount: 0,
    notes: '',
    bookingHistory: [],
  },
]

function readStoredCustomers() {
  if (typeof window === 'undefined') return seedCustomers
  try {
    const stored = window.localStorage.getItem(_custKey())
    if (!stored) return seedCustomers
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed) || !parsed.length) return seedCustomers
    return parsed.some((row) => row.id === 'tcust-walkin') ? parsed : [seedCustomers[0], ...parsed]
  } catch {
    return seedCustomers
  }
}

function cancelledBookingNumbers() {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = window.localStorage.getItem(_bookKey())
    const parsed = stored ? JSON.parse(stored) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed
        .filter((booking) => String(booking?.status || '').toLowerCase() === 'cancelled')
        .map((booking) => booking?.bookingNumber)
        .filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

export function loadTransportCustomers() {
  const cancelledNumbers = cancelledBookingNumbers()
  return readStoredCustomers()
    .map((customer) => normalizeTransportCustomer(customer))
    .map((customer) => {
      if (!cancelledNumbers.size || !customer.bookingHistory?.length) return customer
      const cancelledDue = customer.bookingHistory
        .filter((entry) => cancelledNumbers.has(entry.bookingNumber))
        .reduce((sum, entry) => sum + safeMoney(entry.due), 0)
      if (cancelledDue <= 0) return customer
      return {
        ...customer,
        creditBalance: Math.max(0, customer.creditBalance - cancelledDue),
      }
    })
    .filter((customer) => customer.id)
}

export function saveTransportCustomers(customers) {
  if (typeof window === 'undefined') return
  const k = _custKey()
  window.localStorage.setItem(k, JSON.stringify(Array.isArray(customers) ? customers : []))
  notifyLocalDataChanged(k)
}

export function getNextCustomerId(customers = loadTransportCustomers()) {
  const numbers = customers
    .map((customer) => Number(String(customer.id || '').replace(/[^0-9]/g, '')))
    .filter((value) => Number.isFinite(value))
  const next = (numbers.length ? Math.max(...numbers) : 100) + 1
  return `tcust-${next}`
}

export function normalizeTransportCustomer(customer = {}) {
  return {
    id: customer.id || '',
    name: customer.name || 'Walk-in Customer',
    phone: customer.phone || '',
    cnic: customer.cnic || '',
    licenseNumber: customer.licenseNumber || '',
    address: customer.address || '',
    creditBalance: safeMoney(customer.creditBalance),
    paidAmount: safeMoney(customer.paidAmount),
    notes: customer.notes || '',
    lastBooking: customer.lastBooking || '',
    bookingHistory: Array.isArray(customer.bookingHistory) ? customer.bookingHistory : [],
    createdAt: customer.createdAt || new Date().toISOString(),
  }
}

export function upsertTransportCustomer(customer) {
  const customers = loadTransportCustomers()
  const normalized = normalizeTransportCustomer({
    ...customer,
    id: customer.id || getNextCustomerId(customers),
  })
  const exists = customers.some((row) => row.id === normalized.id)
  const nextCustomers = exists
    ? customers.map((row) => (row.id === normalized.id ? { ...row, ...normalized } : row))
    : [normalized, ...customers]
  saveTransportCustomers(nextCustomers)
  return nextCustomers
}

export function deleteTransportCustomer(customerId) {
  if (customerId === 'tcust-walkin') return loadTransportCustomers()
  const nextCustomers = loadTransportCustomers().filter((customer) => customer.id !== customerId)
  saveTransportCustomers(nextCustomers)
  return nextCustomers
}

// Apply a charge (new booking due) and/or a payment to a customer's ledger.
export function applyTransportCustomerLedger(customers, customerId, { bookingNumber, total = 0, paid = 0, due = 0, method = 'Cash', note = '' } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  return customers.map((customer) => {
    if (customer.id !== customerId) return customer
    const previousBalance = safeMoney(customer.creditBalance)
    return {
      ...customer,
      creditBalance: Math.max(0, previousBalance + safeMoney(due) - safeMoney(paid)),
      paidAmount: safeMoney(customer.paidAmount) + safeMoney(paid),
      lastBooking: today,
      bookingHistory: [
        {
          bookingNumber: bookingNumber || '',
          total: safeMoney(total),
          paid: safeMoney(paid),
          due: safeMoney(due),
          method,
          date: today,
          note: note || 'Booking activity',
        },
        ...(customer.bookingHistory || []),
      ].slice(0, 50),
    }
  })
}
