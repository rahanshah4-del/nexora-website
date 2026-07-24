import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HiOutlineArchiveBox,
  HiOutlineArrowPath,
  HiOutlineArrowUturnLeft,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineEnvelopeOpen,
  HiOutlineExclamationTriangle,
  HiOutlineInbox,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineTrash,
} from 'react-icons/hi2'
import {
  getReceivedEmail,
  listEmailActivity,
  listReceivedEmails,
  replyToReceivedEmail,
  updateReceivedEmailState,
} from '../../lib/emailInbox.js'
import { confirmAction } from '../../crm/components/ui/dialogActions.js'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'

const defaultCounts = { inbox: 0, unread: 0, starred: 0, archive: 0, trash: 0 }
const defaultSummary = { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, failed: 0 }
const LAST_EMAIL_KEY = 'nexora:emailInbox:lastEmailId'
const AUTO_SYNC_MS = 12000
const REPLY_TEMPLATES = [
  { label: 'Acknowledged', text: 'Hi,\n\nThank you for contacting Nexora Solution. We have received your message and our team is reviewing it.\n\nBest regards,\nNexora Support' },
  { label: 'Need details', text: 'Hi,\n\nThank you for your message. Please share any additional details, screenshots, or reference numbers so we can assist you accurately.\n\nBest regards,\nNexora Support' },
  { label: 'Resolved', text: 'Hi,\n\nYour request has been resolved. Please check and let us know if you need any further assistance.\n\nBest regards,\nNexora Support' },
]

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

function senderLabel(value = '') {
  const match = String(value).match(/^\s*([^<]+?)\s*<[^>]+>\s*$/)
  return match?.[1]?.trim() || String(value).trim() || 'Unknown sender'
}

function senderEmail(value = '') {
  const bracketed = String(value).match(/<([^>]+)>/)
  return bracketed?.[1] || String(value).trim()
}

function readableBody(email) {
  if (email?.text) return email.text
  if (!email?.html) return 'This email has no readable message body.'
  try {
    return new DOMParser().parseFromString(email.html, 'text/html').body.textContent?.trim() || 'This email has no readable message body.'
  } catch {
    return 'This email has no readable message body.'
  }
}

function safeEmailHtml(rawHtml, loadImages) {
  if (!rawHtml || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, form, input, button, textarea, select, base, meta[http-equiv]').forEach((node) => node.remove())
  doc.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name)
    })
  })
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || ''
    if (!/^(https?:|mailto:)/i.test(href)) link.removeAttribute('href')
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noreferrer noopener')
  })
  doc.querySelectorAll('img').forEach((image) => {
    if (!loadImages) image.removeAttribute('src')
    image.setAttribute('loading', 'lazy')
    image.style.maxWidth = '100%'
    image.style.height = 'auto'
  })
  const style = `<style>html{color-scheme:light}body{margin:0;padding:20px;background:#fff;color:#1f2937;font:14px/1.6 Arial,Helvetica,sans-serif;overflow-wrap:anywhere}table{max-width:100%!important}a{color:#1d4ed8}pre{white-space:pre-wrap}img:not([src]){display:none}</style>`
  return `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${doc.body.innerHTML}</body></html>`
}

function eventTone(event) {
  if (['delivered', 'opened', 'clicked'].includes(event)) return 'bg-emerald-50 text-emerald-700'
  if (['bounced', 'failed', 'complained'].includes(event)) return 'bg-rose-50 text-rose-700'
  return 'bg-blue-50 text-blue-700'
}

function Metric({ label, value, icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className="flex min-w-0 items-center gap-3 border-r border-slate-100 px-4 py-3 last:border-r-0">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.blue}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0"><span className="block text-lg font-black text-slate-950">{value || 0}</span><span className="block truncate text-[11px] font-bold uppercase text-slate-400">{label}</span></span>
    </div>
  )
}

export default function EmailInbox({ notify }) {
  const [emails, setEmails] = useState([])
  const [counts, setCounts] = useState(defaultCounts)
  const [activity, setActivity] = useState({ emails: [], summary: defaultSummary })
  const [folder, setFolder] = useState('inbox')
  const [selectedId, setSelectedId] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [showCopies, setShowCopies] = useState(false)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [previewMode, setPreviewMode] = useState('html')
  const [loadImages, setLoadImages] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const latestEmailIdRef = useRef(typeof window === 'undefined' ? '' : window.localStorage.getItem(LAST_EMAIL_KEY) || '')
  const syncRunningRef = useRef(false)
  const notificationPermissionRef = useRef(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  const emailPreviewHtml = useMemo(() => safeEmailHtml(selectedEmail?.html, loadImages), [loadImages, selectedEmail?.html])

  const visibleEmails = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (folder === 'sent') {
      return activity.emails.filter((email) => !needle || `${email.from} ${email.subject} ${(email.to || []).join(' ')}`.toLowerCase().includes(needle))
    }
    return emails.filter((email) => {
      const state = email.state || {}
      const matchesFolder = folder === 'starred'
        ? state.isStarred && state.folder !== 'trash'
        : folder === 'unread'
          ? !state.isRead && state.folder === 'inbox'
          : (state.folder || 'inbox') === folder
      const matchesSearch = !needle || `${email.from} ${email.subject} ${(email.to || []).join(' ')}`.toLowerCase().includes(needle)
      return matchesFolder && matchesSearch
    })
  }, [activity.emails, emails, folder, query])

  async function openEmail(id) {
    if (folder === 'sent') return
    setSelectedId(id)
    setDetailLoading(true)
    setError('')
    setReply('')
    setCc('')
    setBcc('')
    setPreviewMode('html')
    setLoadImages(false)
    try {
      const email = await getReceivedEmail(id)
      setSelectedEmail(email)
      setEmails((current) => current.map((item) => item.id === id ? { ...item, state: email.state } : item))
      setCounts((current) => ({ ...current, unread: Math.max(0, current.unread - (emails.find((item) => item.id === id)?.state?.isRead ? 0 : 1)) }))
    } catch (requestError) {
      setSelectedEmail(null)
      setError(requestError?.message || 'Could not load this email.')
    } finally {
      setDetailLoading(false)
    }
  }

  function announceNewEmails(nextEmails) {
    const newestId = nextEmails[0]?.id || ''
    const previousId = latestEmailIdRef.current
    if (!newestId) return
    if (previousId && newestId !== previousId) {
      const newItems = nextEmails.slice(0, Math.max(1, nextEmails.findIndex((email) => email.id === previousId)))
      newItems.slice(0, 3).forEach((email) => {
        const message = `New email from ${senderLabel(email.from)}: ${email.subject || '(No subject)'}`
        notify?.(message)
        if (notificationPermissionRef.current === 'granted') {
          const browserNotification = new Notification(`Nexora Support: ${senderLabel(email.from)}`, {
            body: email.subject || 'New support email received',
            tag: `nexora-email-${email.id}`,
          })
          browserNotification.onclick = () => {
            window.focus()
            setFolder('inbox')
            openEmail(email.id)
            browserNotification.close()
          }
        }
      })
    }
    latestEmailIdRef.current = newestId
    window.localStorage.setItem(LAST_EMAIL_KEY, newestId)
  }

  async function refreshAll({ reopen = true, silent = false } = {}) {
    if (syncRunningRef.current) return
    syncRunningRef.current = true
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const [inboxResult, activityResult] = await Promise.allSettled([listReceivedEmails(), listEmailActivity()])
      if (inboxResult.status === 'fulfilled') {
        announceNewEmails(inboxResult.value.emails)
        setEmails(inboxResult.value.emails)
        setCounts({ ...defaultCounts, ...inboxResult.value.counts })
        if (reopen && selectedId && inboxResult.value.emails.some((email) => email.id === selectedId)) await openEmail(selectedId)
      }
      if (activityResult.status === 'fulfilled') {
        setActivity({ emails: activityResult.value.emails, summary: { ...defaultSummary, ...activityResult.value.summary } })
      }
      if (inboxResult.status === 'rejected' && activityResult.status === 'rejected') {
        throw inboxResult.reason || activityResult.reason
      }
      if (!silent && inboxResult.status === 'rejected') setError(inboxResult.reason?.message || 'Could not load the support inbox.')
      else if (!silent && activityResult.status === 'rejected') setError(`Inbox loaded. Tracking metrics unavailable: ${activityResult.reason?.message || 'request failed'}`)
      setLastSyncedAt(new Date())
    } catch (requestError) {
      if (!silent) setError(requestError?.message || 'Could not load email operations.')
    } finally {
      if (!silent) setLoading(false)
      syncRunningRef.current = false
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') refreshAll({ reopen: false, silent: true })
    }
    const timer = window.setInterval(sync, AUTO_SYNC_MS)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    notificationPermissionRef.current = permission
    setNotificationPermission(permission)
    notify?.(permission === 'granted' ? 'Live email notifications enabled' : 'Browser notifications were not enabled')
  }

  async function changeState(patch, message) {
    if (!selectedEmail?.id) return
    setActionBusy(true)
    try {
      const state = await updateReceivedEmailState(selectedEmail.id, patch)
      setSelectedEmail((current) => current ? { ...current, state } : current)
      setEmails((current) => current.map((item) => item.id === selectedEmail.id ? { ...item, state } : item))
      notify?.(message)
      await refreshAll({ reopen: false })
      if (patch.folder && patch.folder !== folder && folder !== 'starred') {
        setSelectedId('')
        setSelectedEmail(null)
      }
    } catch (requestError) {
      notify?.(requestError?.message || 'Email action failed.')
    } finally {
      setActionBusy(false)
    }
  }

  async function moveToTrash() {
    if (!await confirmAction({ title: 'Move email to trash?', message: 'The email will leave the active inbox. You can restore it later from Trash.', confirmLabel: 'Move to Trash' })) return
    await changeState({ folder: 'trash' }, 'Email moved to trash')
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!selectedEmail?.id || !reply.trim()) return
    setSending(true)
    try {
      const result = await replyToReceivedEmail(selectedEmail.id, { text: reply.trim(), cc, bcc })
      setReply('')
      setCc('')
      setBcc('')
      notify?.(`Reply sent to ${result.recipient}`)
      await refreshAll({ reopen: false })
      await openEmail(selectedEmail.id)
    } catch (requestError) {
      notify?.(`Reply failed: ${requestError?.message || 'Email could not be sent.'}`)
    } finally {
      setSending(false)
    }
  }

  const folders = [
    ['inbox', 'Inbox', HiOutlineInbox, counts.inbox],
    ['unread', 'Unread', HiOutlineEnvelope, counts.unread],
    ['starred', 'Starred', HiOutlineStar, counts.starred],
    ['archive', 'Archive', HiOutlineArchiveBox, counts.archive],
    ['trash', 'Trash', HiOutlineTrash, counts.trash],
    ['sent', 'Sent Activity', HiOutlineChartBar, activity.summary.total],
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Sent" value={activity.summary.total} icon={HiOutlinePaperAirplane} tone="blue" />
        <Metric label="Delivered" value={activity.summary.delivered} icon={HiOutlineCheckCircle} tone="emerald" />
        <Metric label="Opened" value={activity.summary.opened} icon={HiOutlineEnvelopeOpen} tone="violet" />
        <Metric label="Clicked" value={activity.summary.clicked} icon={HiOutlineChartBar} tone="amber" />
        <Metric label="Bounced" value={activity.summary.bounced} icon={HiOutlineExclamationTriangle} tone="rose" />
        <Metric label="Unread" value={counts.unread} icon={HiOutlineEnvelope} tone="blue" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div><div className="flex items-center gap-2"><h2 className="text-sm font-black text-slate-900">Email Operations</h2><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span></div><p className="flex items-center text-xs text-slate-500"><span>support@nexorasolution.online</span><CopyEmailButton email="support@nexorasolution.online" />{lastSyncedAt ? <span className="ml-1">· synced {lastSyncedAt.toLocaleTimeString()}</span> : ''}</p></div>
        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' ? <button type="button" onClick={enableNotifications} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50"><HiOutlineBell className="h-4 w-4" /> Enable alerts</button> : null}
          <button title="Sync now" type="button" onClick={() => refreshAll()} disabled={loading} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <HiOutlineArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid min-h-[38rem] xl:grid-cols-[180px_330px_minmax(0,1fr)]">
        <nav className="border-b border-slate-200 p-3 xl:border-b-0 xl:border-r">
          <div className="flex gap-1 overflow-x-auto xl:block xl:space-y-1">
            {folders.map(([key, label, Icon, count]) => (
              <button key={key} type="button" onClick={() => { setFolder(key); setSelectedId(''); setSelectedEmail(null) }} className={`flex h-10 min-w-max items-center gap-2 rounded-lg px-3 text-sm font-bold xl:w-full ${folder === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span><span className={folder === key ? 'text-white/70' : 'text-slate-400'}>{count || 0}</span>
              </button>
            ))}
          </div>
        </nav>

        <aside className="border-b border-slate-200 xl:border-b-0 xl:border-r">
          <label className="relative block border-b border-slate-100 p-3">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${folder}...`} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
          </label>
          <div className="max-h-[34rem] overflow-y-auto">
            {loading ? <p className="px-4 py-10 text-center text-sm text-slate-400">Loading emails...</p> : visibleEmails.length ? visibleEmails.map((email) => {
              const sentView = folder === 'sent'
              const unread = !sentView && !email.state?.isRead
              return (
                <button key={email.id} type="button" onClick={() => openEmail(email.id)} disabled={sentView} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition ${selectedId === email.id ? 'bg-blue-50' : 'hover:bg-slate-50'} ${sentView ? 'cursor-default' : ''}`}>
                  <span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className={`block truncate text-sm text-slate-900 ${unread ? 'font-black' : 'font-semibold'}`}>{sentView ? (email.to || []).join(', ') : senderLabel(email.from)}</span><span className="mt-0.5 block truncate text-[13px] font-semibold text-slate-600">{email.subject || '(No subject)'}</span></span>{email.state?.isStarred ? <HiOutlineStar className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" /> : null}</span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{formatDate(email.created_at)}</span>{sentView ? <span className={`rounded-full px-2 py-0.5 font-bold capitalize ${eventTone(email.last_event)}`}>{email.last_event || 'sent'}</span> : email.attachments?.length ? <HiOutlinePaperClip className="h-4 w-4" /> : null}</span>
                </button>
              )
            }) : <div className="px-5 py-12 text-center"><HiOutlineEnvelope className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No emails in {folder}</p></div>}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          {folder === 'sent' ? (
            <div className="grid min-h-[30rem] place-items-center text-center"><div><HiOutlineChartBar className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Sent delivery activity</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Delivery, opens and clicks update from Resend. Enable the custom tracking domain to activate open and click events.</p></div></div>
          ) : detailLoading ? (
            <div className="grid min-h-[30rem] place-items-center text-sm text-slate-400">Loading message...</div>
          ) : selectedEmail ? (
            <div className="space-y-5">
              <header className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-xl font-black text-slate-950">{selectedEmail.subject || '(No subject)'}</h3><p className="mt-2 break-all text-xs text-slate-500"><span className="font-bold text-slate-700">From:</span> {senderLabel(selectedEmail.from)} &lt;{senderEmail(selectedEmail.from)}&gt;</p></div><div className="flex items-center gap-1">
                  <button title={selectedEmail.state?.isStarred ? 'Remove star' : 'Star'} type="button" disabled={actionBusy} onClick={() => changeState({ isStarred: !selectedEmail.state?.isStarred }, selectedEmail.state?.isStarred ? 'Star removed' : 'Email starred')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineStar className={`h-4 w-4 ${selectedEmail.state?.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} /></button>
                  {selectedEmail.state?.folder === 'trash' ? <button title="Restore" type="button" disabled={actionBusy} onClick={() => changeState({ folder: 'inbox' }, 'Email restored')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineArrowUturnLeft className="h-4 w-4" /></button> : <>
                    <button title="Archive" type="button" disabled={actionBusy} onClick={() => changeState({ folder: 'archive' }, 'Email archived')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineArchiveBox className="h-4 w-4" /></button>
                    <button title="Move to trash" type="button" disabled={actionBusy} onClick={moveToTrash} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
                  </>}
                </div></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><time className="text-xs text-slate-400">{formatDate(selectedEmail.created_at)}</time><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => navigator.clipboard.writeText(senderEmail(selectedEmail.from)).then(() => notify?.('Sender email copied'))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-700"><HiOutlineClipboardDocument className="h-4 w-4" /> Copy sender</button>{selectedEmail.raw?.download_url ? <a href={selectedEmail.raw.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-700"><HiOutlineDocumentText className="h-4 w-4" /> Original</a> : null}<button type="button" onClick={() => changeState({ isRead: false }, 'Marked unread')} className="text-xs font-bold text-blue-700 hover:underline">Mark unread</button></div></div>
              </header>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                    <button type="button" onClick={() => setPreviewMode('html')} className={`rounded-md px-3 py-1.5 text-xs font-bold ${previewMode === 'html' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>HTML</button>
                    <button type="button" onClick={() => setPreviewMode('text')} className={`rounded-md px-3 py-1.5 text-xs font-bold ${previewMode === 'text' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Text</button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><HiOutlineShieldCheck className="h-4 w-4 text-emerald-600" /> Scripts blocked{previewMode === 'html' && selectedEmail.html && !loadImages ? <button type="button" onClick={() => setLoadImages(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-bold text-blue-700"><HiOutlinePhoto className="h-4 w-4" /> Load images</button> : null}</div>
                </div>
                {previewMode === 'html' && emailPreviewHtml ? <iframe title={`Email preview: ${selectedEmail.subject || 'message'}`} srcDoc={emailPreviewHtml} sandbox="allow-popups allow-popups-to-escape-sandbox" className="h-[25rem] w-full bg-white" /> : <div className="max-h-[25rem] min-h-[12rem] overflow-y-auto whitespace-pre-wrap break-words p-5 text-sm leading-6 text-slate-700">{readableBody(selectedEmail)}</div>}
              </div>

              {selectedEmail.attachments?.length ? <div><p className="text-xs font-black uppercase text-slate-500">Attachments</p><div className="mt-2 flex flex-wrap gap-2">{selectedEmail.attachments.map((attachment) => <a key={attachment.id} href={attachment.download_url || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 ${attachment.download_url ? 'hover:bg-slate-50' : 'pointer-events-none opacity-50'}`}><HiOutlinePaperClip className="h-4 w-4" /> {attachment.filename || 'Attachment'}</a>)}</div></div> : null}

              {selectedEmail.replies?.length ? <div className="border-t border-slate-100 pt-4"><p className="text-xs font-black uppercase text-slate-500">Reply history</p><div className="mt-2 space-y-2">{selectedEmail.replies.map((item) => <div key={item.id} className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><div className="flex justify-between gap-3 text-[11px] text-slate-500"><span className="font-bold text-blue-700">Sent to {item.recipient}</span><span>{formatDate(item.sent_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body_text}</p></div>)}</div></div> : null}

              {selectedEmail.state?.folder !== 'trash' ? <form onSubmit={sendReply} className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between"><label className="text-xs font-black uppercase text-slate-500" htmlFor="support-reply">Reply</label><button type="button" onClick={() => setShowCopies((value) => !value)} className="text-xs font-bold text-blue-700">CC / BCC</button></div>
                <div className="mt-2 flex flex-wrap gap-1.5">{REPLY_TEMPLATES.map((template) => <button key={template.label} type="button" onClick={() => setReply(template.text)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{template.label}</button>)}</div>
                {showCopies ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="CC addresses" className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400" /><input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="BCC addresses" className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400" /></div> : null}
                <textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${senderEmail(selectedEmail.from)}...`} className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" />
                <div className="mt-3 flex justify-end"><button type="submit" disabled={sending || !reply.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><HiOutlinePaperAirplane className="h-4 w-4" />{sending ? 'Sending...' : 'Send Reply'}</button></div>
              </form> : null}
            </div>
          ) : <div className="grid min-h-[30rem] place-items-center text-center"><div><HiOutlineEnvelope className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Select an email</p></div></div>}
        </div>
      </div>
    </section>
  )
}
