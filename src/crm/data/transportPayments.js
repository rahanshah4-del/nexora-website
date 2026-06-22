import { safeMoney } from '../lib/transportCalculations.js'
import { notifyLocalDataChanged } from '../lib/localDataEvents.js'

export const transportPaymentsStorageKey = 'nexora.transport.payments.v1'

function readStoredPayments() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(transportPaymentsStorageKey)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadTransportPayments() {
  return readStoredPayments().map((payment) => normalizeTransportPayment(payment)).filter((payment) => payment.id)
}

export function saveTransportPayments(payments) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(transportPaymentsStorageKey, JSON.stringify(Array.isArray(payments) ? payments : []))
  notifyLocalDataChanged(transportPaymentsStorageKey)
}

export function getNextPaymentId(payments = loadTransportPayments()) {
  const numbers = payments
    .map((payment) => Number(String(payment.id || '').replace(/[^0-9]/g, '')))
    .filter((value) => Number.isFinite(value))
  const next = (numbers.length ? Math.max(...numbers) : 5000) + 1
  return `TPAY-${next}`
}

export function normalizeTransportPayment(payment = {}) {
  const createdAt = payment.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  return {
    id: payment.id || '',
    bookingNumber: payment.bookingNumber || '',
    customerId: payment.customerId || 'tcust-walkin',
    customer: payment.customer || 'Walk-in Customer',
    amount: safeMoney(payment.amount),
    method: payment.method || 'Cash',
    type: payment.type || 'rental', // rental | advance | security | refund
    note: payment.note || '',
    createdAt,
    date: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toISOString().slice(0, 10),
    time: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function recordTransportPayment(payment) {
  const payments = loadTransportPayments()
  const normalized = normalizeTransportPayment({
    ...payment,
    id: payment.id || getNextPaymentId(payments),
  })
  const nextPayments = [normalized, ...payments]
  saveTransportPayments(nextPayments)
  return nextPayments
}
