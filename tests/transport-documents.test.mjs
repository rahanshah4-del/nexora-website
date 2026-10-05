import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal browser stand-ins: the transport data layer keeps everything in localStorage.
const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail } }

const lib = await import('../src/crm/lib/transportDocuments.js')
const print = await import('../src/crm/lib/transportDocumentPrint.js')
const docs = await import('../src/crm/data/transportDocuments.js')
const customersData = await import('../src/crm/data/transportCustomers.js')
const paymentsData = await import('../src/crm/data/transportPayments.js')
const bookingsData = await import('../src/crm/data/transportBookings.js')
const vehiclesData = await import('../src/crm/data/transportVehicles.js')

beforeEach(() => store.clear())

test('totals: discount, tax, deposit kept apart, payments reduce the balance', () => {
  const totals = lib.computeDocumentTotals({
    lines: [{ qty: 3, unitRate: 10000 }, { qty: 3, unitRate: 2000 }, { qty: 1, unitRate: 1500 }],
    discount: 10, discountType: 'percent', taxRate: 5, securityDeposit: 20000,
    payments: [{ amount: 5000 }],
  })
  assert.equal(totals.subtotal, 37500)
  assert.equal(totals.discount, 3750)
  assert.equal(totals.tax, 1687.5)
  assert.equal(totals.total, 35437.5)
  assert.equal(totals.balance, 30437.5)
  assert.equal(totals.securityDeposit, 20000)
  // never negative, never more discount than the subtotal, overpayment is capped
  const edge = lib.computeDocumentTotals({ lines: [{ qty: -2, unitRate: 50 }, { qty: 1, unitRate: 100 }], discount: 999, payments: [{ amount: 500 }] })
  assert.equal(edge.subtotal, 100)
  assert.equal(edge.total, 0)
  assert.equal(edge.balance, 0)
})

test('rental units round up per hour, day, week and month', () => {
  assert.equal(lib.unitsBetween('2026-10-01T09:00', '2026-10-01T09:30', 'hourly'), 1)
  assert.equal(lib.unitsBetween('2026-10-01T09:00', '2026-10-03T10:00', 'daily'), 3)
  assert.equal(lib.unitsBetween('2026-10-01T09:00', '2026-10-09T09:00', 'weekly'), 2)
  assert.equal(lib.unitsBetween('', '', 'daily'), 1)
})

test('document numbers continue per kind, statuses follow dates', () => {
  assert.equal(lib.nextDocumentNumber([], 'quotation'), 'QT-1001')
  assert.equal(lib.nextDocumentNumber([{ kind: 'invoice', number: 'TINV-1007' }], 'invoice'), 'TINV-1008')
  assert.equal(lib.effectiveStatus({ kind: 'quotation', status: 'sent', validUntil: '2026-01-01' }, { today: '2026-02-01' }), 'expired')
  assert.equal(lib.effectiveStatus({ kind: 'quotation', status: 'accepted', validUntil: '2026-01-01' }, { today: '2026-02-01' }), 'accepted')
  const inv = { kind: 'invoice', lines: [{ qty: 1, unitRate: 1000 }], dueDate: '2026-01-01', payments: [] }
  assert.equal(lib.effectiveStatus(inv, { today: '2026-02-01' }), 'overdue')
  assert.equal(lib.effectiveStatus({ ...inv, payments: [{ amount: 400 }] }, { today: '2025-12-01' }), 'partial')
  assert.equal(lib.effectiveStatus({ ...inv, payments: [{ amount: 1000 }] }, { today: '2026-02-01' }), 'paid')
})

test('summary: quotes never count as money, booking invoices are not double counted as stand-alone dues', () => {
  const quote = { kind: 'quotation', status: 'sent', validUntil: '2999-01-01', lines: [{ qty: 1, unitRate: 5000 }] }
  const won = { kind: 'quotation', status: 'accepted', validUntil: '2999-01-01', lines: [{ qty: 1, unitRate: 1000 }] }
  const standalone = { kind: 'invoice', dueDate: '2000-01-01', lines: [{ qty: 1, unitRate: 3000 }], payments: [{ amount: 1000 }] }
  const bookingInvoice = { kind: 'invoice', bookingNumber: 'BK-1', dueDate: '2999-01-01', lines: [{ qty: 1, unitRate: 9000 }], payments: [] }
  const out = lib.summarizeDocuments([quote, won, standalone, bookingInvoice])
  assert.equal(out.openQuotes, 1)
  assert.equal(out.openQuoteValue, 5000)
  assert.equal(out.conversionRate, 100)
  assert.equal(out.invoiced, 12000)
  assert.equal(out.collected, 1000)
  assert.equal(out.outstanding, 11000)
  assert.equal(out.standaloneOutstanding, 2000)
  assert.equal(out.overdue, 1)
})

test('stand-alone invoice: ledger follows the total, payments reach Rental Payments, void is blocked after payment', () => {
  const customers = customersData.loadTransportCustomers()
  const customerId = customers[0].id
  const doc = docs.saveTransportDocument({ kind: 'invoice', customerId, customer: 'Test', lines: [{ type: 'custom', description: 'Charter', qty: 1, unit: 'trip', unitRate: 10000 }] })
  assert.match(doc.number, /^TINV-10\d\d$/)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 10000)

  // editing moves the ledger by the difference only
  docs.saveTransportDocument({ ...doc, lines: [{ ...doc.lines[0], unitRate: 12000 }] })
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 12000)

  const paid = docs.recordTransportDocumentPayment(doc.id, { amount: 5000, method: 'Cash' })
  assert.deepEqual([paid.ok, paid.applied], [true, 5000])
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 7000)
  assert.equal(paymentsData.loadTransportPayments().reduce((sum, row) => sum + row.amount, 0), 5000)
  assert.equal(docs.voidTransportInvoice(doc.id).ok, false)

  // over-payment is capped at the balance
  const rest = docs.recordTransportDocumentPayment(doc.id, { amount: 99999 })
  assert.equal(rest.applied, 7000)
  assert.equal(docs.recordTransportDocumentPayment(doc.id, { amount: 1 }).ok, false)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 0)
})

test('void and delete remove the ledger amount', () => {
  const customerId = customersData.loadTransportCustomers()[0].id
  const doc = docs.saveTransportDocument({ kind: 'invoice', customerId, customer: 'T', lines: [{ qty: 1, unitRate: 4000 }] })
  assert.equal(docs.voidTransportInvoice(doc.id).ok, true)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 0)
  const second = docs.saveTransportDocument({ kind: 'invoice', customerId, customer: 'T', lines: [{ qty: 1, unitRate: 2500 }] })
  assert.equal(docs.deleteTransportDocument(second.id).ok, true)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 0)
})

test('quotation does not touch the books; converting makes an invoice once', () => {
  const customerId = customersData.loadTransportCustomers()[0].id
  const quote = docs.saveTransportDocument({ kind: 'quotation', customerId, customer: 'T', lines: [{ qty: 2, unitRate: 3000 }] })
  assert.match(quote.number, /^QT-/)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 0)
  const result = docs.convertQuoteToInvoice(quote.id)
  assert.equal(result.ok, true)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 6000)
  const after = docs.loadTransportDocuments().find((row) => row.id === quote.id)
  assert.equal(after.status, 'converted')
  assert.equal(after.convertedTo, result.invoice.number)
})

test('quotation to booking needs a vehicle and uses the booking for the money', () => {
  const customerId = customersData.loadTransportCustomers()[0].id
  vehiclesData.saveTransportVehicles([vehiclesData.normalizeTransportVehicle({ id: 'v1', name: 'Corolla', registration: 'ABC-123', dailyRate: 8000 })])
  const noVehicle = docs.saveTransportDocument({ kind: 'quotation', customerId, customer: 'T', lines: [{ type: 'custom', qty: 1, unitRate: 1000 }] })
  assert.equal(docs.convertQuoteToBooking(noVehicle.id, vehiclesData.loadTransportVehicles()).ok, false)

  const quote = docs.saveTransportDocument({ kind: 'quotation', customerId, customer: 'T', startAt: '2026-10-01', endAt: '2026-10-03', lines: [{ type: 'vehicle', vehicleId: 'v1', qty: 2, unit: 'day', unitRate: 8000 }] })
  const result = docs.convertQuoteToBooking(quote.id, vehiclesData.loadTransportVehicles())
  assert.equal(result.ok, true)
  const booking = bookingsData.loadTransportBookings().find((row) => row.bookingNumber === result.bookingNumber)
  assert.equal(booking.total, 16000)
  assert.equal(customersData.loadTransportCustomers().find((row) => row.id === customerId).creditBalance, 16000)
})

test('invoice from a booking mirrors the booking and a payment updates the booking', () => {
  const customerId = customersData.loadTransportCustomers()[0].id
  bookingsData.upsertTransportBooking({ bookingNumber: 'BK-9', vehicleId: 'v1', vehicleName: 'Corolla', customerId, customer: 'T', rateType: 'daily', unitRate: 5000, units: 2, advancePaid: 2000, status: 'reserved' })
  const booking = bookingsData.loadTransportBookings().find((row) => row.bookingNumber === 'BK-9')
  const invoice = docs.saveTransportDocument(docs.invoiceDraftFromBooking(booking))
  const totals = docs.documentTotals(invoice)
  assert.equal(totals.total, 10000)
  assert.equal(totals.paid, 2000)
  assert.equal(totals.balance, 8000)
  const result = docs.recordTransportDocumentPayment(invoice.id, { amount: 3000 })
  assert.equal(result.ok, true)
  assert.equal(bookingsData.loadTransportBookings().find((row) => row.bookingNumber === 'BK-9').dueAmount, 5000)
  assert.equal(docs.documentTotals(docs.loadTransportDocuments()[0]).balance, 5000)
})

test('printable document: escapes text, shows deposit apart from the total, plain-text share has the numbers', () => {
  const doc = docs.normalizeTransportDocument({ kind: 'invoice', number: 'TINV-1001', customer: '<b>Ali</b>', securityDeposit: 5000, lines: [{ type: 'vehicle', description: 'Corolla', qty: 2, unit: 'day', unitRate: 8000 }] })
  const totals = lib.computeDocumentTotals(doc)
  const fmt = (value) => `Rs ${value}`
  const html = print.buildTransportDocumentHtml(doc, totals, { businessName: 'Fleet Co' }, fmt, 'Unpaid')
  assert.ok(html.includes('INVOICE') && html.includes('TINV-1001') && html.includes('Fleet Co'))
  assert.ok(!html.includes('<b>Ali</b>') && html.includes('&lt;b&gt;Ali'))
  assert.ok(html.includes('Refundable security deposit') && html.includes('Rs 5000'))
  const text = print.buildTransportDocumentShareText(doc, totals, { businessName: 'Fleet Co' }, fmt)
  assert.ok(text.includes('Total: Rs 16000') && text.includes('Balance: Rs 16000'))
})
