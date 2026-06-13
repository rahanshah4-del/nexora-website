export function safeMoney(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

export function formatTransportCurrency(value) {
  return `PKR ${Math.round(safeMoney(value)).toLocaleString('en-PK')}`
}

export function safeSignedMoney(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function isTransportRefundPayment(payment = {}) {
  return String(payment.type || '').toLowerCase() === 'refund'
}

export function getTransportPaymentSignedAmount(payment = {}) {
  const amount = safeMoney(payment.amount)
  return isTransportRefundPayment(payment) ? -amount : amount
}

export function formatTransportSignedCurrency(value) {
  const amount = safeSignedMoney(value)
  const prefix = amount < 0 ? '-PKR ' : 'PKR '
  return `${prefix}${Math.round(Math.abs(amount)).toLocaleString('en-PK')}`
}

export function buildTransportFinanceSummary({ bookings = [], payments = [] } = {}) {
  const cancelledBookingNumbers = new Set(
    bookings
      .filter((booking) => String(booking.status || '').toLowerCase() === 'cancelled')
      .map((booking) => booking.bookingNumber)
      .filter(Boolean),
  )
  const activePayments = payments.filter((payment) => !cancelledBookingNumbers.has(payment.bookingNumber))
  const cancelledPayments = payments.filter((payment) => cancelledBookingNumbers.has(payment.bookingNumber))
  const activeBookings = bookings.filter((booking) => String(booking.status || '').toLowerCase() !== 'cancelled')
  const cancelledBookings = bookings.filter((booking) => String(booking.status || '').toLowerCase() === 'cancelled')
  const grossCollected = activePayments
    .filter((payment) => !isTransportRefundPayment(payment))
    .reduce((sum, payment) => sum + safeMoney(payment.amount), 0)
  const activeRefunds = activePayments
    .filter((payment) => isTransportRefundPayment(payment))
    .reduce((sum, payment) => sum + safeMoney(payment.amount), 0)
  const cancelledRefunds = cancelledPayments
    .filter((payment) => isTransportRefundPayment(payment))
    .reduce((sum, payment) => sum + safeMoney(payment.amount), 0)
  const totalRefunds = activeRefunds + cancelledRefunds
  return {
    activePayments,
    cancelledPayments,
    activeBookings,
    cancelledBookings,
    grossCollected,
    activeRefunds,
    cancelledRefunds,
    totalRefunds,
    netCollected: Math.max(0, grossCollected - activeRefunds),
    activeBookingValue: activeBookings.reduce((sum, booking) => sum + safeMoney(booking.total), 0),
    cancelledBookingValue: cancelledBookings.reduce((sum, booking) => sum + safeMoney(booking.total), 0),
    paidAmount: activeBookings.reduce((sum, booking) => sum + safeMoney(booking.advancePaid), 0),
    outstandingDues: activeBookings.reduce((sum, booking) => sum + safeMoney(booking.dueAmount), 0),
    cancelledPaidAmount: cancelledBookings.reduce((sum, booking) => sum + safeMoney(booking.advancePaid), 0),
  }
}

export function normalizeRateType(value) {
  const type = String(value || 'daily').toLowerCase()
  if (['hourly', 'daily', 'weekly'].includes(type)) return type
  return 'daily'
}

// Inclusive day count between two ISO date strings (minimum 1 unit).
export function computeRentalDays(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) return 1
  const start = new Date(pickupDate)
  const end = new Date(returnDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000)
  return Math.max(1, diff)
}

export function rentalUnitsFor(rateType, pickupDate, returnDate) {
  const type = normalizeRateType(rateType)
  const days = computeRentalDays(pickupDate, returnDate)
  if (type === 'weekly') return Math.max(1, Math.ceil(days / 7))
  if (type === 'hourly') return Math.max(1, days * 24)
  return days
}

// Resolve the unit rate for a vehicle based on the chosen rate type.
export function unitRateForVehicle(vehicle = {}, rateType = 'daily') {
  const type = normalizeRateType(rateType)
  if (type === 'weekly') return safeMoney(vehicle.weeklyRate || vehicle.dailyRate * 7)
  if (type === 'hourly') return safeMoney(vehicle.hourlyRate || (vehicle.dailyRate ? vehicle.dailyRate / 24 : 0))
  return safeMoney(vehicle.dailyRate)
}

export function computeBookingTotals({
  unitRate = 0,
  units = 1,
  extraCharges = 0,
  driverRate = 0,
  discount = 0,
  securityDeposit = 0,
  taxRate = 0,
  advancePaid = 0,
} = {}) {
  const safeUnits = Math.max(1, Number(units) || 1)
  const base = safeMoney(unitRate) * safeUnits
  const extras = safeMoney(extraCharges)
  const driverCharges = safeMoney(driverRate) * safeUnits
  const grossBeforeDiscount = base + extras + driverCharges
  const appliedDiscount = Math.min(grossBeforeDiscount, safeMoney(discount))
  const netSubtotal = Math.max(0, grossBeforeDiscount - appliedDiscount)
  const tax = (netSubtotal * safeMoney(taxRate)) / 100
  const total = Math.max(0, netSubtotal + tax)
  const advance = Math.min(total, safeMoney(advancePaid))
  const dueAmount = Math.max(0, total - advance)
  return {
    units: safeUnits,
    base,
    extras,
    driverCharges,
    discount: appliedDiscount,
    netSubtotal,
    tax,
    securityDeposit: safeMoney(securityDeposit),
    total,
    advancePaid: advance,
    dueAmount,
  }
}
