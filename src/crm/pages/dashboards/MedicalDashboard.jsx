import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatCurrency } from '../../utils/format.js'
import { stockState } from '../../hooks/useInventory.js'
import { useMedicalPosOrders } from '../../hooks/useMedicalPosOrders.js'

// ── Medical Store POS pastel dashboard palette ─────────────────────────────
// Local to this component only — sans-serif ambient app font (no Fraunces,
// no serif), plain hex values consumed both as Tailwind arbitrary-value
// classes and as literal colors for recharts fills (which need real color
// strings, not class names).
const PASTEL = {
  bg: '#F6F5FB',
  ink: '#1F2230',
  muted: '#8B8A99',
  mint: '#D9F2E3',
  blush: '#FBDEDE',
  sky: '#DCEBFB',
  lavender: '#E8E1FB',
  green: '#8FD9A8',
  coral: '#F2A6A6',
  amber: '#F5D06F',
  primaryBar: '#8FC1F2',
  dark: '#1C1B29',
}

const DONUT_COLORS = [PASTEL.green, PASTEL.coral, PASTEL.amber, PASTEL.muted]

function expiryState(value) {
  if (!value) return { tone: 'none', label: 'No expiry set' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { tone: 'none', label: 'No expiry set' }
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return { tone: 'expired', label: 'Expired' }
  if (daysLeft <= 30) return { tone: 'expiring', label: `Expires in ${daysLeft}d` }
  return { tone: 'valid', label: 'Valid' }
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

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateTime(value) {
  const date = dateValue(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const DAY_MS = 86400000

// Sums paidAmount/total for orders whose createdAt falls within the rolling
// window from msAgoStart-ago to msAgoEnd-ago (exclusive of the older edge,
// inclusive of the more recent edge). Rolling windows, not calendar week/
// month boundaries — simplest, and consistent with the "last 7 days" rolling
// window the existing Sales Overview chart above already uses.
function revenueBetween(orders, msAgoStart, msAgoEnd) {
  const now = Date.now()
  const from = now - msAgoStart
  const to = now - msAgoEnd
  return orders.reduce((sum, order) => {
    const created = dateValue(order.createdAt)
    if (!created) return sum
    const t = created.getTime()
    if (t > from && t <= to) return sum + Number(order.paidAmount || order.total || 0)
    return sum
  }, 0)
}

// null = no prior-period revenue to compare against (shown as "No prior data"
// rather than a misleading +Infinity%).
function computeGrowth(current, previous) {
  if (previous <= 0) return current > 0 ? null : 0
  return ((current - previous) / previous) * 100
}

// Small decorative bar-chart glyph for the top-right corner of a KPI card —
// not a real chart, just a lightweight sparkline-style indicator.
function MiniBarsGlyph() {
  return (
    <div className="flex items-end gap-0.5 opacity-50">
      <span className="h-2 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-3.5 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-1.5 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-3 w-1 rounded-sm bg-[#1F2230]" />
    </div>
  )
}

function PastelKpiCard({ tint, label, value, hint }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: tint }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#1F2230]/70">{label}</p>
        <MiniBarsGlyph />
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-[#1F2230]">{value}</p>
      <p className="mt-1 truncate text-xs text-[#1F2230]/60">{hint}</p>
    </div>
  )
}

function PastelPanel({ className = '', children }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

function PanelHeading({ children, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[#1F2230]">{children}</p>
      {action}
    </div>
  )
}

function PrimaryButton({ children, ...props }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1C1B29] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#141420]"
      {...props}
    >
      {children}
    </span>
  )
}

function SecondaryButton({ children, ...props }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#1F2230]/15 bg-white px-3.5 py-2 text-sm font-medium text-[#1F2230] transition hover:bg-[#F6F5FB]"
      {...props}
    >
      {children}
    </span>
  )
}

function EmptyHint({ children }) {
  return <p className="px-1 py-6 text-center text-sm text-[#8B8A99]">{children}</p>
}

export default function MedicalDashboard({
  medicines = [],
  orders = [],
  transactions = [],
  stats,
  loading = false,
  businessTitle = 'Medical Store POS',
  workspaceName = '',
  currency = 'PKR',
}) {
  const safeStats = stats || {
    totalProducts: 0,
    trackedProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inventoryValue: 0,
    lowStockItems: [],
    outOfStockItems: [],
  }

  const nonRefundedOrders = useMemo(() => orders.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt), [orders])
  const todayOrders = useMemo(() => nonRefundedOrders.filter((o) => isToday(o.createdAt)), [nonRefundedOrders])
  const todaySales = useMemo(() => todayOrders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0), [todayOrders])
  const recentOrders = useMemo(() => nonRefundedOrders.slice(0, 6), [nonRefundedOrders])

  const expiringSoonCount = useMemo(
    () => medicines.filter((medicine) => ['expiring', 'expired'].includes(expiryState(medicine.expiryDate).tone)).length,
    [medicines],
  )
  const expiringMedicines = useMemo(
    () => medicines.filter((medicine) => ['expiring', 'expired'].includes(expiryState(medicine.expiryDate).tone)).slice(0, 6),
    [medicines],
  )
  const lowStockMedicines = useMemo(
    () => [...safeStats.outOfStockItems, ...safeStats.lowStockItems].slice(0, 6),
    [safeStats.outOfStockItems, safeStats.lowStockItems],
  )

  // "Sales Breakdown" donut — grouped by paymentMethod (the field that
  // actually exists on medicalPosOrders; see useMedicalPosOrders.js), using
  // today's orders when there are any, otherwise falling back to the most
  // recent loaded orders so the chart isn't empty for a quiet day.
  const chartOrders = todayOrders.length ? todayOrders : nonRefundedOrders
  const paymentBreakdown = useMemo(() => {
    const totals = new Map()
    chartOrders.forEach((order) => {
      const key = order.paymentMethod || 'Other'
      totals.set(key, (totals.get(key) || 0) + Number(order.paidAmount || order.total || 0))
    })
    const sorted = Array.from(totals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 3).map(([name, value]) => ({ name, value }))
    const restTotal = sorted.slice(3).reduce((sum, [, value]) => sum + value, 0)
    if (restTotal > 0) top.push({ name: 'Other', value: restTotal })
    return top
  }, [chartOrders])
  const paymentBreakdownTotal = useMemo(
    () => paymentBreakdown.reduce((sum, row) => sum + row.value, 0),
    [paymentBreakdown],
  )

  // "Sales Overview" — last 7 calendar days of paid medical POS sales.
  // Built from whatever orders are already loaded (DASHBOARD_RECENT_LIMIT
  // most recent, per DashboardHome.jsx's existing hook wiring) — not a new
  // query, so a very high-volume workspace may not see a full week here.
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      return d
    })
    return days.map((day) => {
      const total = nonRefundedOrders
        .filter((order) => {
          const created = dateValue(order.createdAt)
          return created && isSameDay(created, day)
        })
        .reduce((sum, order) => sum + Number(order.paidAmount || 0), 0)
      return { day: day.toLocaleDateString('en', { weekday: 'short' }), total }
    })
  }, [nonRefundedOrders])

  // ── Top-selling medicines & Revenue comparison ──────────────────────────
  // Both need accurate week/month totals, and the `orders` prop above is
  // capped at DASHBOARD_RECENT_LIMIT (25, set by DashboardHome.jsx) — too few
  // once a pharmacy does more than ~25 sales in a period. Rather than thread
  // a wider limit back through DashboardHome.jsx's existing prop list, these
  // two sections use their own, self-contained, wider order query (up to
  // 500 most recent orders — ordering is already createdAt/desc inside
  // useMedicalPosOrders.js itself, so no orderByField/orderDirection option
  // exists to pass here). This is an additional Firestore read scoped only
  // to this component.
  const wideOrdersApi = useMedicalPosOrders({ limitCount: 500 })
  const wideNonRefundedOrders = useMemo(
    () => wideOrdersApi.orders.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt),
    [wideOrdersApi.orders],
  )

  // Shared by both sections below: 'week' = rolling 7 days, 'month' = rolling
  // 30 days (same rolling-window approach as Sales Overview's last7Days).
  const [rangeMode, setRangeMode] = useState('week')

  const topSellingOrders = useMemo(() => {
    const windowMs = (rangeMode === 'month' ? 30 : 7) * DAY_MS
    const cutoff = Date.now() - windowMs
    return wideNonRefundedOrders.filter((order) => {
      const created = dateValue(order.createdAt)
      return created && created.getTime() > cutoff
    })
  }, [wideNonRefundedOrders, rangeMode])

  const topSellingMedicines = useMemo(() => {
    const totals = new Map()
    topSellingOrders.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : []
      items.forEach((item) => {
        // Group by productId; fall back to name if productId is ever missing
        // (e.g. an older/manually-adjusted order) so the row isn't dropped.
        const key = item.productId || item.name || 'unknown'
        const existing = totals.get(key) || { key, name: item.name || 'Unnamed medicine', units: 0, revenue: 0 }
        existing.units += Number(item.quantity || 0)
        existing.revenue += Number(item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 0)) || 0
        totals.set(key, existing)
      })
    })
    return Array.from(totals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [topSellingOrders])

  const revenueComparison = useMemo(() => {
    if (rangeMode === 'month') {
      return {
        currentLabel: 'This month',
        previousLabel: 'Last month',
        current: revenueBetween(wideNonRefundedOrders, 30 * DAY_MS, 0),
        previous: revenueBetween(wideNonRefundedOrders, 60 * DAY_MS, 30 * DAY_MS),
      }
    }
    return {
      currentLabel: 'This week',
      previousLabel: 'Last week',
      current: revenueBetween(wideNonRefundedOrders, 7 * DAY_MS, 0),
      previous: revenueBetween(wideNonRefundedOrders, 14 * DAY_MS, 7 * DAY_MS),
    }
  }, [wideNonRefundedOrders, rangeMode])
  const revenueGrowth = computeGrowth(revenueComparison.current, revenueComparison.previous)

  return (
    <div className="min-w-0 p-4 sm:p-6" style={{ backgroundColor: PASTEL.bg, color: PASTEL.ink }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#8B8A99]">{workspaceName || businessTitle}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1F2230] sm:text-[1.75rem]">Medical Store POS</h1>
          <p className="mt-1 max-w-xl text-sm text-[#8B8A99]">
            Today's sales, batch expiry, and stock health for your pharmacy — all in one view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/pos-till/medical" target="_blank" rel="noopener noreferrer">
            <PrimaryButton>Open POS Billing</PrimaryButton>
          </a>
          <Link to="/app/medical-inventory">
            <SecondaryButton>Add Medicine</SecondaryButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <PastelKpiCard
          tint={PASTEL.mint}
          label="Today's sales"
          value={loading ? '—' : formatCurrency(todaySales, currency)}
          hint={`${todayOrders.length} orders today`}
        />
        <PastelKpiCard
          tint={PASTEL.blush}
          label="Total medicines"
          value={loading ? '—' : safeStats.totalProducts}
          hint={`${safeStats.trackedProducts} stock-tracked`}
        />
        <PastelKpiCard
          tint={PASTEL.sky}
          label="Low stock"
          value={loading ? '—' : safeStats.lowStockCount}
          hint="need reorder"
        />
        <PastelKpiCard
          tint={PASTEL.lavender}
          label="Inventory value"
          value={loading ? '—' : formatCurrency(safeStats.inventoryValue, currency)}
          hint="at cost price"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PastelPanel>
          <PanelHeading>Sales breakdown</PanelHeading>
          {loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : paymentBreakdown.length ? (
            <>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3}>
                      {paymentBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs text-[#8B8A99]">Total</p>
                  <p className="text-lg font-bold text-[#1F2230]">{formatCurrency(paymentBreakdownTotal, currency)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {paymentBreakdown.map((row, idx) => (
                  <div key={row.name} className="flex items-center gap-1.5 text-xs text-[#1F2230]/70">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                    <span>{row.name}</span>
                    <span className="text-[#8B8A99]">{formatCurrency(row.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyHint>No medical POS sales to break down yet.</EmptyHint>
          )}
        </PastelPanel>

        <PastelPanel>
          <PanelHeading>Sales overview</PanelHeading>
          {loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: PASTEL.muted, fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: PASTEL.muted, fontSize: 12 }} width={36} />
                  <Tooltip formatter={(value) => formatCurrency(value, currency)} cursor={{ fill: PASTEL.bg }} />
                  <Bar dataKey="total" fill={PASTEL.primaryBar} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PastelPanel>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#8B8A99]">Top-selling medicines &amp; revenue growth</p>
        <div className="inline-flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
          {[
            { key: 'week', label: 'This week' },
            { key: 'month', label: 'This month' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRangeMode(opt.key)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                rangeMode === opt.key
                  ? { backgroundColor: PASTEL.dark, color: '#fff' }
                  : { backgroundColor: 'transparent', color: PASTEL.muted }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <PastelPanel>
          <PanelHeading>Top-selling medicines</PanelHeading>
          {wideOrdersApi.loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : topSellingMedicines.length ? (
            <div className="space-y-1.5">
              {topSellingMedicines.map((row, idx) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  style={{ backgroundColor: idx === 0 ? PASTEL.mint : PASTEL.bg }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1F2230]">
                      {idx + 1}
                    </span>
                    <p className="truncate text-sm font-medium text-[#1F2230]">{row.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-[#1F2230]">{formatCurrency(row.revenue, currency)}</p>
                    <p className="text-xs text-[#8B8A99]">{row.units} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>No medical POS sales in this period yet.</EmptyHint>
          )}
        </PastelPanel>

        <PastelPanel>
          <PanelHeading>Revenue comparison</PanelHeading>
          {wideOrdersApi.loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-[#8B8A99]">{revenueComparison.currentLabel}</p>
                  <p className="mt-1 text-2xl font-bold text-[#1F2230]">{formatCurrency(revenueComparison.current, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8B8A99]">{revenueComparison.previousLabel}</p>
                  <p className="mt-1 text-sm font-medium text-[#1F2230]/70">{formatCurrency(revenueComparison.previous, currency)}</p>
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{
                  backgroundColor: revenueGrowth === null ? `${PASTEL.muted}22` : revenueGrowth >= 0 ? `${PASTEL.green}55` : `${PASTEL.coral}55`,
                  color: revenueGrowth === null ? PASTEL.muted : revenueGrowth >= 0 ? '#1F7A45' : '#B4453F',
                }}
              >
                {revenueGrowth === null ? (
                  <span>No prior data</span>
                ) : (
                  <>
                    <span>{revenueGrowth >= 0 ? '▲' : '▼'}</span>
                    <span>{`${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </PastelPanel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <PanelHeading action={<Link to="/app/medical-pos-orders" className="text-xs font-medium text-[#1F2230] hover:underline">View all</Link>}>
            Recent medical POS sales
          </PanelHeading>
          <PastelPanel className="p-2">
            {loading ? (
              <EmptyHint>Loading…</EmptyHint>
            ) : recentOrders.length ? (
              <div className="divide-y divide-[#1F2230]/[0.06]">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1F2230]">{order.orderNumber || order.id}</p>
                      <p className="truncate text-xs text-[#8B8A99]">
                        {order.customerName || 'Walk-in Customer'} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-[#1F2230]">{formatCurrency(order.total, currency)}</p>
                      {order.dueAmount > 0 ? (
                        <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${PASTEL.amber}55`, color: PASTEL.ink }}>
                          Due {formatCurrency(order.dueAmount, currency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint>No medical POS sales yet.</EmptyHint>
            )}
          </PastelPanel>
        </div>

        <div>
          <PanelHeading action={<Link to="/app/medical-inventory" className="text-xs font-medium text-[#1F2230] hover:underline">Review medicines</Link>}>
            Low stock &amp; expiring soon
          </PanelHeading>
          <PastelPanel className="p-2">
            {!loading ? (
              <p className="px-2 pb-2 text-xs text-[#8B8A99]">
                {safeStats.lowStockCount} low stock · {expiringSoonCount} expiring soon
              </p>
            ) : null}
            {loading ? (
              <EmptyHint>Loading…</EmptyHint>
            ) : lowStockMedicines.length || expiringMedicines.length ? (
              <div className="space-y-1.5">
                {lowStockMedicines.map((medicine) => {
                  const s = stockState(medicine)
                  const tint = s.tone === 'danger' ? PASTEL.blush : s.tone === 'warning' ? `${PASTEL.amber}33` : PASTEL.mint
                  return (
                    <div key={`stock-${medicine.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: tint }}>
                      <p className="truncate text-sm font-medium text-[#1F2230]">{medicine.name}</p>
                      <span className="shrink-0 text-xs font-medium text-[#1F2230]/70">{s.label}</span>
                    </div>
                  )
                })}
                {expiringMedicines
                  .filter((medicine) => !lowStockMedicines.some((item) => item.id === medicine.id))
                  .map((medicine) => {
                    const s = expiryState(medicine.expiryDate)
                    const tint = s.tone === 'expired' ? PASTEL.blush : `${PASTEL.amber}33`
                    return (
                      <div key={`expiry-${medicine.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: tint }}>
                        <p className="truncate text-sm font-medium text-[#1F2230]">{medicine.name}</p>
                        <span className="shrink-0 text-xs font-medium text-[#1F2230]/70">{s.label}</span>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <EmptyHint>All stock levels are healthy and no batches are expiring soon.</EmptyHint>
            )}
          </PastelPanel>
        </div>
      </div>
    </div>
  )
}
