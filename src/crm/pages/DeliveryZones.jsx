import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useDeliveryZones } from '../hooks/useDeliveryZones.js'
import { formatCurrency } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'

export default function DeliveryZonesPage() {
  const api = useDeliveryZones()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ name: '', description: '', baseCharge: 0, perKmCharge: 10, maxCharge: 0, maxDistance: 10, freeDeliveryThreshold: 0, minOrderAmount: 0, estimatedTime: 30 })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  async function handleSave() {
    if (!draft.name?.trim()) return show('error', 'Zone name required')
    const res = editing ? await api.updateZone(editing.id, draft) : await api.createZone(draft)
    if (res.ok) { show('success', `Zone ${editing ? 'updated' : 'created'}`); setShowCreate(false); setEditing(null) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete zone?', message: 'This will remove the delivery zone permanently.', confirmLabel: 'Delete' })) return
    const res = await api.deleteZone(id)
    if (res.ok) show('success', 'Zone deleted'); else show('error', res.error)
  }

  const columns = [
    { key: 'name', header: 'Zone', cell: (r) => <span className="font-semibold text-slate-950">{r.name}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description || '—' },
    { key: 'charges', header: 'Charges', cell: (r) => `Base: ${formatCurrency(r.baseCharge)} + ${formatCurrency(r.perKmCharge)}/km` },
    { key: 'maxDistance', header: 'Max Distance', cell: (r) => `${r.maxDistance || '∞'} km` },
    { key: 'freeDelivery', header: 'Free Delivery', cell: (r) => r.freeDeliveryThreshold > 0 ? `≥ ${formatCurrency(r.freeDeliveryThreshold)}` : '—' },
    { key: 'minOrder', header: 'Min Order', cell: (r) => r.minOrderAmount > 0 ? formatCurrency(r.minOrderAmount) : 'None' },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.active !== false ? 'success' : 'danger'}>{r.active !== false ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', cell: (r) => (
      <div className="flex justify-end gap-2">
        <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => { setEditing(r); setDraft(r); setShowCreate(true) }}><HiOutlinePencilSquare className="h-4 w-4" /></Button>
        <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs text-rose-700" onClick={() => handleDelete(r.id)}><HiOutlineTrash className="h-4 w-4" /></Button>
      </div>
    )},
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Delivery Zones" subtitle="Define delivery areas, pricing, and distance limits."
        right={<><Link to="/app/delivery"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={() => { setEditing(null); setShowCreate(true) }}><HiOutlinePlus /> Add Zone</Button></>} />

      <Card className="p-5">
        {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
          : api.zones.length ? <Table columns={columns} rows={api.zones} />
          : <EmptyState title="No delivery zones" description="Define delivery zones with charges, distance limits, and thresholds." actionLabel="Add Zone" onAction={() => setShowCreate(true)} />}
      </Card>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Zones</p><h2 className="mt-1 text-2xl font-black text-slate-950">{editing ? 'Edit Zone' : 'Add Zone'}</h2></div>
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null) }} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Zone Name *</span><Input value={draft.name} onChange={(e) => update('name', e.target.value)} required /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Description</span><Input value={draft.description} onChange={(e) => update('description', e.target.value)} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Base Charge</span><Input type="number" min="0" value={draft.baseCharge} onChange={(e) => update('baseCharge', Number(e.target.value))} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Per Km Charge</span><Input type="number" min="0" value={draft.perKmCharge} onChange={(e) => update('perKmCharge', Number(e.target.value))} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max Charge (0 = no limit)</span><Input type="number" min="0" value={draft.maxCharge} onChange={(e) => update('maxCharge', Number(e.target.value))} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max Distance (km, 0 = unlimited)</span><Input type="number" min="0" value={draft.maxDistance} onChange={(e) => update('maxDistance', Number(e.target.value))} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Free Delivery ≥</span><Input type="number" min="0" value={draft.freeDeliveryThreshold} onChange={(e) => update('freeDeliveryThreshold', Number(e.target.value))} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Min Order Amount</span><Input type="number" min="0" value={draft.minOrderAmount} onChange={(e) => update('minOrderAmount', Number(e.target.value))} /></label>
              </div>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Est. Delivery Time (min)</span><Input type="number" min="1" value={draft.estimatedTime} onChange={(e) => update('estimatedTime', Number(e.target.value))} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => { setShowCreate(false); setEditing(null) }}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleSave}>{editing ? 'Update' : 'Add Zone'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
