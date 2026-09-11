import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/format.js'
import { stockState } from '../../hooks/useInventory.js'

// ── Medical Store POS visual identity ──────────────────────────────────────
// Same local design tokens as src/crm/pages/MedicalInventory.jsx — do not
// invent new ones here, and don't touch the global Tailwind config, so other
// business-type dashboards (Retail POS, Restaurant, School ERP, WhatsApp
// CRM, ...) keep their own existing look untouched.
const MED = {
  ink: '#142420',
  canvas: '#F3F5F1',
  primary: '#0D6E5C',
  primaryDeep: '#095146',
  amber: '#C1791F',
  clay: '#A8412F',
  line: '#D8DED7',
  surface: '#FFFFFF',
}

const serif = "font-['Fraunces']"
const sans = "font-['Inter']"

function toneColor(tone) {
  if (tone === 'danger') return MED.clay
  if (tone === 'warning') return MED.amber
  if (tone === 'success' || tone === 'info') return MED.primary
  return MED.line
}

function toneTint(tone) {
  if (tone === 'danger') return { color: MED.clay, backgroundColor: `${MED.clay}14` }
  if (tone === 'warning') return { color: MED.amber, backgroundColor: `${MED.amber}14` }
  if (tone === 'success' || tone === 'info') return { color: MED.primary, backgroundColor: `${MED.primary}14` }
  return { color: `${MED.ink}99`, backgroundColor: `${MED.ink}0d` }
}

// Same expiry classification as MedicalInventory.jsx's dashboard tab —
// duplicated locally (that file wasn't touched for this task) rather than
// shared, matching how RestaurantDashboard/SchoolDashboard/WhatsappDashboard
// each keep their own local helpers instead of a shared module.
function expiryState(value) {
  if (!value) return { tone: 'default', label: 'No expiry set' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { tone: 'default', label: 'No expiry set' }
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return { tone: 'danger', label: 'Expired' }
  if (daysLeft <= 30) return { tone: 'warning', label: `Expires in ${daysLeft}d` }
  return { tone: 'success', label: 'Valid' }
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

function formatDateTime(value) {
  const date = dateValue(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function medicineAccent(medicine) {
  const stock = stockState(medicine)
  const expiry = expiryState(medicine.expiryDate)
  if (stock.tone === 'danger' || expiry.tone === 'danger') return MED.clay
  if (stock.tone === 'warning' || expiry.tone === 'warning') return MED.amber
  return MED.primary
}

function MedFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
      />
    </>
  )
}

function MedPanel({ className, children }) {
  return <div className={`border border-[#D8DED7] bg-white ${className || ''}`}>{children}</div>
}

function MedButton({ variant = 'primary', className, children, ...props }) {
  const base = `inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-medium ${sans} transition disabled:cursor-not-allowed disabled:opacity-50`
  const variants = {
    primary: 'bg-[#0D6E5C] text-white hover:bg-[#095146]',
    secondary: 'border border-[#142420]/25 text-[#142420] hover:border-[#142420]/45 hover:bg-[#142420]/[0.03]',
  }
  return (
    <span className={`${base} ${variants[variant]} ${className || ''}`} {...props}>
      {children}
    </span>
  )
}

function MedTag({ tone = 'default', children }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium ${sans}`} style={toneTint(tone)}>
      {children}
    </span>
  )
}

function MedKpi({ value, label, hint }) {
  return (
    <div className="min-w-0">
      <p className={`${serif} text-[2.15rem] leading-none text-[#142420]`}>{value}</p>
      <div className="mt-2.5 h-[3px] w-8 bg-[#0D6E5C]" />
      <p className={`mt-2 text-[13px] text-[#142420]/70 ${sans}`}>{label}</p>
      {hint ? <p className={`text-[11px] text-[#142420]/40 ${sans}`}>{hint}</p> : null}
    </div>
  )
}

function MedSectionHeading({ children, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className={`text-sm font-medium text-[#142420] ${sans}`}>{children}</p>
      {action}
    </div>
  )
}

function MedRow({ accent, children }) {
  return (
    <div className="flex items-stretch gap-3 border-b border-[#D8DED7]/60 py-2.5 last:border-b-0">
      <span className="w-1 shrink-0" style={{ backgroundColor: accent || 'transparent' }} />
      <div className={`min-w-0 flex-1 ${sans}`}>{children}</div>
    </div>
  )
}

function MedEmpty({ children }) {
  return (
    <p className={`border border-dashed border-[#D8DED7] bg-white px-4 py-8 text-center text-sm text-[#142420]/50 ${sans}`}>
      {children}
    </p>
  )
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

  const expiringSoonCount = useMemo(
    () => medicines.filter((medicine) => ['warning', 'danger'].includes(expiryState(medicine.expiryDate).tone)).length,
    [medicines],
  )
  const expiringMedicines = useMemo(
    () =>
      medicines
        .filter((medicine) => ['warning', 'danger'].includes(expiryState(medicine.expiryDate).tone))
        .slice(0, 6),
    [medicines],
  )
  const lowStockMedicines = useMemo(
    () => [...safeStats.outOfStockItems, ...safeStats.lowStockItems].slice(0, 6),
    [safeStats.outOfStockItems, safeStats.lowStockItems],
  )

  const nonRefundedOrders = useMemo(() => orders.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt), [orders])
  const todayOrders = useMemo(() => nonRefundedOrders.filter((o) => isToday(o.createdAt)), [nonRefundedOrders])
  const todaySales = useMemo(() => todayOrders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0), [todayOrders])
  const recentOrders = useMemo(() => nonRefundedOrders.slice(0, 6), [nonRefundedOrders])

  return (
    <div className={`min-w-0 bg-[#F3F5F1] p-4 sm:p-6 ${sans}`} style={{ color: MED.ink }}>
      <MedFonts />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-[11px] font-medium text-[#142420]/45 ${sans}`}>{workspaceName || businessTitle}</p>
          <h1 className={`mt-1 text-[1.9rem] leading-tight text-[#142420] ${serif}`}>Medical Store POS</h1>
          <p className="mt-1 max-w-xl text-sm text-[#142420]/60">
            Today's sales, batch expiry, and stock health for your pharmacy — all in one view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/pos-till/medical" target="_blank" rel="noopener noreferrer">
            <MedButton variant="primary">Open POS Billing</MedButton>
          </a>
          <Link to="/app/medical-inventory">
            <MedButton variant="secondary">Add Medicine</MedButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 border-y border-[#D8DED7] py-5 sm:grid-cols-3 xl:grid-cols-5">
        <MedKpi value={loading ? '—' : formatCurrency(todaySales, currency)} label="Today's sales" hint={`${todayOrders.length} orders today`} />
        <MedKpi value={loading ? '—' : safeStats.totalProducts} label="Total medicines" hint={`${safeStats.trackedProducts} stock-tracked`} />
        <MedKpi value={loading ? '—' : safeStats.lowStockCount} label="Low stock" hint="need reorder" />
        <MedKpi value={loading ? '—' : expiringSoonCount} label="Expiring / expired" hint="within 30 days" />
        <MedKpi value={loading ? '—' : formatCurrency(safeStats.inventoryValue, currency)} label="Inventory value" hint="at cost price" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <MedSectionHeading action={<Link to="/app/medical-pos-orders" className="text-xs font-medium text-[#0D6E5C] hover:text-[#095146]">View all</Link>}>
            Recent medical POS sales
          </MedSectionHeading>
          <MedPanel className="p-2">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-[#142420]/50">Loading…</p>
            ) : recentOrders.length ? (
              recentOrders.map((order) => (
                <MedRow key={order.id} accent={order.dueAmount > 0 ? MED.amber : MED.primary}>
                  <div className="flex items-center justify-between gap-3 px-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#142420]">{order.orderNumber || order.id}</p>
                      <p className="truncate text-xs text-[#142420]/50">
                        {order.customerName || 'Walk-in Customer'} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-[#142420]">{formatCurrency(order.total, currency)}</p>
                      {order.dueAmount > 0 ? <MedTag tone="warning">Due {formatCurrency(order.dueAmount, currency)}</MedTag> : null}
                    </div>
                  </div>
                </MedRow>
              ))
            ) : (
              <MedEmpty>No medical POS sales yet.</MedEmpty>
            )}
          </MedPanel>
        </div>

        <div>
          <MedSectionHeading action={<Link to="/app/medical-inventory" className="text-xs font-medium text-[#0D6E5C] hover:text-[#095146]">Review medicines</Link>}>
            Low stock &amp; expiring soon
          </MedSectionHeading>
          <MedPanel className="p-2">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-[#142420]/50">Loading…</p>
            ) : lowStockMedicines.length || expiringMedicines.length ? (
              <>
                {lowStockMedicines.map((medicine) => {
                  const s = stockState(medicine)
                  return (
                    <MedRow key={`stock-${medicine.id}`} accent={toneColor(s.tone)}>
                      <div className="flex items-center justify-between gap-3 px-2">
                        <p className="truncate text-sm font-medium text-[#142420]">{medicine.name}</p>
                        <MedTag tone={s.tone}>{s.label}</MedTag>
                      </div>
                    </MedRow>
                  )
                })}
                {expiringMedicines
                  .filter((medicine) => !lowStockMedicines.some((item) => item.id === medicine.id))
                  .map((medicine) => {
                    const s = expiryState(medicine.expiryDate)
                    return (
                      <MedRow key={`expiry-${medicine.id}`} accent={medicineAccent(medicine)}>
                        <div className="flex items-center justify-between gap-3 px-2">
                          <p className="truncate text-sm font-medium text-[#142420]">{medicine.name}</p>
                          <MedTag tone={s.tone}>{s.label}</MedTag>
                        </div>
                      </MedRow>
                    )
                  })}
              </>
            ) : (
              <MedEmpty>All stock levels are healthy and no batches are expiring soon.</MedEmpty>
            )}
          </MedPanel>
        </div>
      </div>
    </div>
  )
}
