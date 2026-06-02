import { normalizeBusinessType } from '../data/moduleAccess.js'
import {
  amountInWords,
  calculateInvoiceDraft,
  calculateInvoiceLine,
  invoicePaidAmount,
  invoiceTotal,
  statusBadge,
} from './invoiceHelpers.js'

export function safePrintText(value, fallback = '-') {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
  return text || fallback
}

export function invoiceDocumentLabel(businessType, invoice = {}) {
  const type = normalizeBusinessType(businessType || invoice.businessType)
  const status = statusBadge(invoice.status || invoice.paymentStatus).label.toLowerCase()

  if (type === 'School ERP') return status === 'paid' ? 'Fee Receipt' : 'Fee Voucher'
  if (type === 'Property ERP') return 'Rent Invoice'
  if (type === 'Retail / POS') return 'Sales Invoice'
  if (type === 'Restaurant POS') return 'Bill'
  return 'Invoice'
}

export function invoiceNumberLabel(businessType, invoice = {}) {
  const label = invoiceDocumentLabel(businessType, invoice)
  if (label === 'Bill') return 'Bill No'
  return `${label} No`
}

export function invoicePartyLabel(businessType) {
  const type = normalizeBusinessType(businessType)
  if (type === 'School ERP') return 'Student'
  if (type === 'Property ERP') return 'Tenant'
  if (type === 'Restaurant POS') return 'Customer / Table'
  return 'Customer'
}

export function normalizeInvoiceTotals(invoice = {}) {
  const hasItems = Array.isArray(invoice.items) && invoice.items.some((item) => item?.name || item?.productId || item?.price || item?.rate)
  if (hasItems) return calculateInvoiceDraft(invoice)

  const total = invoiceTotal(invoice)
  const amountPaid = invoicePaidAmount(invoice)
  const discountTotal = Number(invoice.discountTotal ?? invoice.discount ?? 0) || 0
  const taxTotal = Number(invoice.taxTotal ?? invoice.taxAmount ?? invoice.taxAmountUsd ?? 0) || 0
  const subtotal = Number(invoice.subtotal ?? invoice.subtotalUsd ?? Math.max(total - taxTotal, 0)) || 0
  const taxableAmount = Number(invoice.taxableAmount ?? Math.max(subtotal - discountTotal, 0)) || 0
  const roundOff = Number(invoice.roundOff ?? 0) || 0

  return {
    lines: [],
    subtotal,
    discountTotal,
    taxableAmount,
    taxTotal,
    roundOff,
    grandTotal: total,
    total,
    amountPaid,
    balanceDue: Math.max(Number(invoice.balanceDue ?? total - amountPaid) || 0, 0),
    averageTaxRate: Number(invoice.taxRate ?? 0) || 0,
    amountInWords: invoice.amountInWords || amountInWords(total, invoice.currency || 'PKR'),
  }
}

export function invoiceItemRows(invoice = {}) {
  const items = Array.isArray(invoice.items) && invoice.items.length
    ? invoice.items
    : [{ name: 'Invoice item', quantity: 1, unit: 'Service', price: 0 }]

  return items.map((item, index) => ({
    index,
    item,
    line: calculateInvoiceLine(item),
    description: item.description || item.sku || item.code || '-',
  }))
}

function paymentTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

export function invoicePaymentRows(invoice = {}, payments = []) {
  const invoiceKey = invoice.id || invoice.invoiceId || invoice.invoiceNumber
  const invoiceNumber = invoice.invoiceNumber || invoice.number
  const externalRows = (payments || [])
    .filter((payment) => {
      if (!payment) return false
      return (
        (invoiceKey && payment.invoiceId === invoiceKey) ||
        (invoiceNumber && payment.invoiceNumber === invoiceNumber)
      )
    })
    .map((payment) => ({
      id: payment.id || payment.reference || `${payment.invoiceId || invoiceNumber}-${payment.amount || payment.amountPaid}`,
      date: payment.paidAt || payment.createdAt || payment.recordedAt,
      method: payment.paymentMethod || payment.method || 'Payment',
      reference: payment.reference || payment.transactionId || payment.paymentReference || '',
      amount: Number(payment.amount ?? payment.amountPaid ?? payment.value ?? 0) || 0,
      currency: payment.currency || invoice.currency || 'PKR',
      source: 'payment',
    }))

  const historyRows = (Array.isArray(invoice.paymentHistory) ? invoice.paymentHistory : []).map((payment, index) => ({
    id: payment.id || payment.reference || `${payment.recordedAt || index}-${payment.amount || payment.amountPaid}`,
    date: payment.recordedAt || payment.paidAt || payment.createdAt,
    method: payment.paymentMethod || payment.method || 'Manual',
    reference: payment.reference || payment.transactionId || payment.paymentReference || '',
    amount: Number(payment.amount ?? payment.amountPaid ?? 0) || 0,
    currency: payment.currency || invoice.currency || 'PKR',
    source: 'history',
  }))

  return [...historyRows, ...externalRows]
    .filter((payment) => payment.amount || payment.method || payment.date || payment.reference)
    .sort((a, b) => paymentTime(a.date) - paymentTime(b.date))
}

export function reportFileName(report = {}, fallback = 'report') {
  return `${safePrintText(report.reportId, fallback).replace(/[^a-z0-9-]/gi, '-')}.pdf`
}
