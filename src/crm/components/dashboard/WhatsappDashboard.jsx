import { Link } from 'react-router-dom'
import { memo, useMemo } from 'react'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineSparkles,
  HiOutlineBell,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineInbox,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePhone,
  HiOutlineSignal,
  HiOutlineShieldCheck,
  HiOutlineLink,
  HiOutlineQueueList,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineCog6Tooth,
  HiOutlineRocketLaunch,
} from 'react-icons/hi2'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import SkeletonLoader from '../system/SkeletonLoader.jsx'
import { cn } from '../../utils/cn.js'
import { formatCompact, formatPercentValue } from '../../utils/format.js'
import {
  LEAD_STAGES,
  PRIORITIES,
  toDateValue,
  isFollowUpDueToday,
  isFollowUpOverdue,
  templateStats,
} from '../../lib/whatsappManual.js'
import { whatsappTrialStatus, whatsappCapabilities } from '../../lib/whatsappApiTrial.js'

/* --------------------------------- helpers -------------------------------- */

const DAY_MS = 86400000

function startOfDay(date) {
  const next = new Date(date.getTime())
  next.setHours(0, 0, 0, 0)
  return next
}

function contactTimestamp(contact) {
  return toDateValue(contact.lastContactedAt) || toDateValue(contact.updatedAt) || toDateValue(contact.createdAt)
}

function formatWhen(date) {
  if (!date) return '—'
  const now = new Date()
  const sameDay = startOfDay(now).getTime() === startOfDay(date).getTime()
  if (sameDay) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (now.getTime() - date.getTime() < 7 * DAY_MS) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(date) {
  if (!date) return 'Never'
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Connection badge state derived from non-secret config only.
function connectionMeta(config = {}) {
  const cs = String(config.connectionStatus || '').toLowerCase()
  const hasData = Boolean(config.connectedNumber || config.phoneNumberId || config.businessAccountId)
  if (config.webhookVerified || cs === 'connected') return { label: 'Connected', variant: 'success' }
  if (cs === 'verification_failed' || cs === 'failed') return { label: 'Verification Failed', variant: 'danger' }
  if (cs === 'disconnected') return { label: 'Disconnected', variant: 'danger' }
  if (hasData) return { label: 'Pending Verification', variant: 'warning' }
  return { label: 'Not Connected', variant: 'default' }
}

function modeLabel(config = {}) {
  const mode = config.whatsappApiMode || 'manual'
  if (mode === 'paid-api') return 'Paid API'
  if (mode === 'trial-api') return 'Trial API'
  return 'Manual Mode'
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

const PRIORITY_TONES = {
  Low: 'bg-emerald-300',
  Medium: 'bg-teal-400',
  High: 'bg-amber-400',
  Urgent: 'bg-rose-500',
}

const METRIC_TONES = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  lime: 'border-lime-200 bg-lime-50 text-lime-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
}

const Trend = memo(function Trend({ dir = 'flat', label }) {
  if (!label) return null
  const tone = dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-rose-500' : 'text-slate-400'
  const Icon = dir === 'down' ? HiOutlineArrowTrendingDown : HiOutlineArrowTrendingUp
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', tone)}>
      {dir !== 'flat' ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  )
})

const WaMetricCard = memo(function WaMetricCard({ icon: Icon, label, value, helper, tone = 'green', trend, loading = false }) {
  return (
    <div className="min-w-0">
      <Card className="h-full rounded-[1.5rem] border-emerald-100/70 bg-gradient-to-br from-white via-white to-emerald-50/60 p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-[0_18px_40px_-24px_rgba(16,185,129,0.55)] dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        {loading ? (
          <SkeletonLoader lines={3} />
        ) : (
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/70">{label}</p>
              <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {trend ? <Trend dir={trend.dir} label={trend.label} /> : null}
                <p className="line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p>
              </div>
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

const WaEmpty = memo(function WaEmpty({ icon: Icon = HiOutlineChatBubbleLeftRight, title, description, action }) {
  return (
    <div className="grid min-h-[10rem] place-items-center rounded-[1.25rem] border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="max-w-xs">
        <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        {action ? (
          <Link to={action.to} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
})

const LoadingBlock = memo(function LoadingBlock({ lines = 4, className = '' }) {
  return (
    <div className={cn('rounded-[1.25rem] border border-emerald-100 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-slate-900/40', className)}>
      <SkeletonLoader lines={lines} />
    </div>
  )
})

const TrendBars = memo(function TrendBars({ data, emptyTitle = 'No activity yet', emptyDescription = 'New records will plot here as they arrive this week.', unit = 'records' }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const hasData = data.some((item) => item.value > 0)
  if (!hasData) {
    return <WaEmpty icon={HiOutlineArrowTrendingUp} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <div className="flex h-44 items-end gap-2 rounded-[1.25rem] border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-4 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900/40">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-green-400 shadow-sm"
              style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
              title={`${item.value} ${unit}`}
            />
          </div>
          <span className="w-full truncate text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
})

const BarRow = memo(function BarRow({ label, value, max, tone }) {
  const safeMax = Math.max(1, max)
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="shrink-0 font-semibold text-slate-950 dark:text-white">{formatCompact(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
})

const SectionCard = memo(function SectionCard({ eyebrow, title, right, children, span = '' }) {
  return (
    <Card className={cn('rounded-[1.6rem] border-emerald-100/70 p-5', span)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
        </div>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  )
})

const StatChip = memo(function StatChip({ label, value, tone = 'emerald' }) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
    rose: 'border-rose-100 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <div className={cn('rounded-2xl border p-3 text-center', tones[tone] || tones.emerald)}>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
})

const IntegrationRow = memo(function IntegrationRow({ icon: Icon, label, value, ok }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100/70 bg-white/70 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-slate-900/40">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      </span>
      <span className="min-w-0 truncate text-right text-xs font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  )
})

const QuickAction = memo(function QuickAction({ to, icon: Icon, title, detail }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-emerald-100 bg-white/70 p-3 transition-colors duration-100 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-slate-900/40 dark:hover:bg-emerald-950/30"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white transition-transform duration-100 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{title}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
    </Link>
  )
})

const HeroButton = memo(function HeroButton({ to, icon: Icon, label, primary = false }) {
  return (
    <Link
      to={to}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition-transform duration-100 hover:scale-[1.02]',
        primary
          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
          : 'border border-emerald-200 bg-white/80 text-emerald-800 hover:bg-white dark:border-emerald-800/60 dark:bg-slate-900/60 dark:text-emerald-200',
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  )
})

/* ------------------------------- component -------------------------------- */

function WhatsappDashboard({
  stats,
  contacts = [],
  leads = [],
  followUps = [],
  templates = [],
  config = {},
  loading = false,
  businessTitle = 'WhatsApp CRM',
  workspaceName = '',
}) {
  const waStatus = useMemo(() => whatsappTrialStatus(config), [config])
  const caps = useMemo(() => whatsappCapabilities(config), [config])
  const connection = useMemo(() => connectionMeta(config), [config])
  const tplStats = useMemo(() => templateStats(templates), [templates])

  const newLeadsToday = useMemo(() => {
    const today = startOfDay(new Date()).getTime()
    return leads.reduce((count, lead) => {
      const date = toDateValue(lead.createdAt)
      return date && startOfDay(date).getTime() === today ? count + 1 : count
    }, 0)
  }, [leads])

  const conversionRate = stats.leads.total ? (stats.leads.won / stats.leads.total) * 100 : 0

  const contactsGrowth = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now).getTime()
    const weekAgo = today - 6 * DAY_MS
    const monthAgo = today - 29 * DAY_MS
    let daily = 0
    let weekly = 0
    let monthly = 0
    const buckets = []
    for (let i = 6; i >= 0; i -= 1) {
      const day = startOfDay(new Date(now.getTime() - i * DAY_MS))
      buckets.push({ key: day.getTime(), label: day.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 })
    }
    const index = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    contacts.forEach((contact) => {
      const date = toDateValue(contact.createdAt)
      if (!date) return
      const t = startOfDay(date).getTime()
      if (t === today) daily += 1
      if (t >= weekAgo) weekly += 1
      if (t >= monthAgo) monthly += 1
      const bucket = index.get(t)
      if (bucket) bucket.value += 1
    })
    return { daily, weekly, monthly, buckets }
  }, [contacts])

  const stageRows = useMemo(
    () => LEAD_STAGES.map((stage) => ({ label: stage, value: stats.leads.byStage?.[stage] || 0, tone: STAGE_TONES[stage] || 'bg-emerald-400' })),
    [stats.leads.byStage],
  )

  const priorityRows = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Urgent: 0 }
    followUps.forEach((item) => {
      if (String(item.status || 'Pending').toLowerCase() !== 'pending') return
      const priority = PRIORITIES.includes(item.priority) ? item.priority : 'Medium'
      counts[priority] += 1
    })
    return PRIORITIES.map((priority) => ({ label: priority, value: counts[priority], tone: PRIORITY_TONES[priority] }))
  }, [followUps])

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

  const pendingAssignment = useMemo(() => contacts.filter((contact) => !contact.assignedTo).length, [contacts])
  const totalUnread = useMemo(() => contacts.reduce((sum, contact) => sum + (Number(contact.unreadCount) || 0), 0), [contacts])

  const checklist = useMemo(
    () => [
      { label: 'Business Number Added', done: Boolean(config.connectedNumber) },
      { label: 'Phone Number ID Saved', done: Boolean(config.phoneNumberId) },
      { label: 'Business Account ID Saved', done: Boolean(config.businessAccountId) },
      { label: 'Webhook Verified', done: Boolean(config.webhookVerified) },
      { label: 'API Mode Enabled', done: (config.whatsappApiMode || 'manual') !== 'manual' },
      { label: 'Templates Created', done: templates.length > 0 },
      { label: 'Inbox Ready', done: contacts.length > 0 },
    ],
    [config, templates.length, contacts.length],
  )
  const doneCount = checklist.filter((item) => item.done).length
  const completion = Math.round((doneCount / checklist.length) * 100)
  const missingRequirements = checklist.filter((item) => !item.done).map((item) => item.label)

  const usageLabel = caps.isPaid ? `${formatCompact(waStatus.messagesUsed)} sent` : `${formatCompact(waStatus.messagesUsed)} / ${formatCompact(waStatus.messageLimit)}`
  const lastVerified = toDateValue(config.updatedAt)
  const hasConnection = Boolean(config.connectedNumber || config.phoneNumberId || config.businessAccountId)

  const cards = [
    { icon: HiOutlineUserGroup, label: 'Total Contacts', value: formatCompact(stats.contacts.total), helper: `${formatCompact(stats.contacts.customers)} customers`, tone: 'green', trend: stats.contacts.total ? { dir: 'up', label: `+${contactsGrowth.weekly} wk` } : null },
    { icon: HiOutlineChatBubbleLeftRight, label: 'Active Conversations', value: formatCompact(stats.contacts.active), helper: `${formatCompact(stats.contacts.total)} total contacts`, tone: 'teal' },
    { icon: HiOutlineUserPlus, label: 'New Leads Today', value: formatCompact(newLeadsToday), helper: `${formatCompact(stats.leads.open)} open in pipeline`, tone: 'green', trend: newLeadsToday ? { dir: 'up', label: 'today' } : null },
    { icon: HiOutlineBell, label: 'Follow-Ups Due', value: formatCompact(stats.followUps.dueToday), helper: `${formatCompact(stats.followUps.overdue)} overdue`, tone: stats.followUps.overdue ? 'amber' : 'lime', trend: stats.followUps.overdue ? { dir: 'down', label: `${stats.followUps.overdue} overdue` } : null },
    { icon: HiOutlineDocumentText, label: 'Templates Created', value: formatCompact(tplStats.total), helper: `${Object.keys(tplStats.byCategory).length} categories`, tone: 'sky' },
    { icon: HiOutlineChartBar, label: 'Message Usage', value: usageLabel, helper: caps.isPaid ? 'Unlimited (paid)' : `${formatCompact(waStatus.messagesRemaining)} remaining`, tone: 'teal' },
    { icon: HiOutlineArrowTrendingUp, label: 'Conversion Rate', value: formatPercentValue(conversionRate), helper: 'Won vs. total leads', tone: 'green' },
    { icon: HiOutlineSignal, label: 'API Status', value: modeLabel(config), helper: connection.label, tone: connection.variant === 'success' ? 'green' : connection.variant === 'danger' ? 'amber' : 'sky' },
  ]

  return (
    <div className="crm-dashboard-page min-w-0 space-y-5">
      {/* Hero / sticky command header */}
      <section className="sticky top-0 z-20 min-w-0 overflow-hidden rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-5 shadow-sm sm:p-6 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-950 dark:to-green-950/30">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.6)]">
              <HiOutlineChatBubbleLeftRight className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">{workspaceName || businessTitle}</p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl dark:text-white">WhatsApp CRM Command Center</h1>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {config.displayName ? <span className="truncate font-medium text-slate-700 dark:text-slate-200">{config.displayName}</span> : null}
                {config.connectedNumber ? (
                  <span className="inline-flex items-center gap-1"><HiOutlinePhone className="h-3.5 w-3.5" /> {config.connectedNumber}</span>
                ) : (
                  <span className="text-slate-400">No number connected</span>
                )}
                <span className="inline-flex items-center gap-1"><HiOutlineCog6Tooth className="h-3.5 w-3.5" /> {modeLabel(config)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={loading ? 'default' : connection.variant}>{loading ? 'Syncing' : connection.label}</Badge>
              {!caps.isPaid ? <Badge variant="info">{`${waStatus.daysRemaining} trial days left`}</Badge> : <Badge variant="success">Paid plan</Badge>}
              <Badge variant="default">{`Usage ${usageLabel}`}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HeroButton to="/app/whatsapp-connect" icon={HiOutlineLink} label="Connect WhatsApp" primary />
              <HeroButton to="/app/whatsapp-connect" icon={HiOutlineShieldCheck} label="Verify Webhook" />
              <HeroButton to="/app/whatsapp-inbox" icon={HiOutlineInbox} label="Open Inbox" />
              <HeroButton to="/app/whatsapp-leads" icon={HiOutlinePlus} label="New Lead" />
            </div>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <WaMetricCard key={card.label} {...card} loading={loading} />
        ))}
      </section>

      {/* WhatsApp Business integration */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <SectionCard
          eyebrow="WhatsApp Business"
          title="Integration status"
          span="lg:col-span-7"
          right={<Badge variant={connection.variant}>{connection.label}</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={6} />
          ) : !hasConnection ? (
            <WaEmpty
              icon={HiOutlineLink}
              title="Not Connected"
              description="Connect your WhatsApp Business Account to unlock API features."
              action={{ to: '/app/whatsapp-connect', label: 'Connect WhatsApp' }}
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <IntegrationRow icon={HiOutlineSignal} label="Connection Status" value={connection.label} ok={connection.variant === 'success'} />
              <IntegrationRow icon={HiOutlineShieldCheck} label="Webhook Status" value={config.webhookStatus ? String(config.webhookStatus).replace(/_/g, ' ') : config.webhookVerified ? 'Verified' : 'Pending Setup'} ok={Boolean(config.webhookVerified)} />
              <IntegrationRow icon={HiOutlinePhone} label="Phone Number ID" value={config.phoneNumberId || 'Pending Setup'} ok={Boolean(config.phoneNumberId)} />
              <IntegrationRow icon={HiOutlineUserGroup} label="Business Account ID" value={config.businessAccountId || 'Pending Setup'} ok={Boolean(config.businessAccountId)} />
              <IntegrationRow icon={HiOutlineChartBar} label="Trial API Limit" value={caps.isPaid ? 'Unlimited' : formatCompact(waStatus.messageLimit)} ok />
              <IntegrationRow icon={HiOutlineArrowTrendingUp} label="Trial Usage" value={usageLabel} ok />
              <IntegrationRow icon={HiOutlineDocumentText} label="Templates Sync" value={tplStats.total ? `${tplStats.total} ready` : 'Not synced'} ok={tplStats.total > 0} />
              <IntegrationRow icon={HiOutlineClock} label="Last Verification" value={formatDateTime(lastVerified)} ok={Boolean(lastVerified)} />
            </div>
          )}
        </SectionCard>

        {/* Connection checklist */}
        <SectionCard
          eyebrow="Onboarding"
          title="Connection checklist"
          span="lg:col-span-5"
          right={<Badge variant={completion === 100 ? 'success' : 'info'}>{completion}%</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={6} />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{doneCount} of {checklist.length} complete</span>
                  <span>{completion}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5 text-sm">
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')}>
                      {item.done ? <HiOutlineCheckCircle className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={cn('truncate', item.done ? 'font-medium text-slate-700 line-through decoration-emerald-300 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300')}>{item.label}</span>
                  </li>
                ))}
              </ul>
              {missingRequirements.length ? (
                <p className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <span className="font-semibold">Missing: </span>{missingRequirements.join(', ')}.
                </p>
              ) : (
                <p className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  All connection requirements complete — ready for backend verification.
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </section>

      {/* Charts: contacts growth + leads by status */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <SectionCard
          eyebrow="Contacts Growth"
          title="New contacts this week"
          span="lg:col-span-7"
          right={<Badge variant="success">{`${formatCompact(stats.contacts.total)} total`}</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={5} className="min-h-44" />
          ) : (
            <>
              <TrendBars data={contactsGrowth.buckets} emptyTitle="No contacts yet" emptyDescription="Connect WhatsApp to start receiving conversations." unit="contacts" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatChip label="Daily" value={formatCompact(contactsGrowth.daily)} />
                <StatChip label="Weekly" value={formatCompact(contactsGrowth.weekly)} />
                <StatChip label="Monthly" value={formatCompact(contactsGrowth.monthly)} />
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Leads by Status"
          title="Pipeline breakdown"
          span="lg:col-span-5"
          right={<Badge variant="success">{`${formatCompact(stats.leads.won)} won`}</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={6} />
          ) : stats.leads.total ? (
            <div className="space-y-4">
              {stageRows.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={stats.leads.total} tone={row.tone} />
              ))}
            </div>
          ) : (
            <WaEmpty icon={HiOutlineSparkles} title="No leads yet" description="Add your first contact and start managing leads." action={{ to: '/app/whatsapp-leads', label: 'New Lead' }} />
          )}
        </SectionCard>
      </section>

      {/* Charts: message usage + follow-ups by priority */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <SectionCard
          eyebrow="Message Usage Trend"
          title="API message consumption"
          span="lg:col-span-6"
          right={<Badge variant={waStatus.usagePercent >= 100 ? 'danger' : 'success'}>{caps.isPaid ? 'Unlimited' : `${waStatus.usagePercent}%`}</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={4} />
          ) : (
            <div className="space-y-4">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', waStatus.usagePercent >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-green-400')}
                  style={{ width: `${caps.isPaid ? 100 : waStatus.usagePercent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatChip label="Used" value={formatCompact(waStatus.messagesUsed)} tone="emerald" />
                <StatChip label="Remaining" value={caps.isPaid ? '∞' : formatCompact(waStatus.messagesRemaining)} tone={waStatus.usagePercent >= 100 ? 'rose' : 'slate'} />
                <StatChip label="Trial Limit" value={caps.isPaid ? '∞' : formatCompact(waStatus.messageLimit)} tone="slate" />
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {caps.isPaid ? 'Paid plan — unlimited WhatsApp API messages.' : `Trial allows ${formatCompact(waStatus.messageLimit)} messages. Backend send/receive is not yet active.`}
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Follow-Ups by Priority"
          title="Open follow-up load"
          span="lg:col-span-6"
          right={<Badge variant="success">{`${formatCompact(stats.followUps.pending)} open`}</Badge>}
        >
          {loading ? (
            <LoadingBlock lines={4} />
          ) : stats.followUps.pending ? (
            <div className="space-y-4">
              {priorityRows.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={stats.followUps.pending} tone={row.tone} />
              ))}
            </div>
          ) : (
            <WaEmpty icon={HiOutlineBell} title="No open follow-ups" description="Schedule follow-ups to keep every WhatsApp lead warm." action={{ to: '/app/whatsapp-followups', label: 'Create Follow-Up' }} />
          )}
        </SectionCard>
      </section>

      {/* Right panel: conversations + follow-ups + unread queue */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <SectionCard
          eyebrow="Recent Conversations"
          title="Latest WhatsApp contacts"
          span="lg:col-span-7"
          right={<Link to="/app/whatsapp-inbox" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300">Open inbox</Link>}
        >
          <div className="space-y-3">
            {loading ? (
              <LoadingBlock lines={4} />
            ) : recentChats.length ? (
              recentChats.map((contact) => {
                const unread = Number(contact.unreadCount) || 0
                return (
                  <div key={contact.id} className="flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-emerald-100/70 bg-white/70 px-3 py-3 dark:border-emerald-900/40 dark:bg-slate-900/40">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {String(contact.name || 'W').trim().charAt(0).toUpperCase() || 'W'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{contact.name || 'WhatsApp contact'}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{contact.notes ? contact.notes : contact.phone || 'No messages yet'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] text-slate-400">{formatWhen(contactTimestamp(contact))}</span>
                      {unread > 0 ? <Badge variant="success" className="shrink-0">{unread}</Badge> : <Badge variant={String(contact.status).toLowerCase() === 'customer' ? 'success' : 'default'} className="shrink-0">{contact.status || 'New'}</Badge>}
                    </div>
                  </div>
                )
              })
            ) : (
              <WaEmpty title="No conversations yet" description="Connect WhatsApp to start receiving conversations." action={{ to: '/app/whatsapp-connect', label: 'Connect WhatsApp' }} />
            )}
          </div>
        </SectionCard>

        <div className="grid min-w-0 gap-5 lg:col-span-5">
          <SectionCard
            eyebrow="Today's Follow-Ups"
            title="What needs attention"
            right={<Link to="/app/whatsapp-followups" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300">View all</Link>}
          >
            {loading ? (
              <LoadingBlock lines={3} />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <StatChip label="Due Today" value={formatCompact(stats.followUps.dueToday)} tone="emerald" />
                  <StatChip label="Overdue" value={formatCompact(stats.followUps.overdue)} tone={stats.followUps.overdue ? 'rose' : 'slate'} />
                  <StatChip label="Upcoming" value={formatCompact(stats.followUps.dueSoon)} tone="amber" />
                </div>
                <div className="space-y-2.5">
                  {todayFollowUps.length ? (
                    todayFollowUps.map((item) => {
                      const overdue = isFollowUpOverdue(item, new Date())
                      return (
                        <div key={item.id} className="flex min-w-0 items-start gap-3 rounded-[1.15rem] border border-emerald-100/70 bg-white/70 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-slate-900/40">
                          <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl', overdue ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}>
                            {overdue ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineClock className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title || 'Follow-up'}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.contactName || 'No contact'}{item.dueDate ? ` · ${item.dueDate}` : ''}</p>
                          </div>
                          {overdue ? <Badge variant="danger" className="shrink-0">Overdue</Badge> : <Badge variant="success" className="shrink-0">Today</Badge>}
                        </div>
                      )
                    })
                  ) : (
                    <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3 text-center text-xs text-slate-500 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-400">No follow-ups due today.</p>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="Unread Queue" title="Inbox workload">
            {loading ? (
              <LoadingBlock lines={2} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-100/70 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-slate-900/40">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><HiOutlineQueueList className="h-5 w-5" /></span>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{formatCompact(totalUnread)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total unread</p>
                </div>
                <div className="rounded-2xl border border-emerald-100/70 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-slate-900/40">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><HiOutlineUserPlus className="h-5 w-5" /></span>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{formatCompact(pendingAssignment)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pending assignment</p>
                </div>
                <p className="col-span-2 text-[11px] leading-5 text-slate-400">Live unread counts activate once WhatsApp message receive is connected.</p>
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      {/* Quick actions */}
      <section className="min-w-0">
        <SectionCard eyebrow="Quick Actions" title="Move work forward">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction to="/app/whatsapp-inbox" icon={HiOutlineInbox} title="Open Inbox" detail="Jump into conversations" />
            <QuickAction to="/app/whatsapp-leads" icon={HiOutlinePlus} title="New Lead" detail="Capture a WhatsApp lead" />
            <QuickAction to="/app/whatsapp-inbox" icon={HiOutlineUserPlus} title="New Contact" detail="Add a WhatsApp contact" />
            <QuickAction to="/app/whatsapp-templates" icon={HiOutlineDocumentText} title="Create Template" detail="Draft a reusable reply" />
            <QuickAction to="/app/whatsapp-followups" icon={HiOutlineBell} title="Create Follow-Up" detail="Schedule a reminder" />
            <QuickAction to="/app/whatsapp-connect" icon={HiOutlineLink} title="Connect WhatsApp" detail="Set up the integration" />
            <QuickAction to="/app/settings" icon={HiOutlineShieldCheck} title="Verify Webhook" detail="Confirm webhook status" />
            <QuickAction to="/app/reports" icon={HiOutlineRocketLaunch} title="View Reports" detail="Analytics & exports" />
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

export default memo(WhatsappDashboard)
