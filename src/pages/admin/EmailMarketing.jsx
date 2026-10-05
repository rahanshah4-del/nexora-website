import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  addSubscriber,
  filterRecipients,
  listMarketingContacts,
  recipientCountsBySource,
  listCampaigns,
  listCampaignLogs,
  getEmailStatus,
  saveEmailSettings,
  cancelCampaign,
  getAutomations,
  setAutomation,
  runAutomationsNow,
  listAutomationActivity,
  sendCampaign,
  sendTestEmail,
  setSubscriberStatus,
  AUDIENCE_OPTIONS,
  AUDIENCE_SOURCES,
  CLIENT_DATA_EXCLUDED_NOTE,
  MODULE_OPTIONS,
} from '../../lib/marketing.js'
import { MARKETING_TEMPLATES } from '../../lib/marketingTemplates.js'
import { confirmAction } from '../../crm/components/ui/dialogActions.js'
import EmailInbox from './EmailInbox.jsx'

const TABS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'subscribers', label: 'Subscribers' },
  { key: 'campaign', label: 'Create Campaign' },
  { key: 'automation', label: 'Automations' },
  { key: 'history', label: 'Campaign History' },
]

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-50 text-emerald-700',
    sending: 'bg-amber-50 text-amber-700',
    queued: 'bg-blue-50 text-blue-700',
    sent: 'bg-slate-100 text-slate-700',
    delivered: 'bg-sky-50 text-sky-700',
    opened: 'bg-emerald-50 text-emerald-700',
    clicked: 'bg-violet-50 text-violet-700',
    bounced: 'bg-rose-50 text-rose-700',
    complained: 'bg-rose-50 text-rose-700',
    skipped: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-slate-100 text-slate-500',
    failed: 'bg-rose-50 text-rose-700',
    draft: 'bg-slate-100 text-slate-600',
    subscribed: 'bg-emerald-50 text-emerald-700',
    unsubscribed: 'bg-rose-50 text-rose-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status || '—'}</span>
}

function pct(part, whole) {
  return whole > 0 ? `${Math.round((Number(part || 0) / whole) * 100)}%` : '—'
}

function dateText(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'
}

function QuotaPanel({ status, draft, setDraft, onSave, busy }) {
  if (!status) return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Loading sending limits…</div>
  if (status.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">Could not load sending limits: {status.error}. Deploy the email functions first.</div>
  const usedPct = Math.min(100, Math.round((status.sentToday / Math.max(1, status.settings.dailyLimit)) * 100))
  const box = 'h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm font-bold outline-none focus:border-blue-400'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700">Daily sending limit</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.settings.paused ? 'bg-amber-50 text-amber-700' : status.windowOpenNow ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {status.settings.paused ? 'Paused' : status.windowOpenNow ? 'Sending now' : 'Outside sending hours'}
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${usedPct}%` }} /></div>
      <p className="mt-2 text-sm text-slate-600"><strong>{status.sentToday}</strong> of <strong>{status.settings.dailyLimit}</strong> sent today (Pakistan time) · <strong>{status.remainingToday}</strong> left · <strong>{status.queued}</strong> waiting in queue{status.queued > 0 ? ` (about ${status.estimatedDays} day${status.estimatedDays === 1 ? '' : 's'})` : ''}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3 text-xs font-semibold text-slate-500">
        <label>Emails per day<input className={`${box} mt-1 block`} type="number" min="1" max="500" value={draft.dailyLimit} onChange={(e) => setDraft({ ...draft, dailyLimit: e.target.value })} /></label>
        <label>From hour<input className={`${box} mt-1 block`} type="number" min="0" max="23" value={draft.windowStartHour} onChange={(e) => setDraft({ ...draft, windowStartHour: e.target.value })} /></label>
        <label>To hour<input className={`${box} mt-1 block`} type="number" min="1" max="24" value={draft.windowEndHour} onChange={(e) => setDraft({ ...draft, windowEndHour: e.target.value })} /></label>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={draft.paused} onChange={(e) => setDraft({ ...draft, paused: e.target.checked })} /> Pause sending</label>
        <button type="button" disabled={busy} onClick={onSave} className="h-9 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">Save</button>
      </div>
      {!status.resendConfigured ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">RESEND_API_KEY is not set on the functions: nothing can be sent.</p> : null}
      {!status.webhookConfigured ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Resend webhook is not set up yet, so delivered / opened / clicked will stay empty. Emails still send.</p> : null}
      <p className="mt-3 text-[11px] leading-5 text-slate-500">Resend free plan allows 100 emails/day and 3,000/month. Emails go out in small groups every 10 minutes between the sending hours, never past the daily limit.</p>
    </div>
  )
}

function CampaignReport({ campaign, rows, loading }) {
  const sent = rows.filter((row) => row.status && !['queued', 'skipped', 'cancelled', 'failed'].includes(row.status)).length
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-800">{campaign.title || campaign.subject}</p>
      <p className="mt-1 text-xs text-slate-500">Opens can be over- or under-counted (Apple Mail pre-loads emails, some apps block the tracking pixel). Clicks are the most reliable signal.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1.5">Email</th><th>Status</th><th>Sent</th><th>Opened</th><th>Clicks</th><th>Last link / error</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-4 text-center text-slate-400">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="py-4 text-center text-slate-400">No recipients recorded.</td></tr> : rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="py-1.5 font-medium text-slate-800">{row.email}</td>
                <td><StatusBadge status={row.status} /></td>
                <td className="text-slate-600">{dateText(row.sentAt)}</td>
                <td className="text-slate-600">{row.openedAt ? `${row.openCount || 1}× · ${dateText(row.openedAt)}` : '—'}</td>
                <td className="text-slate-600">{row.clickCount || 0}</td>
                <td className="max-w-[260px] truncate text-slate-500" title={row.lastClickUrl || row.error || ''}>{row.lastClickUrl || row.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length ? <p className="mt-2 text-[11px] text-slate-500">{sent} of {rows.length} recipients have been sent this campaign.</p> : null}
    </div>
  )
}

/** Fill the per-person placeholders so the preview looks like the real email. */
function previewHtml(html) {
  return String(html || '').replaceAll('{{name}}', 'Ahmed').replaceAll('{{unsubscribe}}', '#')
}

function EmailPreview({ html }) {
  if (!html) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Preview</p>
      <iframe title="Email preview" sandbox="" srcDoc={previewHtml(html)} className="h-[560px] w-full rounded-lg border-0 bg-white" />
    </div>
  )
}

function AutomationsPanel({ notify }) {
  const [state, setState] = useState({ loading: true, error: '', sequences: [], resendConfigured: true })
  const [busyId, setBusyId] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [activity, setActivity] = useState([])

  const toState = (res) => (res.ok
    ? { loading: false, error: '', sequences: res.sequences || [], resendConfigured: res.resendConfigured !== false }
    : { loading: false, error: res.error || 'Could not load automations.', sequences: [], resendConfigured: true })

  const load = () => {
    getAutomations().then((res) => setState(toState(res)))
    listAutomationActivity().then(setActivity).catch(() => {})
  }

  useEffect(() => {
    let alive = true
    getAutomations().then((res) => { if (alive) setState(toState(res)) })
    listAutomationActivity().then((rows) => { if (alive) setActivity(rows) }).catch(() => {})
    return () => { alive = false }
  }, [])

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
    const total = Object.values(res.queued || {}).reduce((sum, count) => sum + count, 0)
    notify(res.skipped ? 'No automation is switched on yet.' : `${total} email(s) added to the queue`)
    load()
  }

  const preview = MARKETING_TEMPLATES.find((tpl) => tpl.id === state.sequences.find((item) => item.id === previewId)?.templateId)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Automatic emails</h2>
            <p className="mt-1 text-sm text-slate-500">Switch a sequence on and it runs by itself every hour. They use the same daily limit as campaigns and go out before campaign emails. Each person gets each email once.</p>
          </div>
          <button type="button" disabled={busyId === 'run'} onClick={runNow} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{busyId === 'run' ? 'Checking…' : 'Check now'}</button>
        </div>
        {!state.resendConfigured ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">RESEND_API_KEY is missing, so nothing can be sent yet.</p> : null}
        {state.error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{state.error}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {state.loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {state.sequences.map((sequence) => (
          <div key={sequence.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">{sequence.label}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{sequence.when}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sequence.enabled}
                aria-label={`${sequence.label} on or off`}
                disabled={busyId === sequence.id}
                onClick={() => toggle(sequence)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${sequence.enabled ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-60`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${sequence.enabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              {[['Queued', sequence.total], ['Sent', sequence.sent], ['Delivered', sequence.delivered], ['Clicked', sequence.clicked]].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 px-1 py-1.5">
                  <p className="text-sm font-black text-slate-900">{value}</p>
                  <p className="text-[10px] font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setPreviewId(previewId === sequence.id ? '' : sequence.id)} className="mt-3 text-xs font-bold text-blue-600 hover:underline">{previewId === sequence.id ? 'Hide email preview' : 'Show email preview'}</button>
          </div>
        ))}
      </div>
      {preview ? <EmailPreview html={preview.bodyHtml} /> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Recent activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Who got (or will get) an automatic email. Newest first.</p>
          </div>
          <button type="button" onClick={load} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Refresh</button>
        </div>
        {activity.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Automation</th>
                  <th className="py-2 pr-3">Account ID</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2">Opens / Clicks</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 align-top">
                    <td className="py-2 pr-3 font-semibold text-slate-900">{row.email}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.name || '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{state.sequences.find((item) => item.id === row.sequence)?.label || row.sequence || '—'}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-slate-500" title={row.accountId || ''}>{row.accountId ? `${row.accountId.slice(0, 10)}…` : '—'}</td>
                    <td className="py-2 pr-3"><StatusBadge status={row.status} />{row.error ? <p className="mt-1 max-w-[180px] text-[10px] text-rose-600">{row.error}</p> : null}</td>
                    <td className="py-2 pr-3 text-slate-500">{dateText(row.sentAt || row.createdAt)}</td>
                    <td className="py-2 text-slate-600">{row.openCount || 0} / {row.clickCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">No automatic emails yet. Switch a sequence on and press "Check now".</p>}
      </div>
    </div>
  )
}

export default function EmailMarketing({ embedded = false }) {
  const [tab, setTab] = useState('inbox')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const [subscribers, setSubscribers] = useState([])
  const [moduleFilter, setModuleFilter] = useState('all')
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [newSub, setNewSub] = useState({ email: '', name: '', phone: '', source: 'manual', moduleInterest: 'crm' })

  const [campaigns, setCampaigns] = useState([])
  const [campaign, setCampaign] = useState({ title: '', subject: '', bodyHtml: '', bodyText: '', audienceType: 'all', module: 'all' })
  const [testEmail, setTestEmail] = useState('')
  const [quota, setQuota] = useState(null)
  const [quotaDraft, setQuotaDraft] = useState({ dailyLimit: 50, windowStartHour: 9, windowEndHour: 21, paused: false })
  const [openReport, setOpenReport] = useState('')
  const [reportRows, setReportRows] = useState([])
  const [reportLoading, setReportLoading] = useState(false)

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  async function refreshSubscribers() {
    setLoadingSubs(true)
    try {
      setSubscribers(await listMarketingContacts({ module: moduleFilter }))
    } catch (error) {
      notify(error?.message || 'Could not load subscribers.')
    } finally {
      setLoadingSubs(false)
    }
  }

  async function refreshCampaigns() {
    try {
      setCampaigns(await listCampaigns())
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refreshSubscribers()
  }, [moduleFilter])

  async function refreshQuota() {
    const result = await getEmailStatus()
    if (!result.ok) return setQuota({ error: result.error })
    setQuota(result)
    setQuotaDraft(result.settings)
  }

  useEffect(() => {
    refreshCampaigns()
    refreshQuota()
  }, [])

  async function handleSaveQuota() {
    setBusy(true)
    const result = await saveEmailSettings({ ...quotaDraft, dailyLimit: Number(quotaDraft.dailyLimit), windowStartHour: Number(quotaDraft.windowStartHour), windowEndHour: Number(quotaDraft.windowEndHour) })
    setBusy(false)
    if (!result.ok) return notify(`Could not save: ${result.error}`)
    notify('Sending limits saved')
    refreshQuota()
  }

  async function toggleReport(id) {
    if (openReport === id) return setOpenReport('')
    setOpenReport(id)
    setReportRows([])
    setReportLoading(true)
    try {
      setReportRows(await listCampaignLogs(id))
    } catch (error) {
      notify(error?.message || 'Could not load the report.')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleCancel(item) {
    if (!await confirmAction({ tone: 'warning', badge: 'Campaign', title: 'Cancel this campaign?', message: `Emails not sent yet for "${item.title || item.subject}" will be dropped. Already sent emails are not affected.`, confirmLabel: 'Cancel campaign' })) return
    const result = await cancelCampaign(item.id)
    notify(result.ok ? `Cancelled — ${result.cancelled} queued email(s) removed` : `Could not cancel: ${result.error}`)
    refreshCampaigns()
    refreshQuota()
  }

  const recipientCount = useMemo(
    () => filterRecipients(subscribers, { audienceType: campaign.audienceType, module: campaign.module }).length,
    [subscribers, campaign.audienceType, campaign.module],
  )
  const recipientSourceCounts = useMemo(
    () => recipientCountsBySource(subscribers, { audienceType: campaign.audienceType, module: campaign.module }),
    [subscribers, campaign.audienceType, campaign.module],
  )
  const sourceLabels = Object.fromEntries(AUDIENCE_SOURCES.map((source) => [source.key, source.label]))

  async function handleAddSubscriber(event) {
    event.preventDefault()
    setBusy(true)
    const res = await addSubscriber(newSub)
    setBusy(false)
    if (!res.ok) return notify(res.error)
    setNewSub({ email: '', name: '', phone: '', source: 'manual', moduleInterest: 'crm' })
    notify('Subscriber added')
    refreshSubscribers()
  }

  async function handleUnsubscribe(sub) {
    const next = sub.status === 'unsubscribed' ? 'subscribed' : 'unsubscribed'
    const res = await setSubscriberStatus(sub.subscriberId || sub.id, next)
    if (!res.ok) return notify(res.error)
    notify(next === 'unsubscribed' ? 'Marked unsubscribed' : 'Re-subscribed')
    refreshSubscribers()
  }

  function applyTemplate(templateId) {
    const tpl = MARKETING_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setCampaign((c) => ({ ...c, title: c.title || tpl.name, subject: tpl.subject, bodyHtml: tpl.bodyHtml, bodyText: tpl.bodyText }))
    notify(`Loaded template: ${tpl.name}`)
  }

  async function handleTest() {
    if (!testEmail) return notify('Enter a test email address.')
    if (!campaign.subject || !campaign.bodyHtml) return notify('Subject and email body are required.')
    setBusy(true)
    const res = await sendTestEmail({ subject: campaign.subject, bodyHtml: campaign.bodyHtml, bodyText: campaign.bodyText, testEmail })
    setBusy(false)
    notify(res.ok ? `Test email sent to ${testEmail}` : `Test failed: ${res.error}`)
  }

  async function handleSend() {
    if (!campaign.subject || !campaign.bodyHtml) return notify('Subject and email body are required.')
    const recipients = filterRecipients(subscribers, { audienceType: campaign.audienceType, module: campaign.module })
    if (!recipients.length) return notify('No subscribed recipients for this audience.')
    if (!await confirmAction({ tone: 'warning', badge: 'Campaign', title: 'Send email campaign?', message: `Queue "${campaign.subject}" for ${recipients.length} subscriber(s)? Emails go out ${quota?.settings ? `${quota.settings.dailyLimit} per day` : 'within the daily limit'}.`, confirmLabel: 'Queue Campaign' })) return
    setBusy(true)
    const res = await sendCampaign(campaign)
    setBusy(false)
    if (!res.ok) return notify(`Send failed: ${res.error}`)
    notify(res.queued ? `Queued ${res.totalRecipients} emails — ${res.dailyLimit}/day, about ${res.estimatedDays} day(s)` : `Campaign sent — ${res.sentCount} sent, ${res.failedCount} failed`)
    refreshQuota()
    setCampaign({ title: '', subject: '', bodyHtml: '', bodyText: '', audienceType: 'all', module: 'all' })
    refreshCampaigns()
    setTab('history')
  }

  const input = 'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400'
  const primaryButton = 'h-10 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60'
  const shellClass = embedded ? 'text-slate-950' : 'min-h-screen bg-slate-50 px-4 py-6 text-slate-900'
  const innerClass = embedded ? 'space-y-5' : 'mx-auto max-w-6xl space-y-5'

  return (
    <main className={shellClass}>
      {toast ? <div className="fixed left-1/2 top-1/2 z-[110] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">{toast}</div> : null}
      <div className={innerClass}>
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Backend Communication</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Email Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">Send campaigns to Nexora's own audience: subscribers, account users, workspace owners and upgrade requests. Keys stay server-side.</p>
          <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">{CLIENT_DATA_EXCLUDED_NOTE} Unsubscribed contacts are never emailed.</p>
        </header>

        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'inbox' ? <EmailInbox notify={notify} /> : null}

        {tab === 'automation' ? <AutomationsPanel notify={notify} /> : null}

        {/* Subscribers */}
        {tab === 'subscribers' ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-700">Audience contacts ({subscribers.length})</h2>
                <div className="flex items-center gap-2">
                  <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-[13px] font-medium">
                    {MODULE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <button type="button" onClick={() => notify('CSV import coming soon — placeholder.')} className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-600 hover:bg-slate-50">Import CSV</button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                    <tr><th className="py-2">Email</th><th>Name</th><th>Module</th><th>Source</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {loadingSubs ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading…</td></tr>
                    ) : subscribers.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400">No contacts found for this module.</td></tr>
                    ) : subscribers.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="py-2 font-medium text-slate-800">{s.email}</td>
                        <td className="text-slate-600">{s.name || '—'}</td>
                        <td className="text-slate-600">{s.moduleInterest || '—'}</td>
                        <td className="text-slate-600">{(s.sources || []).map((key) => sourceLabels[key] || key).join(', ') || s.source || '—'}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td className="text-right">
                          {s.subscriberId ? (
                            <button type="button" onClick={() => handleUnsubscribe(s)} className="text-[12px] font-bold text-blue-700 hover:underline">{s.status === 'unsubscribed' ? 'Re-subscribe' : 'Unsubscribe'}</button>
                          ) : (
                            <span className="text-[12px] font-semibold text-slate-400">Synced</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleAddSubscriber} className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-700">Add subscriber</h2>
              <div className="mt-3 space-y-2.5">
                <input className={input} placeholder="Email *" type="email" value={newSub.email} onChange={(e) => setNewSub({ ...newSub, email: e.target.value })} required />
                <input className={input} placeholder="Name" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} />
                <input className={input} placeholder="Phone" value={newSub.phone} onChange={(e) => setNewSub({ ...newSub, phone: e.target.value })} />
                <select className={input} value={newSub.moduleInterest} onChange={(e) => setNewSub({ ...newSub, moduleInterest: e.target.value })}>
                  {MODULE_OPTIONS.filter((m) => m.value !== 'all').map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select className={input} value={newSub.source} onChange={(e) => setNewSub({ ...newSub, source: e.target.value })}>
                  {['manual', 'website', 'trial', 'crm'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>Add subscriber</button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Create Campaign */}
        {tab === 'campaign' || tab === 'history' ? <QuotaPanel status={quota} draft={quotaDraft} setDraft={setQuotaDraft} onSave={handleSaveQuota} busy={busy} /> : null}

        {tab === 'campaign' ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <input className={input} placeholder="Campaign title" value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} />
              <input className={input} placeholder="Subject *" value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })} />
              <textarea className="min-h-[200px] w-full rounded-xl border border-slate-200 p-3 font-mono text-[12px] outline-none focus:border-blue-400" placeholder="Email body (HTML) *" value={campaign.bodyHtml} onChange={(e) => setCampaign({ ...campaign, bodyHtml: e.target.value })} />
              <textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-blue-400" placeholder="Plain text body (fallback)" value={campaign.bodyText} onChange={(e) => setCampaign({ ...campaign, bodyText: e.target.value })} />
              <EmailPreview html={campaign.bodyHtml} />
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" placeholder="Test email address" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                <button type="button" disabled={busy} onClick={handleTest} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Send Test</button>
                <button type="button" disabled={busy} onClick={handleSend} className={primaryButton}>Queue Campaign</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-bold text-slate-700">Audience</h2>
                <label className="mt-2 block text-xs font-semibold text-slate-500">Audience type
                  <select className={`${input} mt-1`} value={campaign.audienceType} onChange={(e) => setCampaign({ ...campaign, audienceType: e.target.value })}>
                    {AUDIENCE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </label>
                <label className="mt-2 block text-xs font-semibold text-slate-500">Module
                  <select className={`${input} mt-1`} value={campaign.module} onChange={(e) => setCampaign({ ...campaign, module: e.target.value })}>
                    {MODULE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{recipientCount} recipient(s) match</p>
                <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
                  {recipientSourceCounts.map((source) => (
                    <li key={source.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                      <span>{source.label}</span>
                      <span className="font-black text-slate-900">{source.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">Someone found in two sources counts in both rows but receives one email. Unsubscribed contacts are excluded.</p>
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{CLIENT_DATA_EXCLUDED_NOTE}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-bold text-slate-700">Templates</h2>
                <div className="mt-2 space-y-1.5">
                  {MARKETING_TEMPLATES.map((t, index) => (
                    <Fragment key={t.id}>
                      {index === 0 || MARKETING_TEMPLATES[index - 1].group !== t.group ? <p className="pt-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{t.group}</p> : null}
                      <button type="button" onClick={() => applyTemplate(t.id)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                        {t.name}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* History */}
        {tab === 'history' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Campaign History ({campaigns.length})</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                  <tr><th className="py-2">Title</th><th>Recipients</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Bounced</th><th>Failed</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr><td colSpan={10} className="py-6 text-center text-slate-400">No campaigns yet.</td></tr>
                  ) : campaigns.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="border-t border-slate-100">
                        <td className="py-2"><p className="font-medium text-slate-800">{c.title}</p><p className="text-[11px] text-slate-500">{c.subject}</p></td>
                        <td className="text-slate-600">{c.totalRecipients || 0}</td>
                        <td className="font-bold text-slate-800">{c.sentCount || 0}</td>
                        <td className="text-slate-600">{c.deliveredCount || 0}</td>
                        <td className="text-slate-600">{c.openedCount || 0} <span className="text-[11px] text-slate-400">{pct(c.openedCount, c.deliveredCount || c.sentCount)}</span></td>
                        <td className="text-slate-600">{c.clickedCount || 0} <span className="text-[11px] text-slate-400">{pct(c.clickedCount, c.deliveredCount || c.sentCount)}</span></td>
                        <td className="font-bold text-rose-600">{(c.bouncedCount || 0) + (c.complainedCount || 0)}</td>
                        <td className="font-bold text-rose-600">{c.failedCount || 0}</td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="whitespace-nowrap text-right">
                          <button type="button" onClick={() => toggleReport(c.id)} className="text-[12px] font-bold text-blue-700 hover:underline">{openReport === c.id ? 'Hide report' : 'Report'}</button>
                          {['queued', 'sending'].includes(c.status) ? <button type="button" onClick={() => handleCancel(c)} className="ml-3 text-[12px] font-bold text-rose-600 hover:underline">Cancel</button> : null}
                        </td>
                      </tr>
                      {openReport === c.id ? <tr><td colSpan={10}><CampaignReport campaign={c} rows={reportRows} loading={reportLoading} /></td></tr> : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
