import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useProductionBatches } from '../hooks/useKitchenProduction.js'
import { BATCH_STATUSES } from '../lib/kitchenProductionCalculations.js'
import { loadRestaurantMenuItems } from '../data/restaurantMenu.js'
import { formatCurrency } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'

function dateStr(v) {
  if (!v) return '—'
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export default function KitchenProductionBatchesPage() {
  const api = useProductionBatches()
  const [showForm, setShowForm] = useState(false)
  const [completeBatch, setCompleteBatch] = useState(null)
  const [toast, setToast] = useState(null)
  const menuItems = useMemo(() => loadRestaurantMenuItems(), [])
  const [draft, setDraft] = useState({ menuItemId: '', menuItemName: '', plannedQty: 10, shift: 'morning', notes: '', expiresAt: '' })
  const [completeDraft, setCompleteDraft] = useState({ actualQty: 0, wasteQty: 0, notes: '' })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  function selectItem(id) {
    const item = menuItems.find((i) => i.id === id)
    update('menuItemId', id)
    update('menuItemName', item?.name || '')
  }

  async function handleCreate() {
    if (!draft.menuItemId) return show('error', 'Select a menu item')
    const res = await api.createBatch(draft)
    if (res.ok) { show('success', `Batch ${res.batchNumber} created`); setShowForm(false); setDraft({ menuItemId: '', menuItemName: '', plannedQty: 10, shift: 'morning', notes: '', expiresAt: '' }) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete batch?', message: 'This action cannot be undone.', confirmLabel: 'Delete' })) return
    const res = await api.deleteBatch(id)
    if (res.ok) show('success', 'Batch deleted'); else show('error', res.error)
  }

  async function handleComplete() {
    if (!completeBatch) return
    const res = await api.completeBatch(completeBatch.id, completeDraft)
    if (res.ok) { show('success', 'Batch completed'); setCompleteBatch(null) }
    else show('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Production Batches" subtitle="Plan, track, and complete production batches with auto inventory update."
        right={<><Link to="/app/kitchen-production"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={() => setShowForm(true)}><HiOutlinePlus /> New Batch</Button></>} />

      <Card className="p-5">
        {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
          : api.batches.length === 0 ? <EmptyState title="No batches yet" description="Create a production batch to start tracking." actionLabel="New Batch" onAction={() => setShowForm(true)} />
          : <div className="space-y-3">{[...api.batches].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0)).map((batch) => {
            const s = BATCH_STATUSES.find((x) => x.id === batch.status)
            return (
              <div key={batch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-950">{batch.batchNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s?.color || 'text-slate-600 bg-slate-100'}`}>{s?.label || batch.status}</span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-950">{batch.menuItemName}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Planned: {batch.plannedQty}</span>
                      {batch.actualQty !== null && <span>Actual: {batch.actualQty}</span>}
                      {batch.wasteQty > 0 && <span>Waste: {batch.wasteQty}</span>}
                      <span>Cost: {formatCurrency(batch.totalCost || 0)}</span>
                      <span>Shift: {batch.shift}</span>
                      {batch.yield_ && <span>Yield: {batch.yield_}%</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{dateStr(batch.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {batch.status === 'planned' && <Button variant="subtle" className="h-7 rounded-xl px-2 text-[10px]" onClick={() => api.updateBatchStatus(batch.id, 'in_progress')}>Start</Button>}
                    {batch.status === 'in_progress' && <Button variant="subtle" className="h-7 rounded-xl px-2 text-[10px]" onClick={() => { setCompleteBatch(batch); setCompleteDraft({ actualQty: batch.plannedQty, wasteQty: 0, notes: '' }) }}>Complete</Button>}
                    {(batch.status === 'planned' || batch.status === 'in_progress') && <Button variant="subtle" className="h-7 rounded-xl px-2 text-[10px] text-rose-600" onClick={() => api.updateBatchStatus(batch.id, 'cancelled')}>Cancel</Button>}
                    <button onClick={() => handleDelete(batch.id)} className="rounded-xl border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50"><HiOutlineTrash className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          })}</div>}
      </Card>

      {/* New Batch Form */}
      {showForm ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Production</p><h2 className="mt-1 text-2xl font-black text-slate-950">New Batch</h2></div>
              <button type="button" onClick={() => setShowForm(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Menu Item</span>
                <select value={draft.menuItemId} onChange={(e) => selectItem(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                  <option value="">Select...</option>
                  {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.category})</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Planned Quantity</span>
                <Input type="number" min="1" value={draft.plannedQty} onChange={(e) => update('plannedQty', Number(e.target.value))} /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Shift</span>
                <select value={draft.shift} onChange={(e) => update('shift', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                  <option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
                </select></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Notes</span>
                <textarea value={draft.notes} onChange={(e) => update('notes', e.target.value)} className="mt-1 h-16 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleCreate}>Create Batch</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Complete Batch Form */}
      {completeBatch ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Complete</p><h2 className="mt-1 text-2xl font-black text-slate-950">{completeBatch.batchNumber}</h2></div>
              <button type="button" onClick={() => setCompleteBatch(null)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Actual Quantity</span>
                <Input type="number" min="0" value={completeDraft.actualQty} onChange={(e) => setCompleteDraft((p) => ({ ...p, actualQty: Number(e.target.value) }))} /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Waste Quantity</span>
                <Input type="number" min="0" value={completeDraft.wasteQty} onChange={(e) => setCompleteDraft((p) => ({ ...p, wasteQty: Number(e.target.value) }))} /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Notes</span>
                <textarea value={completeDraft.notes} onChange={(e) => setCompleteDraft((p) => ({ ...p, notes: e.target.value }))} className="mt-1 h-16 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setCompleteBatch(null)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleComplete}>Complete Batch</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
