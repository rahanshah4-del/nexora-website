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
import { loadRestaurantOrders, upsertRestaurantOrder } from '../data/restaurantOrders.js'
import { normalizeInvoiceOrders } from '../data/restaurantInvoiceOrders.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import {
  formatRestaurantBusinessWindow,
  isWithinRestaurantBusinessDay,
  restaurantBusinessDateKey,
} from '../lib/restaurantBusinessDay.js'

const filters = ['Today', 'Pending', 'Preparing', 'Served', 'Paid', 'Due', 'Cancelled']
const restaurantTablesStorageKey = 'nexora.restaurant.tables.v1'

function moneyValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

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

function releaseRestaurantTable(tableId) {
  if (typeof window === 'undefined' || !tableId) return
  try {
    const stored = window.localStorage.getItem(restaurantTablesStorageKey)
    const floors = stored ? JSON.parse(stored) : []
    if (!Array.isArray(floors)) return
    const nextFloors = floors.map((floor) => ({
      ...floor,
      tables: Array.isArray(floor.tables)
        ? floor.tables.map((table) => (
            table.id === tableId
              ? {
                  ...table,
                  status: 'available',
                  order: '',
                  orderNumber: '',
                  kotNumber: '',
                  billNumber: '',
                  total: '',
                  customer: '',
                }
              : table
          ))
        : [],
    }))
    window.localStorage.setItem(restaurantTablesStorageKey, JSON.stringify(nextFloors))
  } catch {
    // Local table state is best-effort; order cancellation still continues.
  }
}

function occupyRestaurantTable(tableId, order) {
  if (typeof window === 'undefined' || !tableId) return
  try {
    const stored = window.localStorage.getItem(restaurantTablesStorageKey)
    const floors = stored ? JSON.parse(stored) : []
    if (!Array.isArray(floors)) return
    const nextFloors = floors.map((floor) => ({
      ...floor,
      tables: Array.isArray(floor.tables)
        ? floor.tables.map((table) => (
            table.id === tableId
              ? {
                  ...table,
                  status: 'occupied',
                  order: order.orderNumber,
                  orderNumber: order.orderNumber,
                  kotNumber: order.kotNumber,
                  billNumber: order.billNumber,
                  total: formatRestaurantCurrency(order.total || order.totals?.total || 0),
                  customer: order.customer || 'Walk-in Guest',
                }
              : table
          ))
        : [],
    }))
    window.localStorage.setItem(restaurantTablesStorageKey, JSON.stringify(nextFloors))
  } catch {
    // Local table state is best-effort; order edit still continues.
  }
}

function buildTodayClosingReportData({ orders = [], expenses = [], reportDate = new Date().toISOString().slice(0, 10), settings = {} } = {}) {
  const activeOrders = orders.filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled')
  const cancelledOrders = orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'cancelled')
  const simpleOrders = activeOrders.filter((order) => order.sourceKind !== 'invoice')
  const invoiceOrders = activeOrders.filter((order) => order.sourceKind === 'invoice')
  const totalSales = activeOrders.reduce((sum, order) => sum + moneyValue(order.total || order.totals?.total), 0)
  const paidAmount = activeOrders.reduce((sum, order) => sum + moneyValue(order.paidAmount), 0)
  const dueAmount = activeOrders.reduce((sum, order) => sum + moneyValue(order.due || order.dueAmount), 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + moneyValue(expense.amount), 0)
  const cashSales = activeOrders.filter((order) => String(order.paymentMethod || '').toLowerCase() === 'cash').reduce((sum, order) => sum + moneyValue(order.paidAmount), 0)
  const digitalSales = activeOrders.filter((order) => ['card', 'jazzcash', 'easypaisa', 'bank'].includes(String(order.paymentMethod || '').toLowerCase())).reduce((sum, order) => sum + moneyValue(order.paidAmount), 0)
  const averageOrderValue = activeOrders.length ? totalSales / activeOrders.length : 0
  const categoryMap = new Map()
  const typeMap = new Map()

  activeOrders.forEach((order) => {
    const type = order.orderType || 'Order'
    typeMap.set(type, (typeMap.get(type) || 0) + moneyValue(order.total || order.totals?.total))
    ;(order.cartRows || []).forEach((row) => {
      const category = row.item?.category || row.category || (order.sourceKind === 'invoice' ? 'Invoice Items' : 'Menu Items')
      const current = categoryMap.get(category) || { qty: 0, amount: 0 }
      const qty = moneyValue(row.qty ?? row.quantity)
      categoryMap.set(category, {
        qty: current.qty + qty,
        amount: current.amount + moneyValue(row.lineTotal || row.item?.price * qty),
      })
    })
  })

  const categories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([category, row]) => ({ category, ...row }))

  return {
    restaurantName: settings.restaurantName || settings.businessName || 'Restaurant',
    branchName: settings.branchName || '',
    phone: settings.phone || '',
    reportDate,
    printedAt: new Date().toLocaleString(),
    summary: {
      orders: activeOrders.length,
      simpleOrders: simpleOrders.length,
      invoiceOrders: invoiceOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalSales,
      paidAmount,
      dueAmount,
      cashSales,
      digitalSales,
      expenseTotal,
      netAfterExpenses: Math.max(0, totalSales - expenseTotal),
      averageOrderValue,
    },
    orderTypes: Array.from(typeMap.entries()).map(([label, amount]) => ({ label, amount })),
    orders: activeOrders.slice(0, 18),
    categories: categories.slice(0, 10),
    invoices: invoiceOrders.slice(0, 8),
    expenses: expenses.slice(0, 8),
  }
}

export default function RestaurantOrdersKotPage() {
  const navigate = useNavigate()
  const { invoices } = useInvoices({ limitCount: 50 })
  const expensesApi = useExpenses({ limitCount: 100 })
  const { settings } = useBusinessSettings()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Today')
  const [selectedDate, setSelectedDate] = useState('')
  const [preview, setPreview] = useState(null)
  const [ordersVersion, setOrdersVersion] = useState(0)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({
    orderStatus: 'pending',
    paymentStatus: 'due',
    paidAmount: '',
    cancelReason: '',
    freeTable: false,
  })
  const [editError, setEditError] = useState('')
  const savedOrders = useMemo(() => [...loadRestaurantOrders(), ...normalizeInvoiceOrders(invoices)], [invoices, ordersVersion])
  const todayKey = restaurantBusinessDateKey(new Date(), settings)
  const businessDayLabel = formatRestaurantBusinessWindow(settings)
  const todayOrders = useMemo(
    () => savedOrders.filter((order) => isWithinRestaurantBusinessDay(order.createdAt || order.date, settings)),
    [savedOrders, settings],
  )
  const todayExpenses = useMemo(
    () => expensesApi.expenses.filter((expense) => isWithinRestaurantBusinessDay(expense.approvedAt || expense.createdAt, settings)),
    [expensesApi.expenses, settings],
  )

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return savedOrders.filter((order) => {
      const orderStatus = String(order.orderStatus || '').toLowerCase()
      const paymentStatus = String(order.paymentStatus || '').toLowerCase()
      const normalizedFilter = activeFilter.toLowerCase()
      const orderDate = restaurantBusinessDateKey(order.createdAt || order.date, settings)
      const matchesDate = !selectedDate || orderDate === selectedDate
      const matchesFilter =
        (selectedDate ? true : activeFilter === 'Today' && isWithinRestaurantBusinessDay(order.createdAt || order.date, settings)) ||
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
      return matchesDate && matchesFilter && matchesQuery
    })
  }, [activeFilter, query, savedOrders, selectedDate, settings])

  const report = useMemo(() => {
    const todayRows = savedOrders.filter((order) => isWithinRestaurantBusinessDay(order.createdAt || order.date, settings))
    return {
      totalOrders: todayRows.length,
      simpleOrders: todayRows.filter((order) => order.sourceKind !== 'invoice').length,
      invoiceOrders: todayRows.filter((order) => order.sourceKind === 'invoice').length,
      totalSales: todayRows
        .filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.total || order.totals?.total || 0), 0),
      dueAmount: todayRows.reduce((sum, order) => sum + Number(order.due || order.dueAmount || 0), 0),
      cancelled: todayRows.filter((order) => String(order.orderStatus || '').toLowerCase() === 'cancelled').length,
    }
  }, [savedOrders, settings])

  function billPreview(order) {
    if (order.sourceKind === 'invoice') {
      setPreview({ title: `${order.billNumber} A4 Invoice`, size: 'a4', order })
      return
    }
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
    if (order.sourceKind === 'invoice') {
      billPreview(order)
      return
    }
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
    if (order.sourceKind === 'invoice') {
      navigate('/app/invoices')
      return
    }
    setEditTarget(order)
    setEditForm({
      orderStatus: String(order.orderStatus || 'pending').toLowerCase(),
      paymentStatus: String(order.paymentStatus || 'due').toLowerCase(),
      paidAmount: String(Math.round(Number(order.paidAmount || 0))),
      cancelReason: order.cancelReason || '',
      freeTable: ['paid', 'cancelled'].includes(String(order.paymentStatus || order.orderStatus || '').toLowerCase()) ||
        String(order.orderStatus || '').toLowerCase() === 'cancelled',
    })
    setEditError('')
  }

  function openOrderInBilling(order = editTarget) {
    if (!order) return
    const params = new URLSearchParams({ order: order.orderNumber })
    if (order.orderType) params.set('mode', order.orderType)
    if (order.table) params.set('table', order.table)
    navigate(`/app/orders?${params.toString()}`)
  }

  function saveEditedOrder() {
    if (!editTarget) return
    const nextOrderStatus = String(editForm.orderStatus || 'pending').toLowerCase()
    const nextPaymentStatus = String(editForm.paymentStatus || 'due').toLowerCase()
    if (nextOrderStatus === 'cancelled' && !editForm.cancelReason.trim()) {
      setEditError('Cancel reason is required when order status is cancelled.')
      return
    }
    const total = Number(editTarget.total || editTarget.totals?.total || 0)
    const paidAmount = nextPaymentStatus === 'paid'
      ? total
      : nextPaymentStatus === 'due'
        ? 0
        : Math.min(total, Math.max(0, Number(editForm.paidAmount || 0)))
    const nextOrder = {
      ...editTarget,
      orderStatus: nextOrderStatus,
      paymentStatus: nextPaymentStatus,
      paidAmount,
      cancelReason: nextOrderStatus === 'cancelled' ? editForm.cancelReason.trim() : '',
      cancelledAt: nextOrderStatus === 'cancelled' ? editTarget.cancelledAt || new Date().toISOString() : '',
      editedAt: new Date().toISOString(),
    }
    upsertRestaurantOrder(nextOrder)
    if (nextOrder.table) {
      if (editForm.freeTable || nextPaymentStatus === 'paid' || nextOrderStatus === 'cancelled') {
        releaseRestaurantTable(nextOrder.table)
      } else {
        occupyRestaurantTable(nextOrder.table, nextOrder)
      }
    }
    setEditTarget(null)
    setOrdersVersion((current) => current + 1)
    setActiveFilter(nextOrderStatus === 'cancelled' ? 'Cancelled' : nextPaymentStatus === 'paid' ? 'Paid' : 'Today')
  }

  function requestCancelOrder(order) {
    setCancelTarget(order)
    setCancelReason('')
    setCancelError('')
  }

  function confirmCancelOrder() {
    if (!cancelTarget) return
    if (cancelTarget.sourceKind === 'invoice') {
      setCancelTarget(null)
      navigate('/app/invoices')
      return
    }
    if (!cancelReason.trim()) {
      setCancelError('Cancel reason is required.')
      return
    }
    upsertRestaurantOrder({
      ...cancelTarget,
      orderStatus: 'cancelled',
      paymentStatus: 'cancelled',
      cancelReason: cancelReason.trim(),
      cancelledAt: new Date().toISOString(),
    })
    releaseRestaurantTable(cancelTarget.table)
    setCancelTarget(null)
    setOrdersVersion((current) => current + 1)
    setActiveFilter('Cancelled')
  }

  function openTodayReport() {
    setPreview({
      title: 'Today Report 58mm',
      size: 'today-report',
      data: buildTodayClosingReportData({
        orders: todayOrders,
        expenses: todayExpenses,
        reportDate: businessDayLabel,
        settings: {
          ...(settings || {}),
          ...(settings?.restaurantPos || {}),
        },
      }),
    })
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="subtle" className="h-9 px-3 text-xs" onClick={openTodayReport}>
              <HiOutlinePrinter className="h-4 w-4" />
              Today Report
            </Button>
            <Button type="button" className="h-9 px-3 text-xs" onClick={() => navigate('/app/orders')}>
              <HiOutlineReceiptPercent className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative min-w-0">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, bill, KOT, table, customer, or phone"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-300"
              aria-label="Filter orders by date"
            />
            {selectedDate ? (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
              >
                Clear
              </button>
            ) : null}
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
        <ReportCard label="Simple Orders" value={report.simpleOrders} />
        <ReportCard label="Invoice Orders" value={report.invoiceOrders} />
        <ReportCard label="Total Sales" value={formatRestaurantCurrency(report.totalSales)} />
        <ReportCard label="Due Amount" value={formatRestaurantCurrency(report.dueAmount)} tone="text-rose-700" />
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
                    {String(order.orderStatus || '').toLowerCase() !== 'cancelled' && (order.due || order.dueAmount) ? (
                      <p className="mt-1 text-xs font-bold text-rose-700">Due {formatRestaurantCurrency(order.due || order.dueAmount)}</p>
                    ) : null}
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
                      <IconButton label="Cancel order" onClick={() => requestCancelOrder(order)} icon={HiOutlineXCircle} />
                      <IconButton label={order.sourceKind === 'invoice' ? 'Print A4 invoice' : 'Reprint bill'} onClick={() => billPreview(order)} icon={HiOutlinePrinter} />
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
          <div className={cn('w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl', preview.size === 'a4' ? 'max-w-5xl' : 'max-w-sm')}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black text-slate-950">{preview.title}</p>
              <button type="button" onClick={() => setPreview(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">x</button>
            </div>
            <div className="max-h-[70dvh] overflow-auto bg-slate-50 px-4 py-4">
              {preview.size === 'a4' ? <InvoiceOrderA4Preview order={preview.order} /> : null}
              {preview.size === 'today-report' ? <TodayClosingReportPreview data={preview.data} /> : null}
              {!preview.size ? (
                <pre className="mx-auto w-[58mm] whitespace-pre-wrap rounded bg-white p-3 font-mono text-[10px] leading-4 text-slate-950 shadow-inner">
                  {preview.content}
                </pre>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Button type="button" variant="subtle" onClick={() => setPreview(null)}>Close</Button>
              <Button type="button" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-[94] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Edit Order</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{editTarget.orderNumber || editTarget.id}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Change payment/status after save. Use Open Billing for item changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close edit order"
              >
                x
              </button>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Order Status</label>
                <select
                  value={editForm.orderStatus}
                  onChange={(event) => {
                    const orderStatus = event.target.value
                    setEditForm((current) => ({
                      ...current,
                      orderStatus,
                      freeTable: orderStatus === 'cancelled' ? true : current.freeTable,
                    }))
                    setEditError('')
                  }}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="served">Served</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Payment Status</label>
                <select
                  value={editForm.paymentStatus}
                  onChange={(event) => {
                    const paymentStatus = event.target.value
                    setEditForm((current) => ({
                      ...current,
                      paymentStatus,
                      paidAmount: paymentStatus === 'paid' ? String(Math.round(Number(editTarget.total || editTarget.totals?.total || 0))) : paymentStatus === 'due' ? '0' : current.paidAmount,
                      freeTable: paymentStatus === 'paid' ? true : current.freeTable,
                    }))
                  }}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
                >
                  <option value="due">Due</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Paid Amount</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.paidAmount}
                  onChange={(event) => setEditForm((current) => ({ ...current, paidAmount: event.target.value, paymentStatus: 'partial' }))}
                  disabled={editForm.paymentStatus === 'paid' || editForm.paymentStatus === 'due'}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="0"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Table</p>
                <p className="mt-1 text-sm font-black text-slate-950">{editTarget.table || editTarget.orderType}</p>
                <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.freeTable)}
                    onChange={(event) => setEditForm((current) => ({ ...current, freeTable: event.target.checked }))}
                    className="h-4 w-4 accent-slate-950"
                  />
                  Free table / close holder
                </label>
              </div>
              {editForm.orderStatus === 'cancelled' ? (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Cancel Reason</label>
                  <textarea
                    value={editForm.cancelReason}
                    onChange={(event) => {
                      setEditForm((current) => ({ ...current, cancelReason: event.target.value }))
                      setEditError('')
                    }}
                    className="mt-1.5 min-h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                    placeholder="Reason required if status is cancelled"
                  />
                </div>
              ) : null}
              {editError ? <p className="sm:col-span-2 text-xs font-semibold text-rose-600">{editError}</p> : null}
              <div className="sm:col-span-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                Paid status full amount mark karega. Due status paid amount zero karega. Partial me custom paid amount save hoga.
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-3">
              <Button type="button" variant="subtle" onClick={() => setEditTarget(null)}>Close</Button>
              <Button type="button" variant="subtle" onClick={() => openOrderInBilling(editTarget)}>Open Billing</Button>
              <Button type="button" onClick={saveEditedOrder}>Save Changes</Button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelTarget ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
                <HiOutlineXCircle className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-950">
                {cancelTarget.sourceKind === 'invoice' ? 'Open invoice module?' : 'Cancel order?'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {cancelTarget.sourceKind === 'invoice'
                  ? `${cancelTarget.billNumber} is an invoice order. Open Invoices to cancel or edit it.`
                  : `${cancelTarget.orderNumber || cancelTarget.id} will be marked cancelled. If it has a dine-in table, the table will become available.`}
              </p>
              {cancelTarget.sourceKind !== 'invoice' ? (
                <div className="mt-4 text-left">
                  <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Cancel reason</label>
                  <textarea
                    value={cancelReason}
                    onChange={(event) => {
                      setCancelReason(event.target.value)
                      setCancelError('')
                    }}
                    className="mt-1.5 min-h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                    placeholder="Reason required before cancelling this order"
                  />
                  {cancelError ? <p className="mt-1 text-xs font-semibold text-rose-600">{cancelError}</p> : null}
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Button type="button" variant="subtle" onClick={() => setCancelTarget(null)}>Back</Button>
              <Button type="button" onClick={confirmCancelOrder}>
                {cancelTarget.sourceKind === 'invoice' ? 'OK, Open' : 'OK, Cancel Order'}
              </Button>
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

function ReceiptSection({ title, children }) {
  return (
    <section className="border-t border-dashed border-slate-300 pt-2">
      <p className="mb-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{title}</p>
      {children}
    </section>
  )
}

function MiniLine({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-2 text-[10.5px] leading-4">
      <span className="min-w-0 text-slate-600">{label}</span>
      <span className={cn('shrink-0 text-right text-slate-950', strong ? 'text-[12px] font-black' : 'font-bold')}>{value}</span>
    </div>
  )
}

function TodayClosingReportPreview({ data = {} }) {
  const summary = data.summary || {}
  return (
    <article className="mx-auto w-[58mm] rounded-2xl border border-slate-200 bg-white p-3 font-mono text-slate-950 shadow-inner">
      <header className="text-center">
        <p className="text-[15px] font-black uppercase leading-5 tracking-wide">{data.restaurantName || 'Restaurant'}</p>
        {data.branchName ? <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{data.branchName}</p> : null}
        {data.phone ? <p className="mt-0.5 text-[9.5px] text-slate-500">{data.phone}</p> : null}
        <div className="my-2 border-t border-dashed border-slate-300" />
        <p className="text-[13px] font-black uppercase tracking-[0.2em]">Today Report</p>
        <p className="mt-1 text-[10px] font-bold text-slate-600">{data.reportDate}</p>
        <p className="text-[9px] text-slate-500">Printed {data.printedAt}</p>
      </header>

      <div className="mt-2 space-y-2">
        <ReceiptSection title="Closing Summary">
          <MiniLine label="Total Orders" value={summary.orders || 0} />
          <MiniLine label="Simple Orders" value={summary.simpleOrders || 0} />
          <MiniLine label="Invoice Orders" value={summary.invoiceOrders || 0} />
          <MiniLine label="Cancelled" value={summary.cancelledOrders || 0} />
          <MiniLine label="Total Sales" value={formatRestaurantCurrency(summary.totalSales)} strong />
          <MiniLine label="Paid Amount" value={formatRestaurantCurrency(summary.paidAmount)} />
          <MiniLine label="Due Amount" value={formatRestaurantCurrency(summary.dueAmount)} />
          <MiniLine label="Average Order" value={formatRestaurantCurrency(summary.averageOrderValue)} />
        </ReceiptSection>

        <ReceiptSection title="Cash Control">
          <MiniLine label="Cash Received" value={formatRestaurantCurrency(summary.cashSales)} />
          <MiniLine label="Card/Online" value={formatRestaurantCurrency(summary.digitalSales)} />
          <MiniLine label="Expenses" value={formatRestaurantCurrency(summary.expenseTotal)} />
          <MiniLine label="Net After Expenses" value={formatRestaurantCurrency(summary.netAfterExpenses)} strong />
        </ReceiptSection>

        <ReceiptSection title="Order Type Sale">
          {data.orderTypes?.length ? data.orderTypes.map((row) => (
            <MiniLine key={row.label} label={row.label} value={formatRestaurantCurrency(row.amount)} />
          )) : <p className="text-center text-[10px] text-slate-500">No order type sale</p>}
        </ReceiptSection>

        <ReceiptSection title="Category Sale">
          {data.categories?.length ? data.categories.map((row) => (
            <div key={row.category} className="mb-1">
              <MiniLine label={row.category} value={formatRestaurantCurrency(row.amount)} />
              <p className="text-[9px] font-bold text-slate-500">Qty {row.qty}</p>
            </div>
          )) : <p className="text-center text-[10px] text-slate-500">No category sales</p>}
        </ReceiptSection>

        <ReceiptSection title="Order Detail">
          {data.orders?.length ? data.orders.map((order) => (
            <div key={order.id || order.orderNumber} className="mb-1 border-b border-slate-100 pb-1 last:border-b-0">
              <MiniLine label={`${order.orderNumber || order.id} ${order.table || ''}`} value={formatRestaurantCurrency(order.total || order.totals?.total)} />
              <p className="truncate text-[9px] font-bold text-slate-500">{order.customer || 'Walk-in'} · {order.paymentStatus || '-'}</p>
            </div>
          )) : <p className="text-center text-[10px] text-slate-500">No orders today</p>}
        </ReceiptSection>

        <ReceiptSection title="Invoice Orders">
          {data.invoices?.length ? data.invoices.map((order) => (
            <MiniLine key={order.id || order.orderNumber} label={order.billNumber || order.orderNumber} value={formatRestaurantCurrency(order.total)} />
          )) : <p className="text-center text-[10px] text-slate-500">No invoice orders</p>}
        </ReceiptSection>

        <ReceiptSection title="Expenses">
          {data.expenses?.length ? data.expenses.map((expense) => (
            <MiniLine key={expense.id || expense.title} label={expense.title || expense.category || 'Expense'} value={formatRestaurantCurrency(expense.amount)} />
          )) : <p className="text-center text-[10px] text-slate-500">No expenses today</p>}
        </ReceiptSection>
      </div>

      <footer className="mt-3 border-t border-dashed border-slate-300 pt-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">NEXORA SOLUTION</p>
        <p className="mt-0.5 text-[8.5px] font-bold text-slate-500">All rights reserved 2019-2026</p>
      </footer>
    </article>
  )
}

function InvoiceOrderA4Preview({ order }) {
  return (
    <article className="mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-8 text-slate-950 shadow-inner">
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-950 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">NEXORA SOLUTION</p>
          <h2 className="mt-2 text-3xl font-black">Invoice Order</h2>
          <p className="mt-1 text-sm text-slate-600">{order.customer}</p>
          {order.phone ? <p className="text-sm text-slate-600">{order.phone}</p> : null}
        </div>
        <div className="text-right text-sm">
          <p className="font-black">{order.billNumber}</p>
          <p className="text-slate-600">{order.date} {order.time}</p>
          <p className="mt-2 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">{order.paymentStatus}</p>
        </div>
      </header>

      <table className="mt-6 w-full border-collapse text-left text-sm">
        <thead className="bg-slate-950 text-white">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.cartRows.length ? order.cartRows.map((row) => (
            <tr key={row.itemId} className="border-b border-slate-200">
              <td className="px-3 py-2">
                <b>{row.item?.name || 'Invoice item'}</b>
                {row.note ? <p className="text-xs text-slate-500">{row.note}</p> : null}
              </td>
              <td className="px-3 py-2 text-right">{row.quantity || row.qty}</td>
              <td className="px-3 py-2 text-right">{formatRestaurantCurrency(row.item?.price || 0)}</td>
              <td className="px-3 py-2 text-right font-bold">{formatRestaurantCurrency(row.lineTotal)}</td>
            </tr>
          )) : (
            <tr><td className="px-3 py-4 text-slate-500" colSpan={4}>No invoice item rows saved.</td></tr>
          )}
        </tbody>
      </table>

      <section className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
        <SummaryLine label="Subtotal" value={formatRestaurantCurrency(order.totals.subtotal)} />
        <SummaryLine label="Discount" value={formatRestaurantCurrency(order.totals.discount)} />
        <SummaryLine label="Tax" value={formatRestaurantCurrency(order.totals.tax)} />
        <SummaryLine label="Total" value={formatRestaurantCurrency(order.total)} strong />
        <SummaryLine label="Paid" value={formatRestaurantCurrency(order.paidAmount)} />
        <SummaryLine label="Due" value={formatRestaurantCurrency(order.dueAmount)} />
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500">
        NEXORA SOLUTION - All rights reserved 2019-2026.
      </footer>
    </article>
  )
}

function SummaryLine({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-1">
      <span className="text-slate-600">{label}</span>
      <span className={strong ? 'text-lg font-black text-slate-950' : 'font-bold text-slate-950'}>{value}</span>
    </div>
  )
}
