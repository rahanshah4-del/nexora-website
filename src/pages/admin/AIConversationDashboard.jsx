import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineFaceFrown,
  HiOutlineFaceSmile,
  HiOutlineFunnel,
  HiOutlineHandThumbDown,
  HiOutlineHandThumbUp,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { exportCsv, exportPdf } from '../../crm/lib/exporters.js'

// ── Constants ──
const AI_GATEWAY_URL =
  import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'

const PROVIDERS = ['deepseek', 'openai', 'gemini', 'claude']
const PROVIDER_LABELS = { deepseek: 'DeepSeek', openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude' }
const PROVIDER_COLORS = ['#7c3aed', '#3b82f6', '#14b8a6', '#f97316']
const PROVIDER_HEX = { deepseek: '#7c3aed', openai: '#3b82f6', gemini: '#14b8a6', claude: '#f97316' }

// Approximate cost per 1M tokens (input + output blended)
const PROVIDER_COST_PER_1M = { deepseek: 0.21, openai: 0.375, gemini: 0.25, claude: 0.75 }

const MODULES = [
  'Restaurant POS', 'Retail POS', 'School ERP', 'CRM', 'WhatsApp CRM',
  'Inventory', 'Invoice', 'Transport', 'Property ERP', 'Medical Store POS',
  'Reports & Analytics', 'Team & Permissions', 'Email Marketing', 'General / Other',
]

const DEMO_USERS = [
  { email: 'ahmed@restaurant.pk', workspace: 'Lahore Grill House' },
  { email: 'sarah@retailhub.com', workspace: 'RetailHub Store' },
  { email: 'admin@school.edu.pk', workspace: 'Crescent Academy' },
  { email: 'bilal@transco.pk', workspace: 'Bilal Transport Co.' },
  { email: 'info@clinic.com', workspace: 'City Medical Store' },
  { email: 'umar@property.pk', workspace: 'Green Properties' },
  { email: 'fatima@cafe.pk', workspace: 'Fatima Cafe & Bistro' },
  { email: 'demo@nexora-demo.pk', workspace: 'Nexora Demo Account' },
  { email: 'zain@techstore.pk', workspace: 'Zain Tech Hub' },
  { email: 'ayesha@brand.pk', workspace: 'Ayesha Clothing Brand' },
]

const DEMO_QUESTIONS = [
  'How do I add a new menu item with variants?',
  'What are the best inventory reports for my store?',
  'Can I set up role-based permissions for my staff?',
  'How does the KOT system work for kitchen display?',
  'Show me how to generate monthly sales reports',
  'How do I connect WhatsApp Business API?',
  'What payment methods are supported in POS?',
  'How to set up customer loyalty points?',
  'Can I export invoices in bulk to PDF?',
  'Explain the table management system',
  'How does staff attendance tracking work?',
  'What is the process for purchase orders?',
  'How do I create a new deal in the pipeline?',
  'Can I integrate with my existing accounting software?',
  'How to configure tax rates for different products?',
  'Show me the kitchen production batch system',
  'How do delivery zones and charges work?',
  'What reports are available for school fee collection?',
  'Can I customize the invoice template?',
  'How to manage vehicle maintenance logs?',
]

function generateId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ── Helpers ──
function dateTimeLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '-'
}

function dateLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '-'
}

function searchRows(rows, queryText, fields) {
  const q = queryText.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    fields.some((field) => String(row[field] || '').toLowerCase().includes(q)),
  )
}

// ── Sub-Components ──
function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  )
}

function KpiCard({ label, value, helper, icon: Icon, tone = 'violet' }) {
  const colors = {
    violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
  }
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black leading-4 text-slate-500">{label}</p>
          <p className="mt-3 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {value}
          </p>
          <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function Panel({ title, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function ShellButton({ children, className = '', active = false, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-violet-300 bg-violet-50 text-violet-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50'
      } ${className}`}
      {...props}
    />
  )
}

function Status({ value }) {
  const s = String(value || '').toLowerCase().replace(/\s+/g, '_')
  const tone = ['active', 'completed', 'success', 'resolved', 'online'].includes(s)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : ['error', 'failed', 'flagged'].includes(s)
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : ['pending', 'processing'].includes(s)
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${tone}`}>
      {String(value || 'Unknown').replace(/_/g, ' ')}
    </span>
  )
}

function EmptyState({ title = 'No data yet', detail = '' }) {
  return (
    <div className="grid min-h-[10rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-28 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}

// ── Build conversation list from REAL analytics data ──
function buildConversationsFromStats(statsData) {
  const conversations = []

  if (!statsData?.byDay) return conversations

  // Build real entries from per-day analytics
  for (const [date, day] of Object.entries(statsData.byDay)) {
    const dayQuestions = day.topQuestions || day.questions || []
    const avgTime = day.avgTime || 0
    const tokens = day.tokens || 0
    const requests = day.requests || 0
    const errors = day.errors || 0

    // Add real questions
    for (let i = 0; i < dayQuestions.length; i++) {
      const q = dayQuestions[i]
      // Skip stats/menu-import entries
      const isMeta = q.startsWith('[MENU') || q.startsWith('[STATS')
      conversations.push({
        id: `${date}-${i}`,
        timestamp: new Date(`${date}T${String(12 + Math.floor(i * 0.5)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
        provider: 'deepseek-chat',
        userEmail: '—',
        workspaceName: 'Nexora',
        question: isMeta ? q.replace(/^\[.*?\]\s*/, '') : q,
        response: isMeta ? 'AI system operation' : 'AI response',
        tokens: Math.round(tokens / Math.max(requests, 1)),
        responseTime: avgTime,
        cost: 0,
        module: isMeta ? 'system' : 'ai-chat',
        hasError: false,
        status: 'completed',
      })
    }

    // Add error entries
    if (errors > 0) {
      conversations.push({
        id: `${date}-errors`,
        timestamp: new Date(`${date}T00:00:00Z`),
        provider: 'deepseek-chat',
        userEmail: '—',
        workspaceName: 'Nexora',
        question: `${errors} error(s) on ${date}`,
        response: 'AI service error — retried',
        tokens: 0,
        responseTime: 0,
        cost: 0,
        module: 'system',
        hasError: true,
        status: 'error',
      })
    }
  }

  // Sort newest first
  conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return conversations
}

// ── Main Hook ──
function useAIDashboardData() {
  const [state, setState] = useState({
    stats: null,
    conversations: [],
    loading: true,
    error: null,
    lastUpdated: null,
  })

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const res = await fetch(`${AI_GATEWAY_URL}/admin/stats`, {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error(`Gateway returned ${res.status}`)
      }

      const statsData = await res.json()
      const conversations = buildConversationsFromStats(statsData)

      setState({
        stats: statsData,
        conversations,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (err) {
      console.error('[AI Dashboard] Fetch error:', err)
      // Fallback: empty conversation list when gateway is unavailable
      const conversations = []
      setState({
        stats: null,
        conversations,
        loading: false,
        error: err.message || 'Failed to fetch AI stats',
        lastUpdated: new Date(),
      })
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refresh: fetchData }
}

// ── Main Component ──
export default function AIConversationDashboard() {
  const { stats, conversations, loading, error, lastUpdated, refresh } = useAIDashboardData()

  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('30d')
  const [providerFilter, setProviderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [localConversations, setLocalConversations] = useState([])

  // Sync conversations from hook
  useEffect(() => {
    setLocalConversations(conversations)
  }, [conversations])

  // ── Derived Data ──
  const filteredConversations = useMemo(() => {
    let rows = localConversations

    // Date filter
    const now = Date.now()
    if (dateRange === '7d') rows = rows.filter((r) => now - r.timestamp.getTime() < 7 * 86400000)
    else if (dateRange === '30d') rows = rows.filter((r) => now - r.timestamp.getTime() < 30 * 86400000)
    else if (dateRange === '90d') rows = rows.filter((r) => now - r.timestamp.getTime() < 90 * 86400000)

    // Provider filter
    if (providerFilter !== 'all') rows = rows.filter((r) => r.provider === providerFilter)

    // Status filter
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter)

    // Search
    rows = searchRows(rows, search, ['question', 'response', 'userEmail', 'workspaceName', 'provider', 'module'])

    return rows
  }, [localConversations, dateRange, providerFilter, statusFilter, search])

  // ── Summary Stats ──
  const summary = useMemo(() => {
    const total = localConversations.length
    const active = localConversations.filter((r) => r.status === 'active').length
    const errorCount = localConversations.filter((r) => r.hasError).length
    const totalTokens = localConversations.reduce((sum, r) => sum + r.tokens, 0)
    const totalCost = localConversations.reduce((sum, r) => sum + r.cost, 0)
    const avgResponseTime = total > 0
      ? Math.round(localConversations.reduce((sum, r) => sum + r.responseTime, 0) / total)
      : 0
    const errorRate = total > 0 ? ((errorCount / total) * 100).toFixed(1) : '0.0'
    const totalRequests = stats?.total || localConversations.length

    return { total, active, errorCount, totalTokens, totalCost, avgResponseTime, errorRate, totalRequests }
  }, [localConversations, stats])

  // ── Time Series Data ──
  const timeSeriesData = useMemo(() => {
    const mode = dateRange === '7d' ? 'daily' : dateRange === '30d' ? 'daily' : dateRange === '90d' ? 'weekly' : 'monthly'
    const buckets = {}

    filteredConversations.forEach((r) => {
      let key
      const d = new Date(r.timestamp)
      if (mode === 'daily') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      } else if (mode === 'weekly') {
        const startOfWeek = new Date(d)
        startOfWeek.setDate(d.getDate() - d.getDay())
        key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else {
        key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }
      if (!buckets[key]) buckets[key] = { label: key, requests: 0, tokens: 0, errors: 0 }
      buckets[key].requests++
      buckets[key].tokens += r.tokens
      if (r.hasError) buckets[key].errors++
    })

    return Object.values(buckets).sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredConversations, dateRange])

  const [chartMode, setChartMode] = useState('requests')

  // ── Provider Breakdown ──
  const providerBreakdown = useMemo(() => {
    return PROVIDERS.map((p) => ({
      name: PROVIDER_LABELS[p],
      value: filteredConversations.filter((r) => r.provider === p).length,
      color: PROVIDER_HEX[p],
    })).filter((d) => d.value > 0)
  }, [filteredConversations])

  // ── Top Questions ──
  const topQuestions = useMemo(() => {
    const freq = {}
    filteredConversations.forEach((r) => {
      const q = r.question.slice(0, 60)
      freq[q] = (freq[q] || 0) + 1
    })
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([question, count]) => ({ question, count }))
  }, [filteredConversations])

  // ── Module Usage ──
  const moduleUsage = useMemo(() => {
    const freq = {}
    filteredConversations.forEach((r) => {
      freq[r.module] = (freq[r.module] || 0) + 1
    })
    const max = Math.max(1, ...Object.values(freq))
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
  }, [filteredConversations])

  // ── Live Conversations (most recent 8) ──
  const liveConversations = useMemo(() => {
    return localConversations.slice(0, 8)
  }, [localConversations])

  // ── Actions ──
  function handleFeedback(convId, type) {
    setLocalConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, feedback: c.feedback === type ? null : type } : c)),
    )
  }

  function handleFlag(convId) {
    setLocalConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, flagged: !c.flagged, status: !c.flagged && c.status !== 'error' ? c.status : c.flagged ? 'flagged' : c.status } : c)),
    )
  }

  async function handleRetry(conv) {
    try {
      const res = await fetch(`${AI_GATEWAY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: conv.question }],
          maxTokens: 300,
          provider: conv.provider,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setLocalConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? { ...c, response: data.text, responseTime: data.responseTime || c.responseTime, tokens: data.usage?.total_tokens || c.tokens, hasError: false, status: 'completed', flagged: false }
              : c,
          ),
        )
        // Update selected conversation detail if open
        setSelectedConversation((prev) =>
          prev?.id === conv.id
            ? { ...prev, response: data.text, responseTime: data.responseTime || prev.responseTime, tokens: data.usage?.total_tokens || prev.tokens, hasError: false, status: 'completed', flagged: false }
            : prev,
        )
      } else {
        throw new Error('Retry failed')
      }
    } catch {
      // Silently fail retry — user can try again
    }
  }

  function handleExportCSV() {
    const columns = [
      { key: 'timestamp', label: 'Date', value: (r) => dateTimeLabel(r.timestamp) },
      { key: 'provider', label: 'Provider', value: (r) => PROVIDER_LABELS[r.provider] || r.provider },
      { key: 'userEmail', label: 'User' },
      { key: 'workspaceName', label: 'Workspace' },
      { key: 'module', label: 'Module' },
      { key: 'question', label: 'Question' },
      { key: 'tokens', label: 'Tokens' },
      { key: 'cost', label: 'Est. Cost (USD)', value: (r) => `$${r.cost.toFixed(4)}` },
      { key: 'responseTime', label: 'Response Time', value: (r) => `${r.responseTime}ms` },
      { key: 'status', label: 'Status' },
      { key: 'hasError', label: 'Error', value: (r) => (r.hasError ? 'Yes' : 'No') },
      { key: 'feedback', label: 'Feedback', value: (r) => r.feedback || '-' },
    ]
    exportCsv('nexora-ai-conversations.csv', columns, filteredConversations)
  }

  function handleExportPDF() {
    const columns = [
      { key: 'timestamp', label: 'Date', value: (r) => dateTimeLabel(r.timestamp) },
      { key: 'provider', label: 'Provider', value: (r) => PROVIDER_LABELS[r.provider] || r.provider },
      { key: 'userEmail', label: 'User' },
      { key: 'workspaceName', label: 'Workspace' },
      { key: 'module', label: 'Module' },
      { key: 'tokens', label: 'Tokens' },
      { key: 'cost', label: 'Est. Cost', value: (r) => `$${r.cost.toFixed(4)}` },
      { key: 'responseTime', label: 'Resp. Time', value: (r) => `${r.responseTime}ms` },
      { key: 'status', label: 'Status' },
    ]
    exportPdf('nexora-ai-conversations.pdf', columns, filteredConversations, 'Nexora AI Conversations')
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="mt-4 h-72 rounded-xl bg-slate-50" />
        </div>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <HiOutlineExclamationTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-800">Gateway Unavailable</p>
              <p className="text-xs font-semibold text-amber-700">
                {error}. Showing demo data. <button type="button" className="underline" onClick={refresh}>Retry</button>
              </p>
            </div>
          </div>
          <ShellButton onClick={refresh}>
            <HiOutlineArrowPath className="h-4 w-4" />
          </ShellButton>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <ShellButton onClick={refresh}>
            <HiOutlineArrowPath className="mr-1 h-3.5 w-3.5 inline" />
            Refresh
          </ShellButton>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiCard
          label="Total Conversations"
          value={summary.total.toLocaleString()}
          helper="All-time AI chats"
          icon={HiOutlineChatBubbleLeftRight}
          tone="violet"
        />
        <KpiCard
          label="Active Now"
          value={summary.active}
          helper="In progress"
          icon={HiOutlineSparkles}
          tone="emerald"
        />
        <KpiCard
          label="Total Requests"
          value={summary.totalRequests.toLocaleString()}
          helper="API calls to AI"
          icon={HiOutlineChartBarSquare}
          tone="sky"
        />
        <KpiCard
          label="Tokens Used"
          value={(summary.totalTokens / 1000).toFixed(0) + 'K'}
          helper="Total tokens processed"
          icon={HiOutlineCheckBadge}
          tone="violet"
        />
        <KpiCard
          label="Est. API Cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          helper="Based on provider rates"
          icon={HiOutlineCurrencyDollar}
          tone="amber"
        />
        <KpiCard
          label="Avg Response"
          value={`${summary.avgResponseTime}ms`}
          helper="Average latency"
          icon={HiOutlineClock}
          tone="sky"
        />
        <KpiCard
          label="Error Rate"
          value={`${summary.errorRate}%`}
          helper={`${summary.errorCount} failed requests`}
          icon={HiOutlineExclamationTriangle}
          tone={Number(summary.errorRate) > 5 ? 'rose' : 'emerald'}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={chartMode === 'requests' ? 'AI Requests Over Time' : 'Tokens Used Over Time'}
          action={
            <div className="flex gap-1">
              <ShellButton active={chartMode === 'requests'} onClick={() => setChartMode('requests')}>
                Requests
              </ShellButton>
              <ShellButton active={chartMode === 'tokens'} onClick={() => setChartMode('tokens')}>
                Tokens
              </ShellButton>
            </div>
          }
        >
          {timeSeriesData.length === 0 ? (
            <EmptyState title="No chart data" detail="Adjust filters to see chart data." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="aiGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey={chartMode === 'requests' ? 'requests' : 'tokens'}
                    stroke="#7c3aed"
                    fill="url(#aiGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Date Range">
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                ['7d', '7 Days'],
                ['30d', '30 Days'],
                ['90d', '90 Days'],
                ['all', 'All Time'],
              ].map(([key, label]) => (
                <ShellButton key={key} active={dateRange === key} onClick={() => setDateRange(key)}>
                  {label}
                </ShellButton>
              ))}
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="aiTokens" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#f43f5e"
                    fill="url(#aiTokens)"
                    strokeWidth={2}
                    name="Errors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Breakdown Row ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        {/* Provider Usage */}
        <Panel title="AI Provider Usage">
          {providerBreakdown.length === 0 ? (
            <EmptyState title="No provider data" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr] xl:grid-cols-1 2xl:grid-cols-[12rem_1fr]">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={providerBreakdown}
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {providerBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {providerBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PROVIDER_COLORS[index % PROVIDER_COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Top Questions */}
        <Panel title="Top Questions">
          {topQuestions.length === 0 ? (
            <EmptyState title="No questions yet" />
          ) : (
            <div className="space-y-2">
              {topQuestions.map((item, index) => (
                <div
                  key={item.question}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-black text-violet-700">
                      {index + 1}
                    </span>
                    <p className="truncate text-xs font-semibold text-slate-700">{item.question}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-slate-500">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Module Usage */}
        <Panel title="Most Used Modules">
          {moduleUsage.length === 0 ? (
            <EmptyState title="No module data" />
          ) : (
            <div className="space-y-3">
              {moduleUsage.map((item, index) => (
                <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.count} conversations</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Live Conversation Monitor ── */}
      <Panel
        title="Live Conversation Monitor"
        action={
          <span className="flex items-center gap-2 text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {liveConversations.filter((c) => c.status === 'active').length} active
          </span>
        }
      >
        {liveConversations.length === 0 ? (
          <EmptyState title="No live conversations" detail="Recent AI conversations will appear here in real time." />
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {liveConversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:bg-slate-50 ${
                  conv.status === 'active'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : conv.hasError
                      ? 'border-rose-100 bg-rose-50/30'
                      : 'border-slate-100 bg-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {conv.status === 'active' && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    <p className="truncate text-sm font-bold text-slate-900">{conv.question}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold">{conv.userEmail}</span>
                    <span>·</span>
                    <span>{conv.workspaceName}</span>
                    <span>·</span>
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${PROVIDER_HEX[conv.provider]}15`, color: PROVIDER_HEX[conv.provider] }}
                    >
                      {PROVIDER_LABELS[conv.provider]}
                    </span>
                    <span>·</span>
                    <span>{conv.tokens} tokens</span>
                    <span>·</span>
                    <span>{conv.responseTime}ms</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setSelectedConversation(conv)}
                    title="View conversation"
                  >
                    <HiOutlineEye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Conversations Table ── */}
      <Panel
        title="All Conversations"
        action={
          <div className="flex gap-2">
            <ShellButton onClick={handleExportCSV}>Export CSV</ShellButton>
            <ShellButton onClick={handleExportPDF}>Export PDF</ShellButton>
          </div>
        }
      >
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-1.5">
            <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="all">All Providers</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
          </select>

          {/* Result count */}
          <span className="text-xs font-bold text-slate-500">
            {filteredConversations.length} of {localConversations.length} conversations
          </span>
        </div>

        {/* Table */}
        {filteredConversations.length === 0 ? (
          <EmptyState
            title="No conversations match your filters"
            detail="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="max-h-[30rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Time</th>
                  <th className="whitespace-nowrap px-4 py-3">User</th>
                  <th className="whitespace-nowrap px-4 py-3">Workspace</th>
                  <th className="whitespace-nowrap px-4 py-3">Question</th>
                  <th className="whitespace-nowrap px-4 py-3">Provider</th>
                  <th className="whitespace-nowrap px-4 py-3">Module</th>
                  <th className="whitespace-nowrap px-4 py-3">Tokens</th>
                  <th className="whitespace-nowrap px-4 py-3">Cost</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConversations.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                      {dateTimeLabel(row.timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-900">
                      {row.userEmail}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {row.workspaceName}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 text-xs text-slate-700">
                      <p className="truncate">{row.question}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${PROVIDER_HEX[row.provider]}15`,
                          color: PROVIDER_HEX[row.provider],
                        }}
                      >
                        {PROVIDER_LABELS[row.provider]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {row.module}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                      {row.tokens.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-700">
                      ${row.cost.toFixed(4)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Status value={row.flagged ? 'flagged' : row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => setSelectedConversation(row)}
                          title="View conversation"
                        >
                          <HiOutlineEye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`grid h-7 w-7 place-items-center rounded-lg ${
                            row.feedback === 'up'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                          }`}
                          onClick={() => handleFeedback(row.id, 'up')}
                          title="Helpful"
                        >
                          <HiOutlineHandThumbUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`grid h-7 w-7 place-items-center rounded-lg ${
                            row.feedback === 'down'
                              ? 'bg-rose-100 text-rose-600'
                              : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          onClick={() => handleFeedback(row.id, 'down')}
                          title="Not helpful"
                        >
                          <HiOutlineHandThumbDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`grid h-7 w-7 place-items-center rounded-lg ${
                            row.flagged
                              ? 'bg-amber-100 text-amber-600'
                              : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                          }`}
                          onClick={() => handleFlag(row.id)}
                          title={row.flagged ? 'Unflag' : 'Flag response'}
                        >
                          <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Conversation Detail Modal ── */}
      {selectedConversation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedConversation(null)}
          />

          {/* Modal */}
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-950">Conversation Detail</p>
                <p className="text-xs text-slate-500">
                  {dateTimeLabel(selectedConversation.timestamp)} · {PROVIDER_LABELS[selectedConversation.provider]} · {selectedConversation.module}
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedConversation(null)}
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Metadata */}
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">User</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{selectedConversation.userEmail}</p>
                <p className="text-xs text-slate-500">{selectedConversation.workspaceName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Provider</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{PROVIDER_LABELS[selectedConversation.provider]}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Performance</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{selectedConversation.responseTime}ms · {selectedConversation.tokens.toLocaleString()} tokens</p>
                <p className="text-xs text-slate-500">${selectedConversation.cost.toFixed(4)} est. cost</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                <div className="mt-1">
                  <Status value={selectedConversation.flagged ? 'flagged' : selectedConversation.status} />
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="space-y-4 px-6 py-5">
              {/* User Question */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">User Question</p>
                <div className="mt-2 rounded-2xl rounded-tl-md border border-violet-200 bg-violet-50/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{selectedConversation.question}</p>
                </div>
              </div>

              {/* AI Response */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">AI Response</p>
                <div className="mt-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedConversation.response}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition ${
                  selectedConversation.feedback === 'up'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50'
                }`}
                onClick={() => handleFeedback(selectedConversation.id, 'up')}
              >
                <HiOutlineFaceSmile className="h-4 w-4" />
                Helpful
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition ${
                  selectedConversation.feedback === 'down'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50'
                }`}
                onClick={() => handleFeedback(selectedConversation.id, 'down')}
              >
                <HiOutlineFaceFrown className="h-4 w-4" />
                Not Helpful
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition ${
                  selectedConversation.flagged
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50'
                }`}
                onClick={() => handleFlag(selectedConversation.id)}
              >
                <HiOutlineExclamationTriangle className="h-4 w-4" />
                {selectedConversation.flagged ? 'Flagged' : 'Flag Response'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                onClick={() => handleRetry(selectedConversation)}
              >
                <HiOutlineArrowPath className="h-4 w-4" />
                Retry AI Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
