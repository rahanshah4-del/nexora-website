import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineCalendarDays } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useRestaurantReservations } from '../hooks/useRestaurantReservations.js'
import { RESERVATION_STATUSES, timeToMinutes } from '../lib/restaurantReservationCalculations.js'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function RestaurantReservationCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // month | day
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const api = useRestaurantReservations({ date: viewMode === 'day' ? selectedDate : undefined })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date().toISOString().slice(0, 10)
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayRes = api.reservations.filter((r) => String(r.reservationDate) === dateStr)
      cells.push({ date: d, dateStr, isToday: dateStr === today, reservations: dayRes })
    }
    return cells
  }, [year, month, api.reservations])

  const dayReservations = useMemo(() => {
    return api.reservations.filter((r) => String(r.reservationDate) === selectedDate)
      .sort((a, b) => String(a.reservationTime).localeCompare(String(b.reservationTime)))
  }, [api.reservations, selectedDate])

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  function selectDate(dateStr) {
    setSelectedDate(dateStr)
    setViewMode('day')
  }

  const statusColor = {
    pending: 'bg-amber-400', confirmed: 'bg-sky-400', seated: 'bg-emerald-400',
    completed: 'bg-emerald-600', cancelled: 'bg-rose-400', no_show: 'bg-slate-400',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title="Reservation Calendar" subtitle="Daily, weekly, and monthly view of all table bookings."
        right={<Link to="/app/reservations"><Button variant="subtle" className="rounded-2xl"><HiOutlineCalendarDays /> Back</Button></Link>} />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('month')} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${viewMode === 'month' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>Monthly</button>
        <button onClick={() => setViewMode('day')} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${viewMode === 'day' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>Daily</button>
      </div>

      {viewMode === 'month' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"><HiOutlineChevronLeft className="h-4 w-4" /></button>
            <h2 className="text-lg font-bold text-slate-950">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"><HiOutlineChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => <div key={d} className="p-2 text-center text-[10px] font-bold uppercase text-slate-400">{d}</div>)}
            {calendarDays.map((cell, i) => (
              <div key={i} className={`min-h-20 rounded-xl border p-1.5 transition cursor-pointer ${cell?.isToday ? 'border-sky-300 bg-sky-50' : cell ? 'border-slate-100 hover:border-sky-200 hover:bg-sky-50' : ''}`}
                onClick={() => cell && selectDate(cell.dateStr)}>
                {cell && <>
                  <p className="text-xs font-bold text-slate-950">{cell.date}</p>
                  <div className="mt-1 space-y-0.5">
                    {cell.reservations.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center gap-1">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor[r.status] || 'bg-slate-300'}`} />
                        <span className="truncate text-[8px] text-slate-600">{r.reservationTime}</span>
                      </div>
                    ))}
                    {cell.reservations.length > 3 && <p className="text-[8px] text-slate-400">+{cell.reservations.length - 3} more</p>}
                  </div>
                </>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {viewMode === 'day' && (
        <div className="space-y-3">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
              <p className="text-sm text-slate-500">{dayReservations.length} reservation(s)</p>
            </div>
            <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => setViewMode('month')}>Back to Month</Button>
          </Card>
          <div className="space-y-2">
            {dayReservations.length === 0 ? (
              <Card className="p-6 text-center"><p className="text-sm text-slate-500">No reservations for this date.</p></Card>
            ) : (
              <div className="relative pl-8">
                <div className="absolute left-3 top-2 h-[calc(100%-1.5rem)] w-0.5 bg-slate-100" />
                {dayReservations.map((res) => (
                  <div key={res.id} className="relative pb-4">
                    <div className={`absolute -left-[1.05rem] mt-1 grid h-5 w-5 place-items-center rounded-full ${statusColor[res.status] || 'bg-slate-300'}`}>
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </div>
                    <div className="ml-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-950">{res.customerName}</span>
                          <span className="ml-2 text-xs text-slate-500">{res.reservationTime} · {res.adults + res.children} guests</span>
                        </div>
                        {(() => { const s = RESERVATION_STATUSES.find((x) => x.id === res.status); return s ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.color}`}>{s.label}</span> : null })()}
                      </div>
                      {res.tableId && <p className="mt-1 text-xs text-slate-500">Table {res.tableId}</p>}
                      {res.specialRequest && <p className="mt-0.5 text-xs italic text-slate-400">"{res.specialRequest}"</p>}
                      <div className="mt-1 flex gap-2">
                        {res.vip && <Badge variant="purple">VIP</Badge>}
                        {res.birthday && <Badge variant="warning">Birthday</Badge>}
                        {res.anniversary && <Badge variant="info">Anniversary</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
