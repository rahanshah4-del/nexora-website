import { Link } from 'react-router-dom'
import { memo, useMemo } from 'react'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineSparkles,
  HiOutlineBell,
  HiOutlineCheckBadge,
  HiOutlineArrowTrendingUp,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineInbox,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import SkeletonLoader from '../system/SkeletonLoader.jsx'
import { cn } from '../../utils/cn.js'
import { formatCompact, formatPercentValue } from '../../utils/format.js'
import {
  LEAD_STAGES,
  toDateValue,
  isFollowUpDueToday,
  isFollowUpOverdue,
} from '../../lib/whatsappManual.js'

/* --------------------------------- helpers -------------------------------- */

function startOfDay(date) {
  const next = new Date(date.getTime())
  next.setHours(0, 0, 0, 0)
  return next
}

function contactTimestamp(contact) {
  return (
    toDateValue(contact.lastContactedAt) ||
    toDateValue(contact.updatedAt) ||
    toDateValue(contact.createdAt)
  )
}

/* ------------------------------ UI primitives ----------------------------- */

const STAGE_TONES = {
  New: 'bg-emerald-400',
  Contacted: 'bg-teal-400',
  Qualified: 'bg-green-500',
  Proposal: 'bg-lime-500',
  Won: 'bg-emerald-600',
  Lost: 'bg-slate-300',
}

const METRIC_TONES = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  lime: 'border-lime-200 bg-lime-50 text-lime-700',
}

const WaMetricCard = memo(function WaMetricCard({ icon: Icon, label, value, helper, tone = 'green', loading = false }) {
  return (
    <div className="min-w-0">
      <Card className="h-full rounded-[1.5rem] border-emerald-100/70 bg-gradient-to-br from-white via-white to-emerald-50/60 p-4 hover:border-emerald-200 hover:bg-white">
        {loading ? (
          <SkeletonLoader lines={3} />
        ) : (
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/70">{label}</p>
              <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{helper}</p>
            </div>
            <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl border', METRIC_TONES[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
})

const WaEmpty = memo(function WaEmpty({ icon: Icon = HiOutlineChatBubbleLeftRight, title, description }) {
  return (
    <div className="grid min-h-[10rem] place-items-center rounded-[1.25rem] border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-6 text-center">
      <div className="max-w-xs">
        <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
})

const LoadingBlock = memo(function LoadingBlock({ lines = 4, className = '' }) {
  return (
    <div className={cn('rounded-[1.25rem] border border-emerald-100 bg-white/70 p-4', className)}>
      <SkeletonLoader lines={lines} />
    </div>
  )
})

const TrendBars = memo(function TrendBars({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const hasData = data.some((item) => item.value > 0)
  if (!hasData) {
    return (
      <WaEmpty
        icon={HiOutlineArrowTrendingUp}
        title="No lead activity yet"
        description="New WhatsApp leads will plot here as they come in this week."
      />
    )
  }
  return (
    <div className="flex h-44 items-end gap-2 rounded-[1.25rem] border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-4">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-green-400 shadow-sm"
              style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
              title={`${item.value} leads`}
            />
          </div>
          <span className="w-full truncate text-center text-[11px] font-medium text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
})

const StageRow = memo(function StageRow({ label, value, max, tone }) {
  const safeMax = Math.max(1, max)
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-600">{label}</span>
        <span className="shrink-0 font-semibold text-slate-950">{formatCompact(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
})

const QuickAction = memo(function QuickAction({ to, icon: Icon, title, detail }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-emerald-100 bg-white/70 p-3 transition-colors duration-100 hover:border-emerald-200 hover:bg-emerald-50/60"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white transition-transform duration-100 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950">{title}</span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
      </span>
    </Link>
  )
})

/* ------------------------------- component -------------------------------- */

function WhatsappDashboard({ stats, contacts = [], leads = [], followUps = [], loading = false, businessTitle = 'WhatsApp CRM', workspaceName = '' }) {
  const newLeadsToday = useMemo(() => {
    const today = startOfDay(new Date()).getTime()
    return leads.reduce((count, lead) => {
      const date = toDateValue(lead.createdAt)
      return date && startOfDay(date).getTime() === today ? count + 1 : count
    }, 0)
  }, [leads])

  const conversionRate = stats.leads.total ? (stats.leads.won / stats.leads.total) * 100 : 0

  const leadsTrend = useMemo(() => {
    const now = new Date()
    const buckets = []
    for (let i = 6; i >= 0; i -= 1) {
      const day = startOfDay(new Date(now.getTime() - i * 86400000))
      buckets.push({ key: day.getTime(), label: day.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 })
    }
    const index = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    leads.forEach((lead) => {
      const date = toDateValue(lead.createdAt)
      if (!date) return
      const bucket = index.get(startOfDay(date).getTime())
      if (bucket) bucket.value += 1
    })
    return buckets
  }, [leads])

  const stageRows = useMemo(
    () => LEAD_STAGES.map((stage) => ({ label: stage, value: stats.leads.byStage?.[stage] || 0, tone: STAGE_TONES[stage] || 'bg-emerald-400' })),
    [stats.leads.byStage],
  )

  const recentChats = useMemo(
    () =>
      [...contacts]
        .sort((a, b) => {
          const da = contactTimestamp(a)
          const dbv = contactTimestamp(b)
          return (dbv ? dbv.getTime() : 0) - (da ? da.getTime() : 0)
        })
        .slice(0, 5),
    [contacts],
  )

  const todayFollowUps = useMemo(() => {
    const now = new Date()
    return followUps
      .filter((item) => isFollowUpDueToday(item, now) || isFollowUpOverdue(item, now))
      .sort((a, b) => {
        const da = toDateValue(a.dueDate)
        const dbv = toDateValue(b.dueDate)
        return (da ? da.getTime() : 0) - (dbv ? dbv.getTime() : 0)
      })
      .slice(0, 5)
  }, [followUps])

  const cards = [
    { icon: HiOutlineUserGroup, label: 'Total Leads', value: formatCompact(stats.leads.total), helper: `${formatCompact(stats.leads.open)} open in pipeline`, tone: 'green' },
    { icon: HiOutlineUserPlus, label: 'New Leads Today', value: formatCompact(newLeadsToday), helper: 'Captured in the last 24 hours', tone: 'teal' },
    { icon: HiOutlineChatBubbleLeftRight, label: 'Active Chats', value: formatCompact(stats.contacts.active), helper: `${formatCompact(stats.contacts.total)} total contacts`, tone: 'green' },
    { icon: HiOutlineBell, label: 'Follow-Ups Due', value: formatCompact(stats.followUps.dueToday), helper: `${formatCompact(stats.followUps.overdue)} overdue`, tone: 'lime' },
    { icon: HiOutlineCheckBadge, label: 'Won Deals', value: formatCompact(stats.leads.won), helper: `${formatCompact(stats.leads.lost)} lost`, tone: 'green' },
    { icon: HiOutlineArrowTrendingUp, label: 'Conversion Rate', value: formatPercentValue(conversionRate), helper: 'Won vs. total leads', tone: 'teal' },
  ]

  return (
    <div className="crm-dashboard-page min-w-0 space-y-5">
      {/* Hero */}
      <section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.6)]">
              <HiOutlineChatBubbleLeftRight className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">{workspaceName || businessTitle}</p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">WhatsApp CRM Dashboard</h1>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">Manage WhatsApp leads, conversations, follow-ups, and customer relationships in one place.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant={loading ? 'default' : 'success'}>{loading ? 'Syncing' : 'Manual Mode'}</Badge>
            <Link
              to="/app/whatsapp-inbox"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-100 hover:scale-[1.02]"
            >
              <HiOutlineInbox className="h-4 w-4" /> Open Inbox
            </Link>
          </div>
        </div>
      </section>

      {/* Metric cards */}
      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <WaMetricCard key={card.label} {...card} loading={loading} />
        ))}
      </section>

      {/* Charts */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] border-emerald-100/70 p-5 lg:col-span-7">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Leads Trend</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">New leads this week</h2>
            </div>
            <Badge variant="success">{`${formatCompact(stats.leads.total)} total`}</Badge>
          </div>
          <div className="mt-5">
            {loading ? <LoadingBlock lines={5} className="min-h-44" /> : <TrendBars data={leadsTrend} />}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] border-emerald-100/70 p-5 lg:col-span-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Lead Status</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">Pipeline breakdown</h2>
            </div>
            <Badge variant="success">{`${formatCompact(stats.leads.won)} won`}</Badge>
          </div>
          <div className="mt-5 space-y-4">
            {loading ? (
              <LoadingBlock lines={5} />
            ) : stats.leads.total ? (
              stageRows.map((row) => (
                <StageRow key={row.label} label={row.label} value={row.value} max={stats.leads.total} tone={row.tone} />
              ))
            ) : (
              <WaEmpty icon={HiOutlineSparkles} title="No leads yet" description="Add WhatsApp leads to see how your pipeline is distributed across stages." />
            )}
          </div>
        </Card>
      </section>

      {/* Right panel: conversations + follow-ups */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] border-emerald-100/70 p-5 lg:col-span-7">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Recent Conversations</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">Latest WhatsApp contacts</h2>
            </div>
            <Link to="/app/whatsapp-inbox" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Open inbox</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <LoadingBlock lines={4} />
            ) : recentChats.length ? (
              recentChats.map((contact) => (
                <div key={contact.id} className="flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-emerald-100/70 bg-white/70 px-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {String(contact.name || 'W').trim().charAt(0).toUpperCase() || 'W'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{contact.name || 'WhatsApp contact'}</p>
                    <p className="truncate text-xs text-slate-500">{contact.phone || 'No number on file'}</p>
                  </div>
                  <Badge variant={String(contact.status).toLowerCase() === 'customer' ? 'success' : 'default'} className="shrink-0">{contact.status || 'New'}</Badge>
                </div>
              ))
            ) : (
              <WaEmpty title="No conversations yet" description="Add WhatsApp contacts to start tracking conversations and replies." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] border-emerald-100/70 p-5 lg:col-span-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Follow-Ups</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">Due today</h2>
            </div>
            <Link to="/app/whatsapp-followups" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">View all</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <LoadingBlock lines={4} />
            ) : todayFollowUps.length ? (
              todayFollowUps.map((item) => {
                const overdue = isFollowUpOverdue(item, new Date())
                return (
                  <div key={item.id} className="flex min-w-0 items-start gap-3 rounded-[1.15rem] border border-emerald-100/70 bg-white/70 px-3 py-3">
                    <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl', overdue ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}>
                      {overdue ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineClock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{item.title || 'Follow-up'}</p>
                      <p className="truncate text-xs text-slate-500">{item.contactName || 'No contact'}{item.dueDate ? ` · ${item.dueDate}` : ''}</p>
                    </div>
                    {overdue ? <Badge variant="danger" className="shrink-0">Overdue</Badge> : <Badge variant="success" className="shrink-0">Today</Badge>}
                  </div>
                )
              })
            ) : (
              <WaEmpty icon={HiOutlineBell} title="No follow-ups due" description="Schedule follow-ups to keep every WhatsApp lead warm." />
            )}
          </div>
        </Card>
      </section>

      {/* Quick actions */}
      <section className="min-w-0">
        <Card className="rounded-[1.6rem] border-emerald-100/70 p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Quick Actions</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">Move work forward</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction to="/app/whatsapp-leads" icon={HiOutlinePlus} title="New Lead" detail="Capture a WhatsApp lead" />
            <QuickAction to="/app/customers" icon={HiOutlineUserPlus} title="Add Customer" detail="Create a customer record" />
            <QuickAction to="/app/whatsapp-templates" icon={HiOutlineDocumentText} title="Create Template" detail="Draft a reusable reply" />
            <QuickAction to="/app/whatsapp-inbox" icon={HiOutlineInbox} title="Open WhatsApp Inbox" detail="Jump into conversations" />
          </div>
        </Card>
      </section>
    </div>
  )
}

export default memo(WhatsappDashboard)
