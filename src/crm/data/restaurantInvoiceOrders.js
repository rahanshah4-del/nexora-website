import { getInvoiceStatus, invoiceValue, toNumber } from '../lib/calculations.js'

function toDate(value) {
  if (!value) return new Date()
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function invoicePaidAmount(invoice = {}) {
  return Math.max(0, toNumber(invoice.amountPaid ?? invoice.partialPaidAmount ?? invoice.paidAmount, 0))
}

function invoiceDueAmount(invoice = {}) {
  const total = Math.max(0, invoiceValue(invoice))
  return Math.max(0, toNumber(invoice.balanceDue ?? total - invoicePaidAmount(invoice), 0))
}

function invoicePaymentStatus(invoice = {}) {
  const status = getInvoiceStatus(invoice)
  if (status === 'paid' || status === 'approved') return 'paid'
  if (invoicePaidAmount(invoice) > 0 && invoiceDueAmount(invoice) > 0) return 'partial'
  if (invoiceDueAmount(invoice) > 0) return 'due'
  return status || 'pending'
}

export function normalizeInvoiceOrder(invoice = {}) {
  const createdDate = toDate(invoice.createdAt || invoice.issueDate || invoice.invoiceDate || invoice.dueDate)
  const total = Math.max(0, invoiceValue(invoice))
  const paidAmount = Math.min(invoicePaidAmount(invoice), total)
  const dueAmount = invoiceDueAmount(invoice)
  const rows = Array.isArray(invoice.items)
    ? invoice.items.map((item, index) => {
        const quantity = Math.max(0, toNumber(item.quantity ?? item.qty, 1))
        const price = Math.max(0, toNumber(item.rate ?? item.price ?? item.unitPrice, 0))
        return {
          itemId: item.id || item.productId || `invoice-item-${index}`,
          item: {
            id: item.id || item.productId || `invoice-item-${index}`,
            name: item.name || item.itemName || item.productName || 'Invoice item',
            price,
            costPrice: toNumber(item.costPrice, 0),
            discountType: item.discount ? 'fixed' : 'none',
            discountValue: toNumber(item.discount, 0),
          },
          qty: quantity,
          quantity,
          note: item.description || '',
          lineTotal: Math.max(0, toNumber(item.total ?? price * quantity, 0)),
        }
      }).filter((row) => row.quantity > 0)
    : []
  const invoiceNumber = invoice.invoiceNumber || invoice.number || invoice.id || 'INV'

  return {
    id: `INV-${invoice.id || invoiceNumber}`,
    sourceKind: 'invoice',
    sourceLabel: 'Invoice Order',
    invoice,
    orderNumber: invoiceNumber,
    billNumber: invoiceNumber,
    kotNumber: '—',
    orderType: 'Invoice Order',
    table: '',
    customerId: invoice.customerId || 'invoice-customer',
    customer: invoice.customerName || invoice.clientName || invoice.studentName || invoice.tenantName || 'Invoice Customer',
    phone: invoice.customerPhone || invoice.phone || '',
    paymentMethod: invoice.paymentMethod || 'Invoice',
    paymentStatus: invoicePaymentStatus(invoice),
    orderStatus: getInvoiceStatus(invoice) === 'cancelled' ? 'cancelled' : 'served',
    dueAmount,
    paidAmount,
    prepTime: 0,
    notes: invoice.notes || invoice.terms || '',
    createdAt: createdDate.toISOString(),
    date: createdDate.toISOString().slice(0, 10),
    time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cartRows: rows,
    items: rows.map((row) => `${row.quantity}x ${row.item.name}`),
    itemsCount: rows.reduce((sum, row) => sum + row.quantity, 0),
    total,
    due: dueAmount,
    totals: {
      rows,
      subtotal: toNumber(invoice.subtotal ?? invoice.subtotalUsd, total),
      discount: toNumber(invoice.discountTotal ?? invoice.discount, 0),
      netSubtotal: Math.max(0, toNumber(invoice.subtotal ?? invoice.subtotalUsd, total) - toNumber(invoice.discountTotal ?? invoice.discount, 0)),
      serviceCharges: toNumber(invoice.serviceCharges ?? invoice.serviceCharge, 0),
      tax: toNumber(invoice.taxAmount ?? invoice.taxTotal ?? invoice.tax, 0),
      total,
    },
  }
}

export function normalizeInvoiceOrders(invoices = []) {
  return (Array.isArray(invoices) ? invoices : []).map(normalizeInvoiceOrder)
}
