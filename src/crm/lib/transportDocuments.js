/**
 * Transport / Rental quotations and invoices: pure maths and status rules.
 * No storage or React here, so every number is unit tested
 * (tests/transport-documents.test.mjs).
 *
 * Money rules
 * - Line amount = qty x unit rate (never negative).
 * - Discount comes off the subtotal (never more than the subtotal).
 * - Tax is a % of the amount after discount.
 * - Security deposit is refundable, so it is shown separately and is NOT part
 *   of the total or the balance.
 * - Balance = total - payments received (never below 0).
 */

export const DOCUMENT_KINDS = ['quotation', 'invoice']

export const LINE_TYPES = [
  { id: 'vehicle', label: 'Vehicle rental', unit: 'day' },
  { id: 'driver', label: 'Driver charges', unit: 'day' },
  { id: 'fuel', label: 'Fuel', unit: 'litre' },
  { id: 'distance', label: 'Distance (per km)', unit: 'km' },
  { id: 'toll', label: 'Toll & parking', unit: 'trip' },
  { id: 'night', label: 'Night stay / driver allowance', unit: 'night' },
  { id: 'custom', label: 'Other charge', unit: 'item' },
]

export const TRIP_TYPES = [
  { id: 'self_drive', label: 'Self-drive rental' },
  { id: 'with_driver', label: 'Rental with driver' },
  { id: 'point_to_point', label: 'Point-to-point trip' },
  { id: 'tour', label: 'Tour / multi-day trip' },
  { id: 'monthly', label: 'Monthly / corporate contract' },
  { id: 'goods', label: 'Goods transport' },
]

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']
export const INVOICE_STATUSES = ['unpaid', 'partial', 'paid', 'overdue', 'void']

const money = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}
const round2 = (value) => Math.round(value * 100) / 100

export function todayIso(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function addDaysIso(iso, days) {
  const date = new Date(`${iso || todayIso()}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + Number(days || 0))
  return todayIso(date)
}

/** Rental units between two dates for a rate type (min 1). Dates may include a time. */
export function unitsBetween(start, end, rateType = 'daily') {
  const a = new Date(start)
  const b = new Date(end)
  if (!start || !end || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 1
  const hours = (b.getTime() - a.getTime()) / 3600000
  if (rateType === 'hourly') return Math.max(1, Math.ceil(hours))
  const days = Math.max(1, Math.ceil(hours / 24))
  if (rateType === 'weekly') return Math.max(1, Math.ceil(days / 7))
  if (rateType === 'monthly') return Math.max(1, Math.ceil(days / 30))
  return days
}

export function lineAmount(line = {}) {
  return round2(money(line.qty) * money(line.unitRate))
}

/** Totals for a quotation or invoice. */
export function computeDocumentTotals({ lines = [], discount = 0, discountType = 'amount', taxRate = 0, securityDeposit = 0, payments = [] } = {}) {
  const rows = Array.isArray(lines) ? lines : []
  const subtotal = round2(rows.reduce((sum, line) => sum + lineAmount(line), 0))
  const rawDiscount = discountType === 'percent' ? (subtotal * Math.min(100, money(discount))) / 100 : money(discount)
  const discountApplied = round2(Math.min(subtotal, rawDiscount))
  const taxable = round2(subtotal - discountApplied)
  const tax = round2((taxable * money(taxRate)) / 100)
  const total = round2(taxable + tax)
  const paid = round2((Array.isArray(payments) ? payments : []).reduce((sum, payment) => sum + money(payment.amount), 0))
  const appliedPaid = Math.min(total, paid)
  return {
    subtotal,
    discount: discountApplied,
    taxable,
    tax,
    total,
    paid: appliedPaid,
    balance: round2(Math.max(0, total - appliedPaid)),
    securityDeposit: money(securityDeposit),
  }
}

/** Next number like QT-1001 / INV-1001 for the given kind. */
export function nextDocumentNumber(documents = [], kind = 'invoice') {
  const prefix = kind === 'quotation' ? 'QT-' : 'TINV-'
  const max = documents
    .filter((doc) => doc.kind === kind)
    .map((doc) => Number(String(doc.number || '').replace(/[^0-9]/g, '')))
    .filter(Number.isFinite)
    .reduce((top, value) => Math.max(top, value), 1000)
  return `${prefix}${max + 1}`
}

/**
 * Status shown to the user. Quotes past their valid-until date become "expired"
 * (unless already accepted/rejected/converted); unpaid invoices past the due
 * date become "overdue".
 */
export function effectiveStatus(doc = {}, { today = todayIso(), totals } = {}) {
  if (doc.kind === 'quotation') {
    const status = QUOTE_STATUSES.includes(doc.status) ? doc.status : 'draft'
    if ((status === 'draft' || status === 'sent') && doc.validUntil && doc.validUntil < today) return 'expired'
    return status
  }
  if (doc.status === 'void') return 'void'
  const t = totals || computeDocumentTotals(doc)
  if (t.total > 0 && t.balance <= 0) return 'paid'
  if (doc.dueDate && doc.dueDate < today) return 'overdue'
  return t.paid > 0 ? 'partial' : 'unpaid'
}

/** Numbers for the Fleet Dashboard and the documents page header. */
export function summarizeDocuments(documents = [], { today = todayIso() } = {}) {
  const out = {
    quotes: 0, openQuotes: 0, openQuoteValue: 0, acceptedQuotes: 0, convertedQuotes: 0, decidedQuotes: 0, conversionRate: 0,
    invoices: 0, invoiced: 0, collected: 0, outstanding: 0, overdue: 0, overdueAmount: 0, standaloneOutstanding: 0,
  }
  documents.forEach((doc) => {
    const totals = doc.totalsOverride || computeDocumentTotals(doc)
    const status = effectiveStatus(doc, { today, totals })
    if (doc.kind === 'quotation') {
      out.quotes += 1
      if (status === 'draft' || status === 'sent') { out.openQuotes += 1; out.openQuoteValue += totals.total }
      if (status === 'accepted') out.acceptedQuotes += 1
      if (status === 'converted') out.convertedQuotes += 1
      if (['accepted', 'converted', 'rejected', 'expired'].includes(status)) out.decidedQuotes += 1
      return
    }
    if (status === 'void') return
    out.invoices += 1
    out.invoiced += totals.total
    out.collected += totals.paid
    out.outstanding += totals.balance
    if (!doc.bookingNumber) out.standaloneOutstanding += totals.balance
    if (status === 'overdue') { out.overdue += 1; out.overdueAmount += totals.balance }
  })
  const won = out.acceptedQuotes + out.convertedQuotes
  out.conversionRate = out.decidedQuotes ? Math.round((won / out.decidedQuotes) * 100) : 0
  Object.keys(out).forEach((key) => { out[key] = round2(out[key]) })
  return out
}

/** Invoice / quote lines from a rental booking (same numbers as the booking). */
export function linesFromBooking(booking = {}) {
  const totals = booking.totals || {}
  const units = Math.max(1, Number(booking.units) || 1)
  const unitLabel = booking.rateType === 'hourly' ? 'hour' : booking.rateType === 'weekly' ? 'week' : 'day'
  const lines = [{
    id: 'l1',
    type: 'vehicle',
    description: `${booking.vehicleName || 'Vehicle'}${booking.vehicleRegistration ? ` (${booking.vehicleRegistration})` : ''} - ${booking.rateType || 'daily'} rental`,
    vehicleId: booking.vehicleId || '',
    qty: units,
    unit: unitLabel,
    unitRate: money(booking.unitRate),
  }]
  if (booking.withDriver && money(booking.driverRate) > 0) {
    lines.push({ id: 'l2', type: 'driver', description: `Driver${booking.driverName ? `: ${booking.driverName}` : ''}`, qty: units, unit: unitLabel, unitRate: money(booking.driverRate) })
  }
  if (money(totals.extras ?? booking.extraCharges) > 0) {
    lines.push({ id: 'l3', type: 'custom', description: 'Extra charges', qty: 1, unit: 'item', unitRate: money(totals.extras ?? booking.extraCharges) })
  }
  return lines
}
