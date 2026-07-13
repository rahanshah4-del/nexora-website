/**
 * Online Ordering & Delivery Management — Pure Functions.
 * Zero side effects. No Firebase imports.
 */

// ─── Delivery Statuses ───────────────────────────────────────────────────────

export const DELIVERY_ORDER_STATUSES = [
  { id: 'pending',    label: 'Pending',     color: 'text-amber-600 bg-amber-50', icon: 'HiOutlineClock' },
  { id: 'accepted',   label: 'Accepted',    color: 'text-sky-600 bg-sky-50',     icon: 'HiOutlineCheckCircle' },
  { id: 'preparing',  label: 'Preparing',   color: 'text-indigo-600 bg-indigo-50', icon: 'HiOutlineFire' },
  { id: 'ready',      label: 'Ready',       color: 'text-emerald-600 bg-emerald-50', icon: 'HiOutlineCheckBadge' },
  { id: 'picked_up',  label: 'Picked Up',   color: 'text-violet-600 bg-violet-50', icon: 'HiOutlineArrowUpTray' },
  { id: 'on_route',   label: 'On Route',    color: 'text-blue-600 bg-blue-50',   icon: 'HiOutlineTruck' },
  { id: 'delivered',  label: 'Delivered',   color: 'text-emerald-700 bg-emerald-100', icon: 'HiOutlineCheckCircle' },
  { id: 'cancelled',  label: 'Cancelled',   color: 'text-rose-600 bg-rose-50',   icon: 'HiOutlineXCircle' },
  { id: 'refunded',   label: 'Refunded',    color: 'text-rose-700 bg-rose-100',  icon: 'HiOutlineArrowPath' },
  { id: 'returned',   label: 'Returned',    color: 'text-orange-600 bg-orange-50', icon: 'HiOutlineArrowUturnLeft' },
]

export const ORDER_TYPES = [
  { id: 'delivery',    label: 'Delivery' },
  { id: 'pickup',      label: 'Pickup' },
  { id: 'dine_in',     label: 'Dine-In Preorder' },
  { id: 'scheduled',   label: 'Scheduled' },
]

export const DRIVER_ORDER_STATUSES = ['pending', 'accepted', 'picked_up', 'on_route', 'delivered']

export const STATUS_TRANSITIONS = {
  pending:    ['accepted', 'cancelled'],
  accepted:   ['preparing', 'cancelled'],
  preparing:  ['ready', 'cancelled'],
  ready:      ['picked_up', 'on_route', 'cancelled'],
  picked_up:  ['on_route', 'cancelled'],
  on_route:   ['delivered', 'cancelled', 'returned'],
  delivered:  ['refunded', 'returned'],
  cancelled:  ['refunded'],
  refunded:   [],
  returned:   [],
}

export function validTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

export function canTransition(from, to) {
  return validTransitions(from).includes(to)
}

// ─── Delivery Zones ─────────────────────────────────────────────────────────

export function calculateDeliveryCharge({ zone = {}, distanceKm = 0, subtotal = 0 } = {}) {
  if (!zone || zone.active === false) return { charge: 0, freeDelivery: false, reason: 'Zone not available' }
  const minOrder = Number(zone.minOrderAmount || 0)
  if (minOrder > 0 && subtotal < minOrder) return { charge: 0, freeDelivery: false, reason: `Minimum order Rs ${minOrder} required` }
  const baseCharge = Number(zone.baseCharge || 0)
  const perKmCharge = Number(zone.perKmCharge || 0)
  const freeDeliveryThreshold = Number(zone.freeDeliveryThreshold || 0)
  const distance = Math.max(0, Number(distanceKm || 0))
  let charge = baseCharge + (perKmCharge * distance)
  if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) return { charge: 0, freeDelivery: true, reason: 'Free delivery' }
  if (zone.maxCharge > 0) charge = Math.min(charge, Number(zone.maxCharge))
  return { charge: Math.round(charge), freeDelivery: charge === 0, reason: '' }
}

export function withinZoneBounds(zone = {}, distanceKm = 0) {
  if (!zone) return false
  const maxDist = Number(zone.maxDistance || 0)
  return maxDist <= 0 || Number(distanceKm) <= maxDist
}

// ─── Driver Availability ─────────────────────────────────────────────────────

export function isDriverAvailable(driver = {}) {
  if (!driver || driver.active === false) return false
  if (driver.status !== 'available' && driver.status !== 'on_delivery') return false
  if (driver.currentLoad !== undefined && driver.maxLoad !== undefined && Number(driver.currentLoad) >= Number(driver.maxLoad)) return false
  return true
}

export function driverLoad(driver = {}, activeDeliveries = 0) {
  return {
    currentLoad: Number(driver.currentLoad || 0) + activeDeliveries,
    maxLoad: Number(driver.maxLoad || 5),
    available: Number(driver.currentLoad || 0) + activeDeliveries < Number(driver.maxLoad || 5),
  }
}

// ─── Driver Performance KPIs ─────────────────────────────────────────────────

export function driverPerformanceKPIs(driver = {}, deliveries = []) {
  const completed = deliveries.filter((d) => d.status === 'delivered')
  const failed = deliveries.filter((d) => d.status === 'cancelled' || d.status === 'returned')
  const totalDeliveries = deliveries.length || 1
  const successRate = Math.round((completed.length / totalDeliveries) * 100)
  const totalEarnings = completed.reduce((s, d) => s + Number(d.deliveryFee || d.driverEarnings || 0), 0)
  const avgDeliveryTime = completed.length > 0
    ? Math.round(completed.reduce((s, d) => {
        if (d.pickedUpAt && d.deliveredAt) {
          const start = typeof d.pickedUpAt?.toDate === 'function' ? d.pickedUpAt.toDate() : new Date(d.pickedUpAt)
          const end = typeof d.deliveredAt?.toDate === 'function' ? d.deliveredAt.toDate() : new Date(d.deliveredAt)
          return s + (end - start)
        }
        return s
      }, 0) / completed.length / 60000)
    : 0
  const todayDeliveries = deliveries.filter((d) => {
    const date = typeof d.createdAt?.toDate === 'function' ? d.createdAt.toDate() : new Date(d.createdAt)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  })
  return {
    totalDeliveries: deliveries.length,
    completedDeliveries: completed.length,
    failedDeliveries: failed.length,
    successRate,
    totalEarnings,
    avgDeliveryTimeMinutes: avgDeliveryTime,
    todayDeliveries: todayDeliveries.length,
    rating: Number(driver.rating || 0),
    onTimeRate: driver.onTimeRate || 0,
  }
}

// ─── ETA Calculation ─────────────────────────────────────────────────────────

export function estimateDeliveryTime({ distanceKm = 0, avgSpeedKmph = 30, prepTimeMinutes = 15, driverAssignmentMinutes = 5 } = {}) {
  const travelMinutes = Math.ceil((Math.max(0, Number(distanceKm)) / Math.max(1, Number(avgSpeedKmph))) * 60)
  const totalMinutes = travelMinutes + Math.max(0, Number(prepTimeMinutes)) + Math.max(0, Number(driverAssignmentMinutes))
  return {
    totalMinutes,
    travelMinutes,
    prepTimeMinutes: Math.max(0, Number(prepTimeMinutes)),
    estimatedAt: new Date(Date.now() + totalMinutes * 60000).toISOString(),
  }
}

export function formatETA(minutes) {
  if (minutes <= 0) return 'Now'
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

// ─── Delivery Analytics ──────────────────────────────────────────────────────

export function deliveryAnalytics(deliveries = []) {
  const list = Array.isArray(deliveries) ? deliveries : []
  const total = list.length || 1
  const completed = list.filter((d) => d.status === 'delivered')
  const failed = list.filter((d) => d.status === 'cancelled' || d.status === 'returned' || d.status === 'refunded')
  const lateDeliveries = list.filter((d) => {
    if (d.status !== 'delivered' || !d.estimatedEta || !d.deliveredAt) return false
    const eta = typeof d.estimatedEta?.toDate === 'function' ? d.estimatedEta.toDate() : new Date(d.estimatedEta)
    const actual = typeof d.deliveredAt?.toDate === 'function' ? d.deliveredAt.toDate() : new Date(d.deliveredAt)
    return actual > eta
  })
  const avgDeliveryTimeMs = completed.length > 0
    ? completed.reduce((s, d) => {
        if (d.acceptedAt && d.deliveredAt) {
          const start = typeof d.acceptedAt?.toDate === 'function' ? d.acceptedAt.toDate() : new Date(d.acceptedAt)
          const end = typeof d.deliveredAt?.toDate === 'function' ? d.deliveredAt.toDate() : new Date(d.deliveredAt)
          return s + (end - start)
        }
        return s
      }, 0) / completed.length
    : 0
  const totalRevenue = completed.reduce((s, d) => s + Number(d.total || d.orderTotal || 0), 0)
  const totalDeliveryFees = completed.reduce((s, d) => s + Number(d.deliveryFee || 0), 0)
  return {
    totalDeliveries: list.length,
    completedDeliveries: completed.length,
    failedDeliveries: failed.length,
    lateDeliveries: lateDeliveries.length,
    deliverySuccessRate: Math.round((completed.length / total) * 100),
    lateDeliveryRate: Math.round((lateDeliveries.length / total) * 100),
    avgDeliveryTimeMinutes: Math.round(avgDeliveryTimeMs / 60000),
    totalRevenue,
    totalDeliveryFees,
  }
}

export function zonePerformance(deliveries = [], zones = []) {
  return (Array.isArray(zones) ? zones : []).map((zone) => {
    const zoneDeliveries = (Array.isArray(deliveries) ? deliveries : []).filter((d) => d.zoneId === zone.id)
    const completed = zoneDeliveries.filter((d) => d.status === 'delivered')
    return {
      zoneId: zone.id,
      zoneName: zone.name || 'Unknown',
      totalOrders: zoneDeliveries.length,
      completedOrders: completed.length,
      totalRevenue: completed.reduce((s, d) => s + Number(d.total || 0), 0),
      totalDeliveryFees: completed.reduce((s, d) => s + Number(d.deliveryFee || 0), 0),
      avgOrderValue: completed.length > 0 ? Math.round(completed.reduce((s, d) => s + Number(d.total || 0), 0) / completed.length) : 0,
      successRate: zoneDeliveries.length > 0 ? Math.round((completed.length / zoneDeliveries.length) * 100) : 0,
    }
  })
}

// ─── Order Type / Channel Sales ──────────────────────────────────────────────

export function salesByChannel(orders = []) {
  const channels = { online: 0, walkin: 0, delivery: 0, pickup: 0, dine_in: 0 }
  const counts = { online: 0, walkin: 0, delivery: 0, pickup: 0, dine_in: 0 }
  ;(Array.isArray(orders) ? orders : []).forEach((o) => {
    const source = String(o.source || o.orderType || '').toLowerCase()
    if (source === 'online' || o.isOnlineOrder) { channels.online += Number(o.total || 0); counts.online++ }
    else if (source === 'delivery') { channels.delivery += Number(o.total || 0); counts.delivery++ }
    else if (source === 'pickup' || source === 'takeaway') { channels.pickup += Number(o.total || 0); counts.pickup++ }
    else { channels.walkin += Number(o.total || 0); counts.walkin++ }
    if (source === 'dine_in' || source === 'dine-in') { channels.dine_in += Number(o.total || 0); counts.dine_in++ }
  })
  return { revenue: channels, counts }
}

// ─── Driver Settlement ───────────────────────────────────────────────────────

export function calculateDriverSettlement(driver = {}, deliveries = []) {
  const completed = deliveries.filter((d) => d.status === 'delivered' && d.driverId === driver.id)
  const cashCollected = completed.reduce((s, d) => {
    if (d.paymentMethod === 'Cash') return s + Number(d.total || 0)
    return s
  }, 0)
  const deliveryFees = completed.reduce((s, d) => s + Number(d.deliveryFee || d.driverEarnings || 0), 0)
  const tips = completed.reduce((s, d) => s + Number(d.tip || 0), 0)
  const totalAmount = cashCollected + deliveryFees + tips
  return {
    driverId: driver.id,
    driverName: driver.name || 'Driver',
    completedDeliveries: completed.length,
    cashCollected,
    deliveryFees,
    tips,
    totalAmount,
    commission: driver.commissionRate ? Math.round(totalAmount * (Number(driver.commissionRate) / 100)) : 0,
  }
}

// ─── Order Scheduling ───────────────────────────────────────────────────────

export function isScheduledOrder(order = {}) {
  return order.orderType === 'scheduled' || (order.scheduledAt && order.scheduledAt > new Date().toISOString())
}

export function scheduledTimeWindow(order = {}) {
  if (!order.scheduledAt) return null
  const date = typeof order.scheduledAt?.toDate === 'function' ? order.scheduledAt.toDate() : new Date(order.scheduledAt)
  if (Number.isNaN(date.getTime())) return null
  const windowStart = new Date(date.getTime() - 15 * 60000)
  const windowEnd = new Date(date.getTime() + 15 * 60000)
  return { windowStart, windowEnd, scheduledAt: date }
}

// ─── Proof of Delivery ──────────────────────────────────────────────────────

export function validateProofOfDelivery(proof = {}) {
  const errors = []
  if (!proof.deliveryOrderId) errors.push('Delivery order is required')
  if (!proof.method) errors.push('Proof method is required (signature/otp/photo)')
  if (!proof.collectedBy) errors.push('Collected by name is required')
  return { valid: errors.length === 0, errors }
}

export function generateDeliveryOTP() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ─── Address Validation ──────────────────────────────────────────────────────

export function normalizeAddress(address = {}) {
  return {
    id: address.id || '',
    label: address.label || 'Home',
    fullAddress: String(address.fullAddress || address.address || '').trim(),
    city: String(address.city || '').trim(),
    area: String(address.area || '').trim(),
    zipCode: String(address.zipCode || '').trim(),
    latitude: Number(address.latitude || 0),
    longitude: Number(address.longitude || 0),
    instructions: String(address.instructions || '').trim(),
    isDefault: Boolean(address.isDefault),
  }
}

// ─── QR Menu ─────────────────────────────────────────────────────────────────

export function buildQRMenuURL({ workspaceId = '', restaurantName = '' }) {
  const slug = (restaurantName || workspaceId).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().slice(0, 30)
  return `/menu/${slug}?ws=${workspaceId}`
}

export function buildQRMenuDataUrl(menuUrl) {
  return menuUrl
}

// ─── Default Settings ────────────────────────────────────────────────────────

export const DELIVERY_SETTINGS_DEFAULTS = {
  enableOnlineOrdering: true,
  enableDelivery: true,
  enablePickup: true,
  enableScheduledOrders: true,
  enableGuestCheckout: true,
  enableCustomerLogin: true,
  enableDriverModule: true,
  enableProofOfDelivery: true,
  enableOTPVerification: true,
  defaultAvgSpeedKmph: 30,
  driverAssignmentMinutes: 5,
  defaultPrepTimeMinutes: 15,
  autoAssignDrivers: true,
  maxDriverLoad: 5,
  defaultCommissionRate: 10,
  freeDeliveryThreshold: 0,
  orderAcceptedNotification: true,
  orderReadyNotification: true,
  orderOnRouteNotification: true,
  orderDeliveredNotification: true,
  driverAssignedNotification: true,
  customerTrackingEnabled: true,
  onlinePaymentRequired: false,
  scheduleLeadTimeMinutes: 60,
  maxScheduleDaysAhead: 7,
  restaurantName: '',
  restaurantPhone: '',
  restaurantAddress: '',
  openingHours: { mon: { open: '09:00', close: '22:00' }, tue: { open: '09:00', close: '22:00' }, wed: { open: '09:00', close: '22:00' }, thu: { open: '09:00', close: '22:00' }, fri: { open: '09:00', close: '22:00' }, sat: { open: '10:00', close: '23:00' }, sun: { open: '10:00', close: '21:00' } },
}

export const ONLINE_ORDER_STATUSES = [
  { id: 'placed',     label: 'Placed',      color: 'bg-amber-100 text-amber-800' },
  { id: 'confirmed',  label: 'Confirmed',   color: 'bg-sky-100 text-sky-800' },
  { id: 'preparing',  label: 'Preparing',   color: 'bg-indigo-100 text-indigo-800' },
  { id: 'ready',      label: 'Ready',       color: 'bg-emerald-100 text-emerald-800' },
  { id: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-blue-100 text-blue-800' },
  { id: 'delivered',  label: 'Delivered',   color: 'bg-emerald-200 text-emerald-900' },
  { id: 'cancelled',  label: 'Cancelled',   color: 'bg-rose-100 text-rose-800' },
]
