import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineCalendarDays, HiOutlineUserGroup, HiOutlineClock, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineUserMinus, HiOutlineStar, HiOutlineChartBar, HiOutlineArrowRight } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useRestaurantReservationAnalytics } from '../hooks/useRestaurantReservationAnalytics.js'
import { RESERVATION_SETTINGS_DEFAULTS } from '../lib/restaurantReservationCalculations.js'
import { formatCompact } from '../utils/format.js'

// Inline table loader (mirrors src/crm/pages/RestaurantTables.jsx)
function loadRestaurantFloors() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem('nexora.restaurant.tables.v1')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export default function RestaurantReservationDashboard() {
  const tables = useMemo(() => {
    const floors = loadRestaurantFloors()
    return floors.flatMap((f) => f.tables || [])
  }, [])
  const { analytics, loading } = useRestaurantReservationAnalytics({ tables })

  const stats = useMemo(() => {
    if (!analytics) return []
    return [
      { icon: HiOutlineCalendarDays, label: "Today's Reservations", value: formatCompact(analytics.todayReservations), helper: `${analytics.confirmedToday} confirmed`, tone: 'sky' },
      { icon: HiOutlineClock, label: 'Upcoming', value: formatCompact(analytics.upcomingReservations), helper: 'Pending + confirmed', tone: 'violet' },
      { icon: HiOutlineUserGroup, label: 'Waitlist', value: formatCompact(analytics.waitlist.currentlyWaiting), helper: `${analytics.waitlist.averageWaitMinutes}min avg wait`, tone: 'amber' },
      { icon: HiOutlineChartBar, label: 'Occupancy', value: `${analytics.occupancy}%`, helper: 'Today seat utilization', tone: 'emerald' },
      { icon: HiOutlineCheckCircle, label: 'Seated Today', value: formatCompact(analytics.seatedToday), helper: `${analytics.completedToday} completed`, tone: 'emerald' },
      { icon: HiOutlineXCircle, label: 'Cancelled', value: formatCompact(analytics.cancelledToday), helper: `${analytics.cancellationRate}% rate`, tone: 'rose' },
      { icon: HiOutlineUserMinus, label: 'No Shows', value: formatCompact(analytics.noShowToday), helper: `${analytics.noShowRate}% rate`, tone: 'slate' },
      { icon: HiOutlineStar, label: 'VIP Guests', value: formatCompact(analytics.vipGuests), helper: `${analytics.birthdayGuests} birthdays`, tone: 'purple' },
    ]
  }, [analytics])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Reservations Dashboard" subtitle="Today's occupancy, waitlist, bookings, and guest insights."
        right={
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/reservations"><Badge variant="info">Reservations</Badge></Link>
            <Link to="/app/reservations/calendar"><Badge variant="purple">Calendar</Badge></Link>
            <Link to="/app/reservations/waitlist"><Badge variant="warning">Waitlist</Badge></Link>
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
      {analytics?.peakHours?.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-950">Peak Booking Hours</p>
            <div className="space-y-2">
              {analytics.peakHours.slice(0, 6).map((ph) => {
                const maxCount = Math.max(1, analytics.peakHours[0]?.count || 1)
                const pct = Math.round((ph.count / maxCount) * 100)
                return (
                  <div key={ph.hour}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{ph.label}</span>
                      <span className="font-bold text-slate-950">{ph.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-950">Quick Actions</p>
            <div className="space-y-2">
              <Link to="/app/reservations" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">New Reservation</span>
                <HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
              <Link to="/app/reservations/calendar" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">View Calendar</span>
                <HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
              <Link to="/app/reservations/waitlist" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">Manage Waitlist ({analytics?.waitlist?.currentlyWaiting || 0})</span>
                <HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
              <Link to="/app/reservations/settings" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">Settings</span>
                <HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
