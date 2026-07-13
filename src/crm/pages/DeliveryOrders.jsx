import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { HiOutlineArrowPath, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders.js'
import { useDeliveryDrivers } from '../hooks/useDeliveryDrivers.js'
import { DELIVERY_ORDER_STATUSES, formatETA } from '../lib/deliveryCalculations.js'
import { formatCurrency } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'

function dateStr(v) {
  if (!v) return '—'
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export default function DeliveryOrdersPage() {
  const api = useDeliveryOrders()
  const driversApi = useDeliveryDrivers()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [assigning, setAssigning] = useState('')

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }

  const filtered = useMemo(() => {
    let list = api.orders
    if (filterStatus !== 'all') list = list.filter((o) => o.status === filterStatus)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((o) => [o.orderNumber, o.customerName, o.customerPhone, o.deliveryAddress].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    return list.sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt || 0).getTime()
      const tb = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
  }, [api.orders, filterStatus, search])

  async function handleTransition(id, status) {
    const res = await api.updateStatus(id, status)
    if (res.ok) show('success', `Order status updated to ${status}`); else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete order?', message: 'This will permanently remove this delivery order.', confirmLabel: 'Delete' })) return
    const res = await api.deleteDeliveryOrder(id)
    if (res.ok) show('success', 'Order deleted'); else show('error', res.error)
  }

  async function handleAssign(deliveryOrderId, driverId) {
    setAssigning(deliveryOrderId)
    const res = await driversApi.assignDriver(deliveryOrderId, driverId)
    if (res.ok) show('success', 'Driver assigned'); else show('error', res.error)
    setAssigning('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Delivery Orders" subtitle="Manage all delivery, pickup, and scheduled orders."
        right={<Link to="/app/delivery"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>} />

      <Card className="p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterStatus('all')} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterStatus === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>All ({api.orders.length})</button>
          {DELIVERY_ORDER_STATUSES.slice(0, 7).map((s) => {
            const count = api.orders.filter((o) => o.status === s.id).length
            return <button key={s.id} onClick={() => setFilterStatus(s.id)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterStatus === s.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{s.label} ({count})</button>
          })}
        </div>
        <Input placeholder="Search by order #, customer, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-4 space-y-3">
          {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>
            : filtered.length ? filtered.map((order) => {
              const statusDef = DELIVERY_ORDER_STATUSES.find((s) => s.id === order.status) || DELIVERY_ORDER_STATUSES[0]
              const driver = driversApi.drivers.find((d) => d.id === order.driverId)
              const validNext = api.getValidTransitions(order.status)
              return (
                <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-950">{order.orderNumber || order.id.slice(0, 8)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusDef.color}`}>{statusDef.label}</span>
                        <Badge variant={order.orderType === 'delivery' ? 'info' : order.orderType === 'pickup' ? 'warning' : 'default'}>{order.orderType}</Badge>
                        {order.paymentStatus === 'paid' ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">{order.paymentStatus}</Badge>}
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
                        <p><span className="font-semibold text-slate-950">{order.customerName}</span> {order.customerPhone ? `· ${order.customerPhone}` : ''}</p>
                        <p className="truncate">{order.deliveryAddress || 'No address'}</p>
                        <p className="text-right text-xs text-slate-500">{dateStr(order.createdAt)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-semibold">Rs {formatCurrency(order.total)}</span>
                        {order.deliveryFee > 0 && <span>+ Rs {order.deliveryFee} delivery</span>}
                        {driver && <span>Driver: {driver.name}</span>}
                        {order.estimatedEta && <span>ETA: {dateStr(order.estimatedEta)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {validNext.filter((s) => s !== 'cancelled').slice(0, 2).map((nextStatus) => {
                        const ns = DELIVERY_ORDER_STATUSES.find((s) => s.id === nextStatus)
                        return <Button key={nextStatus} variant="subtle" className="h-7 rounded-xl px-2 text-[10px]" onClick={() => handleTransition(order.id, nextStatus)}>{ns?.label || nextStatus}</Button>
                      })}
                      {!order.driverId && driversApi.availableDrivers.length > 0 && (
                        <select value="" onChange={(e) => { if (e.target.value) handleAssign(order.id, e.target.value) }}
                          className="h-7 rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-bold outline-none">
                          <option value="">Assign driver</option>
                          {driversApi.availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      )}
                      <button onClick={() => setSelected(order)} className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><HiOutlineEye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(order.id)} className="rounded-xl border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50"><HiOutlineTrash className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            }) : <EmptyState title="No delivery orders" description="Delivery orders will appear here when customers place online orders." />}
        </div>
      </Card>
    </motion.div>
  )
}
