/**
 * Transport / Rental quotations and invoices (stored per workspace + user like
 * the other transport data) and how they touch the books.
 *
 * Accounting rules, so nothing is counted twice:
 * - A quotation never touches the books.
 * - An invoice made FROM a booking is a view of that booking: its total, paid
 *   and balance are the booking's, and a payment taken on it is recorded
 *   exactly like a booking payment (booking advance, payments list, ledger).
 * - A stand-alone invoice (trip, charter, extra services) adds its total to the
 *   customer's ledger when it is issued; each payment is recorded in Rental
 *   Payments (so Fleet Dashboard revenue includes it) and reduces the ledger.
 * - Editing a stand-alone invoice moves the ledger by the difference only.
 * - Voiding is allowed only before any payment and removes the ledger amount.
 */
import { computeDocumentTotals, nextDocumentNumber, todayIso, addDaysIso, linesFromBooking } from '../lib/transportDocuments.js'
import { safeMoney } from '../lib/transportCalculations.js'
import { migrateKey, notifyLocalDataChanged, scopedKey } from '../lib/localDataEvents.js'
import { loadTransportBookings, upsertTransportBooking, getNextBookingNumber, syncVehiclesWithBookings } from './transportBookings.js'
import { loadTransportCustomers, saveTransportCustomers, applyTransportCustomerLedger } from './transportCustomers.js'
import { recordTransportPayment } from './transportPayments.js'

const _BASE = 'nexora.transport.documents.v1'
export const transportDocumentsStorageKey = _BASE

function _key() {
  const k = scopedKey(_BASE)
  if (k !== _BASE) migrateKey(_BASE, k)
  return k
}

function readStored() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(_key()) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const newId = () => `tdoc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function normalizeTransportDocument(doc = {}) {
  const kind = doc.kind === 'quotation' ? 'quotation' : 'invoice'
  const issueDate = doc.issueDate || todayIso()
  return {
    id: doc.id || newId(),
    kind,
    number: doc.number || '',
    status: doc.status || (kind === 'quotation' ? 'draft' : 'unpaid'),
    customerId: doc.customerId || 'tcust-walkin',
    customer: doc.customer || 'Walk-in Customer',
    phone: doc.phone || '',
    email: doc.email || '',
    address: doc.address || '',
    cnic: doc.cnic || '',
    tripType: doc.tripType || 'self_drive',
    pickupLocation: doc.pickupLocation || '',
    dropLocation: doc.dropLocation || '',
    startAt: doc.startAt || '',
    endAt: doc.endAt || '',
    vehicleId: doc.vehicleId || '',
    issueDate,
    validUntil: kind === 'quotation' ? (doc.validUntil || addDaysIso(issueDate, 7)) : '',
    dueDate: kind === 'invoice' ? (doc.dueDate || issueDate) : '',
    lines: (Array.isArray(doc.lines) ? doc.lines : []).map((line, index) => ({
      id: line.id || `l${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
      type: line.type || 'custom',
      description: String(line.description || ''),
      vehicleId: line.vehicleId || '',
      rateType: line.rateType || '',
      qty: safeMoney(line.qty === '' ? 0 : line.qty ?? 1),
      unit: line.unit || '',
      unitRate: safeMoney(line.unitRate),
    })),
    discount: safeMoney(doc.discount),
    discountType: doc.discountType === 'percent' ? 'percent' : 'amount',
    taxRate: safeMoney(doc.taxRate),
    taxLabel: doc.taxLabel || 'Tax',
    securityDeposit: safeMoney(doc.securityDeposit),
    payments: Array.isArray(doc.payments) ? doc.payments : [],
    notes: doc.notes || '',
    terms: doc.terms || '',
    bookingNumber: doc.bookingNumber || '',
    sourceQuoteId: doc.sourceQuoteId || '',
    convertedTo: doc.convertedTo || '',
    ledgerPosted: safeMoney(doc.ledgerPosted),
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  }
}

export function loadTransportDocuments() {
  return readStored().map(normalizeTransportDocument).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

function saveAll(docs) {
  if (typeof window === 'undefined') return
  const k = _key()
  window.localStorage.setItem(k, JSON.stringify(docs))
  notifyLocalDataChanged(k)
  if (k !== _BASE) notifyLocalDataChanged(_BASE)
}

/** Live totals. Booking-linked invoices read the booking so both always agree. */
export function documentTotals(doc, bookings = null) {
  const base = computeDocumentTotals(doc)
  if (doc.kind !== 'invoice' || !doc.bookingNumber) return base
  const booking = (bookings || loadTransportBookings()).find((row) => row.bookingNumber === doc.bookingNumber)
  if (!booking) return base
  return {
    ...base,
    total: safeMoney(booking.total),
    paid: safeMoney(booking.advancePaid),
    balance: safeMoney(booking.dueAmount),
    securityDeposit: safeMoney(booking.securityDeposit),
  }
}

function moveLedger(customerId, delta, { number, total, method = 'Cash', note }) {
  if (!delta) return
  const customers = loadTransportCustomers()
  let next
  if (delta > 0) {
    next = applyTransportCustomerLedger(customers, customerId, { bookingNumber: number, total, due: delta, paid: 0, method, note })
  } else {
    next = customers.map((customer) => (customer.id === customerId
      ? { ...customer, creditBalance: Math.max(0, safeMoney(customer.creditBalance) + delta) }
      : customer))
  }
  saveTransportCustomers(next)
}

/** Create or update. Returns the saved document. */
export function saveTransportDocument(input) {
  const docs = loadTransportDocuments()
  const existing = docs.find((row) => row.id === input.id)
  const doc = normalizeTransportDocument({
    ...existing,
    ...input,
    number: input.number || existing?.number || nextDocumentNumber(docs, input.kind),
    updatedAt: new Date().toISOString(),
  })
  // Stand-alone invoice: keep the customer ledger in step with the total.
  if (doc.kind === 'invoice' && !doc.bookingNumber && doc.status !== 'void') {
    const { total } = computeDocumentTotals(doc)
    if (existing && existing.customerId !== doc.customerId) {
      moveLedger(existing.customerId, -existing.ledgerPosted, { number: doc.number, total, note: `Invoice ${doc.number} moved` })
      doc.ledgerPosted = 0
    }
    const delta = Math.round((total - doc.ledgerPosted) * 100) / 100
    moveLedger(doc.customerId, delta, { number: doc.number, total, note: existing ? `Invoice ${doc.number} updated` : `Invoice ${doc.number} issued` })
    doc.ledgerPosted = total
  }
  const next = existing ? docs.map((row) => (row.id === doc.id ? doc : row)) : [doc, ...docs]
  saveAll(next)
  return doc
}

export function setTransportDocumentStatus(id, status) {
  const docs = loadTransportDocuments()
  saveAll(docs.map((row) => (row.id === id ? { ...row, status, updatedAt: new Date().toISOString() } : row)))
}

/** Delete a quotation, or an invoice that has no payments (its ledger amount is removed). */
export function deleteTransportDocument(id) {
  const docs = loadTransportDocuments()
  const doc = docs.find((row) => row.id === id)
  if (!doc) return { ok: false, error: 'Not found.' }
  if (doc.kind === 'invoice' && doc.payments.length) return { ok: false, error: 'This invoice has payments. Void is not possible; record a refund in Rental Payments instead.' }
  if (doc.kind === 'invoice' && !doc.bookingNumber && doc.status !== 'void') moveLedger(doc.customerId, -doc.ledgerPosted, { number: doc.number, total: 0 })
  saveAll(docs.filter((row) => row.id !== id))
  return { ok: true }
}

export function voidTransportInvoice(id) {
  const docs = loadTransportDocuments()
  const doc = docs.find((row) => row.id === id)
  if (!doc || doc.kind !== 'invoice') return { ok: false, error: 'Not found.' }
  if (doc.bookingNumber) return { ok: false, error: 'This invoice belongs to a booking. Cancel the booking instead.' }
  if (doc.payments.length) return { ok: false, error: 'This invoice has payments. Record a refund in Rental Payments instead.' }
  moveLedger(doc.customerId, -doc.ledgerPosted, { number: doc.number, total: 0 })
  saveAll(docs.map((row) => (row.id === id ? { ...row, status: 'void', ledgerPosted: 0, updatedAt: new Date().toISOString() } : row)))
  return { ok: true }
}

/** Take a payment against an invoice. Returns { ok, applied } or { ok:false, error }. */
export function recordTransportDocumentPayment(id, { amount, method = 'Cash', note = '' }) {
  const docs = loadTransportDocuments()
  const doc = docs.find((row) => row.id === id)
  if (!doc || doc.kind !== 'invoice') return { ok: false, error: 'Invoice not found.' }
  if (doc.status === 'void') return { ok: false, error: 'This invoice is void.' }
  const totals = documentTotals(doc)
  const applied = Math.min(safeMoney(amount), totals.balance)
  if (applied <= 0) return { ok: false, error: totals.balance <= 0 ? 'This invoice is already paid.' : 'Enter an amount greater than zero.' }
  const label = note || `Payment on ${doc.number}`

  if (doc.bookingNumber) {
    const booking = loadTransportBookings().find((row) => row.bookingNumber === doc.bookingNumber)
    if (!booking) return { ok: false, error: 'Booking not found.' }
    recordTransportPayment({ bookingNumber: booking.bookingNumber, customerId: booking.customerId, customer: booking.customer, amount: applied, method, type: 'rental', note: label })
    const nextAdvance = Math.min(booking.total, booking.advancePaid + applied)
    upsertTransportBooking({ ...booking, advancePaid: nextAdvance, paymentStatus: nextAdvance >= booking.total ? 'paid' : 'partial' })
    saveTransportCustomers(applyTransportCustomerLedger(loadTransportCustomers(), booking.customerId, { bookingNumber: booking.bookingNumber, total: booking.total, paid: applied, due: 0, method, note: label }))
    syncVehiclesWithBookings()
  } else {
    recordTransportPayment({ bookingNumber: doc.number, customerId: doc.customerId, customer: doc.customer, amount: applied, method, type: 'rental', note: label })
    saveTransportCustomers(applyTransportCustomerLedger(loadTransportCustomers(), doc.customerId, { bookingNumber: doc.number, total: totals.total, paid: applied, due: 0, method, note: label }))
  }
  const payment = { id: `p-${Date.now().toString(36)}`, amount: applied, method, note: label, date: todayIso(), at: new Date().toISOString() }
  saveAll(loadTransportDocuments().map((row) => (row.id === id ? { ...row, payments: [...row.payments, payment], updatedAt: new Date().toISOString() } : row)))
  return { ok: true, applied }
}

/** New invoice built from a booking (no ledger change: the booking already holds it). */
export function invoiceDraftFromBooking(booking) {
  return normalizeTransportDocument({
    kind: 'invoice',
    customerId: booking.customerId,
    customer: booking.customer,
    phone: booking.phone,
    tripType: booking.withDriver ? 'with_driver' : 'self_drive',
    startAt: booking.pickupDate,
    endAt: booking.returnDate,
    vehicleId: booking.vehicleId,
    lines: linesFromBooking(booking),
    discount: booking.discount,
    taxRate: booking.taxRate,
    securityDeposit: booking.securityDeposit,
    bookingNumber: booking.bookingNumber,
    notes: booking.notes || '',
  })
}

/** Quotation -> invoice. The quote is marked converted. */
export function convertQuoteToInvoice(quoteId) {
  const quote = loadTransportDocuments().find((row) => row.id === quoteId)
  if (!quote || quote.kind !== 'quotation') return { ok: false, error: 'Quotation not found.' }
  const rest = { ...quote }
  ;['id', 'number', 'status', 'validUntil', 'payments', 'ledgerPosted', 'createdAt'].forEach((key) => { delete rest[key] })
  const invoice = saveTransportDocument({ ...rest, kind: 'invoice', sourceQuoteId: quote.id, issueDate: todayIso(), dueDate: addDaysIso(todayIso(), 7) })
  saveAll(loadTransportDocuments().map((row) => (row.id === quote.id ? { ...row, status: 'converted', convertedTo: invoice.number } : row)))
  return { ok: true, invoice }
}

/**
 * Quotation -> reserved booking (needs a vehicle line). The booking then owns
 * the accounting, exactly as if it was made on the Bookings page.
 */
export function convertQuoteToBooking(quoteId, vehicles = []) {
  const quote = loadTransportDocuments().find((row) => row.id === quoteId)
  if (!quote || quote.kind !== 'quotation') return { ok: false, error: 'Quotation not found.' }
  const vehicleLine = quote.lines.find((line) => line.type === 'vehicle' && line.vehicleId)
  const vehicle = vehicles.find((row) => row.id === (vehicleLine?.vehicleId || quote.vehicleId))
  if (!vehicleLine || !vehicle) return { ok: false, error: 'Add a vehicle line (pick a vehicle) to turn this quote into a booking.' }
  const driverLine = quote.lines.find((line) => line.type === 'driver')
  const units = Math.max(1, Number(vehicleLine.qty) || 1)
  const extras = quote.lines
    .filter((line) => line !== vehicleLine && line !== driverLine)
    .reduce((sum, line) => sum + safeMoney(line.qty) * safeMoney(line.unitRate), 0)
    + (driverLine && Number(driverLine.qty) !== units ? safeMoney(driverLine.qty) * safeMoney(driverLine.unitRate) : 0)
  const driverRate = driverLine && Number(driverLine.qty) === units ? safeMoney(driverLine.unitRate) : 0
  const { subtotal, discount } = computeDocumentTotals(quote)
  const bookingNumber = getNextBookingNumber()
  const rateType = ['hourly', 'daily', 'weekly'].includes(vehicleLine.rateType) ? vehicleLine.rateType : 'daily'
  const next = upsertTransportBooking({
    bookingNumber,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleRegistration: vehicle.registration,
    customerId: quote.customerId,
    customer: quote.customer,
    phone: quote.phone,
    rateType,
    unitRate: safeMoney(vehicleLine.unitRate),
    units,
    pickupDate: String(quote.startAt || todayIso()).slice(0, 10),
    returnDate: String(quote.endAt || quote.startAt || todayIso()).slice(0, 10),
    extraCharges: extras,
    discount: subtotal ? discount : 0,
    taxRate: quote.taxRate,
    securityDeposit: quote.securityDeposit,
    advancePaid: 0,
    withDriver: driverRate > 0,
    driverRate,
    paymentMethod: 'Cash',
    notes: [`From quotation ${quote.number}`, quote.notes].filter(Boolean).join('\n'),
    status: 'reserved',
  })
  const created = next.find((row) => row.bookingNumber === bookingNumber)
  saveTransportCustomers(applyTransportCustomerLedger(loadTransportCustomers(), quote.customerId, {
    bookingNumber, total: created?.total || 0, paid: 0, due: created?.dueAmount || 0, method: 'Cash', note: `Booking from ${quote.number}`, paidIncludedInDue: true,
  }))
  syncVehiclesWithBookings()
  saveAll(loadTransportDocuments().map((row) => (row.id === quote.id ? { ...row, status: 'converted', convertedTo: bookingNumber } : row)))
  return { ok: true, bookingNumber }
}
