import { motion } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'
import { HiOutlineTruck, HiOutlineCheckCircle, HiOutlineCurrencyDollar, HiOutlineStar, HiOutlinePhone, HiOutlineMapPin, HiOutlineCheckBadge, HiOutlineArrowPath } from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders.js'
import { useDeliveryDrivers } from '../hooks/useDeliveryDrivers.js'
import { useDeliveryTracking } from '../hooks/useDeliveryTracking.js'
import { DELIVERY_ORDER_STATUSES, driverPerformanceKPIs, calculateDriverSettlement, formatETA, generateDeliveryOTP } from '../lib/deliveryCalculations.js'
import { formatCurrency, formatCompact } from '../utils/format.js'

export default function DriverDashboard() {
  const [driverId, setDriverId] = useState('')
  const ordersApi = useDeliveryOrders({ driverId: driverId || undefined })
  const driversApi = useDeliveryDrivers()
  const trackingApi = useDeliveryTracking({ enabled: Boolean(driverId) })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const [toast, setToast] = useState(null)

  const driver = useMemo(() => driversApi.drivers.find((d) => d.id === driverId), [driversApi.drivers, driverId])
  const kpi = useMemo(() => driver ? driverPerformanceKPIs(driver, ordersApi.orders) : null, [driver, ordersApi.orders])
  const settlement = useMemo(() => driver ? calculateDriverSettlement(driver, ordersApi.orders) : null, [driver, ordersApi.orders])
  const activeDeliveries = ordersApi.activeOrders

  async function handleStatusUpdate(orderId, newStatus) {
    const res = await ordersApi.updateStatus(orderId, newStatus)
    if (res.ok) {
      show('success', `Order ${newStatus}`)
      await trackingApi.addEvent({ deliveryOrderId: orderId, status: newStatus, note: `Driver updated to ${newStatus}` })
    } else show('error', res.error)
  }

  async function handleDeliver(orderId) {
    const order = ordersApi.orders.find((o) => o.id === orderId)
    if (order?.otpCode && otpInput !== order.otpCode) {
      return show('error', 'Invalid OTP. Please verify the code with customer.')
    }
    await handleStatusUpdate(orderId, 'delivered')
    setOtpInput('')
    setSelectedOrder(null)
  }

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 2500) }

  if (!driverId) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <HiOutlineTruck className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-xl font-black text-slate-950">Driver Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Select your driver profile</p>
          <div className="mt-6 space-y-2">
            {driversApi.drivers.map((d) => (
              <button key={d.id} onClick={() => setDriverId(d.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-sky-200 hover:bg-sky-50">
                <div>
                  <p className="font-bold text-slate-950">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.phone} · {d.vehicleType} {d.vehicleNumber}</p>
                </div>
                <Badge variant={d.status === 'available' ? 'success' : d.status === 'on_delivery' ? 'warning' : 'danger'}>{d.status}</Badge>
              </button>
            ))}
            {driversApi.drivers.length === 0 && <p className="text-sm text-slate-500">No drivers available. Contact your manager.</p>}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}

      {/* Driver Header */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-950">{driver?.name}</h1>
            <Badge variant={driver?.status === 'available' ? 'success' : 'warning'}>{driver?.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{driver?.phone} · {driver?.vehicleType} {driver?.vehicleNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" className="rounded-2xl text-xs"
            onClick={() => driversApi.setDriverStatus(driverId, driver?.status === 'available' ? 'offline' : 'available')}>
            {driver?.status === 'available' ? 'Go Offline' : 'Go Online'}
          </Button>
          <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => { setDriverId(''); setSelectedOrder(null) }}>Switch Driver</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="crm-auto-grid gap-3">
        {[
          { icon: HiOutlineTruck, label: 'Active Jobs', value: activeDeliveries.length, tone: 'sky' },
          { icon: HiOutlineCheckCircle, label: 'Completed', value: kpi?.completedDeliveries || 0, tone: 'emerald' },
          { icon: HiOutlineCurrencyDollar, label: 'Earnings', value: formatCurrency(settlement?.totalAmount || 0), tone: 'amber' },
          { icon: HiOutlineStar, label: 'Rating', value: driver?.rating ? `${driver.rating}/5` : '—', tone: 'violet' },
          { icon: HiOutlineCheckBadge, label: 'Success Rate', value: kpi ? `${kpi.successRate}%` : '—', tone: 'emerald' },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className={`h-6 w-6 text-${s.tone}-500 opacity-40`} />
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">{s.label}</p>
                <p className="text-lg font-bold text-slate-950">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Active Deliveries */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-950">Active Deliveries ({activeDeliveries.length})</h2>
        {activeDeliveries.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-500">No active deliveries. Waiting for new orders...</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeDeliveries.map((order) => {
              const statusDef = DELIVERY_ORDER_STATUSES.find((s) => s.id === order.status) || DELIVERY_ORDER_STATUSES[0]
              const nextActions = ordersApi.getValidTransitions(order.status).filter((s) => !['cancelled', 'refunded', 'returned'].includes(s))
              return (
                <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-950">{order.orderNumber || order.id.slice(0, 8)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusDef.color}`}>{statusDef.label}</span>
                      </div>
                      <p className="mt-1 text-sm"><span className="font-semibold text-slate-950">{order.customerName}</span> · {order.customerPhone}</p>
                      {order.deliveryAddress && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><HiOutlineMapPin className="h-3 w-3" /> {order.deliveryAddress}</p>}
                      {order.deliveryInstructions && <p className="mt-1 text-xs italic text-slate-400">"{order.deliveryInstructions}"</p>}
                      <p className="mt-1 text-sm font-bold">Rs {formatCurrency(order.total)} {order.paymentMethod !== 'Cash' ? `(${order.paymentMethod})` : '(Cash on delivery)'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {order.status === 'on_route' && order.otpCode && (
                        <div className="flex items-center gap-1">
                          <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder={`OTP: ${order.otpCode}`} maxLength={6}
                            className="h-7 w-20 rounded-xl border border-slate-200 px-2 text-xs outline-none" />
                        </div>
                      )}
                      {nextActions.map((action) => {
                        const ns = DELIVERY_ORDER_STATUSES.find((s) => s.id === action)
                        if (action === 'delivered') {
                          return <Button key={action} className="h-8 rounded-xl px-3 text-xs" onClick={() => setSelectedOrder(order)}>{ns?.label || action}</Button>
                        }
                        return <Button key={action} variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => handleStatusUpdate(order.id, action)}>{ns?.label || action}</Button>
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Settlement Summary */}
      {settlement && settlement.completedDeliveries > 0 && (
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Settlement Summary</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div><p className="text-xs text-slate-500">Completed</p><p className="text-lg font-bold text-slate-950">{settlement.completedDeliveries}</p></div>
            <div><p className="text-xs text-slate-500">Cash Collected</p><p className="text-lg font-bold text-slate-950">{formatCurrency(settlement.cashCollected)}</p></div>
            <div><p className="text-xs text-slate-500">Delivery Fees</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(settlement.deliveryFees)}</p></div>
            <div><p className="text-xs text-slate-500">Tips</p><p className="text-lg font-bold text-slate-950">{formatCurrency(settlement.tips)}</p></div>
          </div>
        </Card>
      )}

      {/* Deliver with OTP dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">Confirm Delivery</h2>
            <p className="mt-1 text-sm text-slate-500">{selectedOrder.customerName} · Rs {formatCurrency(selectedOrder.total)}</p>
            {selectedOrder.otpCode && (
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-500">Enter OTP from customer</label>
                <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="Enter OTP" maxLength={6}
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-4 text-lg font-bold tracking-widest outline-none focus:border-sky-300" />
                <p className="mt-1 text-xs text-slate-400">Customer OTP: {selectedOrder.otpCode}</p>
              </div>
            )}
            <div className="mt-4 grid gap-2">
              {selectedOrder.paymentMethod === 'Cash' && (
                <div className="rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">
                  Collect Rs {formatCurrency(selectedOrder.total)} cash from customer
                </div>
              )}
              <Button onClick={() => handleDeliver(selectedOrder.id)} className="w-full rounded-2xl">
                <HiOutlineCheckCircle className="h-4 w-4" /> Confirm Delivery
              </Button>
              <Button variant="subtle" className="w-full rounded-2xl" onClick={() => { setSelectedOrder(null); setOtpInput('') }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
