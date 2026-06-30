import { computeBookingTotals, normalizeRateType, rentalUnitsFor, safeMoney } from '../lib/transportCalculations.js'
import { loadTransportVehicles, saveTransportVehicles } from './transportVehicles.js'
import { notifyLocalDataChanged } from '../lib/localDataEvents.js'

export const transportBookingsStorageKey = 'nexora.transport.bookings.v1'

export const bookingStatuses = ['reserved', 'active', 'returned', 'cancelled']

function readStoredBookings() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(transportBookingsStorageKey)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadTransportBookings() {
  return readStoredBookings().map((booking) => normalizeTransportBooking(booking)).filter((booking) => booking.bookingNumber)
}

export function saveTransportBookings(bookings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(transportBookingsStorageKey, JSON.stringify(Array.isArray(bookings) ? bookings : []))
  notifyLocalDataChanged(transportBookingsStorageKey)
}

export function getNextBookingNumber(bookings = loadTransportBookings()) {
  const numbers = bookings
    .map((booking) => Number(String(booking.bookingNumber || '').replace(/[^0-9]/g, '')))
    .filter((value) => Number.isFinite(value))
  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1
  return `#B${next}`
}

export function normalizeTransportBooking(booking = {}) {
  const rateType = normalizeRateType(booking.rateType)
  const status = bookingStatuses.includes(booking.status) ? booking.status : 'reserved'
  const refundAmount = safeMoney(booking.refundAmount)
  const rawAdvancePaid = safeMoney(booking.advancePaid)
  const isLegacyCancelledRefund = status === 'cancelled'
    && refundAmount > 0
    && String(booking.paymentStatus || '').toLowerCase() !== 'refunded'
  const effectiveAdvancePaid = isLegacyCancelledRefund
    ? Math.max(0, rawAdvancePaid - refundAmount)
    : rawAdvancePaid
  const units = booking.units != null
    ? Math.max(1, Number(booking.units) || 1)
    : rentalUnitsFor(rateType, booking.pickupDate, booking.returnDate)
  const totals = computeBookingTotals({
    unitRate: booking.unitRate,
    units,
    extraCharges: booking.extraCharges,
    driverRate: booking.withDriver ? booking.driverRate : 0,
    discount: booking.discount,
    securityDeposit: booking.securityDeposit,
    taxRate: booking.taxRate,
    advancePaid: effectiveAdvancePaid,
  })
  const paymentStatus = String(
    status === 'cancelled'
      ? (refundAmount > 0 ? 'refunded' : 'cancelled')
      : booking.paymentStatus || (totals.dueAmount > 0 ? (totals.advancePaid > 0 ? 'partial' : 'due') : 'paid'),
  ).toLowerCase()
  const createdAt = booking.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  return {
    id: booking.id || `BOOK-${String(booking.bookingNumber || '').replace(/[^0-9]/g, '')}`,
    bookingNumber: booking.bookingNumber || '',
    vehicleId: booking.vehicleId || '',
    vehicleName: booking.vehicleName || '',
    vehicleRegistration: booking.vehicleRegistration || '',
    customerId: booking.customerId || 'tcust-walkin',
    customer: booking.customer || 'Walk-in Customer',
    phone: booking.phone || '',
    rateType,
    unitRate: safeMoney(booking.unitRate),
    units,
    pickupDate: booking.pickupDate || '',
    returnDate: booking.returnDate || '',
    extraCharges: safeMoney(booking.extraCharges),
    discount: safeMoney(booking.discount),
    taxRate: safeMoney(booking.taxRate),
    withDriver: Boolean(booking.withDriver),
    driverName: booking.driverName || '',
    driverPhone: booking.driverPhone || '',
    driverLicense: booking.driverLicense || '',
    driverRate: booking.withDriver ? safeMoney(booking.driverRate) : 0,
    status,
    paymentStatus,
    paymentMethod: booking.paymentMethod || 'Cash',
    notes: booking.notes || '',
    cancelReason: booking.cancelReason || '',
    cancelledAt: booking.cancelledAt || '',
    refundAmount,
    cancellationFine: status === 'cancelled'
      ? Math.max(safeMoney(booking.cancellationFine), totals.advancePaid)
      : safeMoney(booking.cancellationFine),
    refundMethod: booking.refundMethod || '',
    refundedAt: booking.refundedAt || '',
    totals,
    total: totals.total,
    advancePaid: totals.advancePaid,
    dueAmount: status === 'cancelled' ? 0 : totals.dueAmount,
    securityDeposit: totals.securityDeposit,
    createdAt,
    date: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toISOString().slice(0, 10),
    time: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function upsertTransportBooking(booking) {
  if (!booking?.bookingNumber) return loadTransportBookings()
  const bookings = loadTransportBookings()
  const nextBooking = normalizeTransportBooking(booking)
  const exists = bookings.some((row) => row.bookingNumber === nextBooking.bookingNumber)
  const nextBookings = exists
    ? bookings.map((row) => (row.bookingNumber === nextBooking.bookingNumber ? { ...row, ...nextBooking } : row))
    : [nextBooking, ...bookings]
  saveTransportBookings(nextBookings)
  return nextBookings
}

export function updateBookingStatus(bookingNumber, status) {
  const nextStatus = bookingStatuses.includes(status) ? status : 'reserved'
  const nextBookings = loadTransportBookings().map((booking) =>
    booking.bookingNumber === bookingNumber ? { ...booking, status: nextStatus } : booking,
  )
  saveTransportBookings(nextBookings)
  return nextBookings
}

// Keep fleet vehicle statuses in sync with their bookings. A vehicle tied to a
// reserved/active booking is rented; otherwise it is freed. This prevents a
// vehicle from being stuck "rented" after a booking is returned or cancelled.
export function syncVehiclesWithBookings() {
  const bookings = loadTransportBookings()
  const occupiedByVehicle = new Map()
  bookings.forEach((booking) => {
    if (!booking.vehicleId) return
    if (booking.status === 'active' || booking.status === 'reserved') {
      occupiedByVehicle.set(booking.vehicleId, booking.status)
    }
  })
  const vehicles = loadTransportVehicles()
  const nextVehicles = vehicles.map((vehicle) => {
    if (vehicle.status === 'maintenance') return vehicle
    const occupied = occupiedByVehicle.get(vehicle.id)
    if (occupied === 'active') return { ...vehicle, status: 'rented' }
    if (occupied === 'reserved') return { ...vehicle, status: 'reserved' }
    return { ...vehicle, status: 'available' }
  })
  saveTransportVehicles(nextVehicles)
  return nextVehicles
}
