import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlinePlus, HiOutlineUserGroup, HiOutlineBell, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineArrowRight } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useRestaurantWaitlist } from '../hooks/useRestaurantWaitlist.js'
import { WAITLIST_PRIORITIES, WAITLIST_STATUSES } from '../lib/restaurantReservationCalculations.js'

export default function RestaurantWaitlistPage() {
  const api = useRestaurantWaitlist()
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ customerName: '', phone: '', adults: 2, children: 0, priority: 'normal', notes: '', estimatedWait: 15 })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  async function handleAdd() {
    if (!draft.customerName.trim() || !draft.phone.trim()) return show('error', 'Name and phone required')
    const res = await api.addToWaitlist(draft)
    if (res.ok) { show('success', 'Added to waitlist'); setShowAdd(false); setDraft({ customerName: '', phone: '', adults: 2, children: 0, priority: 'normal', notes: '', estimatedWait: 15 }) }
    else show('error', res.error)
  }

  async function handleStatus(id, status) {
    const res = await api.updateStatus(id, status)
    if (res.ok) {
      if (status === 'seated') show('success', 'Guest seated')
      else if (status === 'notified') show('success', 'Guest notified')
      else if (status === 'cancelled') show('success', 'Cancelled')
      else if (status === 'skipped') show('success', 'Skipped')
    } else show('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Waitlist" subtitle="Manage walk-in queue, priority seating, and notify guests when ready."
        right={<><Link to="/app/reservations"><Button variant="subtle" className="rounded-2xl">Back</Button></Link>
        <Button className="rounded-2xl" onClick={() => setShowAdd(true)}><HiOutlinePlus /> Add to Waitlist</Button></>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
            : api.waitingEntries.length === 0 ? <EmptyState title="Waitlist is empty" description="Add walk-in guests to manage the queue." actionLabel="Add Guest" onAction={() => setShowAdd(true)} />
            : api.waitingEntries.map((entry, idx) => {
              const priorityDef = WAITLIST_PRIORITIES.find((p) => p.id === entry.priority)
              return (
                <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-500">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">{entry.customerName}</span>
                      {priorityDef?.id !== 'normal' && <Badge variant={priorityDef?.id === 'vip' ? 'purple' : 'warning'}>{priorityDef?.label}</Badge>}
                      {entry.vip && <Badge variant="purple">VIP</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{entry.phone} · {entry.adults + entry.children} guests</p>
                    {entry.notes && <p className="text-xs text-slate-400">{entry.notes}</p>}
                    <p className="text-xs text-slate-400">Est. wait: {entry.estimatedWait}min</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleStatus(entry.id, 'notified')} className="rounded-xl border border-sky-200 bg-sky-50 p-2 text-sky-700 hover:bg-sky-100" title="Notify guest">
                      <HiOutlineBell className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleStatus(entry.id, 'seated')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100" title="Seat guest">
                      <HiOutlineCheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleStatus(entry.id, 'skipped')} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100" title="Skip">
                      <HiOutlineArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleStatus(entry.id, 'cancelled')} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100" title="Cancel">
                      <HiOutlineXCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
        </div>

        <Card className="p-5 h-fit">
          <p className="text-sm font-bold text-slate-950">Queue Summary</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Waiting</span><span className="font-bold text-slate-950">{api.waitingEntries.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">VIP Waiting</span><span className="font-bold text-purple-700">{api.waitingEntries.filter((w) => w.priority === 'vip').length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Priority</span><span className="font-bold text-amber-700">{api.waitingEntries.filter((w) => w.priority === 'priority').length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Seated Today</span><span className="font-bold text-emerald-700">{api.waitlist.filter((w) => w.status === 'seated').length}</span></div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="text-slate-600">Cancelled</span><span className="font-bold text-rose-700">{api.waitlist.filter((w) => w.status === 'cancelled').length}</span></div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
