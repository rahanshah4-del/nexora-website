import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineTruck, HiOutlineFire, HiOutlineCheckBadge, HiOutlineXCircle, HiOutlinePhone } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { DELIVERY_ORDER_STATUSES, formatETA, estimateDeliveryTime } from '../lib/deliveryCalculations.js'
import { formatRestaurantCurrency } from '../lib/restaurantPosCalculations.js'

const TIMELINE_ICONS = {
  pending: HiOutlineClock, accepted: HiOutlineCheckCircle, preparing: HiOutlineFire,
  ready: HiOutlineCheckBadge, picked_up: HiOutlineTruck, on_route: HiOutlineTruck,
  delivered: HiOutlineCheckCircle, cancelled: HiOutlineXCircle,
}

function dateStr(v) {
  if (!v) return ''
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

export default function CustomerOrderTracking() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState([])
  const eta = order?.estimatedEta ? dateStr(order.estimatedEta) : null

  useEffect(() => {
    const orders = loadRestaurantOrders()
    const found = orders.find((o) => o.orderNumber === `#${orderNumber}` || o.orderNumber === orderNumber)
    if (found) {
      setOrder(found)
      const statuses = DELIVERY_ORDER_STATUSES
      const idx = statuses.findIndex((s) => s.id === found.status)
      setTimeline(statuses.slice(0, Math.max(idx + 1, 3)).map((s, i) => ({
        ...s, active: i <= idx, current: i === idx,
      })))
    }
  }, [orderNumber])

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <HiOutlineClock className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-xl font-black text-slate-950">Looking up your order</h1>
          <p className="mt-2 text-sm text-slate-500">Order #{orderNumber}</p>
        </div>
      </div>
    )
  }

  const statusDef = DELIVERY_ORDER_STATUSES.find((s) => s.id === order.status) || DELIVERY_ORDER_STATUSES[0]

  return (
    <motion.div initial={{ opacity: 0 }} className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Order Status</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{order.orderNumber}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusDef.color}`}>{statusDef.label}</span>
        </div>

        <div className="mt-6 space-y-4">
          {/* Timeline */}
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 h-[calc(100%-1.5rem)] w-0.5 bg-slate-100" />
            {timeline.map((step, i) => {
              const Icon = TIMELINE_ICONS[step.id] || HiOutlineClock
              return (
                <div key={step.id} className={`relative pb-6 last:pb-0 ${step.active ? '' : 'opacity-40'}`}>
                  <div className={`absolute -left-[1.15rem] grid h-6 w-6 place-items-center rounded-full ${step.current ? 'bg-slate-950 text-white' : step.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${step.active ? 'text-slate-950' : 'text-slate-400'}`}>{step.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {eta && (
            <div className="rounded-xl bg-sky-50 p-4 text-center">
              <p className="text-xs font-semibold text-sky-700">Estimated Delivery</p>
              <p className="mt-1 text-lg font-black text-sky-900">{eta}</p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Order Summary</p>
          <div className="mt-3 space-y-2">
            {order.items?.length > 0 && order.items.slice(0, 5).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-950">Total</span>
              <span className="font-black text-slate-950">{formatRestaurantCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {order.phone && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
            <HiOutlinePhone className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Contact: {order.phone}</span>
          </div>
        )}

        {order.deliveryAddress && (
          <div className="mt-2 text-xs text-slate-500">
            <p>Delivering to: {order.deliveryAddress}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
