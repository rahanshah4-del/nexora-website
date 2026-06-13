import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineTruck,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineCheckCircle,
  HiOutlineKey,
  HiOutlineCalendarDays,
  HiOutlineWrenchScrewdriver,
  HiOutlinePlusCircle,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlineClock,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import { cn } from '../utils/cn.js'
import { buildTransportFinanceSummary, formatTransportCurrency, getTransportPaymentSignedAmount } from '../lib/transportCalculations.js'
import { loadTransportVehicles } from '../data/transportVehicles.js'
import { loadTransportBookings, syncVehiclesWithBookings } from '../data/transportBookings.js'
import { loadTransportCustomers } from '../data/transportCustomers.js'
import { loadTransportPayments } from '../data/transportPayments.js'

const bookingStatusMeta = {
  reserved: { label: 'Reserved', badge: 'info' },
  active: { label: 'Active', badge: 'warning' },
  returned: { label: 'Returned', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
}

const fleetStatusMeta = {
  available: { label: 'Available', icon: HiOutlineCheckCircle, dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  rented: { label: 'On Rent', icon: HiOutlineKey, dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-600' },
  reserved: { label: 'Reserved', icon: HiOutlineCalendarDays, dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-600' },
  maintenance: { label: 'Maintenance', icon: HiOutlineWrenchScrewdriver, dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-600' },
}

export default function TransportDashboardPage() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [customers, setCustomers] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
    setBookings(loadTransportBookings())
    setCustomers(loadTransportCustomers())
    setPayments(loadTransportPayments())
  }, [])

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const finance = buildTransportFinanceSummary({ bookings, payments })
    const activeBookings = bookings.filter((booking) => booking.status === 'active')
    const reservedBookings = bookings.filter((booking) => booking.status === 'reserved')
    const todayRevenue = finance.activePayments
      .filter((payment) => payment.date === today)
      .reduce((sum, payment) => sum + getTransportPaymentSignedAmount(payment), 0)
    const available = vehicles.filter((vehicle) => vehicle.status === 'available').length
    const onRent = vehicles.filter((vehicle) => vehicle.status === 'rented').length
    const utilization = vehicles.length ? Math.round(((onRent + reservedBookings.length) / vehicles.length) * 100) : 0
    return {
      totalVehicles: vehicles.length,
      available,
      onRent,
      activeRentals: activeBookings.length,
      reserved: reservedBookings.length,
      customers: customers.length,
      todayRevenue: Math.max(0, todayRevenue),
      totalRevenue: finance.netCollected,
      dues: finance.outstandingDues,
      utilization: Math.min(100, utilization),
    }
  }, [vehicles, bookings, customers, payments])

  const fleetBreakdown = useMemo(() => (
    Object.keys(fleetStatusMeta).map((status) => ({
      status,
      ...fleetStatusMeta[status],
      count: vehicles.filter((vehicle) => vehicle.status === status).length,
    }))
  ), [vehicles])

  const recentBookings = useMemo(() => bookings.slice(0, 6), [bookings])

  const topVehicles = useMemo(() => {
    const tally = new Map()
    bookings.forEach((booking) => {
      if (!booking.vehicleId || booking.status === 'cancelled') return
      const current = tally.get(booking.vehicleId) || { name: booking.vehicleName, registration: booking.vehicleRegistration, count: 0, revenue: 0 }
      current.count += 1
      current.revenue += booking.total
      tally.set(booking.vehicleId, current)
    })
    return [...tally.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 4)
  }, [bookings])

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        title="Fleet Dashboard"
        subtitle="Your transport rental command center — fleet, bookings, customers, and revenue at a glance."
        right={(
          <>
            <Button variant="subtle" onClick={() => navigate('/app/transport/vehicles')}>
              <HiOutlineTruck className="h-4 w-4" />
              Manage Fleet
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => navigate('/app/transport/bookings')}>
              <HiOutlinePlusCircle className="h-4 w-4" />
              New Booking
            </Button>
          </>
        )}
      />

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-cyan-600 via-teal-600 to-sky-700 p-6 text-white shadow-lg shadow-cyan-900/20 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />
        <HiOutlineTruck className="pointer-events-none absolute -bottom-6 -right-2 h-44 w-44 text-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
              <HiOutlineSparkles className="h-4 w-4" />
              Fleet Overview
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{formatTransportCurrency(metrics.totalRevenue)}</p>
            <p className="mt-1 text-sm text-cyan-50/90">Total revenue collected • {formatTransportCurrency(metrics.todayRevenue)} today</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HeroChip icon={HiOutlineTruck} label={`${metrics.totalVehicles} vehicles`} />
              <HeroChip icon={HiOutlineKey} label={`${metrics.activeRentals} on rent`} />
              <HeroChip icon={HiOutlineCalendarDays} label={`${metrics.reserved} reserved`} />
              <HeroChip icon={HiOutlineUserGroup} label={`${metrics.customers} customers`} />
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:min-w-[210px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Fleet Utilization</p>
            <p className="mt-1 text-4xl font-black tracking-tight">{metrics.utilization}%</p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${metrics.utilization}%` }} />
            </div>
            <p className="mt-2 text-xs text-cyan-50/80">{metrics.onRent + metrics.reserved} of {metrics.totalVehicles} in use</p>
          </div>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={HiOutlineTruck} label="Available Now" value={metrics.available} hint={`${metrics.totalVehicles} total fleet`} gradient="from-emerald-500 to-teal-600" onClick={() => navigate('/app/transport/vehicles')} />
        <MetricTile icon={HiOutlineKey} label="Active Rentals" value={metrics.activeRentals} hint="currently checked out" gradient="from-amber-500 to-orange-600" onClick={() => navigate('/app/transport/bookings')} />
        <MetricTile icon={HiOutlineUserGroup} label="Customers" value={metrics.customers} hint="registered renters" gradient="from-sky-500 to-cyan-600" onClick={() => navigate('/app/transport/customers')} />
        <MetricTile icon={HiOutlineBanknotes} label="Today's Revenue" value={formatTransportCurrency(metrics.todayRevenue)} hint="collected today" gradient="from-fuchsia-500 to-violet-600" onClick={() => navigate('/app/transport/payments')} />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent bookings */}
        <Card className="rounded-[1.35rem] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-50 text-cyan-600"><HiOutlineClipboardDocumentList className="h-4 w-4" /></span>
              <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Recent Bookings</p>
            </div>
            <Button variant="ghost" className="h-8 px-2 text-xs text-cyan-700" onClick={() => navigate('/app/transport/bookings')}>View all</Button>
          </div>
          <div className="mt-4 space-y-2">
            {recentBookings.length ? recentBookings.map((booking) => {
              const meta = bookingStatusMeta[booking.status] || bookingStatusMeta.reserved
              return (
                <button
                  key={booking.bookingNumber}
                  type="button"
                  onClick={() => navigate('/app/transport/bookings')}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/40 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
                      <HiOutlineTruck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-950 dark:text-white">{booking.bookingNumber}</p>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{booking.customer} • {booking.vehicleName}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{formatTransportCurrency(booking.total)}</p>
                    {booking.refundAmount > 0 ? (
                      <p className="text-xs font-semibold text-rose-600">Refunded {formatTransportCurrency(booking.refundAmount)}</p>
                    ) : booking.dueAmount > 0
                      ? <p className="text-xs font-semibold text-rose-600">Due {formatTransportCurrency(booking.dueAmount)}</p>
                      : <p className="text-xs font-semibold text-emerald-600">Paid</p>}
                  </div>
                </button>
              )
            }) : (
              <EmptyState icon={HiOutlineClipboardDocumentList} message="No bookings yet. Create your first rental booking." />
            )}
          </div>
        </Card>

        <div className="space-y-5">
          {/* Fleet status */}
          <Card className="rounded-[1.35rem] p-5">
            <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Fleet Status</p>
            <div className="mt-4 space-y-3.5">
              {fleetBreakdown.map((item) => {
                const Icon = item.icon
                const pct = metrics.totalVehicles ? Math.round((item.count / metrics.totalVehicles) * 100) : 0
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Icon className={cn('h-4 w-4', item.text)} />
                        {item.label}
                      </span>
                      <span className={cn('font-bold', item.text)}>{item.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div className={cn('h-full rounded-full transition-all', item.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Outstanding dues */}
          <Card className="relative overflow-hidden rounded-[1.35rem] border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5">
            <div className="flex items-center gap-2 text-rose-600">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
              <p className="text-sm font-black tracking-tight">Outstanding Dues</p>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-rose-600">{formatTransportCurrency(metrics.dues)}</p>
            <p className="mt-1 text-xs text-slate-500">Across all active and reserved bookings.</p>
            <Button className="mt-4 w-full bg-rose-600 text-xs hover:bg-rose-700" onClick={() => navigate('/app/transport/payments')}>
              <HiOutlineBanknotes className="h-4 w-4" />
              Collect Payments
            </Button>
          </Card>
        </div>
      </div>

      {/* Top vehicles + quick actions */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[1.35rem] p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-600"><HiOutlineArrowTrendingUp className="h-4 w-4" /></span>
            <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Top Performing Vehicles</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {topVehicles.length ? topVehicles.map((vehicle, index) => (
              <div key={`${vehicle.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white', index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-cyan-500 to-sky-600')}>
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{vehicle.name}</p>
                    <p className="truncate text-xs text-slate-500">{vehicle.count} bookings • {vehicle.registration}</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-black text-teal-600">{formatTransportCurrency(vehicle.revenue)}</p>
              </div>
            )) : (
              <div className="sm:col-span-2">
                <EmptyState icon={HiOutlineTruck} message="No rental activity yet to rank vehicles." />
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[1.35rem] p-5">
          <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Quick Actions</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <QuickAction icon={HiOutlinePlusCircle} label="New Booking" tone="from-cyan-500 to-sky-600" onClick={() => navigate('/app/transport/bookings')} />
            <QuickAction icon={HiOutlineTruck} label="Add Vehicle" tone="from-emerald-500 to-teal-600" onClick={() => navigate('/app/transport/vehicles')} />
            <QuickAction icon={HiOutlineUserGroup} label="Add Customer" tone="from-violet-500 to-fuchsia-600" onClick={() => navigate('/app/transport/customers')} />
            <QuickAction icon={HiOutlineBanknotes} label="Record Payment" tone="from-amber-500 to-orange-600" onClick={() => navigate('/app/transport/payments')} />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 text-xs text-slate-600">
            <HiOutlineClock className="h-4 w-4 shrink-0 text-cyan-600" />
            <span>{metrics.reserved} upcoming reservation{metrics.reserved === 1 ? '' : 's'} waiting to be checked out.</span>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

function HeroChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function MetricTile({ icon: Icon, label, value, hint, gradient, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm', gradient)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  )
}

function QuickAction({ icon: Icon, label, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
      <Icon className="h-7 w-7 text-slate-300" />
      {message}
    </div>
  )
}
