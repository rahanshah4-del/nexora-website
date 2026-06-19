export function safeMoney(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

export function safeNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
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

export function buildTransportReport({ vehicles = [], bookings = [], customers = [], payments = [] } = {}) {
  const bookingRows = Array.isArray(bookings) ? bookings : []
  const vehicleSource = Array.isArray(vehicles) ? vehicles : []
  const customerSource = Array.isArray(customers) ? customers : []
  const paymentRows = Array.isArray(payments) ? payments : []
  const activeBookings = bookingRows.filter((booking) => booking.status === 'active')
  const reservedBookings = bookingRows.filter((booking) => booking.status === 'reserved')
  const returnedBookings = bookingRows.filter((booking) => booking.status === 'returned')
  const cancelledBookings = bookingRows.filter((booking) => booking.status === 'cancelled')
  const finance = buildTransportFinanceSummary({ bookings: bookingRows, payments: paymentRows })
  const liveBookings = finance.activeBookings
  const securityDeposits = liveBookings.reduce((sum, booking) => sum + safeMoney(booking.securityDeposit), 0)
  const driverCharges = liveBookings.reduce((sum, booking) => sum + safeMoney(booking.totals?.driverCharges || safeMoney(booking.driverRate) * safeNumber(booking.units)), 0)
  const methodRows = Object.values(finance.activePayments.filter((payment) => !isTransportRefundPayment(payment)).reduce((map, payment) => {
    const method = payment.method || 'Cash'
    map[method] = map[method] || { method, count: 0, amount: 0 }
    map[method].count += 1
    map[method].amount += safeMoney(payment.amount)
    return map
  }, {})).sort((a, b) => b.amount - a.amount)
  const refundRows = paymentRows.filter((payment) => isTransportRefundPayment(payment))
  const cancelledRows = cancelledBookings.map((booking) => ({
    ...booking,
    refundAmount: safeMoney(booking.refundAmount),
    refundMethod: booking.refundMethod || refundRows.find((payment) => payment.bookingNumber === booking.bookingNumber)?.method || '',
  }))
  const vehicleRows = vehicleSource.map((vehicle) => {
    const vehicleBookings = bookingRows.filter((booking) => booking.vehicleId === vehicle.id && booking.status !== 'cancelled')
    return {
      ...vehicle,
      bookings: vehicleBookings.length,
      revenue: vehicleBookings.reduce((sum, booking) => sum + safeMoney(booking.total), 0),
      due: vehicleBookings.reduce((sum, booking) => sum + safeMoney(booking.dueAmount), 0),
    }
  }).sort((a, b) => b.revenue - a.revenue)
  const customerRows = customerSource.map((customer) => ({
    ...customer,
    due: safeMoney(customer.creditBalance),
    paid: safeMoney(customer.paidAmount),
    bookings: Array.isArray(customer.bookingHistory) ? customer.bookingHistory.length : 0,
  })).sort((a, b) => b.due - a.due)

  return {
    totalVehicles: vehicleSource.length,
    availableVehicles: vehicleSource.filter((vehicle) => vehicle.status === 'available').length,
    rentedVehicles: vehicleSource.filter((vehicle) => vehicle.status === 'rented').length,
    reservedVehicles: vehicleSource.filter((vehicle) => vehicle.status === 'reserved').length,
    maintenanceVehicles: vehicleSource.filter((vehicle) => vehicle.status === 'maintenance').length,
    totalBookings: bookingRows.length,
    activeBookings: activeBookings.length,
    reservedBookings: reservedBookings.length,
    returnedBookings: returnedBookings.length,
    cancelledBookings: cancelledBookings.length,
    liveBookings: liveBookings.length,
    totalCustomers: customerSource.length,
    dueCustomers: customerRows.filter((customer) => customer.due > 0).length,
    totalRevenue: finance.netCollected,
    bookingRevenue: finance.activeBookingValue,
    paidAmount: finance.paidAmount,
    outstandingDues: finance.outstandingDues,
    grossCollected: finance.grossCollected,
    totalRefunds: finance.totalRefunds,
    activeRefunds: finance.activeRefunds,
    cancelledRefunds: finance.cancelledRefunds,
    cancelledBookingValue: finance.cancelledBookingValue,
    cancelledPaidAmount: finance.cancelledPaidAmount,
    securityDeposits,
    driverCharges,
    utilization: vehicleSource.length ? Math.round(((activeBookings.length + reservedBookings.length) / vehicleSource.length) * 100) : 0,
    methodRows,
    vehicleRows,
    customerRows,
    bookingRows,
    paymentRows,
    activePaymentRows: finance.activePayments,
    refundRows,
    cancelledRows,
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
