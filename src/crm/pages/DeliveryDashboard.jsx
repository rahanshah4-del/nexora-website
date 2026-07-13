import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  HiOutlineTruck, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock,
  HiOutlineCurrencyDollar, HiOutlineUserGroup, HiOutlineMapPin, HiOutlineChartBar,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders.js'
import { useDeliveryDrivers } from '../hooks/useDeliveryDrivers.js'
import { useDeliveryZones } from '../hooks/useDeliveryZones.js'
import { deliveryAnalytics, salesByChannel, formatETA } from '../lib/deliveryCalculations.js'
import { formatCompact, formatCurrency } from '../utils/format.js'

export default function DeliveryDashboard() {
  const ordersApi = useDeliveryOrders()
  const driversApi = useDeliveryDrivers()
  const zonesApi = useDeliveryZones()
  const analytics = deliveryAnalytics(ordersApi.orders)
  const channelSales = salesByChannel(ordersApi.orders)
  const loading = ordersApi.loading || driversApi.loading || zonesApi.loading

  const stats = [
    { icon: HiOutlineTruck, label: 'Active Orders', value: formatCompact(ordersApi.activeOrders.length), helper: 'In progress', tone: 'sky' },
    { icon: HiOutlineCheckCircle, label: 'Delivered', value: formatCompact(analytics.completedDeliveries), helper: `${analytics.deliverySuccessRate}% success`, tone: 'emerald' },
    { icon: HiOutlineXCircle, label: 'Failed', value: formatCompact(analytics.failedDeliveries), helper: `${analytics.lateDeliveryRate}% late`, tone: 'rose' },
    { icon: HiOutlineUserGroup, label: 'Drivers', value: formatCompact(driversApi.drivers.length), helper: `${driversApi.availableDrivers.length} available`, tone: 'violet' },
    { icon: HiOutlineMapPin, label: 'Zones', value: formatCompact(zonesApi.zones.length), helper: 'Delivery areas', tone: 'cyan' },
    { icon: HiOutlineClock, label: 'Avg Time', value: `${analytics.avgDeliveryTimeMinutes}m`, helper: 'Delivery to door', tone: 'amber' },
    { icon: HiOutlineCurrencyDollar, label: 'Revenue', value: formatCurrency(analytics.totalRevenue), helper: `${formatCurrency(analytics.totalDeliveryFees)} delivery fees`, tone: 'sky' },
    { icon: HiOutlineChartBar, label: 'Online Sales', value: formatCurrency(channelSales.revenue.online), helper: `${channelSales.counts.online} online orders`, tone: 'emerald' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Delivery Dashboard" subtitle="Manage online orders, drivers, delivery zones, and track performance."
        right={
          <div className="flex gap-2">
            <Link to="/app/delivery/orders"><Badge variant="info">Orders ({ordersApi.activeOrders.length})</Badge></Link>
            <Link to="/app/delivery/drivers"><Badge variant="purple">Drivers ({driversApi.availableDrivers.length})</Badge></Link>
            <Link to="/app/delivery/zones"><Badge variant="cyan">Zones ({zonesApi.zones.length})</Badge></Link>
          </div>
        } />

      <div className="crm-auto-grid gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            {loading ? <div className="h-16 animate-pulse rounded bg-slate-100" /> : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.helper}</p>
                </div>
                <s.icon className={`h-8 w-8 shrink-0 text-${s.tone}-500 opacity-40`} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 text-sm font-bold text-slate-950">Order Status Overview</p>
          <div className="space-y-3">
            {ordersApi.statuses.filter((s) => !['refunded', 'returned'].includes(s.id)).map((status) => {
              const count = ordersApi.orders.filter((o) => o.status === status.id).length
              const pct = ordersApi.orders.length > 0 ? Math.round((count / ordersApi.orders.length) * 100) : 0
              return (
                <div key={status.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                    <span className="font-bold text-slate-950">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-sm font-bold text-slate-950">Sales by Channel</p>
          <div className="space-y-3">
            {[
              { label: 'Online', value: channelSales.revenue.online, count: channelSales.counts.online, color: 'bg-sky-500' },
              { label: 'Walk-in', value: channelSales.revenue.walkin, count: channelSales.counts.walkin, color: 'bg-slate-500' },
              { label: 'Delivery', value: channelSales.revenue.delivery, count: channelSales.counts.delivery, color: 'bg-emerald-500' },
              { label: 'Pickup', value: channelSales.revenue.pickup, count: channelSales.counts.pickup, color: 'bg-violet-500' },
            ].map((ch) => {
              const total = Math.max(1, channelSales.revenue.online + channelSales.revenue.walkin)
              const pct = Math.round((ch.value / total) * 100)
              return (
                <div key={ch.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{ch.label}</span>
                    <span className="text-slate-950">{formatCurrency(ch.value)} ({ch.count})</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
