import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import EmptyState from '../system/EmptyState.jsx'
import { convertFromUsd } from '../../utils/currency.js'
import { formatCurrency } from '../../utils/format.js'

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function monthKey(d) {
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function num(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#f59e0b', '#ef4444']

export default function ReportsCharts({ invoices, leads, teamMembers, tickets, subscriptions, currency }) {
  const revenueTrend = (() => {
    const map = new Map()
    invoices.forEach((i) => {
      const d = toDateValue(i.createdAt) || toDateValue(i.dueDate) || null
      const k = monthKey(d)
      if (!k) return
      map.set(k, (map.get(k) || 0) + num(i.totalUsd ?? i.total ?? 0))
    })
    const rows = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([k, usd]) => ({ month: k, revenue: convertFromUsd(usd, currency) }))
    return rows
  })()

  const leadConversion = (() => {
    const hot = leads.filter((l) => (l.scoreType || '').includes('Hot') || num(l.score) >= 80).length
    const warm = leads.filter((l) => (l.scoreType || '').includes('Warm') || (num(l.score) >= 50 && num(l.score) < 80)).length
    const cold = Math.max(0, leads.length - hot - warm)
    return [
      { name: 'Hot', value: hot },
      { name: 'Warm', value: warm },
      { name: 'Cold', value: cold },
    ]
  })()

  const invoiceStatus = (() => {
    const statuses = ['Paid', 'Pending', 'Overdue', 'Cancelled']
    return statuses.map((s) => ({ name: s, value: invoices.filter((i) => i.status === s).length }))
  })()

  const teamPerf = teamMembers
    .slice()
    .sort((a, b) => num(b.performanceScore ?? 0) - num(a.performanceScore ?? 0))
    .slice(0, 6)
    .map((m) => ({ name: m.name || '—', score: num(m.performanceScore ?? 0) }))

  const ticketStatus = ['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => ({
    name: s,
    value: tickets.filter((t) => t.status === s).length,
  }))

  const subGrowth = (() => {
    const map = new Map()
    subscriptions.forEach((s) => {
      const d = toDateValue(s.createdAt) || toDateValue(s.updatedAt) || null
      const k = monthKey(d)
      if (!k) return
      map.set(k, (map.get(k) || 0) + 1)
    })
    const rows = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([k, count]) => ({ month: k, subs: count }))
    return rows
  })()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Trend</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Invoices totals over time</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {revenueTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                <Line type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No revenue data" description="Add invoices to see revenue trend." />
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Lead Conversion</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Hot/Warm/Cold lead distribution</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {leads.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadConversion} dataKey="value" nameKey="name" outerRadius={85}>
                  {leadConversion.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No leads found" description="Create leads to generate lead conversion insights." />
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoice Status</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Paid vs pending vs overdue</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {invoices.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceStatus}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#38bdf8" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No invoices" description="Create invoices to see invoice status chart." />
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Team Performance</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Top member performance score</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {teamPerf.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerf}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="score" fill="#a78bfa" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No team members" description="Add team members to see performance chart." />
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Support Ticket Status</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Open/In progress/Resolved/Closed</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {tickets.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketStatus}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No tickets" description="Create support tickets to see ticket status chart." />
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Subscription Growth</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Subscriptions created over time</p>
          </div>
          <Badge variant="purple">Chart</Badge>
        </div>
        <div className="mt-4 h-56">
          {subGrowth.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subGrowth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="subs" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No subscription events" description="Create subscriptions to see growth trend." />
          )}
        </div>
      </Card>
    </div>
  )
}

