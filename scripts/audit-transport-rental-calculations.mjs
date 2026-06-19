import assert from 'node:assert/strict'
import {
  buildTransportFinanceSummary,
  buildTransportReport,
  computeBookingTotals,
  computeRentalDays,
  getTransportPaymentSignedAmount,
  isTransportRefundPayment,
  rentalUnitsFor,
} from '../src/crm/lib/transportCalculations.js'
import { normalizeTransportBooking } from '../src/crm/data/transportBookings.js'
import { normalizeTransportPayment } from '../src/crm/data/transportPayments.js'
import { normalizeTransportCustomer } from '../src/crm/data/transportCustomers.js'
import { normalizeTransportVehicle } from '../src/crm/data/transportVehicles.js'

function closeTo(actual, expected, label) {
  assert.equal(Math.round(Number(actual) * 100) / 100, expected, label)
}

assert.equal(computeRentalDays('2026-06-01', '2026-06-03'), 2, 'exclusive rental day count')
assert.equal(computeRentalDays('2026-06-01', '2026-06-01'), 1, 'same day minimum rental')
assert.equal(rentalUnitsFor('weekly', '2026-06-01', '2026-06-15'), 2, 'weekly unit rounding')
assert.equal(rentalUnitsFor('hourly', '2026-06-01', '2026-06-03'), 48, 'hourly unit conversion')

const totals = computeBookingTotals({
  unitRate: 6000,
  units: 2,
  extraCharges: 1000,
  driverRate: 1500,
  discount: 500,
  securityDeposit: 5000,
  taxRate: 10,
  advancePaid: 8000,
})
closeTo(totals.base, 12000, 'booking base')
closeTo(totals.driverCharges, 3000, 'driver charges')
closeTo(totals.netSubtotal, 15500, 'net subtotal')
closeTo(totals.tax, 1550, 'tax amount')
closeTo(totals.total, 17050, 'booking total')
closeTo(totals.advancePaid, 8000, 'advance paid')
closeTo(totals.dueAmount, 9050, 'due amount')

const vehicles = [
  normalizeTransportVehicle({ id: 'VEH-1', name: 'Toyota Corolla', registration: 'ABC-100', status: 'rented', dailyRate: 6000 }),
  normalizeTransportVehicle({ id: 'VEH-2', name: 'Hiace Van', registration: 'XYZ-200', status: 'available', dailyRate: 12000 }),
  normalizeTransportVehicle({ id: 'VEH-3', name: 'Coaster', registration: 'BUS-300', status: 'maintenance', dailyRate: 18000 }),
]

const activeBooking = normalizeTransportBooking({
  bookingNumber: '#B1001',
  vehicleId: 'VEH-1',
  vehicleName: 'Toyota Corolla',
  vehicleRegistration: 'ABC-100',
  customerId: 'tcust-1',
  customer: 'Ali Renter',
  rateType: 'daily',
  unitRate: 6000,
  units: 2,
  pickupDate: '2026-06-19',
  returnDate: '2026-06-21',
  extraCharges: 1000,
  withDriver: true,
  driverRate: 1500,
  discount: 500,
  securityDeposit: 5000,
  taxRate: 10,
  advancePaid: 8000,
  status: 'active',
  paymentMethod: 'Cash',
  createdAt: '2026-06-19T09:00:00.000Z',
})

const reservedBooking = normalizeTransportBooking({
  bookingNumber: '#B1002',
  vehicleId: 'VEH-2',
  vehicleName: 'Hiace Van',
  vehicleRegistration: 'XYZ-200',
  customerId: 'tcust-2',
  customer: 'Sara Tours',
  rateType: 'daily',
  unitRate: 12000,
  units: 1,
  pickupDate: '2026-06-20',
  returnDate: '2026-06-21',
  extraCharges: 0,
  withDriver: false,
  discount: 0,
  securityDeposit: 8000,
  taxRate: 0,
  advancePaid: 2000,
  status: 'reserved',
  paymentMethod: 'Card',
  createdAt: '2026-06-19T10:00:00.000Z',
})

const returnedBooking = normalizeTransportBooking({
  bookingNumber: '#B1003',
  vehicleId: 'VEH-1',
  vehicleName: 'Toyota Corolla',
  vehicleRegistration: 'ABC-100',
  customerId: 'tcust-1',
  customer: 'Ali Renter',
  rateType: 'daily',
  unitRate: 6000,
  units: 1,
  advancePaid: 6000,
  status: 'returned',
  paymentMethod: 'Cash',
  createdAt: '2026-06-18T10:00:00.000Z',
})

const cancelledBooking = normalizeTransportBooking({
  bookingNumber: '#B1004',
  vehicleId: 'VEH-2',
  vehicleName: 'Hiace Van',
  vehicleRegistration: 'XYZ-200',
  customerId: 'tcust-2',
  customer: 'Sara Tours',
  unitRate: 12000,
  units: 1,
  advancePaid: 4000,
  status: 'cancelled',
  refundAmount: 3000,
  paymentStatus: 'refunded',
  refundMethod: 'Cash',
  createdAt: '2026-06-18T11:00:00.000Z',
})

const bookings = [activeBooking, reservedBooking, returnedBooking, cancelledBooking]
const payments = [
  normalizeTransportPayment({ id: 'TPAY-1', bookingNumber: '#B1001', customerId: 'tcust-1', customer: 'Ali Renter', amount: 8000, method: 'Cash', type: 'advance', createdAt: '2026-06-19T09:10:00.000Z' }),
  normalizeTransportPayment({ id: 'TPAY-2', bookingNumber: '#B1002', customerId: 'tcust-2', customer: 'Sara Tours', amount: 2000, method: 'Card', type: 'advance', createdAt: '2026-06-19T10:10:00.000Z' }),
  normalizeTransportPayment({ id: 'TPAY-3', bookingNumber: '#B1003', customerId: 'tcust-1', customer: 'Ali Renter', amount: 6000, method: 'Cash', type: 'rental', createdAt: '2026-06-18T10:10:00.000Z' }),
  normalizeTransportPayment({ id: 'TPAY-4', bookingNumber: '#B1004', customerId: 'tcust-2', customer: 'Sara Tours', amount: 4000, method: 'Cash', type: 'advance', createdAt: '2026-06-18T11:10:00.000Z' }),
  normalizeTransportPayment({ id: 'TPAY-5', bookingNumber: '#B1004', customerId: 'tcust-2', customer: 'Sara Tours', amount: 3000, method: 'Cash', type: 'refund', createdAt: '2026-06-18T12:10:00.000Z' }),
]
const customers = [
  normalizeTransportCustomer({ id: 'tcust-1', name: 'Ali Renter', creditBalance: 9050, paidAmount: 14000, bookingHistory: [{ bookingNumber: '#B1001' }, { bookingNumber: '#B1003' }] }),
  normalizeTransportCustomer({ id: 'tcust-2', name: 'Sara Tours', creditBalance: 10000, paidAmount: 2000, bookingHistory: [{ bookingNumber: '#B1002' }] }),
]

assert.equal(isTransportRefundPayment(payments[4]), true, 'refund payment detected')
closeTo(getTransportPaymentSignedAmount(payments[4]), -3000, 'refund signed amount')

const finance = buildTransportFinanceSummary({ bookings, payments })
closeTo(finance.grossCollected, 16000, 'gross active collected excludes cancelled payment')
closeTo(finance.activeRefunds, 0, 'active refunds')
closeTo(finance.cancelledRefunds, 3000, 'cancelled refunds')
closeTo(finance.totalRefunds, 3000, 'total refunds')
closeTo(finance.netCollected, 16000, 'net collected excludes cancelled booking and cancelled refund from revenue')
closeTo(finance.activeBookingValue, 35050, 'active booking value excludes cancelled')
closeTo(finance.cancelledBookingValue, 12000, 'cancelled booking value tracked separately')
closeTo(finance.paidAmount, 16000, 'paid amount excludes cancelled booking')
closeTo(finance.outstandingDues, 19050, 'outstanding dues excludes cancelled booking')

const report = buildTransportReport({ vehicles, bookings, customers, payments })
assert.equal(report.totalVehicles, 3, 'vehicle count')
assert.equal(report.availableVehicles, 1, 'available vehicles')
assert.equal(report.rentedVehicles, 1, 'rented vehicles')
assert.equal(report.maintenanceVehicles, 1, 'maintenance vehicles')
assert.equal(report.activeBookings, 1, 'active booking count')
assert.equal(report.reservedBookings, 1, 'reserved booking count')
assert.equal(report.returnedBookings, 1, 'returned booking count')
assert.equal(report.cancelledBookings, 1, 'cancelled booking count')
closeTo(report.totalRevenue, 16000, 'report net revenue')
closeTo(report.bookingRevenue, 35050, 'report booking revenue')
closeTo(report.outstandingDues, 19050, 'report outstanding dues')
closeTo(report.securityDeposits, 13000, 'security deposits from live bookings')
closeTo(report.driverCharges, 3000, 'driver charges from live bookings')
assert.equal(report.utilization, 67, 'fleet utilization active plus reserved')
assert.equal(report.methodRows[0].method, 'Cash', 'top payment method')
closeTo(report.methodRows[0].amount, 14000, 'top payment amount')
assert.equal(report.cancelledRows.length, 1, 'cancelled rows')
closeTo(report.cancelledRows[0].refundAmount, 3000, 'cancelled refund amount')
assert.equal(report.vehicleRows[0].id, 'VEH-1', 'top revenue vehicle')
closeTo(report.vehicleRows[0].revenue, 23050, 'vehicle revenue excludes cancelled')
assert.equal(report.customerRows[0].name, 'Sara Tours', 'customer rows sorted by due')

console.log('Transport / Rental calculation audit passed')
console.table({
  totalRevenue: report.totalRevenue,
  bookingRevenue: report.bookingRevenue,
  paidAmount: report.paidAmount,
  outstandingDues: report.outstandingDues,
  totalRefunds: report.totalRefunds,
  securityDeposits: report.securityDeposits,
  driverCharges: report.driverCharges,
  utilization: report.utilization,
})
