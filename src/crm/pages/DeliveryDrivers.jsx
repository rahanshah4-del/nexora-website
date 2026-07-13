import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
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
import { useDeliveryDrivers } from '../hooks/useDeliveryDrivers.js'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders.js'
import { driverPerformanceKPIs, formatETA } from '../lib/deliveryCalculations.js'
import { formatCompact } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'

export default function DeliveryDriversPage() {
  const api = useDeliveryDrivers()
  const ordersApi = useDeliveryOrders()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', vehicleType: 'motorcycle', vehicleNumber: '', maxLoad: 5, commissionRate: 10 })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...(p || {}), [f]: v }))

  async function handleSave() {
    if (!draft.name?.trim()) return show('error', 'Driver name required')
    const res = editing ? await api.updateDriver(editing.id, draft) : await api.createDriver(draft)
    if (res.ok) { show('success', `Driver ${editing ? 'updated' : 'created'}`); setShowCreate(false); setEditing(null) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete driver?', message: 'This will remove the driver permanently.', confirmLabel: 'Delete' })) return
    const res = await api.deleteDriver(id)
    if (res.ok) show('success', 'Driver deleted'); else show('error', res.error)
  }

  const kpis = useMemo(() => {
    return api.drivers.map((d) => ({ driver: d, kpi: driverPerformanceKPIs(d, ordersApi.orders.filter((o) => o.driverId === d.id)) }))
  }, [api.drivers, ordersApi.orders])

  const columns = [
    { key: 'name', header: 'Driver', cell: (r) => <span className="font-semibold text-slate-950">{r.name}</span> },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone || '—' },
    { key: 'vehicle', header: 'Vehicle', cell: (r) => `${r.vehicleType || ''} ${r.vehicleNumber || ''}`.trim() || '—' },
    { key: 'status', header: 'Status', cell: (r) => {
      const colors = { available: 'success', on_delivery: 'warning', offline: 'danger' }
      return <Badge variant={colors[r.status] || 'default'}>{r.status || 'offline'}</Badge>
    }},
    { key: 'load', header: 'Load', cell: (r) => `${r.currentLoad || 0}/${r.maxLoad || 5}` },
    { key: 'deliveries', header: 'Deliveries', cell: (r) => {
      const kpi = kpis.find((k) => k.driver.id === r.id)?.kpi
      return <span className="font-bold">{kpi?.completedDeliveries || 0}</span>
    }},
    { key: 'rating', header: 'Rating', cell: (r) => r.rating ? `${r.rating}/5` : '—' },
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
      <PageHeader title="Delivery Drivers" subtitle="Manage drivers, track performance, and view settlement data."
        right={<><Link to="/app/delivery"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={() => { setEditing(null); setDraft({ name: '', phone: '', email: '', vehicleType: 'motorcycle', vehicleNumber: '', maxLoad: 5, commissionRate: 10 }); setShowCreate(true) }}><HiOutlinePlus /> Add Driver</Button></>} />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ['Total Drivers', api.drivers.length],
          ['Available', api.availableDrivers.length],
          ['On Delivery', api.drivers.filter((d) => d.status === 'on_delivery').length],
          ['Avg Rating', api.drivers.length ? (api.drivers.reduce((s, d) => s + Number(d.rating || 0), 0) / api.drivers.length).toFixed(1) : '—'],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
          : api.drivers.length ? <Table columns={columns} rows={api.drivers} />
          : <EmptyState title="No drivers yet" description="Add delivery drivers to assign them to orders." actionLabel="Add Driver" onAction={() => setShowCreate(true)} />}
      </Card>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Drivers</p><h2 className="mt-1 text-2xl font-black text-slate-950">{editing ? 'Edit Driver' : 'Add Driver'}</h2></div>
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null) }} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Name *</span><Input value={draft.name} onChange={(e) => update('name', e.target.value)} required /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Phone</span><Input value={draft.phone} onChange={(e) => update('phone', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Vehicle Type</span>
                  <select value={draft.vehicleType} onChange={(e) => update('vehicleType', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                    <option value="motorcycle">Motorcycle</option><option value="car">Car</option><option value="van">Van</option><option value="bicycle">Bicycle</option><option value="truck">Truck</option>
                  </select></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Vehicle Number</span><Input value={draft.vehicleNumber} onChange={(e) => update('vehicleNumber', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max Load (orders)</span><Input type="number" min="1" max="20" value={draft.maxLoad} onChange={(e) => update('maxLoad', Number(e.target.value))} /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Commission %</span><Input type="number" min="0" max="100" value={draft.commissionRate} onChange={(e) => update('commissionRate', Number(e.target.value))} /></label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => { setShowCreate(false); setEditing(null) }}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleSave}>{editing ? 'Update' : 'Add Driver'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
