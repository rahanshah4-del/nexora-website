/**
 * Restaurant Reservation & Waitlist — Pure Functions.
 * Zero side effects. No Firebase imports.
 */

// ─── Reservation Statuses ────────────────────────────────────────────────────

export const RESERVATION_STATUSES = [
  { id: 'pending',       label: 'Pending',       color: 'text-amber-600 bg-amber-50',   icon: 'HiOutlineClock' },
  { id: 'confirmed',     label: 'Confirmed',     color: 'text-sky-600 bg-sky-50',        icon: 'HiOutlineCheckCircle' },
  { id: 'seated',        label: 'Seated',        color: 'text-emerald-600 bg-emerald-50',icon: 'HiOutlineUser' },
  { id: 'completed',     label: 'Completed',     color: 'text-emerald-700 bg-emerald-100',icon: 'HiOutlineCheckBadge' },
  { id: 'cancelled',     label: 'Cancelled',     color: 'text-rose-600 bg-rose-50',      icon: 'HiOutlineXCircle' },
  { id: 'no_show',       label: 'No Show',       color: 'text-slate-600 bg-slate-100',   icon: 'HiOutlineUserMinus' },
]

export const RESERVATION_STATUS_TRANSITIONS = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['seated', 'cancelled', 'no_show'],
  seated:     ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
  no_show:    [],
}

export function validReservationTransitions(status) {
  return RESERVATION_STATUS_TRANSITIONS[status] || []
}

export function canReservationTransition(from, to) {
  return validReservationTransitions(from).includes(to)
}

// ─── Waitlist ────────────────────────────────────────────────────────────────

export const WAITLIST_STATUSES = [
  { id: 'waiting',    label: 'Waiting',   color: 'text-amber-600 bg-amber-50' },
  { id: 'notified',   label: 'Notified',  color: 'text-sky-600 bg-sky-50' },
  { id: 'seated',     label: 'Seated',    color: 'text-emerald-600 bg-emerald-50' },
  { id: 'cancelled',  label: 'Cancelled', color: 'text-rose-600 bg-rose-50' },
  { id: 'skipped',    label: 'Skipped',   color: 'text-slate-600 bg-slate-100' },
]

export const WAITLIST_PRIORITIES = [
  { id: 'normal', label: 'Normal', value: 0 },
  { id: 'priority', label: 'Priority', value: 1 },
  { id: 'vip', label: 'VIP', value: 2 },
]

// ─── Table Statuses ──────────────────────────────────────────────────────────

export const TABLE_BOOKING_STATUSES = [
  { id: 'available',  label: 'Available', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'reserved',   label: 'Reserved',  color: 'text-sky-600 bg-sky-50' },
  { id: 'occupied',   label: 'Occupied',  color: 'text-amber-600 bg-amber-50' },
  { id: 'cleaning',   label: 'Cleaning',  color: 'text-indigo-600 bg-indigo-50' },
  { id: 'blocked',    label: 'Blocked',   color: 'text-rose-600 bg-rose-50' },
  { id: 'maintenance',label: 'Maintenance',color: 'text-slate-600 bg-slate-100' },
]

// ─── Conflict Detection ─────────────────────────────────────────────────────

export function hasTableConflict(reservation, existingReservations = []) {
  if (!reservation?.tableId || !reservation?.reservationDate || !reservation?.reservationTime) return false
  if (!['pending', 'confirmed', 'seated'].includes(reservation.status)) return false

  const newDate = String(reservation.reservationDate)
  const newTime = timeToMinutes(reservation.reservationTime)
  const newDuration = Number(reservation.duration || 60)
  const newEnd = newTime + newDuration
  const excludeId = reservation.id || ''

  return existingReservations.some((r) => {
    if (r.id === excludeId) return false
    if (r.tableId !== reservation.tableId) return false
    if (String(r.reservationDate) !== newDate) return false
    if (!['pending', 'confirmed', 'seated'].includes(r.status)) return false
    const rTime = timeToMinutes(r.reservationTime)
    const rDuration = Number(r.duration || 60)
    const rEnd = rTime + rDuration
    return newTime < rEnd && newEnd > rTime
  })
}

export function hasCapacityConflict(adults, children, tableSeats) {
  const totalGuests = Number(adults || 0) + Number(children || 0)
  const seats = Number(tableSeats || 0)
  if (totalGuests <= 0) return false
  return totalGuests > seats
}

export function findAvailableTables(reservations, reservation, tables = []) {
  if (!reservation?.reservationDate || !reservation?.reservationTime) return []
  const date = String(reservation.reservationDate)
  const time = timeToMinutes(reservation.reservationTime)
  const duration = Number(reservation.duration || 60)
  const end = time + duration
  const guests = Number(reservation.adults || 0) + Number(reservation.children || 0)

  const dateReservations = reservations.filter((r) => String(r.reservationDate) === date)

  return tables.filter((table) => {
    if (table.status === 'blocked' || table.status === 'maintenance') return false
    const seats = Number(table.seats || 0)
    if (guests > seats) return false

    return !dateReservations.some((r) => {
      if (r.tableId !== table.id) return false
      if (!['pending', 'confirmed', 'seated'].includes(r.status)) return false
      const rTime = timeToMinutes(r.reservationTime)
      const rDuration = Number(r.duration || 60)
      const rEnd = rTime + rDuration
      return time < rEnd && end > rTime
    })
  })
}

export function recommendTable(reservations, reservation, tables = []) {
  const available = findAvailableTables(reservations, reservation, tables)
  if (available.length === 0) return null
  const guests = Number(reservation.adults || 0) + Number(reservation.children || 0)
  // Best fit: exact seat count, or next size up
  return available.reduce((best, t) => {
    const seats = Number(t.seats || 0)
    const bestSeats = Number(best.seats || 0)
    const bestDiff = bestSeats - guests
    const diff = seats - guests
    if (diff >= 0 && (bestDiff < 0 || diff < bestDiff || (diff === bestDiff && seats < bestSeats))) return t
    return best
  }, available[0])
}

// ─── Duration & Time Helpers ────────────────────────────────────────────────

export function timeToMinutes(time) {
  if (!time) return 0
  const [h, m] = String(time).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(minutes) {
  const m = Math.max(0, Math.round(Number(minutes || 0)))
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function getTimeSlots({ openTime = '09:00', closeTime = '23:00', intervalMinutes = 30, durationMinutes = 60 } = {}) {
  const slots = []
  const open = timeToMinutes(openTime)
  const close = timeToMinutes(closeTime)
  const maxStart = close - durationMinutes
  for (let t = open; t <= maxStart; t += intervalMinutes) {
    slots.push({ time: minutesToTime(t), label: formatTimeLabel(t), endTime: minutesToTime(t + durationMinutes) })
  }
  return slots
}

export function formatTimeLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function defaultDuration(adults, children) {
  const guests = Number(adults || 0) + Number(children || 0)
  if (guests <= 2) return 60
  if (guests <= 4) return 90
  if (guests <= 6) return 120
  return 150
}

// ─── Reservation Analytics ──────────────────────────────────────────────────

export function reservationAnalytics(reservations = []) {
  const list = Array.isArray(reservations) ? reservations : []
  const today = new Date().toISOString().slice(0, 10)
  const todayRes = list.filter((r) => String(r.reservationDate) === today)
  const total = list.length || 1

  return {
    totalReservations: list.length,
    todayReservations: todayRes.length,
    confirmedToday: todayRes.filter((r) => r.status === 'confirmed').length,
    seatedToday: todayRes.filter((r) => r.status === 'seated').length,
    completedToday: todayRes.filter((r) => r.status === 'completed').length,
    cancelledToday: todayRes.filter((r) => r.status === 'cancelled').length,
    noShowToday: todayRes.filter((r) => r.status === 'no_show').length,
    pendingToday: todayRes.filter((r) => r.status === 'pending').length,
    upcomingReservations: list.filter((r) => r.reservationDate >= today && ['pending', 'confirmed'].includes(r.status)).length,
    noShowRate: Math.round((list.filter((r) => r.status === 'no_show').length / total) * 100),
    cancellationRate: Math.round((list.filter((r) => r.status === 'cancelled').length / total) * 100),
    vipGuests: list.filter((r) => r.vip).length,
    birthdayGuests: list.filter((r) => r.birthday).length,
    anniversaryGuests: list.filter((r) => r.anniversary).length,
  }
}

export function peakBookingHours(reservations = []) {
  const hours = {}
  ;(Array.isArray(reservations) ? reservations : []).forEach((r) => {
    const time = String(r.reservationTime || '').slice(0, 2)
    const hour = Number(time)
    if (!Number.isNaN(hour)) hours[hour] = (hours[hour] || 0) + 1
  })
  return Object.entries(hours)
    .map(([hour, count]) => ({ hour: Number(hour), label: formatTimeLabel(Number(hour) * 60), count }))
    .sort((a, b) => b.count - a.count)
}

export function tableUtilization(reservations = [], tables = []) {
  return (Array.isArray(tables) ? tables : []).map((table) => {
    const tableRes = (Array.isArray(reservations) ? reservations : []).filter((r) => r.tableId === table.id)
    return {
      tableId: table.id,
      tableName: table.name || table.id,
      seats: Number(table.seats || 0),
      totalReservations: tableRes.length,
      completed: tableRes.filter((r) => r.status === 'completed').length,
      cancelled: tableRes.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length,
      utilizationRate: tableRes.length > 0 ? Math.round((tableRes.filter((r) => r.status !== 'cancelled' && r.status !== 'no_show').length / tableRes.length) * 100) : 0,
    }
  })
}

// ─── Waitlist Analytics ──────────────────────────────────────────────────────

export function waitlistAnalytics(waitlist = []) {
  const list = Array.isArray(waitlist) ? waitlist : []
  const waiting = list.filter((w) => w.status === 'waiting')
  const avgWait = waiting.length > 0
    ? Math.round(waiting.reduce((s, w) => s + Number(w.estimatedWait || 15), 0) / waiting.length)
    : 0
  return {
    totalToday: list.length,
    currentlyWaiting: waiting.length,
    seated: list.filter((w) => w.status === 'seated').length,
    cancelled: list.filter((w) => w.status === 'cancelled').length,
    skipped: list.filter((w) => w.status === 'skipped').length,
    averageWaitMinutes: avgWait,
    vipWaiting: waiting.filter((w) => w.priority === 'vip').length,
    priorityWaiting: waiting.filter((w) => w.priority === 'priority').length,
  }
}

// ─── Occupancy ───────────────────────────────────────────────────────────────

export function calculateOccupancy(reservations, tables, date) {
  const totalSeats = (Array.isArray(tables) ? tables : []).reduce((s, t) => s + Number(t.seats || 0), 0)
  if (totalSeats <= 0) return 0
  const dateRes = (Array.isArray(reservations) ? reservations : []).filter((r) => {
    if (String(r.reservationDate) !== date) return false
    return ['confirmed', 'seated'].includes(r.status)
  })
  const occupiedSeats = dateRes.reduce((s, r) => s + Number(r.adults || 0) + Number(r.children || 0), 0)
  return Math.min(100, Math.round((occupiedSeats / totalSeats) * 100))
}

// ─── Default Settings ────────────────────────────────────────────────────────

export const RESERVATION_SETTINGS_DEFAULTS = {
  enableOnlineReservations: true,
  enableWaitlist: true,
  enableAutoAssign: true,
  enableConflictDetection: true,
  enableDoubleBookingPrevention: true,
  enableBirthdayHighlight: true,
  enableAnniversaryHighlight: true,
  enableArrivalReminders: true,
  enableLateArrivalDetection: true,
  enableAutoNoShow: true,
  openTime: '09:00',
  closeTime: '23:00',
  defaultDuration: 60,
  slotInterval: 30,
  maxAdvanceDays: 30,
  maxPartySize: 20,
  lateArrivalMinutes: 15,
  noShowMinutes: 30,
  depositRequired: false,
  depositAmount: 0,
  cancellationPolicy: 'Free cancellation up to 2 hours before reservation',
  smsEnabled: false,
  whatsappEnabled: false,
  autoConfirmEnabled: false,
}

// ─── Conflict & Validation ──────────────────────────────────────────────────

export function validateReservation(payload = {}) {
  const errors = []
  if (!payload.customerName?.trim()) errors.push('Customer name is required')
  if (!payload.reservationDate) errors.push('Reservation date is required')
  if (!payload.reservationTime) errors.push('Reservation time is required')
  if (payload.reservationDate) {
    const d = new Date(payload.reservationDate)
    if (Number.isNaN(d.getTime())) errors.push('Invalid reservation date')
  }
  const guests = Number(payload.adults || 0) + Number(payload.children || 0)
  if (guests <= 0) errors.push('At least one guest required')
  if (payload.maxPartySize && guests > payload.maxPartySize) errors.push(`Maximum party size is ${payload.maxPartySize}`)
  return { valid: errors.length === 0, errors }
}

export function validateWaitlistEntry(payload = {}) {
  const errors = []
  if (!payload.customerName?.trim()) errors.push('Customer name is required')
  if (!payload.phone?.trim()) errors.push('Phone number is required')
  const guests = Number(payload.adults || 0) + Number(payload.children || 0)
  if (guests <= 0) errors.push('At least one guest required')
  return { valid: errors.length === 0, errors }
}

// ─── Late Arrival / No-Show Detection ────────────────────────────────────────

export function isLateArrival(reservation, lateMinutes = 15) {
  if (!reservation?.reservationTime || !['confirmed'].includes(reservation.status)) return false
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (String(reservation.reservationDate) !== today) return false
  const resMin = timeToMinutes(reservation.reservationTime)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin > resMin + lateMinutes && !reservation.arrivalTime
}

export function isNoShow(reservation, noShowMinutes = 30) {
  if (!isLateArrival(reservation, noShowMinutes)) return false
  const resMin = timeToMinutes(reservation.reservationTime)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  return nowMin > resMin + noShowMinutes
}

// ─── Estimated Wait Calculation ──────────────────────────────────────────────

export function estimateWaitTime(waitlist, tables, reservations) {
  const waiting = (Array.isArray(waitlist) ? waitlist : []).filter((w) => w.status === 'waiting')
  if (waiting.length === 0) return 0
  const availableTables = (Array.isArray(tables) ? tables : []).filter((t) => t.status === 'available').length
  if (availableTables <= 0) return 60
  return Math.ceil((waiting.length / availableTables) * 30)
}
