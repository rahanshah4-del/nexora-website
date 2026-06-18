import { useEffect, useMemo, useState } from 'react'
import {
  addSubscriber,
  filterRecipients,
  listMarketingContacts,
  listCampaigns,
  sendCampaign,
  sendTestEmail,
  setSubscriberStatus,
  AUDIENCE_OPTIONS,
  MODULE_OPTIONS,
} from '../../lib/marketing.js'
import { MARKETING_TEMPLATES } from '../../lib/marketingTemplates.js'

const TABS = [
  { key: 'subscribers', label: 'Subscribers' },
  { key: 'campaign', label: 'Create Campaign' },
  { key: 'history', label: 'Campaign History' },
]

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-50 text-emerald-700',
    sending: 'bg-amber-50 text-amber-700',
    failed: 'bg-rose-50 text-rose-700',
    draft: 'bg-slate-100 text-slate-600',
    subscribed: 'bg-emerald-50 text-emerald-700',
    unsubscribed: 'bg-rose-50 text-rose-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status || '—'}</span>
}

export default function EmailMarketing({ embedded = false }) {
  const [tab, setTab] = useState('subscribers')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const [subscribers, setSubscribers] = useState([])
  const [moduleFilter, setModuleFilter] = useState('all')
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [newSub, setNewSub] = useState({ email: '', name: '', phone: '', source: 'manual', moduleInterest: 'crm' })

  const [campaigns, setCampaigns] = useState([])
  const [campaign, setCampaign] = useState({ title: '', subject: '', bodyHtml: '', bodyText: '', audienceType: 'all', module: 'all' })
  const [testEmail, setTestEmail] = useState('')

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter])

  useEffect(() => {
    refreshCampaigns()
  }, [])

  const recipientCount = useMemo(
    () => filterRecipients(subscribers, { audienceType: campaign.audienceType, module: campaign.module }).length,
    [subscribers, campaign.audienceType, campaign.module],
  )

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
    const res = await setSubscriberStatus(sub.id, next)
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
    if (!window.confirm(`Send "${campaign.subject}" to ${recipients.length} subscriber(s)?`)) return
    setBusy(true)
    const res = await sendCampaign(campaign)
    setBusy(false)
    if (!res.ok) return notify(`Send failed: ${res.error}`)
    notify(`Campaign sent — ${res.sentCount} sent, ${res.failedCount} failed`)
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
      {toast ? <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div> : null}
      <div className={innerClass}>
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Backend Communication</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Email Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">Send campaigns to subscribers, leads, trial users and clients. Keys stay server-side.</p>
        </header>

        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
          ))}
        </div>

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
                        <td className="text-slate-600">{s.source || s.origin || '—'}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td className="text-right">
                          {s.origin === 'marketingSubscribers' || !s.origin ? (
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
        {tab === 'campaign' ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <input className={input} placeholder="Campaign title" value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} />
              <input className={input} placeholder="Subject *" value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })} />
              <textarea className="min-h-[200px] w-full rounded-xl border border-slate-200 p-3 font-mono text-[12px] outline-none focus:border-blue-400" placeholder="Email body (HTML) *" value={campaign.bodyHtml} onChange={(e) => setCampaign({ ...campaign, bodyHtml: e.target.value })} />
              <textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-blue-400" placeholder="Plain text body (fallback)" value={campaign.bodyText} onChange={(e) => setCampaign({ ...campaign, bodyText: e.target.value })} />
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" placeholder="Test email address" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                <button type="button" disabled={busy} onClick={handleTest} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Send Test</button>
                <button type="button" disabled={busy} onClick={handleSend} className={primaryButton}>Send Campaign</button>
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
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-bold text-slate-700">Templates</h2>
                <div className="mt-2 space-y-1.5">
                  {MARKETING_TEMPLATES.map((t) => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                      {t.name}
                    </button>
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
                  <tr><th className="py-2">Title</th><th>Subject</th><th>Audience</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No campaigns yet.</td></tr>
                  ) : campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-800">{c.title}</td>
                      <td className="text-slate-600">{c.subject}</td>
                      <td className="text-slate-600">{c.audienceType}</td>
                      <td className="text-slate-600">{c.totalRecipients || 0}</td>
                      <td className="font-bold text-emerald-600">{c.sentCount || 0}</td>
                      <td className="font-bold text-rose-600">{c.failedCount || 0}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
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
