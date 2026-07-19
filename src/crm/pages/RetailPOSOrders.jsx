import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineDocumentChartBar, HiOutlineMagnifyingGlass, HiOutlinePrinter, HiOutlineReceiptPercent, HiOutlineShoppingBag, HiOutlineTrash, HiOutlineBolt, HiOutlineCalendarDays, HiOutlineXCircle } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Table from '../components/ui/Table.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { usePosOrders } from '../hooks/usePosOrders.js'
import { usePosWalletPayments } from '../hooks/usePosWalletPayments.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'
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
  const access = useWorkspaceAccess()
  const [actionMessage, setActionMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Filtered orders ──
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((o) =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').toLowerCase().includes(q) ||
        (o.paymentMethod || '').toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((o) => dateValue(o.createdAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((o) => dateValue(o.createdAt) <= to)
    }
    return result
  }, [orders, searchQuery, dateFrom, dateTo])

  const hasActiveFilters = searchQuery.trim() || dateFrom || dateTo

  const todayOrders = useMemo(() => orders.filter((order) => isToday(order.createdAt) && order.refundStatus !== 'refunded' && !order.refundedAt), [orders])
  const todayWalletPayments = useMemo(() => walletPaymentsApi.payments.filter((payment) => isToday(payment.createdAt)), [walletPaymentsApi.payments])
  const totals = filteredOrders.reduce((summary, order) => {
    summary.sales += Number(order.paidAmount || 0)
    summary.profit += Number(order.profit || 0)
    summary.items += order.itemCount
    summary.due += Number(order.dueAmount || 0)
    return summary
  }, { sales: 0, profit: 0, items: 0, due: 0 })
  const walletSettledTotal = walletPaymentsApi.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const canDeleteOrders = access.isOwner || access.isAdmin || access.hasModulePermission('posOrders', 'delete') || access.hasModulePermission('pos', 'delete')
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
      <tr><td><span class="item-name">${escapeHtml(item.name)}</span><br><span class="item-qty">x${Number(item.quantity || 0)} @ ${formatCurrency(Number(item.price || 0))}</span></td><td class="num">${formatCurrency(Number(item.lineTotal || item.price * item.quantity || 0))}</td></tr>
    `).join('')
    const customer = escapeHtml(order.customerName || 'Walk-in Customer')
    const staff = escapeHtml(order.createdByName || order.cashier || 'Counter Staff')
    const html = `<!doctype html><html><head><title>${escapeHtml(order.orderNumber)}</title><style>
      @page{size:58mm auto;margin:3mm}*{box-sizing:border-box;margin:0;padding:0}body{background:#fff;color:#111827;font-family:'Segoe UI',system-ui,sans-serif;font-size:10px;line-height:1.4}.receipt{width:52mm;margin:0 auto;padding:3mm 0}.center{text-align:center}.brand{font-size:15px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.sub-brand{font-size:7px;font-weight:700;color:#6b7280;letter-spacing:.12em;margin-bottom:3px}.badge{display:inline-block;border:1.5px solid #111827;border-radius:6px;padding:2px 10px;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.divider{border-top:1px dashed #9ca3af;margin:5px 0}.divider-double{border-top:2px solid #111827;margin:5px 0}.info-row{display:flex;justify-content:space-between;font-size:9px;padding:1.5px 0}.info-row .label{color:#6b7280}.info-row .val{font-weight:700;text-align:right}table{width:100%;border-collapse:collapse}th{font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;text-align:left;padding:3px 0;border-bottom:1px solid #e5e7eb}td{padding:3px 0;vertical-align:top;font-size:9px;border-bottom:1px dotted #e5e7eb}.item-name{font-weight:700;color:#111827}.item-qty{font-size:8px;color:#6b7280}.num{text-align:right;font-weight:700;white-space:nowrap}.total-row{display:flex;justify-content:space-between;font-size:9px;padding:2px 0}.total-row.grand{font-size:14px;font-weight:900;border-top:1.5px solid #111827;padding-top:4px;margin-top:2px}.footer{text-align:center;font-size:7px;color:#9ca3af;margin-top:5px;border-top:1px solid #e5e7eb;padding-top:4px}
    </style></head><body><main class="receipt">
      <div class="center">
        <div class="brand">${escapeHtml(order.companyName || 'NEXORA SOLUTION')}</div>
        <div class="sub-brand">RETAIL INVOICE</div>
        <span class="badge">${escapeHtml(order.paymentStatus || 'PAID')}</span>
      </div>
      <div class="divider-double"></div>
      <div class="info-row"><span class="label">Order #</span><span class="val">${escapeHtml(order.orderNumber)}</span></div>
      <div class="info-row"><span class="label">Date</span><span class="val">${escapeHtml(dateText(order.createdAt))}</span></div>
      <div class="info-row"><span class="label">Customer</span><span class="val">${customer}</span></div>
      <div class="info-row"><span class="label">Staff</span><span class="val">${staff}</span></div>
      <div class="info-row"><span class="label">Payment</span><span class="val">${escapeHtml(order.paymentMethod || 'Cash')}</span></div>
      <div class="divider"></div>
      <table><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="divider"></div>
      <div class="total-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
      ${Number(order.discount) > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
      ${Number(order.tax) > 0 ? `<div class="total-row"><span>Tax</span><span>${formatCurrency(order.tax)}</span></div>` : ''}
      <div class="total-row grand"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
      <div class="total-row"><span>Paid</span><span>${formatCurrency(order.paidAmount)}</span></div>
      ${Number(order.dueAmount || 0) > 0 ? `<div class="total-row"><span>Due</span><span>${formatCurrency(order.dueAmount)}</span></div>` : ''}
      ${Number(order.changeAmount || 0) > 0 ? `<div class="total-row"><span>Change</span><span>${formatCurrency(order.changeAmount)}</span></div>` : ''}
      <div class="footer">
        <div>${escapeHtml(order.companyName || 'NEXORA SOLUTION')}</div>
        <div>Nexora Solution &copy; 2019-2026 — All rights reserved</div>
      </div>
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
    const company = escapeHtml(orders[0]?.companyName || 'NEXORA SOLUTION')
    const rows = todayOrders.map((order) => {
      const reason = order.dueAmount > 0 ? 'Partial payment / customer due' : order.paymentStatus === 'paid' ? 'Paid sale' : order.paymentStatus || order.status || 'Completed'
      return `
        <div class="entry">
          <div class="row strong"><span>${escapeHtml(order.orderNumber)}</span><span>${formatCurrency(order.paidAmount)}</span></div>
          <div class="muted">${escapeHtml(dateText(order.createdAt))}</div>
          <div class="muted">${escapeHtml(order.customerName || 'Walk-in Customer')} · ${Number(order.itemCount || 0)} items</div>
          <div class="row"><span>Gross</span><span>${formatCurrency(order.total)}</span></div>
          ${Number(order.dueAmount || 0) > 0 ? `<div class="row"><span>Due</span><span>${formatCurrency(order.dueAmount)}</span></div>` : ''}
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
      @page{size:58mm auto;margin:3mm}*{box-sizing:border-box;margin:0;padding:0}body{background:#fff;color:#111827;font-family:'Segoe UI',system-ui,sans-serif;font-size:10px}.report{width:52mm;margin:0 auto;padding:3mm 0}.center{text-align:center}.brand{font-size:15px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.sub{font-size:7px;font-weight:700;color:#6b7280;letter-spacing:.1em;text-transform:uppercase}.muted{color:#6b7280;font-size:9px}.divider{border-top:1px dashed #9ca3af;margin:5px 0}.divider-solid{border-top:1.5px solid #111827;margin:5px 0}.row{display:flex;justify-content:space-between;gap:8px;padding:2px 0;font-size:9px}.strong{font-weight:900}.total{font-size:12px;font-weight:900;border-top:1.5px solid #111827;padding-top:3px;margin-top:2px}.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:4px 0}.kpi{border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px}.kpi .lbl{font-size:6px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}.kpi .val{font-size:10px;font-weight:900;color:#111827}.entry{border-bottom:1px dashed #cbd5e1;padding:4px 0}.empty{border:1px dashed #cbd5e1;border-radius:6px;padding:8px;text-align:center;color:#9ca3af;font-size:9px}.footer{text-align:center;font-size:7px;color:#9ca3af;margin-top:5px;border-top:1px solid #e5e7eb;padding-top:4px}
    </style></head><body><main class="report">
      <div class="center">
        <div class="brand">${company}</div>
        <div class="sub">DAILY CLOSING REPORT</div>
        <div class="muted">${escapeHtml(date)}</div>
      </div>
      <div class="divider-solid"></div>
      <div class="kpi-grid">
        <div class="kpi"><div class="lbl">Orders</div><div class="val">${todayOrders.length}</div></div>
        <div class="kpi"><div class="lbl">Items Sold</div><div class="val">${todayTotals.items}</div></div>
        <div class="kpi"><div class="lbl">Gross</div><div class="val">${formatCurrency(todayTotals.gross)}</div></div>
        <div class="kpi"><div class="lbl">Collected</div><div class="val">${formatCurrency(todayTotals.sales)}</div></div>
        <div class="kpi"><div class="lbl">Opening Cash</div><div class="val">${formatCurrency(todayTotals.openingCash)}</div></div>
        <div class="kpi"><div class="lbl">Closing Cash</div><div class="val">${formatCurrency(todayTotals.closingCash)}</div></div>
        <div class="kpi"><div class="lbl">Due Left</div><div class="val">${formatCurrency(todayTotals.due)}</div></div>
        <div class="kpi"><div class="lbl">Promo / Tax</div><div class="val">${formatCurrency(todayTotals.discount)} / ${formatCurrency(todayTotals.tax)}</div></div>
      </div>
      <div class="divider"></div>
      ${todayOrders.length ? rows : '<div class="empty">No POS orders found today.</div>'}
      ${todayWalletPayments.length ? `<div class="divider"></div><div class="sub">Due Settlements</div>${settlementRows}` : ''}
      <div class="footer">
        <div>${company}</div>
        <div>Nexora Solution &copy; 2019-2026 — All rights reserved</div>
      </div>
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
          {canDeleteOrders ? (
            <button type="button" onClick={() => handleDeleteOrder(row)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100" title="Delete order">
              <HiOutlineTrash className="h-4 w-4" />
            </button>
          ) : null}
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
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={HiOutlineReceiptPercent} label="POS Collected" value={formatCurrency(totals.sales + walletSettledTotal)} />
        <Stat icon={HiOutlineShoppingBag} label="Items Sold" value={totals.items} />
        <Stat icon={HiOutlinePrinter} label="Orders" value={hasActiveFilters ? `${filteredOrders.length}/${orders.length}` : orders.length} />
        <Stat icon={HiOutlineDocumentChartBar} label="Due" value={formatCurrency(totals.due)} />
      </div>

      {/* ── Search + Date Filter ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-medium outline-none focus:border-sky-300 focus:bg-white focus:ring-1 focus:ring-sky-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <HiOutlineCalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-sky-300 focus:bg-white focus:ring-1 focus:ring-sky-200"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-sky-300 focus:bg-white focus:ring-1 focus:ring-sky-200"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo('') }}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
            >
              <HiOutlineXCircle className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <Card className="rounded-[1.4rem] border-slate-200/80 bg-white p-4">
        {error || walletPaymentsApi.error ? <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error || walletPaymentsApi.error}</p> : null}
        {actionMessage ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{actionMessage}</p> : null}
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm font-semibold text-slate-500">Loading POS orders...</div>
        ) : orders.length ? (
          <>
            <Table columns={columns} rows={filteredOrders} />
            {hasActiveFilters && !filteredOrders.length ? (
              <p className="mt-3 text-center text-sm font-semibold text-slate-400">No orders match your search or date range.</p>
            ) : null}
          </>
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
