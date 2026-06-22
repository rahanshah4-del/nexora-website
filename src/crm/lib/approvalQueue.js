import { statusValue } from './calculations.js'

const closedStatuses = new Set(['approved', 'paid', 'rejected', 'cancelled', 'canceled'])

export function isOpenPaymentApproval(payment = {}) {
  const statuses = [payment.status, payment.paymentStatus, payment.approvalStatus]
    .map((value) => statusValue(value, ''))
    .filter(Boolean)
  return Boolean(payment.requiresApproval || statuses.some((value) => ['pending', 'pending_verification', 'pending_partial', 'partial_pending'].includes(value)))
    && !statuses.some((value) => closedStatuses.has(value))
}

export function openPaymentInvoiceIds(payments = []) {
  return new Set(
    (Array.isArray(payments) ? payments : [])
      .filter(isOpenPaymentApproval)
      .map((payment) => String(payment.invoiceId || '').trim())
      .filter(Boolean),
  )
}

export function hasOpenInvoicePayment(invoiceId, payments = []) {
  return openPaymentInvoiceIds(payments).has(String(invoiceId || '').trim())
}

export function pendingInvoicePaymentId(invoiceId, amountPaid = 0) {
  const safeInvoiceId = String(invoiceId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)
  const paidMinorUnits = Math.max(0, Math.round((Number(amountPaid) || 0) * 100))
  return `pending-invoice-${safeInvoiceId}-${paidMinorUnits}`
}
