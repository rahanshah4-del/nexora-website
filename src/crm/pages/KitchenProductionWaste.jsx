import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useRestaurantWasteTracking } from '../hooks/useRestaurantWasteTracking.js'
import { useRestaurantIngredients } from '../hooks/useRestaurantRecipes.js'
import { formatCurrency } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'

export default function KitchenProductionWastePage() {
  const api = useRestaurantWasteTracking()
  const { ingredients } = useRestaurantIngredients()
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ ingredientId: '', quantity: 1, reason: 'production_waste', notes: '' })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  async function handleRecord() {
    if (!draft.ingredientId || !draft.quantity) return show('error', 'Ingredient and quantity required')
    const ing = ingredients.find((i) => i.id === draft.ingredientId)
    const res = await api.recordWaste({
      ingredientId: draft.ingredientId,
      ingredientName: ing?.name || 'Unknown',
      quantity: Number(draft.quantity),
      reason: draft.reason,
      notes: draft.notes,
    })
    if (res.ok) { show('success', 'Waste recorded'); setShowForm(false); setDraft({ ingredientId: '', quantity: 1, reason: 'production_waste', notes: '' }) }
    else show('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Production Waste" subtitle="Record ingredient waste during production with cost tracking and inventory adjustment."
        right={<><Link to="/app/kitchen-production"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={() => setShowForm(true)}><HiOutlinePlus /> Record Waste</Button></>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
            : api.wasteRecords.length === 0 ? <EmptyState title="No waste recorded" description="Record production waste to track ingredient loss." actionLabel="Record Waste" onAction={() => setShowForm(true)} />
            : [...api.wasteRecords].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0)).map((record) => (
              <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-950">{record.ingredientName || 'Unknown'}</span>
                      <Badge variant="warning">{record.reason || 'production_waste'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Qty: {record.quantity} · Cost: {formatCurrency(record.totalCost || 0)}</p>
                    {record.notes && <p className="text-xs text-slate-400">{record.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
        </div>

        <Card className="p-5 h-fit">
          <p className="text-sm font-bold text-slate-950">Waste Summary</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Records</span><span className="font-bold">{api.wasteRecords.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Total Cost</span><span className="font-bold text-rose-700">{formatCurrency(api.totals?.totalCost || 0)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Total Qty</span><span className="font-bold">{api.totals?.totalQty || 0}</span></div>
          </div>
        </Card>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Waste</p><h2 className="mt-1 text-2xl font-black text-slate-950">Record Waste</h2></div>
              <button type="button" onClick={() => setShowForm(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ingredient</span>
                <select value={draft.ingredientId} onChange={(e) => update('ingredientId', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                  <option value="">Select...</option>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name} (stock: {ing.stockQuantity})</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Quantity</span>
                <Input type="number" min="0.1" step="0.1" value={draft.quantity} onChange={(e) => update('quantity', Number(e.target.value))} /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reason</span>
                <select value={draft.reason} onChange={(e) => update('reason', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                  <option value="production_waste">Production Waste</option>
                  <option value="spoilage">Spoilage</option>
                  <option value="overproduction">Overproduction</option>
                  <option value="expired">Expired</option>
                  <option value="damaged">Damaged</option>
                  <option value="quality_reject">Quality Reject</option>
                  <option value="other">Other</option>
                </select></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Notes</span>
                <textarea value={draft.notes} onChange={(e) => update('notes', e.target.value)} className="mt-1 h-16 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleRecord}>Record Waste</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
