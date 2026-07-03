import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineDocumentChartBar, HiOutlinePrinter, HiOutlineReceiptPercent, HiOutlineShoppingBag, HiOutlineTrash, HiOutlineBolt } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Table from '../components/ui/Table.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { usePosOrders } from '../hooks/usePosOrders.js'
import { usePosWalletPayments } from '../hooks/usePosWalletPayments.js'
import { formatCurrency } from '../utils/format.js'
import { confirmAction } from '../components/ui/dialogActions.js'
import { openBrowserPrintHtml } from '../lib/printerService.js'

function dateText(value) {
  if (!value) return '-'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function dateValue(value) {
  if (!value) return null
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isToday(value) {
  const date = dateValue(value)
  if (!date) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function RetailPOSOrdersPage() {
  const { orders, loading, error, deleteOrder } = usePosOrders({ limitCount: 100, readBusinessType: false })
  const walletPaymentsApi = usePosWalletPayments({ limitCount: 100 })
  const [actionMessage, setActionMessage] = useState('')
  const todayOrders = useMemo(() => orders.filter((order) => isToday(order.createdAt)), [orders])
  const todayWalletPayments = useMemo(() => walletPaymentsApi.payments.filter((payment) => isToday(payment.createdAt)), [walletPaymentsApi.payments])
  const totals = orders.reduce((summary, order) => {
    summary.sales += Number(order.paidAmount || 0)
    summary.profit += Number(order.profit || 0)
    summary.items += order.itemCount
    return summary
  }, { sales: 0, profit: 0, items: 0 })
  const walletSettledTotal = walletPaymentsApi.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const todayTotals = todayOrders.reduce((summary, order) => {
    summary.gross += Number(order.total || 0)
    summary.sales += Number(order.paidAmount || 0)
    summary.due += Number(order.dueAmount || 0)
    summary.discount += Number(order.discount || 0)
    summary.tax += Number(order.tax || 0)
    summary.paid += Number(order.paidAmount || 0)
    summary.items += Number(order.itemCount || 0)
    return summary
  }, { gross: 0, sales: 0, due: 0, discount: 0, tax: 0, paid: 0, items: 0 })
  todayTotals.walletSettled = todayWalletPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  todayTotals.sales += todayTotals.walletSettled
  todayTotals.openingCash = todayOrders.find((order) => Number(order.shiftOpeningCash || 0) > 0)?.shiftOpeningCash || 0
  todayTotals.cashCollected = todayOrders
    .filter((order) => String(order.paymentMethod || '').toLowerCase() === 'cash')
    .reduce((sum, order) => sum + Number(order.paidAmount || 0), 0) +
    todayWalletPayments
      .filter((payment) => String(payment.paymentMethod || '').toLowerCase() === 'cash')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  todayTotals.closingCash = Number(todayTotals.openingCash || 0) + Number(todayTotals.cashCollected || 0)

  function printOrder(order) {
    const rows = (order.items || []).map((item) => `
      <tr><td>${escapeHtml(item.name)}</td><td class="num">x${Number(item.quantity || 0)}</td><td class="num">${formatCurrency(Number(item.lineTotal || item.price * item.quantity || 0))}</td></tr>
    `).join('')
    const html = `<!doctype html><html><head><title>${escapeHtml(order.orderNumber)}</title><style>
      @page{size:58mm auto;margin:3mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#0f172a;font-family:Arial,sans-serif;font-size:10px}.receipt{width:52mm;margin:0 auto}.center{text-align:center}.brand{font-size:14px;font-weight:900;letter-spacing:.08em}.muted{color:#64748b}.line{border-top:1px dashed #0f172a;margin:6px 0}table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.num{text-align:right;white-space:nowrap}.total{font-size:13px;font-weight:900}.pill{display:inline-block;border:1px solid #0f172a;border-radius:999px;padding:2px 8px;font-weight:800}
    </style></head><body><main class="receipt">
      <div class="center"><div class="brand">NEXORA POS</div><div class="muted">${escapeHtml(order.orderNumber)}</div><span class="pill">${escapeHtml(order.paymentStatus || 'paid')}</span></div>
      <div class="line"></div>
      <p>Customer: <strong>${escapeHtml(order.customerName || 'Walk-in Customer')}</strong><br>Payment: <strong>${escapeHtml(order.paymentMethod || 'Cash')}</strong><br>${escapeHtml(dateText(order.createdAt))}</p>
      <div class="line"></div><table>${rows}</table><div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td class="num">${formatCurrency(order.subtotal)}</td></tr>
        <tr><td>Promo</td><td class="num">${formatCurrency(order.discount)}</td></tr>
        <tr><td>Tax</td><td class="num">${formatCurrency(order.tax)}</td></tr>
        <tr class="total"><td>Total</td><td class="num">${formatCurrency(order.total)}</td></tr>
        <tr><td>Paid</td><td class="num">${formatCurrency(order.paidAmount)}</td></tr>
        <tr><td>Due</td><td class="num">${formatCurrency(order.dueAmount || 0)}</td></tr>
        <tr><td>Change</td><td class="num">${formatCurrency(order.changeAmount)}</td></tr>
      </table>
      <div class="line"></div><p class="center muted">Thank you for shopping</p>
    </main></body></html>`
    if (!openBrowserPrintHtml(html, { width: 300, height: 760 })) {
      setActionMessage('Print window blocked. Please allow popups and try again.')
    }
  }

  async function handleDeleteOrder(order) {
    const ok = await confirmAction({
      tone: 'danger',
      badge: 'POS Order',
      title: 'Delete POS order?',
      message: `This will remove ${order.orderNumber} from POS Orders and sales reports. Stock will not be restored automatically. Use Inventory stock movement if stock needs correction.`,
      confirmLabel: 'Delete Order',
    })
    if (!ok) return
    const result = await deleteOrder(order.id)
    setActionMessage(result?.ok ? `${order.orderNumber} deleted from POS orders.` : result?.error || 'Unable to delete POS order.')
  }

  function printTodayReport() {
    const date = new Date().toLocaleString()
    const rows = todayOrders.map((order) => {
      const reason = order.dueAmount > 0 ? 'Partial payment / customer due' : order.paymentStatus === 'paid' ? 'Paid sale' : order.paymentStatus || order.status || 'Completed'
      return `
        <div class="entry">
          <div class="row strong"><span>${escapeHtml(order.orderNumber)}</span><span>${formatCurrency(order.paidAmount)}</span></div>
          <div class="muted">${escapeHtml(dateText(order.createdAt))}</div>
          <div class="muted">${escapeHtml(order.customerName || 'Walk-in Customer')} · ${Number(order.itemCount || 0)} items</div>
          <div class="row"><span>Gross</span><span>${formatCurrency(order.total)}</span></div>
          <div class="row"><span>Due</span><span>${formatCurrency(order.dueAmount || 0)}</span></div>
          <div class="row"><span>Promo / Tax</span><span>${formatCurrency(order.discount || 0)} / ${formatCurrency(order.tax || 0)}</span></div>
          <div class="muted">${escapeHtml(reason)}</div>
        </div>`
    }).join('')
    const settlementRows = todayWalletPayments.map((payment) => `
      <div class="entry">
        <div class="row strong"><span>Wallet settlement</span><span>${formatCurrency(payment.amount)}</span></div>
        <div class="muted">${escapeHtml(payment.customerName)} · ${escapeHtml(payment.paymentMethod)}</div>
        <div class="muted">${escapeHtml(dateText(payment.createdAt))}</div>
        ${payment.note ? `<div class="muted">${escapeHtml(payment.note)}</div>` : ''}
      </div>
    `).join('')
    const html = `<!doctype html><html><head><title>POS Today Report</title><style>
      @page{size:58mm auto;margin:3mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#0f172a;font-family:Arial,sans-serif;font-size:10px}.report{width:52mm;margin:0 auto}.center{text-align:center}.brand{font-size:14px;font-weight:900;letter-spacing:.08em}.title{font-size:12px;font-weight:900}.muted{color:#64748b;font-size:9px;line-height:1.35}.line{border-top:1px dashed #0f172a;margin:6px 0}.row{display:flex;justify-content:space-between;gap:8px;padding:1px 0}.strong{font-weight:900}.total{font-size:12px;font-weight:900}.entry{border-bottom:1px dashed #cbd5e1;padding:5px 0}.empty{border:1px dashed #cbd5e1;border-radius:8px;padding:10px;text-align:center;color:#64748b}
    </style></head><body><main class="report">
      <div class="center"><div class="brand">NEXORA POS</div><div class="title">TODAY REPORT</div><div class="muted">${escapeHtml(date)}</div></div>
      <div class="line"></div>
      <div class="row"><span>Orders</span><strong>${todayOrders.length}</strong></div>
      <div class="row"><span>Items</span><strong>${todayTotals.items}</strong></div>
      <div class="row"><span>Gross bills</span><strong>${formatCurrency(todayTotals.gross)}</strong></div>
      <div class="row total"><span>Collected</span><span>${formatCurrency(todayTotals.sales)}</span></div>
      <div class="row"><span>Opening cash</span><strong>${formatCurrency(todayTotals.openingCash)}</strong></div>
      <div class="row"><span>Cash sale/settle</span><strong>${formatCurrency(todayTotals.cashCollected)}</strong></div>
      <div class="row"><span>Closing cash</span><strong>${formatCurrency(todayTotals.closingCash)}</strong></div>
      <div class="row"><span>Order paid</span><strong>${formatCurrency(todayTotals.paid)}</strong></div>
      <div class="row"><span>Wallet settled</span><strong>${formatCurrency(todayTotals.walletSettled)}</strong></div>
      <div class="row"><span>Due left</span><strong>${formatCurrency(todayTotals.due)}</strong></div>
      <div class="row"><span>Promo</span><strong>${formatCurrency(todayTotals.discount)}</strong></div>
      <div class="row"><span>Tax</span><strong>${formatCurrency(todayTotals.tax)}</strong></div>
      <div class="line"></div>
      ${todayOrders.length ? rows : '<div class="empty">No POS orders found today.</div>'}
      ${todayWalletPayments.length ? `<div class="line"></div><div class="title">Due Settlements</div>${settlementRows}` : ''}
      <div class="line"></div><p class="center muted">Opening/patti cash is separate. Revenue uses collected payments only.</p>
    </main></body></html>`
    if (!openBrowserPrintHtml(html, { width: 300, height: 820 })) {
      setActionMessage('Report print window blocked. Please allow popups and try again.')
    }
  }

  const columns = [
    { key: 'orderNumber', header: 'Order', cell: (row) => <span className="font-black text-slate-950">{row.orderNumber}</span> },
    { key: 'customerName', header: 'Customer' },
    {
      key: 'createdByStaff',
      header: 'Created By',
      cell: (row) => row.createdByStaff ? (
        <div className="space-y-1">
          <Badge variant="warning">{row.staffTag || 'Sales Staff'}</Badge>
          <p className="text-[11px] font-semibold text-slate-500">{row.createdByName || row.cashier || row.createdByEmail || 'Staff'}</p>
        </div>
      ) : (
        <Badge variant="success">Owner/Admin</Badge>
      ),
    },
    { key: 'items', header: 'Items', cell: (row) => row.itemCount },
    { key: 'paymentMethod', header: 'Payment', cell: (row) => <Badge variant="info">{row.paymentMethod}</Badge> },
    {
      key: 'syncStatus',
      header: 'Sync',
      cell: (row) => {
        if (row.syncStatus === 'failed') return <Badge variant="danger">Sync failed</Badge>
        if (row.localOnly || row.syncStatus === 'pending') return <Badge variant="warning">Sync pending</Badge>
        return <Badge variant="success">Synced</Badge>
      },
    },
    { key: 'total', header: 'Total', cell: (row) => <span className="font-black text-blue-700">{formatCurrency(row.total)}</span> },
    { key: 'dueAmount', header: 'Due', cell: (row) => <span className={Number(row.dueAmount || 0) > 0 ? 'font-black text-rose-700' : 'font-bold text-emerald-700'}>{formatCurrency(row.dueAmount || 0)}</span> },
    { key: 'discount', header: 'Promo', cell: (row) => formatCurrency(row.discount || 0) },
    { key: 'createdAt', header: 'Date', cell: (row) => dateText(row.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => printOrder(row)} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100" title="Print order">
            <HiOutlinePrinter className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleDeleteOrder(row)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100" title="Delete order">
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <PageHeader
        title="POS Orders"
        subtitle="Retail front-till orders are stored separately from invoices and do not enter approval centre."
        right={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="subtle" className="rounded-2xl border-blue-100 text-blue-700" onClick={printTodayReport}>
              <HiOutlineDocumentChartBar className="h-4 w-4" /> Today Report
            </Button>
            <Button type="button" className="rounded-2xl" onClick={() => window.open('/app/pos', '_blank', 'noopener,noreferrer')}>
              <HiOutlineBolt className="h-4 w-4" /> Open POS Billing
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={HiOutlineReceiptPercent} label="POS Collected" value={formatCurrency(totals.sales + walletSettledTotal)} />
        <Stat icon={HiOutlineShoppingBag} label="Items Sold" value={totals.items} />
        <Stat icon={HiOutlinePrinter} label="Orders" value={orders.length} />
      </div>
      <Card className="rounded-[1.4rem] border-slate-200/80 bg-white p-4">
        {error ? <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {actionMessage ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{actionMessage}</p> : null}
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm font-semibold text-slate-500">Loading POS orders...</div>
        ) : orders.length ? (
          <Table columns={columns} rows={orders} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm font-semibold text-slate-500">No POS orders yet.</div>
        )}
      </Card>
    </motion.div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-[1.25rem] border-slate-200/80 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  )
}
