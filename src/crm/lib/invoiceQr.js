import { statusValue, toNumber } from './calculations.js'

function customerNameForInvoice(invoice = {}) {
  return (
    invoice.customerName ||
    invoice.studentName ||
    invoice.tenantName ||
    invoice.clientName ||
    invoice.customerEmail ||
    invoice.studentEmail ||
    invoice.tenantEmail ||
    ''
  )
}

export function buildInvoiceQrPayload(invoice = {}, totals = {}) {
  const totalAmount = toNumber(totals.grandTotal ?? invoice.total ?? invoice.totalUsd ?? invoice.grandTotal, 0)
  const paidAmount = toNumber(totals.amountPaid ?? invoice.amountPaid ?? invoice.partialPaidAmount ?? invoice.paidAmount, 0)
  const balance = Math.max(toNumber(totals.balanceDue ?? invoice.balanceDue ?? totalAmount - paidAmount, 0), 0)
  const publicLink = invoice.publicLink || invoice.shareLink || invoice.invoiceLink || invoice.paymentLink || ''

  return {
    invoiceId: invoice.id || invoice.invoiceId || '',
    invoiceNumber: invoice.invoiceNumber || invoice.number || '',
    workspaceId: invoice.workspaceId || invoice.ownerId || invoice.userId || '',
    businessType: invoice.businessType || '',
    customerName: customerNameForInvoice(invoice),
    totalAmount,
    paidAmount,
    balance,
    paymentStatus: statusValue(invoice.paymentStatus || invoice.status, 'pending'),
    ...(publicLink ? { publicLink } : {}),
  }
}
