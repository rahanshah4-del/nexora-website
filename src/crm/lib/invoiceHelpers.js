export const UNIT_OPTIONS = [
  'PCS',
  'KG',
  'Gram',
  'Liter',
  'ML',
  'Meter',
  'Feet',
  'Box',
  'Carton',
  'Dozen',
  'Hour',
  'Day',
  'Month',
  'Service',
]

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Credit Card', 'Other']

export const PAYMENT_TERMS = ['Due on receipt', 'Net 7 Days', 'Net 14 Days', 'Net 30 Days', 'Advance Payment', 'Custom']

export const INVOICE_STATUS_OPTIONS = ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Partial Paid', 'Paid', 'Overdue', 'Cancelled']

export const INVOICE_TEMPLATES = ['Professional', 'Executive White', 'Compact Finance']

export function money(value, fallback = 0) {
  const numeric = typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysInput(days = 7) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

export function generateInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `INV-${stamp}-${rand}`
}

export function blankInvoiceItem() {
  return {
    productId: '',
    name: '',
    sku: '',
    code: '',
    description: '',
    quantity: 1,
    qty: 1,
    unit: 'PCS',
    price: 0,
    rate: 0,
    discountPercent: 0,
    taxRate: 0,
  }
}

export function createBlankInvoice() {
  return {
    invoiceNumber: generateInvoiceNumber(),
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    customerAddress: '',
    customerNotes: '',
    issueDate: todayInput(),
    dueDate: addDaysInput(14),
    currency: 'PKR',
    paymentTerms: 'Net 14 Days',
    status: 'Draft',
    paymentMethod: 'Bank Transfer',
    items: [blankInvoiceItem()],
    amountPaid: 0,
    roundOff: 0,
    attachmentName: '',
    recurring: false,
    recurringCycle: 'monthly',
    template: 'Professional',
    signatureName: '',
    terms:
      'Payment is due within the specified terms.\nLate payment may incur additional charges.\nGoods once sold will not be returned.',
    notes: '',
  }
}

export function calculateInvoiceLine(item = {}) {
  const quantity = Math.max(money(item.quantity ?? item.qty), 0)
  const price = Math.max(money(item.price ?? item.rate), 0)
  const subtotal = quantity * price
  const discountPercent = Math.min(Math.max(money(item.discountPercent ?? item.discountRate), 0), 100)
  const discountAmount = subtotal * (discountPercent / 100)
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const taxRate = Math.max(money(item.taxRate ?? item.taxPercent), 0)
  const taxAmount = taxableAmount * (taxRate / 100)
  const total = taxableAmount + taxAmount

  return { quantity, price, subtotal, discountPercent, discountAmount, taxableAmount, taxRate, taxAmount, total }
}

export function calculateInvoiceDraft(invoice = {}) {
  const lines = Array.isArray(invoice.items) ? invoice.items.map(calculateInvoiceLine) : []
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const lineDiscountTotal = lines.reduce((sum, line) => sum + line.discountAmount, 0)
  // A flat, invoice-level discount (e.g. the School Fee Bill "Discount" field,
  // which has no per-line-item breakdown) only applies when no line item
  // already carries its own discount.
  const flatDiscount = lineDiscountTotal > 0 ? 0 : Math.max(money(invoice.discountTotal ?? invoice.discount, 0), 0)
  const discountTotal = lineDiscountTotal + flatDiscount
  const taxableAmount = Math.max(lines.reduce((sum, line) => sum + line.taxableAmount, 0) - flatDiscount, 0)
  const taxTotal = lines.reduce((sum, line) => sum + line.taxAmount, 0)
  const roundOff = money(invoice.roundOff, 0)
  const grandTotal = Math.max(taxableAmount + taxTotal + roundOff, 0)
  const amountPaid = Math.min(Math.max(money(invoice.amountPaid), 0), grandTotal)
  const balanceDue = Math.max(grandTotal - amountPaid, 0)
  const averageTaxRate = taxableAmount ? (taxTotal / taxableAmount) * 100 : 0

  return {
    lines,
    subtotal,
    discountTotal,
    taxableAmount,
    taxTotal,
    roundOff,
    grandTotal,
    total: grandTotal,
    amountPaid,
    balanceDue,
    averageTaxRate,
    amountInWords: amountInWords(grandTotal, invoice.currency || 'PKR'),
  }
}

const smallNumbers = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const tensNumbers = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function wordsBelowThousand(value) {
  const number = Math.floor(value)
  if (number < 20) return smallNumbers[number]
  if (number < 100) {
    const ten = Math.floor(number / 10)
    const rest = number % 10
    return `${tensNumbers[ten]}${rest ? ` ${smallNumbers[rest]}` : ''}`
  }
  const hundred = Math.floor(number / 100)
  const rest = number % 100
  return `${smallNumbers[hundred]} Hundred${rest ? ` ${wordsBelowThousand(rest)}` : ''}`
}

function numberToWords(value) {
  const number = Math.floor(Math.abs(value))
  if (number === 0) return 'Zero'
  const chunks = [
    [1000000000, 'Billion'],
    [1000000, 'Million'],
    [1000, 'Thousand'],
    [1, ''],
  ]
  let rest = number
  const words = []
  chunks.forEach(([size, label]) => {
    const chunk = Math.floor(rest / size)
    if (!chunk) return
    words.push(`${wordsBelowThousand(chunk)}${label ? ` ${label}` : ''}`)
    rest %= size
  })
  return words.join(' ')
}

export function amountInWords(value, currency = 'PKR') {
  const rounded = Math.round(money(value, 0))
  const currencyName = currency === 'PKR' ? 'Rupees' : currency
  return `${numberToWords(rounded)} ${currencyName} Only`
}

export function dateLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function statusBadge(status) {
  const value = String(status || 'pending').toLowerCase()
  if (value === 'paid') return { label: 'Paid', variant: 'success' }
  if (value === 'partial' || value === 'partial_paid') return { label: 'Partial Paid', variant: 'info' }
  if (value === 'overdue') return { label: 'Overdue', variant: 'danger' }
  if (value === 'approved') return { label: 'Approved', variant: 'success' }
  if (value === 'sent') return { label: 'Sent', variant: 'info' }
  if (value === 'pending_approval') return { label: 'Pending Approval', variant: 'warning' }
  if (value === 'cancelled' || value === 'canceled' || value === 'rejected') return { label: 'Cancelled', variant: 'default' }
  if (value === 'draft') return { label: 'Draft', variant: 'purple' }
  return { label: 'Pending', variant: 'warning' }
}

export function invoiceIssueDate(invoice = {}) {
  return invoice.issueDate || invoice.invoiceDate || invoice.createdAt || ''
}

export function invoicePaidAmount(invoice = {}) {
  const record = invoice || {}
  return Math.max(money(record.amountPaid ?? record.partialPaidAmount), 0)
}

export function invoiceTotal(invoice = {}) {
  const record = invoice || {}
  return Math.max(money(record.total ?? record.totalUsd ?? record.grandTotal), 0)
}
