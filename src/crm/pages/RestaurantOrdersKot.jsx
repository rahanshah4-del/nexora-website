import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowPath,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
  HiOutlineXCircle,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import { cn } from '../utils/cn.js'
import {
  buildBillPrintTemplate,
  buildKotPrintTemplate,
  formatRestaurantCurrency,
} from '../lib/restaurantPosCalculations.js'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'

const filters = ['Today', 'Pending', 'Preparing', 'Served', 'Paid', 'Due', 'Cancelled']

const statusTone = {
  Pending: 'warning',
  pending: 'warning',
  Preparing: 'info',
  preparing: 'info',
  Served: 'purple',
  served: 'purple',
  ready: 'success',
  Paid: 'success',
  paid: 'success',
  Due: 'warning',
  due: 'warning',
  partial: 'warning',
  Cancelled: 'default',
  cancelled: 'default',
}

export default function RestaurantOrdersKotPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Today')
  const [preview, setPreview] = useState(null)
  const savedOrders = useMemo(() => loadRestaurantOrders(), [])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return savedOrders.filter((order) => {
      const orderStatus = String(order.orderStatus || '').toLowerCase()
      const paymentStatus = String(order.paymentStatus || '').toLowerCase()
      const normalizedFilter = activeFilter.toLowerCase()
      const matchesFilter =
        activeFilter === 'Today' ||
        orderStatus === normalizedFilter ||
        paymentStatus === normalizedFilter
      const matchesQuery =
        !needle ||
        [
          order.id,
          order.billNumber,
          order.kotNumber,
          order.table,
          order.orderType,
          order.customer,
          order.phone,
          order.paymentStatus,
          order.orderStatus,
        ].some((value) => String(value || '').toLowerCase().includes(needle))
      return matchesFilter && matchesQuery
    })
  }, [activeFilter, query, savedOrders])

  const report = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayRows = savedOrders.filter((order) => String(order.createdAt || '').slice(0, 10) === today)
    return {
      totalOrders: todayRows.length,
      totalSales: todayRows
        .filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.total || order.totals?.total || 0), 0),
      dueAmount: todayRows.reduce((sum, order) => sum + Number(order.due || order.dueAmount || 0), 0),
      cancelled: todayRows.filter((order) => String(order.orderStatus || '').toLowerCase() === 'cancelled').length,
    }
  }, [savedOrders])

  function billPreview(order) {
    setPreview({
      title: `${order.billNumber} 58mm Bill`,
      content: buildBillPrintTemplate({
        orderNumber: order.billNumber,
        table: order.table,
        orderType: order.orderType,
        rows: order.cartRows || [],
        totals: order.totals || { subtotal: order.total, discount: 0, serviceCharges: 0, tax: 0, total: order.total },
        paymentMethod: order.paymentStatus,
        notes: order.notes,
      }),
    })
  }

  function kotPreview(order) {
    setPreview({
      title: `${order.kotNumber} 58mm KOT`,
      content: buildKotPrintTemplate({
        kotNumber: order.kotNumber,
        table: order.table,
        orderType: order.orderType,
        rows: order.cartRows || [],
        notes: order.notes,
      }),
    })
  }

  function editOrder(order) {
    const params = new URLSearchParams({ order: order.orderNumber })
    if (order.orderType) params.set('mode', order.orderType)
    if (order.table) params.set('table', order.table)
    navigate(`/app/orders?${params.toString()}`)
  }

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="rounded-[1.25rem] p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Badge variant="info">Restaurant Orders</Badge>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Orders</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
              Search bills, KOT numbers, tables, customers, payment state, and daily order totals.
            </p>
          </div>
          <Button type="button" className="h-9 px-3 text-xs" onClick={() => navigate('/app/orders')}>
            <HiOutlineReceiptPercent className="h-4 w-4" />
            New Order
          </Button>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, bill, KOT, table, customer, or phone"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  activeFilter === filter
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700',
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Total Orders" value={report.totalOrders} />
        <ReportCard label="Total Sales" value={formatRestaurantCurrency(report.totalSales)} />
        <ReportCard label="Due Amount" value={formatRestaurantCurrency(report.dueAmount)} tone="text-rose-700" />
        <ReportCard label="Cancelled Orders" value={report.cancelled} tone="text-slate-500" />
      </div>

      <Card className="overflow-hidden rounded-[1.25rem] p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Table / Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{order.id || order.orderNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.billNumber}</p>
                    <p className="text-xs text-slate-500">{order.kotNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{order.table || order.orderType}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.orderType}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{order.customer}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.phone || 'No phone'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{order.itemsCount || 0} items</Badge>
                  </td>
                  <td className="px-4 py-3 font-black text-slate-950">{formatRestaurantCurrency(order.total || order.totals?.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusTone[order.paymentStatus] || 'default'}>{order.paymentStatus}</Badge>
                    {order.due || order.dueAmount ? <p className="mt-1 text-xs font-bold text-rose-700">Due {formatRestaurantCurrency(order.due || order.dueAmount)}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusTone[order.orderStatus] || 'default'}>{order.orderStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{order.time}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconButton label="View bill" onClick={() => billPreview(order)} icon={HiOutlineEye} />
                      <IconButton label="Edit order" onClick={() => editOrder(order)} icon={HiOutlinePencilSquare} />
                      <IconButton label="Cancel order" icon={HiOutlineXCircle} />
                      <IconButton label="Reprint bill" onClick={() => billPreview(order)} icon={HiOutlinePrinter} />
                      <IconButton label="Reprint KOT" onClick={() => kotPreview(order)} icon={HiOutlineArrowPath} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    No restaurant orders match this search or filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {preview ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black text-slate-950">{preview.title}</p>
              <button type="button" onClick={() => setPreview(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">x</button>
            </div>
            <pre className="mx-auto my-4 max-h-[70dvh] w-[58mm] overflow-auto whitespace-pre-wrap rounded bg-white p-3 font-mono text-[10px] leading-4 text-slate-950 shadow-inner">
              {preview.content}
            </pre>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Button type="button" variant="subtle" onClick={() => setPreview(null)}>Close</Button>
              <Button type="button" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

function ReportCard({ label, value, tone = 'text-slate-950' }) {
  return (
    <Card className="rounded-[1.15rem] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    </Card>
  )
}

function IconButton({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
