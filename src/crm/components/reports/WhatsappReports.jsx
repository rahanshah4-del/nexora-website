import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  HiOutlineArrowDownTray,
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineInbox,
  HiOutlinePrinter,
  HiOutlineSignal,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import EmptyState from '../system/EmptyState.jsx'
import { useUser } from '../../hooks/useUser.js'
import { useWhatsappContacts } from '../../hooks/useWhatsappContacts.js'
import { useWhatsappLeads } from '../../hooks/useWhatsappLeads.js'
import { useWhatsappFollowUps } from '../../hooks/useWhatsappFollowUps.js'
import { useWhatsappTemplates } from '../../hooks/useWhatsappTemplates.js'
import { useWhatsappSettings } from '../../hooks/useWhatsappSettings.js'
import { useTeamMembers } from '../../hooks/useTeamMembers.js'
import { useBusinessSettings } from '../../hooks/useBusinessSettings.js'
import {
  CONTACT_STATUSES,
  LEAD_SOURCES,
  LEAD_STAGES,
  PRIORITIES,
  TEMPLATE_CATEGORIES,
  contactStats,
  followUpStats,
  isFollowUpDueSoon,
  isFollowUpOpen,
  leadStats,
  templateStats,
  toDateValue,
} from '../../lib/whatsappManual.js'
import { whatsappCapabilities, whatsappTrialStatus } from '../../lib/whatsappApiTrial.js'
import { buildReportId, exportReportCsv, exportReportExcel, exportReportPdf } from '../../lib/reportGenerator.js'

const GREEN = '#16a34a'
const GREEN_SOFT = '#22c55e'
const GREEN_TINT = '#34d399'
const PIE_GREENS = ['#16a34a', '#22c55e', '#34d399', '#4ade80', '#86efac', '#10b981', '#059669']
const WON_LOST = ['#16a34a', '#ef4444']
const PRIORITY_COLORS = { Low: '#86efac', Medium: '#22c55e', High: '#f59e0b', Urgent: '#ef4444' }

const rangeOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom date range' },
]

/* --------------------------------- helpers -------------------------------- */

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function dateWindow(filters) {
  const now = new Date()
  if (filters.range === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (filters.range === 'week') {
    const start = startOfDay(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return { start, end: endOfDay(now) }
  }
  if (filters.range === 'month') {
    const start = startOfDay(now)
    start.setDate(1)
    return { start, end: endOfDay(now) }
  }
  if (filters.range === 'custom') {
    return {
      start: filters.startDate ? startOfDay(new Date(filters.startDate)) : null,
      end: filters.endDate ? endOfDay(new Date(filters.endDate)) : null,
    }
  }
  return { start: null, end: null }
}

function recordDate(item) {
  return toDateValue(item?.createdAt) || toDateValue(item?.updatedAt) || toDateValue(item?.dueDate) || toDateValue(item?.lastContactedAt)
}

function withinWindow(item, win) {
  if (!win.start && !win.end) return true
  const date = recordDate(item)
  if (!date) return true
  if (win.start && date < win.start) return false
  if (win.end && date > win.end) return false
  return true
}

function monthKey(date) {
  if (!date) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function num(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function pct(part, total) {
  const denom = num(total)
  if (!denom) return 0
  return Math.round((num(part) / denom) * 100)
}

function formatMoney(value, currency = 'PKR') {
  return `${currency} ${num(value).toLocaleString('en-US')}`
}

function agentKey(value) {
  return String(value || '').trim()
}

function connectionMeta(config) {
  const status = String(config.connectionStatus || '').toLowerCase()
  if (config.webhookVerified || status === 'connected') return { label: 'Connected', variant: 'success' }
  if (status === 'failed' || status === 'verification_failed') return { label: 'Verification Failed', variant: 'danger' }
  if (status === 'disconnected') return { label: 'Disconnected', variant: 'danger' }
  if (config.connectedNumber || config.phoneNumberId || config.businessAccountId) return { label: 'Pending Verification', variant: 'warning' }
  return { label: 'Not Connected', variant: 'default' }
}

/* --------------------------------- atoms ---------------------------------- */

function KpiCard({ icon: Icon, label, value, helper, tone = 'green' }) {
  const toneClass = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  }[tone]
  return (
    <Card className="print-break-inside-avoid p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
          {helper ? <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p> : null}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, hasData, emptyTitle, emptyDescription, children }) {
  return (
    <Card className="print-break-inside-avoid p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <Badge variant="success">Chart</Badge>
      </div>
      <div className="mt-4 h-60">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          <EmptyState title={emptyTitle || 'No data yet'} description={emptyDescription || 'Data will appear here once available.'} />
        )}
      </div>
    </Card>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="min-w-0 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  )
}

/* ------------------------------- component -------------------------------- */

export default function WhatsappReports() {
  const { workspaceId, userDoc, firebaseUser } = useUser()
  const contactsApi = useWhatsappContacts({ enabled: true })
  const leadsApi = useWhatsappLeads({ enabled: true })
  const followUpsApi = useWhatsappFollowUps({ enabled: true })
  const templatesApi = useWhatsappTemplates({ enabled: true })
  const settingsApi = useWhatsappSettings({ enabled: true })
  const teamApi = useTeamMembers()
  const businessSettingsApi = useBusinessSettings()

  const [filters, setFilters] = useState({
    range: 'all',
    startDate: '',
    endDate: '',
    agent: 'all',
    leadStage: 'all',
    contactStatus: 'all',
    templateCategory: 'all',
  })
  const [notice, setNotice] = useState('')

  const config = useMemo(() => settingsApi.config || {}, [settingsApi.config])
  const members = useMemo(() => teamApi.members || [], [teamApi.members])
  const loading = contactsApi.loading || leadsApi.loading || followUpsApi.loading || templatesApi.loading

  const win = useMemo(() => dateWindow(filters), [filters])

  // Apply Date Range + Agent + status/category filters consistently.
  const filtered = useMemo(() => {
    const inAgent = (item) => filters.agent === 'all' || agentKey(item.assignedTo) === filters.agent
    const contacts = (contactsApi.contacts || [])
      .filter((item) => withinWindow(item, win))
      .filter(inAgent)
      .filter((item) => filters.contactStatus === 'all' || String(item.status || '') === filters.contactStatus)
    const leads = (leadsApi.leads || [])
      .filter((item) => withinWindow(item, win))
      .filter(inAgent)
      .filter((item) => filters.leadStage === 'all' || String(item.stage || '') === filters.leadStage)
    const followUps = (followUpsApi.followUps || [])
      .filter((item) => withinWindow(item, win))
      .filter(inAgent)
    const templates = (templatesApi.templates || [])
      .filter((item) => withinWindow(item, win))
      .filter((item) => filters.templateCategory === 'all' || String(item.category || '') === filters.templateCategory)
    return { contacts, leads, followUps, templates }
  }, [contactsApi.contacts, leadsApi.leads, followUpsApi.followUps, templatesApi.templates, win, filters])

  const stats = useMemo(
    () => ({
      contacts: contactStats(filtered.contacts),
      leads: leadStats(filtered.leads),
      followUps: followUpStats(filtered.followUps),
      templates: templateStats(filtered.templates),
    }),
    [filtered],
  )

  const trial = useMemo(() => whatsappTrialStatus(config), [config])
  const caps = useMemo(() => whatsappCapabilities(config), [config])
  const connection = useMemo(() => connectionMeta(config), [config])
  const currency = config.currency || filtered.leads[0]?.currency || 'PKR'
  const isConnected = connection.variant === 'success'

  /* ------------------------------- chart data ------------------------------ */

  const contactGrowth = useMemo(() => {
    const map = new Map()
    filtered.contacts.forEach((contact) => {
      const key = monthKey(recordDate(contact))
      if (!key) return
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([key, count]) => ({ month: monthLabel(key), contacts: count }))
  }, [filtered.contacts])

  const contactStatusData = useMemo(
    () => CONTACT_STATUSES.map((status) => ({ name: status, value: stats.contacts.byStatus?.[status] || 0 })).filter((row) => row.value > 0),
    [stats.contacts.byStatus],
  )

  const leadStageData = useMemo(
    () => LEAD_STAGES.map((stage) => ({ name: stage, value: stats.leads.byStage?.[stage] || 0 })),
    [stats.leads.byStage],
  )

  const wonLostData = useMemo(
    () => [
      { name: 'Won', value: stats.leads.won },
      { name: 'Lost', value: stats.leads.lost },
    ].filter((row) => row.value > 0),
    [stats.leads.won, stats.leads.lost],
  )

  const leadSourceData = useMemo(() => {
    const map = {}
    filtered.leads.forEach((lead) => {
      const source = String(lead.source || 'Other')
      map[source] = (map[source] || 0) + 1
    })
    return LEAD_SOURCES.map((source) => ({ name: source, value: map[source] || 0 })).filter((row) => row.value > 0)
  }, [filtered.leads])

  const priorityData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Urgent: 0 }
    filtered.followUps.forEach((item) => {
      if (!isFollowUpOpen(item)) return
      const priority = PRIORITIES.includes(item.priority) ? item.priority : 'Medium'
      counts[priority] += 1
    })
    return PRIORITIES.map((priority) => ({ name: priority, value: counts[priority] }))
  }, [filtered.followUps])

  const completionData = useMemo(
    () => [
      { name: 'Completed', value: stats.followUps.completed },
      { name: 'Pending', value: stats.followUps.pending },
      { name: 'Cancelled', value: stats.followUps.cancelled },
    ].filter((row) => row.value > 0),
    [stats.followUps],
  )

  const templateUsage = useMemo(
    () =>
      [...filtered.templates]
        .sort((a, b) => num(b.usageCount) - num(a.usageCount))
        .slice(0, 7)
        .map((template) => ({ name: template.name || 'Template', usage: num(template.usageCount) })),
    [filtered.templates],
  )

  const templateCategoryData = useMemo(
    () => TEMPLATE_CATEGORIES.map((category) => ({ name: category, value: stats.templates.byCategory?.[category] || 0 })).filter((row) => row.value > 0),
    [stats.templates.byCategory],
  )

  // Team analytics — leads/follow-ups per agent, completed, won, score.
  const agents = useMemo(() => {
    const map = new Map()
    const ensure = (key, name) => {
      const id = agentKey(key)
      if (!id) return null
      if (!map.has(id)) map.set(id, { id, name: name || id, leads: 0, won: 0, followUps: 0, completed: 0 })
      return map.get(id)
    }
    members.forEach((member) => ensure(member.id, member.name || member.email))
    filtered.leads.forEach((lead) => {
      const member = members.find((entry) => entry.id === agentKey(lead.assignedTo) || entry.name === agentKey(lead.assignedTo))
      const row = ensure(lead.assignedTo, member?.name || member?.email)
      if (!row) return
      row.leads += 1
      if (String(lead.stage || '').toLowerCase() === 'won') row.won += 1
    })
    filtered.followUps.forEach((item) => {
      const member = members.find((entry) => entry.id === agentKey(item.assignedTo) || entry.name === agentKey(item.assignedTo))
      const row = ensure(item.assignedTo, member?.name || member?.email)
      if (!row) return
      row.followUps += 1
      if (String(item.status || '').toLowerCase() === 'completed') row.completed += 1
    })
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        score: Math.min(100, row.won * 25 + row.completed * 10 + row.leads * 3 + row.followUps * 2),
      }))
      .sort((a, b) => b.score - a.score)
  }, [members, filtered.leads, filtered.followUps])

  const conversionRate = pct(stats.leads.won, stats.leads.total)
  const activeTemplates = filtered.templates.filter((template) => template.active !== false).length
  const totalTagged = filtered.contacts.filter((contact) => Array.isArray(contact.tags) && contact.tags.length > 0).length
  const inactiveContacts = filtered.contacts.filter((contact) => ['inactive', 'blocked'].includes(String(contact.status || '').toLowerCase())).length
  const newContacts = filtered.contacts.filter((contact) => String(contact.status || '').toLowerCase() === 'new').length
  const upcomingFollowUps = filtered.followUps.filter((item) => isFollowUpDueSoon(item)).length

  const hasData = filtered.contacts.length || filtered.leads.length || filtered.followUps.length || filtered.templates.length

  /* --------------------------------- export -------------------------------- */

  const reportExport = useMemo(() => {
    const reportId = buildReportId('WA')
    const generatedAt = new Date().toLocaleString()
    const workspaceName = businessSettingsApi.settings.businessName || userDoc?.workspaceName || userDoc?.company || 'WhatsApp CRM Workspace'
    const dateRange = filters.range === 'custom'
      ? `${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`
      : rangeOptions.find((option) => option.value === filters.range)?.label || 'All time'
    return {
      reportId,
      title: 'WhatsApp CRM Report',
      workspaceName,
      businessType: 'WhatsApp CRM',
      dateRange,
      generatedBy: userDoc?.fullName || userDoc?.name || firebaseUser?.email || 'Workspace Owner',
      generatedAt,
      branding: { logo: '/nexora-brand-logo.png', logoUrl: '', receiptFooter: 'NEXORA SOLUTION — All rights reserved 2019-2026.' },
      summary: [
        { label: 'Total Contacts', value: String(stats.contacts.total) },
        { label: 'Active Contacts', value: String(stats.contacts.active) },
        { label: 'Total Leads', value: String(stats.leads.total) },
        { label: 'Won Leads', value: String(stats.leads.won) },
        { label: 'Lost Leads', value: String(stats.leads.lost) },
        { label: 'Conversion Rate', value: `${conversionRate}%` },
        { label: 'Active Follow-Ups', value: String(stats.followUps.pending) },
        { label: 'Overdue Follow-Ups', value: String(stats.followUps.overdue) },
        { label: 'Templates', value: String(stats.templates.total) },
        { label: 'Connection', value: connection.label },
        { label: 'API Mode', value: trial.label },
        { label: 'Trial Usage', value: `${trial.messagesUsed}/${trial.messageLimit}` },
      ],
      tables: [
        {
          title: 'Leads by Stage',
          columns: [
            { label: 'Stage', value: (row) => row.name },
            { label: 'Count', value: (row) => String(row.value) },
          ],
          rows: leadStageData,
        },
        {
          title: 'Follow-Ups by Priority',
          columns: [
            { label: 'Priority', value: (row) => row.name },
            { label: 'Open', value: (row) => String(row.value) },
          ],
          rows: priorityData,
        },
        {
          title: 'Team Performance',
          columns: [
            { label: 'Agent', value: (row) => row.name },
            { label: 'Leads', value: (row) => String(row.leads) },
            { label: 'Won', value: (row) => String(row.won) },
            { label: 'Follow-Ups', value: (row) => String(row.followUps) },
            { label: 'Completed', value: (row) => String(row.completed) },
            { label: 'Score', value: (row) => String(row.score) },
          ],
          rows: agents,
        },
      ],
      qrPayload: { reportId, workspaceId, businessType: 'WhatsApp CRM', dateRange, generatedAt, contacts: stats.contacts.total, leads: stats.leads.total },
    }
  }, [agents, businessSettingsApi.settings.businessName, connection.label, conversionRate, filters, firebaseUser?.email, leadStageData, priorityData, stats, trial.label, trial.messageLimit, trial.messagesUsed, userDoc, workspaceId])

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  function resetFilters() {
    setFilters({ range: 'all', startDate: '', endDate: '', agent: 'all', leadStage: 'all', contactStatus: 'all', templateCategory: 'all' })
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {notice ? (
        <div className="no-print fixed left-1/2 top-1/2 z-[110] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-xl">
          {notice}
        </div>
      ) : null}

      {/* Header */}
      <div className="overflow-hidden rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-5 shadow-sm sm:p-6 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-950 dark:to-green-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <HiOutlineChatBubbleLeftRight className="h-4 w-4" /> WhatsApp CRM Reports
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">WhatsApp CRM Reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Contacts, leads, follow-ups, templates, integration, and team performance — built only from your WhatsApp CRM data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={loading ? 'warning' : 'success'}>{loading ? 'Loading' : 'Live data'}</Badge>
            <Badge variant={connection.variant}>{connection.label}</Badge>
            <Badge variant="default">{trial.label}</Badge>
          </div>
        </div>
      </div>

      {/* Filters + Exports */}
      <Card className="no-print p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date Range</label>
            <Select className="mt-1.5" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>
              {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Agent</label>
            <Select className="mt-1.5" value={filters.agent} onChange={(event) => setFilters((current) => ({ ...current, agent: event.target.value }))}>
              <option value="all">All agents</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Lead Status</label>
            <Select className="mt-1.5" value={filters.leadStage} onChange={(event) => setFilters((current) => ({ ...current, leadStage: event.target.value }))}>
              <option value="all">All stages</option>
              {LEAD_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Contact Status</label>
            <Select className="mt-1.5" value={filters.contactStatus} onChange={(event) => setFilters((current) => ({ ...current, contactStatus: event.target.value }))}>
              <option value="all">All statuses</option>
              {CONTACT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Template Category</label>
            <Select className="mt-1.5" value={filters.templateCategory} onChange={(event) => setFilters((current) => ({ ...current, templateCategory: event.target.value }))}>
              <option value="all">All categories</option>
              {TEMPLATE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start date</label>
            <Input className="mt-1.5" type="date" disabled={filters.range !== 'custom'} value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">End date</label>
            <Input className="mt-1.5" type="date" disabled={filters.range !== 'custom'} value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
          <div className="flex items-end">
            <Button variant="subtle" className="h-10 w-full rounded-2xl" type="button" onClick={resetFilters}>Reset filters</Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="subtle" className="h-10 rounded-2xl" type="button" onClick={() => window.setTimeout(() => window.print(), 150)}>
            <HiOutlinePrinter className="h-4 w-4" /> Print Report
          </Button>
          <Button
            variant="subtle"
            className="h-10 rounded-2xl"
            type="button"
            onClick={async () => {
              try {
                await exportReportPdf(reportExport)
              } catch (error) {
                showNotice(error?.message || 'Unable to export PDF.')
              }
            }}
          >
            <HiOutlineDocumentText className="h-4 w-4" /> PDF Export
          </Button>
          <Button variant="subtle" className="h-10 rounded-2xl" type="button" onClick={() => exportReportExcel(reportExport)}>
            Excel Export
          </Button>
          <Button className="h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700" type="button" onClick={() => exportReportCsv(reportExport)}>
            <HiOutlineArrowDownTray className="h-4 w-4" /> CSV Export
          </Button>
        </div>
      </Card>

      {!loading && !hasData ? (
        <Card className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <HiOutlineChatBubbleLeftRight className="h-7 w-7" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">No WhatsApp CRM data yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Add WhatsApp contacts, leads, follow-ups, or templates and your reports will populate automatically.
          </p>
        </Card>
      ) : null}

      {/* 1 · WhatsApp Dashboard Report */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineBolt} title="WhatsApp Dashboard Report" subtitle="Top-level WhatsApp CRM performance." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={HiOutlineUserGroup} label="Total Contacts" value={stats.contacts.total} helper={`${newContacts} new`} />
          <KpiCard icon={HiOutlineUsers} label="Active Contacts" value={stats.contacts.active} helper={`${stats.contacts.customers} customers`} />
          <KpiCard icon={HiOutlineChatBubbleLeftRight} label="Total Leads" value={stats.leads.total} helper={`${stats.leads.open} open`} />
          <KpiCard icon={HiOutlineCheckCircle} label="Won Leads" value={stats.leads.won} helper={formatMoney(stats.leads.wonValue, currency)} />
          <KpiCard icon={HiOutlineBolt} label="Lost Leads" value={stats.leads.lost} tone="rose" />
          <KpiCard icon={HiOutlineSignal} label="Conversion Rate" value={`${conversionRate}%`} helper="Won vs total leads" />
          <KpiCard icon={HiOutlineClock} label="Active Follow-Ups" value={stats.followUps.pending} helper={`${stats.followUps.dueToday} due today`} tone="amber" />
          <KpiCard icon={HiOutlineClock} label="Overdue Follow-Ups" value={stats.followUps.overdue} tone="rose" />
          <KpiCard icon={HiOutlineDocumentText} label="Templates Created" value={stats.templates.total} helper={`${activeTemplates} active`} />
          <KpiCard icon={HiOutlineSignal} label="Connected Status" value={connection.label} tone={isConnected ? 'green' : 'amber'} />
          <KpiCard icon={HiOutlineInbox} label="Trial Usage" value={`${trial.messagesUsed}/${trial.messageLimit}`} helper={`${trial.messagesRemaining} remaining`} tone="sky" />
          <KpiCard icon={HiOutlineCheckCircle} label="API Mode" value={trial.label} helper={caps.isPaid ? 'Full access' : caps.isTrial ? `${trial.daysRemaining} days left` : 'Manual mode'} />
        </div>
      </section>

      {/* 2 · Contacts Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineUserGroup} title="Contacts Analytics" subtitle="Growth, status mix, and customer ratio." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard icon={HiOutlineUserGroup} label="New Contacts" value={newContacts} />
          <KpiCard icon={HiOutlineUsers} label="Active Contacts" value={stats.contacts.active} />
          <KpiCard icon={HiOutlineUsers} label="Inactive Contacts" value={inactiveContacts} tone="amber" />
          <KpiCard icon={HiOutlineCheckCircle} label="Tagged Contacts" value={totalTagged} tone="sky" />
          <KpiCard icon={HiOutlineUserGroup} label="Customers" value={stats.contacts.customers} />
          <KpiCard icon={HiOutlineChatBubbleLeftRight} label="Customer vs Lead" value={`${stats.contacts.customers} : ${stats.leads.total}`} helper="Customers vs leads" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Contact Growth Chart" subtitle="New contacts per month" hasData={contactGrowth.length > 0} emptyTitle="No contacts yet" emptyDescription="Add WhatsApp contacts to see growth.">
            <LineChart data={contactGrowth}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="contacts" stroke={GREEN} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
          <ChartCard title="Contact Status Chart" subtitle="Distribution by status" hasData={contactStatusData.length > 0} emptyTitle="No contacts yet" emptyDescription="Add contacts to see status mix.">
            <PieChart>
              <Pie data={contactStatusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {contactStatusData.map((entry, index) => <Cell key={entry.name} fill={PIE_GREENS[index % PIE_GREENS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
        </div>
      </section>

      {/* 3 · Leads Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineChatBubbleLeftRight} title="Leads Analytics" subtitle="Pipeline, sources, and conversion." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={HiOutlineChatBubbleLeftRight} label="Total Leads" value={stats.leads.total} />
          <KpiCard icon={HiOutlineCheckCircle} label="Won Leads" value={stats.leads.won} />
          <KpiCard icon={HiOutlineBolt} label="Lost Leads" value={stats.leads.lost} tone="rose" />
          <KpiCard icon={HiOutlineSignal} label="Conversion Rate" value={`${conversionRate}%`} />
          <KpiCard icon={HiOutlineInbox} label="Expected Revenue" value={formatMoney(stats.leads.pipelineValue, currency)} helper="Open pipeline value" tone="sky" />
          <KpiCard icon={HiOutlineCheckCircle} label="Won Value" value={formatMoney(stats.leads.wonValue, currency)} />
          <KpiCard icon={HiOutlineChatBubbleLeftRight} label="Open Leads" value={stats.leads.open} tone="amber" />
          <KpiCard icon={HiOutlineSignal} label="Lead Value (Total)" value={formatMoney(stats.leads.pipelineValue + stats.leads.wonValue, currency)} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <ChartCard title="Leads Pipeline Chart" subtitle="Leads by stage" hasData={stats.leads.total > 0} emptyTitle="No leads yet" emptyDescription="Add leads to see the pipeline.">
            <BarChart data={leadStageData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={GREEN_SOFT} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Won vs Lost Chart" subtitle="Closed lead outcomes" hasData={wonLostData.length > 0} emptyTitle="No closed leads" emptyDescription="Win or lose leads to compare.">
            <PieChart>
              <Pie data={wonLostData} dataKey="value" nameKey="name" outerRadius={90} label>
                {wonLostData.map((entry, index) => <Cell key={entry.name} fill={WON_LOST[index % WON_LOST.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
          <ChartCard title="Lead Source Chart" subtitle="Where leads come from" hasData={leadSourceData.length > 0} emptyTitle="No lead sources" emptyDescription="Add leads with sources.">
            <BarChart data={leadSourceData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={GREEN_TINT} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </section>

      {/* 4 · Follow-Up Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineClock} title="Follow-Up Analytics" subtitle="Due, overdue, and completion." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={HiOutlineClock} label="Due Today" value={stats.followUps.dueToday} tone="amber" />
          <KpiCard icon={HiOutlineClock} label="Overdue" value={stats.followUps.overdue} tone="rose" />
          <KpiCard icon={HiOutlineClock} label="Upcoming" value={upcomingFollowUps} tone="sky" />
          <KpiCard icon={HiOutlineCheckCircle} label="Completed" value={stats.followUps.completed} />
          <KpiCard icon={HiOutlineBolt} label="Cancelled" value={stats.followUps.cancelled} tone="amber" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <ChartCard title="Follow-Ups by Priority" subtitle="Open reminders by priority" hasData={priorityData.some((row) => row.value > 0)} emptyTitle="No follow-ups" emptyDescription="Create follow-ups to see priorities.">
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((entry) => <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || GREEN_SOFT} />)}
              </Bar>
            </BarChart>
          </ChartCard>
          <ChartCard title="Completion Rate" subtitle="Completed vs pending vs cancelled" hasData={completionData.length > 0} emptyTitle="No follow-ups" emptyDescription="Create follow-ups to track completion.">
            <PieChart>
              <Pie data={completionData} dataKey="value" nameKey="name" outerRadius={90} label>
                {completionData.map((entry, index) => <Cell key={entry.name} fill={PIE_GREENS[index % PIE_GREENS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
          <ChartCard title="Agent Performance" subtitle="Completed follow-ups per agent" hasData={agents.length > 0} emptyTitle="No agents" emptyDescription="Assign follow-ups to team members.">
            <BarChart data={agents.slice(0, 6).map((agent) => ({ name: agent.name, completed: agent.completed }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="completed" fill={GREEN} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </section>

      {/* 5 · Template Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineDocumentText} title="Template Analytics" subtitle="Usage and category mix." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={HiOutlineDocumentText} label="Total Templates" value={stats.templates.total} />
          <KpiCard icon={HiOutlineCheckCircle} label="Active Templates" value={activeTemplates} />
          <KpiCard icon={HiOutlineBolt} label="Total Usage Count" value={filtered.templates.reduce((sum, template) => sum + num(template.usageCount), 0)} tone="sky" />
          <KpiCard icon={HiOutlineDocumentText} label="Most Used" value={templateUsage[0]?.name || '—'} helper={templateUsage[0] ? `${templateUsage[0].usage} uses` : 'No usage yet'} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Template Usage Chart" subtitle="Top templates by usage" hasData={templateUsage.some((row) => row.usage > 0)} emptyTitle="No template usage" emptyDescription="Send templates to record usage.">
            <BarChart data={templateUsage}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="usage" fill={GREEN_SOFT} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Template Category Distribution" subtitle="Templates by category" hasData={templateCategoryData.length > 0} emptyTitle="No templates" emptyDescription="Create templates to see categories.">
            <PieChart>
              <Pie data={templateCategoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                {templateCategoryData.map((entry, index) => <Cell key={entry.name} fill={PIE_GREENS[index % PIE_GREENS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
        </div>
      </section>

      {/* 6 · Conversation Analytics (future-ready) */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineInbox} title="Conversation Analytics" subtitle="Live messaging metrics." />
        {isConnected ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={HiOutlineInbox} label="Total Conversations" value={0} helper="Syncs once messaging is live" />
            <KpiCard icon={HiOutlineChatBubbleLeftRight} label="Active Conversations" value={0} />
            <KpiCard icon={HiOutlineInbox} label="Unread Conversations" value={0} tone="amber" />
            <KpiCard icon={HiOutlineBolt} label="Messages Sent" value={0} />
            <KpiCard icon={HiOutlineInbox} label="Messages Received" value={0} />
            <KpiCard icon={HiOutlineCheckCircle} label="Delivered" value={0} />
            <KpiCard icon={HiOutlineCheckCircle} label="Read" value={0} tone="sky" />
            <KpiCard icon={HiOutlineBolt} label="Failed Messages" value={0} tone="rose" />
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <HiOutlineInbox className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-950 dark:text-white">Conversation analytics locked</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Connect WhatsApp Business API to unlock live conversation analytics.
            </p>
          </Card>
        )}
      </section>

      {/* 7 · Integration Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineSignal} title="Integration Analytics" subtitle="Connection, webhook, and trial status." />
        <Card className="print-break-inside-avoid p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatRow label="Connection Status" value={connection.label} />
            <StatRow label="API Mode" value={trial.label} />
            <StatRow label="Webhook Status" value={config.webhookStatus ? String(config.webhookStatus).replace(/_/g, ' ') : (config.webhookVerified ? 'Verified' : 'Pending')} />
            <StatRow label="Connected Number" value={config.connectedNumber || '—'} />
            <StatRow label="Phone Number ID" value={config.phoneNumberId || '—'} />
            <StatRow label="Business Account ID" value={config.businessAccountId || '—'} />
            <StatRow label="Trial Messages Used" value={trial.messagesUsed} />
            <StatRow label="Trial Remaining" value={Number.isFinite(trial.messagesRemaining) ? trial.messagesRemaining : 'Unlimited'} />
            <StatRow label="Trial Days Remaining" value={caps.isPaid ? 'Unlimited' : trial.daysRemaining} />
            <StatRow label="Template Sync Status" value={config.templateStatus ? String(config.templateStatus) : (stats.templates.total ? `${stats.templates.total} synced` : 'Not synced')} />
          </div>
        </Card>
      </section>

      {/* 8 · Team Analytics */}
      <section className="space-y-4">
        <SectionHeader icon={HiOutlineUsers} title="Team Analytics" subtitle="Per-agent leads, follow-ups, and score." />
        {agents.length ? (
          <Card className="print-break-inside-avoid overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-emerald-50/70 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <tr>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Won Leads</th>
                    <th className="px-4 py-3">Follow-Ups</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Performance Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{agent.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{agent.leads}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{agent.won}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{agent.followUps}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{agent.completed}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${agent.score}%` }} />
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{agent.score}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState title="No agent activity yet" description="Assign leads and follow-ups to team members to see agent performance." />
        )}
      </section>
    </motion.div>
  )
}
