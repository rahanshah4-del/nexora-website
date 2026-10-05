import { useRef, useState } from 'react'
import { sendCampaign } from '../../lib/marketing.js'
import { emailsFromFile } from '../../lib/emailExtract.js'
import { MARKETING_TEMPLATES } from '../../lib/marketingTemplates.js'
import { confirmAction } from '../../crm/components/ui/dialogActions.js'
import { EmailPreview } from './emailUi.jsx'

const ACCEPT = '.pdf,.docx,.doc,.xlsx,.csv,.txt'
const MAX = 2000

/** Upload a file, keep only its email addresses, pick a template, press Run. Everything else is automatic. */
export default function FileCampaign({ notify, quota, onStarted }) {
  const [file, setFile] = useState(null)
  const [emails, setEmails] = useState([])
  const [reading, setReading] = useState(false)
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [running, setRunning] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const input = useRef(null)

  const template = MARKETING_TEMPLATES.find((item) => item.id === templateId)
  const groups = Array.from(new Set(MARKETING_TEMPLATES.map((item) => item.group)))
  const ready = emails.length > 0 && title.trim() && template && !running
  const limit = quota && !quota.error ? quota.settings.dailyLimit : 0
  const days = limit ? Math.max(1, Math.ceil(Math.min(emails.length, MAX) / limit)) : null

  async function pick(event) {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    if (!chosen) return
    setReading(true)
    setFile(chosen)
    setEmails([])
    try {
      const found = await emailsFromFile(chosen)
      setEmails(found)
      if (!title.trim()) setTitle(chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
      notify(found.length ? `${found.length} email address(es) found` : 'No email addresses found in this file.')
    } catch (error) {
      notify(error?.message || 'Could not read this file.')
    } finally {
      setReading(false)
    }
  }

  function reset() {
    setFile(null)
    setEmails([])
    setTitle('')
    setTemplateId('')
    setShowAll(false)
  }

  async function run() {
    const count = Math.min(emails.length, MAX)
    const ok = await confirmAction({
      tone: 'warning',
      badge: 'Run campaign',
      title: `Send "${template.name}" to ${count} address(es)?`,
      message: `Campaign "${title.trim()}". Emails go out automatically in small groups, ${limit ? `${limit} a day` : 'within your daily limit'}${days ? `, about ${days} day(s)` : ''}, only during your sending hours. People who unsubscribed are skipped.`,
      confirmLabel: 'Run campaign',
    })
    if (!ok) return
    setRunning(true)
    const res = await sendCampaign({ title: title.trim(), subject: template.subject, bodyHtml: template.bodyHtml, bodyText: template.bodyText, audienceType: 'list', emails: emails.slice(0, MAX) })
    setRunning(false)
    if (!res.ok) return notify(`Could not start: ${res.error}`)
    notify(`Campaign started: ${res.totalRecipients} email(s) queued, about ${res.estimatedDays} day(s)`)
    reset()
    onStarted?.()
  }

  const shown = showAll ? emails : emails.slice(0, 12)

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Quick campaign</p>
          <h3 className="mt-0.5 text-lg font-black text-slate-950">Upload a file, pick a template, press Run</h3>
          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-500">Upload a PDF, Word, Excel, CSV or text file. Only the email addresses are taken; names, phones and everything else are ignored. Sending limits, hours, unsubscribe link and tracking are handled for you.</p>
        </div>
        <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={pick} />
        <button type="button" disabled={reading || running} onClick={() => input.current?.click()} className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{reading ? 'Reading file…' : file ? 'Choose another file' : 'Upload file'}</button>
      </div>

      {file ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-bold text-slate-900">{file.name} <span className="font-normal text-slate-500">· {emails.length} email address(es) found{emails.length > MAX ? `, first ${MAX} will be used` : ''}</span></p>
            {emails.length ? (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shown.map((email) => <span key={email} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{email}</span>)}
                </div>
                {emails.length > 12 ? <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 text-xs font-bold text-blue-600 hover:underline">{showAll ? 'Show fewer' : `Show all ${emails.length}`}</button> : null}
              </>
            ) : !reading ? <p className="mt-1 text-xs text-rose-600">No email addresses in this file. If it is a scanned PDF (a photo), the text cannot be read; use a text PDF, Word or CSV.</p> : null}
          </div>

          {emails.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Campaign name
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. School ERP offer, October" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-400" />
              </label>
              <label className="text-xs font-bold text-slate-600">Template
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-400">
                  <option value="">Select a template…</option>
                  {groups.map((group) => (
                    <optgroup key={group} label={group}>
                      {MARKETING_TEMPLATES.filter((item) => item.group === group).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {template ? <EmailPreview html={template.bodyHtml} height={480} /> : null}

          {emails.length ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={!ready} onClick={run} className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">{running ? 'Starting…' : `Run campaign (${Math.min(emails.length, MAX)})`}</button>
              <button type="button" disabled={running} onClick={reset} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Clear</button>
              <p className="text-xs text-slate-500">{!title.trim() ? 'Type a campaign name.' : !template ? 'Select a template.' : days ? `Sends ${limit} a day, about ${days} day(s).` : ''}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
