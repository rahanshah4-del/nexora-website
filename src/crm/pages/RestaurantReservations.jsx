import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineArrowRight } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useRestaurantReservations } from '../hooks/useRestaurantReservations.js'
import { RESERVATION_STATUSES, RESERVATION_STATUS_TRANSITIONS, getTimeSlots, formatTimeLabel, timeToMinutes } from '../lib/restaurantReservationCalculations.js'
import { confirmAction } from '../components/ui/dialogActions.js'

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

function dateStr(v) {
  if (!v) return '—'
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function statusBadge(status) {
  const s = RESERVATION_STATUSES.find((x) => x.id === status)
  if (!s) return <Badge variant="default">{status}</Badge>
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.color}`}>{s.label}</span>
}

export default function RestaurantReservationsPage() {
  const api = useRestaurantReservations()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  const tables = useMemo(() => loadRestaurantFloors().flatMap((f) => f.tables || []), [])
  const allTables = useMemo(() => tables.map((t) => ({ value: t.id, label: `${t.id} (${t.seats} seats)` })), [tables])
  const timeSlots = useMemo(() => getTimeSlots({ openTime: '09:00', closeTime: '23:00', intervalMinutes: 30 }), [])

  const [draft, setDraft] = useState({
    customerName: '', phone: '', email: '', adults: 2, children: 0,
    reservationDate: new Date().toISOString().slice(0, 10),
    reservationTime: '19:00', duration: 60, tableId: '',
    specialRequest: '', notes: '', vip: false, birthday: false, anniversary: false,
    wheelchair: false, highChair: false, outdoor: false, smoking: false, indoor: false,
  })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  const filtered = useMemo(() => {
    let list = api.reservations
    if (filterStatus !== 'all') list = list.filter((r) => r.status === filterStatus)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((r) => [r.customerName, r.phone, r.email, r.tableId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    return list.sort((a, b) => String(a.reservationDate) !== String(b.reservationDate) ? String(a.reservationDate).localeCompare(String(b.reservationDate)) : String(a.reservationTime).localeCompare(String(b.reservationTime)))
  }, [api.reservations, filterStatus, search])

  async function handleSave() {
    const payload = editing ? draft : draft
    const res = editing ? await api.updateReservation(editing.id, payload) : await api.createReservation(payload)
    if (res.ok) { show('success', `Reservation ${editing ? 'updated' : 'created'}`); setShowForm(false); setEditing(null) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete reservation?', message: 'This will permanently remove the reservation.', confirmLabel: 'Delete' })) return
    const res = await api.deleteReservation(id)
    if (res.ok) show('success', 'Reservation deleted'); else show('error', res.error)
  }

  async function handleStatusChange(id, status) {
    const res = await api.changeStatus(id, status)
    if (res.ok) show('success', `Reservation ${status}`); else show('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Reservations" subtitle="Manage table bookings, guest details, and reservation status."
        right={<><Link to="/app/reservations"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={() => { setEditing(null); setShowForm(true) }}><HiOutlinePlus /> New Reservation</Button></>} />

      <Card className="p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterStatus('all')} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterStatus === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>All ({api.reservations.length})</button>
          {RESERVATION_STATUSES.map((s) => {
            const count = api.reservations.filter((r) => r.status === s.id).length
            return <button key={s.id} onClick={() => setFilterStatus(s.id)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterStatus === s.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{s.label} ({count})</button>
          })}
        </div>
        <Input placeholder="Search by name, phone, table..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-4 space-y-3">
          {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
            : filtered.length ? filtered.map((res) => {
              const validNext = RESERVATION_STATUS_TRANSITIONS[res.status] || []
              return (
                <div key={res.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-950">{res.customerName}</span>
                        {statusBadge(res.status)}
                        {res.vip && <Badge variant="purple">VIP</Badge>}
                        {res.birthday && <Badge variant="warning">Birthday</Badge>}
                        {res.anniversary && <Badge variant="info">Anniversary</Badge>}
                      </div>
                      <div className="mt-1 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
                        <p>{res.reservationDate} @ {res.reservationTime} · {res.duration}min</p>
                        <p>{res.phone} {res.email ? `· ${res.email}` : ''}</p>
                        <p>{res.adults + res.children} guests {res.tableId ? `· Table ${res.tableId}` : '· No table'}</p>
                      </div>
                      {res.specialRequest && <p className="mt-1 text-xs italic text-slate-400">"{res.specialRequest}"</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {validNext.slice(0, 2).map((ns) => {
                        const nsd = RESERVATION_STATUSES.find((x) => x.id === ns)
                        return <Button key={ns} variant="subtle" className="h-7 rounded-xl px-2 text-[10px]" onClick={() => handleStatusChange(res.id, ns)}>{nsd?.label || ns}</Button>
                      })}
                      <Button variant="subtle" className="h-7 rounded-xl px-2 text-[10px]" onClick={() => { setEditing(res); setDraft(res); setShowForm(true) }}>
                        <HiOutlinePencilSquare className="h-3 w-3" />
                      </Button>
                      <button onClick={() => handleDelete(res.id)} className="rounded-xl border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50">
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            }) : <EmptyState title="No reservations" description="Create a reservation to get started." actionLabel="New Reservation" onAction={() => setShowForm(true)} />}
        </div>
      </Card>

      {showForm ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Reservations</p><h2 className="mt-1 text-2xl font-black text-slate-950">{editing ? 'Edit Reservation' : 'New Reservation'}</h2></div>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Customer Name *</span><Input value={draft.customerName} onChange={(e) => update('customerName', e.target.value)} required /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Phone</span><Input value={draft.phone} onChange={(e) => update('phone', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Date *</span><Input type="date" value={draft.reservationDate} onChange={(e) => update('reservationDate', e.target.value)} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Time *</span>
                  <select value={draft.reservationTime} onChange={(e) => update('reservationTime', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                    {timeSlots.map((slot) => <option key={slot.time} value={slot.time}>{slot.label}</option>)}
                  </select></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Adults</span><Input type="number" min="1" max="20" value={draft.adults} onChange={(e) => update('adults', Number(e.target.value))} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Children</span><Input type="number" min="0" max="20" value={draft.children} onChange={(e) => update('children', Number(e.target.value))} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Duration (min)</span>
                  <select value={draft.duration} onChange={(e) => update('duration', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                    <option value={30}>30 min</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option><option value={150}>2.5 hours</option><option value={180}>3 hours</option>
                  </select></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Table</span>
                  <select value={draft.tableId} onChange={(e) => update('tableId', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                    <option value="">Auto assign</option>
                    {allTables.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select></label>
              </div>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Special Request</span>
                <textarea value={draft.specialRequest} onChange={(e) => update('specialRequest', e.target.value)} className="mt-1 h-16 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none" /></label>
              <div className="flex flex-wrap gap-3">
                {['vip', 'birthday', 'anniversary', 'wheelchair', 'highChair', 'outdoor', 'smoking', 'indoor'].map((flag) => (
                  <label key={flag} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={draft[flag]} onChange={(e) => update(flag, e.target.checked)} className="rounded border-slate-300" />
                    {flag === 'highChair' ? 'High Chair' : flag.charAt(0).toUpperCase() + flag.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="subtle" className="rounded-2xl" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleSave}>{editing ? 'Update' : 'Create Reservation'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
