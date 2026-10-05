import { useEffect, useMemo, useState } from 'react'
import {
  getAutomations,
  setAutomation,
  runAutomationsNow,
  previewAutomations,
  listAutomationActivity,
  sendTestEmail,
} from '../../lib/marketing.js'
import { MARKETING_TEMPLATES } from '../../lib/marketingTemplates.js'
import { confirmAction } from '../../crm/components/ui/dialogActions.js'
import { StatusBadge, EmailPreview } from './emailUi.jsx'

const DAYS = 14
const FUNNEL_SHADES = ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4338ca'] // one hue, light to dark
const BAR = '#6366f1'
const PKT_MS = 5 * 3600 * 1000

const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : null)
const dayKey = (date) => new Date(date.getTime() + PKT_MS).toISOString().slice(0, 10)
const rate = (part, whole) => (whole > 0 ? `${Math.round((Number(part || 0) / whole) * 100)}%` : '—')
const num = (value) => Number(value || 0).toLocaleString()
const when = (value) => {
  const date = toDate(value)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadCsv(rows, labelFor) {
  const header = ['Email', 'Name', 'Automation', 'Account ID', 'Status', 'Sent at', 'Opens', 'Clicks']
  const lines = rows.map((row) => [row.email, row.name, labelFor(row.sequence), row.accountId, row.status, when(row.sentAt || row.createdAt), row.openCount || 0, row.clickCount || 0].map(csvCell).join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `automation-activity-${dayKey(new Date())}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Chip({ tone, icon, children }) {
  const colors = { good: 'bg-emerald-50 text-emerald-700 ring-emerald-200', warn: 'bg-amber-50 text-amber-800 ring-amber-200', bad: 'bg-rose-50 text-rose-700 ring-rose-200', idle: 'bg-slate-100 text-slate-600 ring-slate-200' }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${colors[tone]}`}><span aria-hidden="true">{icon}</span>{children}</span>
}

function Tile({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      {note ? <p className="mt-0.5 text-[11px] text-slate-500">{note}</p> : null}
    </div>
  )
}

function Funnel({ stages }) {
  const top = Math.max(1, ...stages.map((stage) => stage.value))
  return (
    <div className="space-y-2.5">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex items-center gap-3" title={`${stage.label}: ${num(stage.value)}`}>
          <span className="w-20 shrink-0 text-xs font-semibold text-slate-600">{stage.label}</span>
          <div className="relative h-6 flex-1">
            <div className="h-6 rounded-r-[4px] rounded-l-none" style={{ width: `${Math.max(stage.value ? 2 : 0, (stage.value / top) * 100)}%`, background: FUNNEL_SHADES[index] }} />
          </div>
          <span className="w-24 shrink-0 text-right text-xs text-slate-900"><strong>{num(stage.value)}</strong>{stage.note ? <span className="ml-1 text-slate-500">{stage.note}</span> : null}</span>
        </div>
      ))}
    </div>
  )
}

function DayChart({ counts }) {
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...counts.map((item) => item.count))
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const shown = hover === null ? null : counts[hover]
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-h-[1.25rem] text-xs text-slate-600">{shown ? <><strong className="text-slate-900">{shown.count}</strong> sent on {shown.label}</> : <><strong className="text-slate-900">{total}</strong> sent in the last {DAYS} days</>}</p>
        <button type="button" onClick={() => setAsTable((value) => !value)} className="text-[11px] font-bold text-blue-600 hover:underline">{asTable ? 'Show chart' : 'Show table'}</button>
      </div>
      {asTable ? (
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Day</th><th className="py-1 text-right">Sent</th></tr></thead>
          <tbody>{counts.map((item) => <tr key={item.key} className="border-t border-slate-100"><td className="py-1 text-slate-700">{item.label}</td><td className="py-1 text-right font-semibold text-slate-900">{item.count}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="relative">
          <span className="absolute left-0 top-0 text-[10px] text-slate-400">{max}</span>
          <div className="flex h-36 items-end gap-1.5 border-b border-slate-200 pl-5" role="img" aria-label={`Automatic emails sent per day, last ${DAYS} days, ${total} in total`}>
            {counts.map((item, index) => (
              <div key={item.key} className="flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(index)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${item.label}: ${item.count} sent`}>
                <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${item.count ? Math.max(4, (item.count / max) * 100) : 0}%`, background: BAR, opacity: hover === null || hover === index ? 1 : 0.45 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between pl-5 text-[10px] text-slate-400"><span>{counts[0]?.short}</span><span>{counts[counts.length - 1]?.short}</span></div>
        </div>
      )}
    </div>
  )
}

export default function AutomationDashboard({ notify, quota, campaigns = [], quotaPanel, onTogglePause, pauseBusy, onOpenTab }) {
  const [data, setData] = useState({ loading: true, error: '', sequences: [], resendConfigured: true })
  const [activity, setActivity] = useState([])
  const [due, setDue] = useState({})
  const [busyId, setBusyId] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [filters, setFilters] = useState({ q: '', sequence: 'all', status: 'all' })
  const [showLimits, setShowLimits] = useState(false)
  const [now] = useState(() => Date.now())

  const toData = (res) => (res.ok
    ? { loading: false, error: '', sequences: res.sequences || [], resendConfigured: res.resendConfigured !== false }
    : { loading: false, error: res.error || 'Could not load automations.', sequences: [], resendConfigured: true })
  const toDue = (res) => (res.ok ? Object.fromEntries((res.sequences || []).map((item) => [item.id, item.due || []])) : {})

  const load = () => {
    getAutomations().then((res) => setData(toData(res)))
    listAutomationActivity({ max: 300 }).then(setActivity).catch(() => {})
    previewAutomations().then((res) => setDue(toDue(res)))
  }

  useEffect(() => {
    let alive = true
    getAutomations().then((res) => { if (alive) setData(toData(res)) })
    listAutomationActivity({ max: 300 }).then((rows) => { if (alive) setActivity(rows) }).catch(() => {})
    previewAutomations().then((res) => { if (alive) setDue(toDue(res)) })
    return () => { alive = false }
  }, [])

  const sequences = data.sequences
  const labelFor = (id) => sequences.find((item) => item.id === id)?.label || id || '—'

  const totals = useMemo(() => sequences.reduce((sum, item) => ({
    total: sum.total + item.total,
    sent: sum.sent + item.sent,
    delivered: sum.delivered + item.delivered,
    opened: sum.opened + item.opened,
    clicked: sum.clicked + item.clicked,
    bounced: sum.bounced + item.bounced,
  }), { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }), [sequences])

  const perDay = useMemo(() => {
    const counts = new Map()
    activity.forEach((row) => {
      const date = toDate(row.sentAt)
      if (date && !Number.isNaN(date.getTime())) counts.set(dayKey(date), (counts.get(dayKey(date)) || 0) + 1)
    })
    return Array.from({ length: DAYS }, (_, index) => {
      const date = new Date(now - (DAYS - 1 - index) * 86400000)
      const key = dayKey(date)
      return {
        key,
        count: counts.get(key) || 0,
        label: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' }),
        short: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' }),
      }
    })
  }, [activity, now])

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase()
    return activity.filter((row) => (filters.sequence === 'all' || row.sequence === filters.sequence)
      && (filters.status === 'all' || row.status === filters.status)
      && (!query || [row.email, row.name, row.accountId].some((value) => String(value || '').toLowerCase().includes(query))))
  }, [activity, filters])

  const statuses = useMemo(() => Array.from(new Set(activity.map((row) => row.status).filter(Boolean))).sort(), [activity])
  const lastSent = (id) => activity.find((row) => row.sequence === id && row.sentAt)?.sentAt
  const enabledCount = sequences.filter((item) => item.enabled).length
  const dueOn = sequences.filter((item) => item.enabled).reduce((sum, item) => sum + (due[item.id]?.length || 0), 0)
  const quotaOk = quota && !quota.error
  const sentToday = quotaOk ? quota.sentToday : 0
  const limit = quotaOk ? quota.settings.dailyLimit : 0
  const usedPct = limit ? Math.min(100, Math.round((sentToday / limit) * 100)) : 0
  const paused = quotaOk && quota.settings.paused
  const preview = MARKETING_TEMPLATES.find((tpl) => tpl.id === sequences.find((item) => item.id === previewId)?.templateId)

  async function toggle(sequence) {
    const turningOn = !sequence.enabled
    if (turningOn && !await confirmAction({
      tone: 'warning',
      badge: 'Automation',
      title: `Switch on "${sequence.label}"?`,
      message: `${sequence.when}. Emails are sent automatically within your daily limit and never twice to the same person. People who unsubscribed are skipped.`,
      confirmLabel: 'Switch on',
    })) return
    setBusyId(sequence.id)
    const res = await setAutomation(sequence.id, turningOn)
    setBusyId('')
    if (!res.ok) return notify(`Failed: ${res.error}`)
    notify(turningOn ? `${sequence.label} is ON` : `${sequence.label} is OFF`)
    load()
  }

  async function runNow() {
    setBusyId('run')
    const res = await runAutomationsNow()
    setBusyId('')
    if (!res.ok) return notify(`Failed: ${res.error}`)
    const count = Object.values(res.queued || {}).reduce((sum, value) => sum + value, 0)
    notify(res.skipped ? 'No automation is switched on yet.' : `${count} email(s) added to the queue`)
    load()
  }

  async function sendTest(sequence) {
    const tpl = MARKETING_TEMPLATES.find((item) => item.id === sequence.templateId)
    if (!tpl) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) return notify('Type your own email in "Send tests to" first.')
    setBusyId(`test-${sequence.id}`)
    const res = await sendTestEmail({ subject: tpl.subject, bodyHtml: tpl.bodyHtml, bodyText: tpl.bodyText, testEmail: testEmail.trim() })
    setBusyId('')
    notify(res.ok ? `Test "${sequence.label}" sent to ${testEmail.trim()}` : `Test failed: ${res.error}`)
  }

  function copyId(id) {
    navigator.clipboard?.writeText(id).then(() => notify('Account ID copied')).catch(() => notify(id))
  }

  const field = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400'
  const recentCampaigns = campaigns.filter((item) => item.kind !== 'automation').slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Header: the one hero number, health, and the main actions */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300">Automation Center</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Emails that send themselves</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">Welcome, trial reminders and lead follow-ups run every hour. Nothing goes out outside your sending hours or past your daily limit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busyId === 'run'} onClick={runNow} className="h-10 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60">{busyId === 'run' ? 'Checking…' : 'Check now'}</button>
            {quotaOk ? <button type="button" disabled={pauseBusy} onClick={onTogglePause} className="h-10 rounded-xl border border-white/30 px-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60">{paused ? 'Resume all sending' : 'Pause all sending'}</button> : null}
            <button type="button" onClick={load} className="h-10 rounded-xl border border-white/30 px-4 text-sm font-bold text-white hover:bg-white/10">Refresh</button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold text-indigo-200">Sent today (Pakistan time)</p>
            <p className="mt-1 text-5xl font-black tracking-tight">{quotaOk ? sentToday : '—'}<span className="ml-2 text-xl font-bold text-slate-400">{quotaOk ? `/ ${limit}` : ''}</span></p>
            <div className="mt-3 h-2.5 max-w-md overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${usedPct}%` }} /></div>
            <p className="mt-2 text-xs text-slate-300">{quotaOk ? `${quota.remainingToday} left today · ${quota.queued} waiting in queue${dueOn ? ` · ${dueOn} more due from automations` : ''}` : 'Loading sending limits…'}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            {quotaOk ? (
              <Chip tone={paused ? 'warn' : quota.windowOpenNow ? 'good' : 'idle'} icon={paused ? '!' : quota.windowOpenNow ? '✓' : '○'}>{paused ? 'Sending paused' : quota.windowOpenNow ? 'Sending now' : 'Outside sending hours'}</Chip>
            ) : null}
            {quotaOk ? <Chip tone={quota.resendConfigured ? 'good' : 'bad'} icon={quota.resendConfigured ? '✓' : '✕'}>{quota.resendConfigured ? 'Resend key set' : 'Resend key missing'}</Chip> : null}
            {quotaOk ? <Chip tone={quota.webhookConfigured ? 'good' : 'warn'} icon={quota.webhookConfigured ? '✓' : '!'}>{quota.webhookConfigured ? 'Tracking on' : 'Tracking webhook missing'}</Chip> : null}
            <Chip tone={enabledCount ? 'good' : 'idle'} icon={enabledCount ? '✓' : '○'}>{enabledCount} of {sequences.length || 6} automations on</Chip>
          </div>
        </div>
        {data.error ? <p className="mt-4 rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-100">{data.error}</p> : null}
        {quotaOk && !quota.resendConfigured ? <p className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-100">RESEND_API_KEY is missing on the functions, so nothing can be sent.</p> : null}
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Automatic emails sent" value={num(totals.sent)} note={`${num(totals.total)} queued in total`} />
        <Tile label="Delivery rate" value={rate(totals.delivered, totals.sent)} note={`${num(totals.delivered)} delivered`} />
        <Tile label="Open rate" value={rate(totals.opened, totals.delivered)} note="Apple Mail inflates opens" />
        <Tile label="Click rate" value={rate(totals.clicked, totals.delivered)} note={`${num(totals.clicked)} people clicked`} />
        <Tile label="Bounced" value={num(totals.bounced)} note={totals.bounced ? 'Bad addresses are blocked' : 'No problems'} />
        <Tile label="Waiting in queue" value={quotaOk ? num(quota.queued) : '—'} note={quotaOk && quota.queued ? `about ${quota.estimatedDays} day(s)` : 'Nothing waiting'} />
      </section>

      {/* Funnel + per day */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-950">Delivery funnel</h3>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">What happened to every automatic email, all time.</p>
          <Funnel stages={[
            { label: 'Queued', value: totals.total },
            { label: 'Sent', value: totals.sent, note: rate(totals.sent, totals.total) },
            { label: 'Delivered', value: totals.delivered, note: rate(totals.delivered, totals.sent) },
            { label: 'Opened', value: totals.opened, note: rate(totals.opened, totals.delivered) },
            { label: 'Clicked', value: totals.clicked, note: rate(totals.clicked, totals.delivered) },
          ]} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-950">Automatic emails per day</h3>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">Emails actually sent, by day (Pakistan time).</p>
          <DayChart counts={perDay} />
        </div>
      </section>

      {/* Who is due */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-black text-slate-950">Due next</h3>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">People who match an automation today and have not had that email yet. Sequences that are off will not send.</p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sequences.map((sequence) => {
            const list = due[sequence.id] || []
            return (
              <div key={sequence.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">{sequence.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sequence.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{sequence.enabled ? 'ON' : 'OFF'}</span>
                </div>
                {list.length ? (
                  <ul className="mt-2 space-y-1">
                    {list.slice(0, 5).map((person) => <li key={person.email} className="truncate text-[11px] text-slate-600" title={person.accountId ? `Account ${person.accountId}` : ''}>{person.email}{person.name ? ` · ${person.name}` : ''}</li>)}
                    {list.length > 5 ? <li className="text-[11px] font-semibold text-slate-500">+ {list.length - 5} more</li> : null}
                  </ul>
                ) : <p className="mt-2 text-[11px] text-slate-400">Nobody due right now</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* Automation cards */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">Your automations</h3>
            <p className="mt-0.5 text-xs text-slate-500">Switch each one on or off. Each person gets each email once.</p>
          </div>
          <label className="text-[11px] font-bold text-slate-500">Send tests to
            <input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" className={`${field} mt-1 block w-56 font-normal`} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {sequences.map((sequence) => (
            <div key={sequence.id} className={`rounded-2xl border bg-white p-4 ${sequence.enabled ? 'border-emerald-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-950">{sequence.label}</h4>
                  <p className="mt-0.5 text-xs text-slate-500">{sequence.when}</p>
                </div>
                <button type="button" role="switch" aria-checked={sequence.enabled} aria-label={`${sequence.label} on or off`} disabled={busyId === sequence.id} onClick={() => toggle(sequence)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${sequence.enabled ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-60`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${sequence.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                {[['Queued', sequence.total], ['Sent', sequence.sent], ['Deliv.', sequence.delivered], ['Opened', sequence.opened], ['Clicked', sequence.clicked]].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 px-1 py-1.5">
                    <p className="text-sm font-black text-slate-900">{num(value)}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Open {rate(sequence.opened, sequence.delivered)} · Click {rate(sequence.clicked, sequence.delivered)} · Last sent {lastSent(sequence.id) ? when(lastSent(sequence.id)) : 'never'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold">
                <button type="button" onClick={() => setPreviewId(previewId === sequence.id ? '' : sequence.id)} className="text-blue-600 hover:underline">{previewId === sequence.id ? 'Hide email' : 'See email'}</button>
                <button type="button" disabled={busyId === `test-${sequence.id}`} onClick={() => sendTest(sequence)} className="text-blue-600 hover:underline disabled:opacity-60">{busyId === `test-${sequence.id}` ? 'Sending…' : 'Send me a test'}</button>
                {(due[sequence.id] || []).length ? <span className="ml-auto text-slate-500">{due[sequence.id].length} due</span> : null}
              </div>
            </div>
          ))}
        </div>
        {preview ? <div className="mt-3"><EmailPreview html={preview.bodyHtml} /></div> : null}
      </section>

      {/* Activity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">Activity</h3>
            <p className="mt-0.5 text-xs text-slate-500">Every automatic email: who, which automation, which account, and what happened. Newest first.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Search email, name or account ID" className={`${field} w-56`} />
            <select value={filters.sequence} onChange={(event) => setFilters({ ...filters, sequence: event.target.value })} className={field} aria-label="Filter by automation">
              <option value="all">All automations</option>
              {sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.label}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={field} aria-label="Filter by status">
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="button" disabled={!filtered.length} onClick={() => downloadCsv(filtered, labelFor)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Download CSV</button>
          </div>
        </div>
        {filtered.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Automation</th><th className="py-2 pr-3">Account ID</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">When</th><th className="py-2">Opens / Clicks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 align-top">
                    <td className="py-2 pr-3 font-semibold text-slate-900">{row.email}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.name || '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.sequence ? labelFor(row.sequence) : '—'}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">{row.accountId ? <button type="button" title={`${row.accountId} (click to copy)`} onClick={() => copyId(row.accountId)} className="hover:text-blue-600">{row.accountId.slice(0, 10)}…</button> : '—'}</td>
                    <td className="py-2 pr-3"><StatusBadge status={row.status} />{row.error ? <p className="mt-1 max-w-[180px] text-[10px] text-rose-600">{row.error}</p> : null}</td>
                    <td className="py-2 pr-3 text-slate-500">{when(row.sentAt || row.createdAt)}</td>
                    <td className="py-2 text-slate-600">{row.openCount || 0} / {row.clickCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">Showing {filtered.length} of {activity.length} (latest 300).</p>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">{activity.length ? 'No emails match these filters.' : 'No automatic emails yet. Switch an automation on and press "Check now".'}</p>}
      </section>

      {/* Campaigns + limits */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Recent campaigns</h3>
            <button type="button" onClick={() => onOpenTab('history')} className="text-xs font-bold text-blue-600 hover:underline">All campaigns</button>
          </div>
          {recentCampaigns.length ? (
            <ul className="mt-3 space-y-2">
              {recentCampaigns.map((item) => (
                <li key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-slate-800">{item.title || item.subject}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{num(item.sentCount)} sent · {num(item.deliveredCount)} delivered · {num(item.openedCount)} opened · {num(item.clickedCount)} clicked</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-500">No campaigns yet.</p>}
          <button type="button" onClick={() => onOpenTab('campaign')} className="mt-3 h-9 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800">New campaign</button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Sending limits</h3>
            <button type="button" onClick={() => setShowLimits((value) => !value)} className="text-xs font-bold text-blue-600 hover:underline">{showLimits ? 'Hide' : 'Change'}</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{quotaOk ? `${limit} emails a day between ${quota.settings.windowStartHour}:00 and ${quota.settings.windowEndHour}:00 (Pakistan time). Automatic emails go first, campaigns use what is left.` : 'Loading…'}</p>
          {showLimits ? <div className="mt-3">{quotaPanel}</div> : null}
        </div>
      </section>
    </div>
  )
}
