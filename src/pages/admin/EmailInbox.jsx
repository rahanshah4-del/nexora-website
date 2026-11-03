import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HiOutlineArchiveBox,
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineArrowUturnLeft,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineCommandLine,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineEnvelopeOpen,
  HiOutlineExclamationTriangle,
  HiOutlineInbox,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineXMark,
  HiStar,
} from 'react-icons/hi2'
import {
  bulkUpdateEmails,
  downloadInboxAttachment,
  getInboxPulse,
  getReceivedEmail,
  listEmailActivity,
  listReceivedEmails,
  replyToReceivedEmail,
  updateReceivedEmailState,
  updateTicket,
} from '../../lib/emailInbox.js'
import { draftKey, formatBytes, neighbourId, quoteOriginal, relativeTime, secondsAgo, shortcutFor, slaState, toggleId } from '../../lib/inboxUtils.js'
import { fillTemplate } from '../../../workers/shared/emailTemplate.js'
import { confirmAction } from '../../crm/components/ui/dialogActions.js'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'
import EmailSendingLimits from './EmailSendingLimits.jsx'
import { flightKey, runOnce } from '../../lib/singleFlight.js'
import ComposeModal from './inbox/ComposeModal.jsx'
import TicketPanel from './inbox/TicketPanel.jsx'
import { PRIORITY_META, STATUS_META } from './inbox/inboxMeta.js'
import { Avatar, LiveBadge, ShortcutsHelp } from './inbox/InboxParts.jsx'
import EmailPreview from './inbox/EmailPreview.jsx'
import CustomerCard from './inbox/CustomerCard.jsx'
import { findCustomerByEmail } from '../../lib/customerLookup.js'
import { QUICK_EMOJIS, REPLY_TEMPLATES, RESOLVED_TEMPLATE, firstName } from './inbox/replyTemplates.js'

const defaultCounts = { inbox: 0, unread: 0, starred: 0, archive: 0, trash: 0 }
const defaultSummary = { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, failed: 0 }
const LAST_EMAIL_KEY = 'nexora:emailInbox:lastEmailId'
const ALERT_ALL_KEY = 'nexora:emailInbox:alertAll'
const PULSE_MS = 4000
const PULSE_HIDDEN_MS = 30000
const FULL_SYNC_MS = 60000
const TICKET_FILTERS = [['all', 'All'], ['open', '🟢 Open'], ['pending', '⏳ Pending'], ['resolved', '✅ Resolved'], ['urgent', '🔥 Urgent']]

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

function readDraft(id) {
  try { return window.localStorage.getItem(draftKey(id)) || '' } catch { return '' }
}

function writeDraft(id, text) {
  try {
    if (text.trim()) window.localStorage.setItem(draftKey(id), text)
    else window.localStorage.removeItem(draftKey(id))
  } catch { /* drafts are a convenience only */ }
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

function ListSkeleton() {
  return <div aria-hidden="true">{[0, 1, 2, 3].map((n) => <div key={n} className="flex animate-pulse gap-3 border-b border-slate-100 px-4 py-4"><span className="h-9 w-9 rounded-full bg-slate-100" /><span className="flex-1 space-y-2"><span className="block h-3 w-2/5 rounded bg-slate-100" /><span className="block h-3 w-4/5 rounded bg-slate-100" /><span className="block h-3 w-3/5 rounded bg-slate-50" /></span></div>)}</div>
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
  const [includeQuote, setIncludeQuote] = useState(false)
  const [showCopies, setShowCopies] = useState(false)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [previewMode, setPreviewMode] = useState('html')
  const [loadImages, setLoadImages] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [ticketFilter, setTicketFilter] = useState('all')
  const [ticketDraft, setTicketDraft] = useState({ assignee: '', note: '' })
  const [ticketBusy, setTicketBusy] = useState(false)
  const [alertAll, setAlertAll] = useState(() => { try { return window.localStorage.getItem(ALERT_ALL_KEY) === '1' } catch { return false } })
  const [liveStatus, setLiveStatus] = useState('live')
  const [liveAt, setLiveAt] = useState(0)
  const [, setTick] = useState(0)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [freshIds, setFreshIds] = useState(() => new Set())
  const [showCompose, setShowCompose] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ email: '', customer: null })
  const latestEmailIdRef = useRef(typeof window === 'undefined' ? '' : window.localStorage.getItem(LAST_EMAIL_KEY) || '')
  const syncRunningRef = useRef(false)
  const syncPendingRef = useRef(false)
  const notificationPermissionRef = useRef(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const alertAllRef = useRef(alertAll)
  const pulseVersionRef = useRef('')
  const knownIdsRef = useRef(null)
  const searchRef = useRef(null)
  const replyRef = useRef(null)
  const refreshRef = useRef(null)
  const shortcutRef = useRef(null)

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
      const matchesSearch = !needle || `${email.from} ${email.subject} ${email.snippet || ''} ${(email.to || []).join(' ')} ${email.ticket?.ticketId || ''}`.toLowerCase().includes(needle)
      const matchesTicket = ticketFilter === 'all'
        || (ticketFilter === 'urgent' ? email.ticket?.priority === 'urgent' : email.ticket?.status === ticketFilter)
      return matchesFolder && matchesSearch && matchesTicket
    })
  }, [activity.emails, emails, folder, query, ticketFilter])

  const ticketCounts = useMemo(() => {
    const seen = new Set()
    const totals = { all: 0, open: 0, pending: 0, resolved: 0, urgent: 0 }
    emails.forEach((email) => {
      const ticket = email.ticket
      if (!ticket || seen.has(ticket.ticketId) || (email.state?.folder || 'inbox') === 'trash') return
      seen.add(ticket.ticketId)
      totals.all += 1
      if (totals[ticket.status] !== undefined) totals[ticket.status] += 1
      if (ticket.priority === 'urgent' && ticket.status !== 'resolved') totals.urgent += 1
    })
    return totals
  }, [emails])

  const selectedTicket = useMemo(() => emails.find((item) => item.id === selectedEmail?.id)?.ticket || null, [emails, selectedEmail?.id])
  const selectedSender = selectedEmail ? senderEmail(selectedEmail.from).toLowerCase() : ''
  useEffect(() => {
    if (!selectedSender) return undefined
    let cancelled = false
    findCustomerByEmail(selectedSender).then((customer) => { if (!cancelled) setCustomerInfo({ email: selectedSender, customer }) }).catch(() => { if (!cancelled) setCustomerInfo({ email: selectedSender, customer: null }) })
    return () => { cancelled = true }
  }, [selectedSender])
  const ticketThread = useMemo(() => (selectedTicket ? emails.filter((item) => item.ticket?.ticketId === selectedTicket.ticketId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) : []), [emails, selectedTicket])

  async function openEmail(id) {
    if (folder === 'sent') return
    setSelectedId(id)
    setDetailLoading(true)
    setError('')
    setReply(readDraft(id))
    setIncludeQuote(false)
    setCc('')
    setBcc('')
    setPreviewMode('html')
    setLoadImages(false)
    setFreshIds((current) => { if (!current.has(id)) return current; const next = new Set(current); next.delete(id); return next })
    try {
      const email = await getReceivedEmail(id)
      setSelectedEmail(email)
      const knownTicket = emails.find((item) => item.id === id)?.ticket
      setTicketDraft({ assignee: knownTicket?.assignee || '', note: knownTicket?.note || '' })
      setEmails((current) => current.map((item) => item.id === id ? { ...item, state: email.state } : item))
      setCounts((current) => ({ ...current, unread: Math.max(0, current.unread - (emails.find((item) => item.id === id)?.state?.isRead ? 0 : 1)) }))
    } catch (requestError) {
      setSelectedEmail(null)
      setError(requestError?.message || 'Could not load this email.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedId('')
    setSelectedEmail(null)
  }

  function announceNewEmails(nextEmails) {
    const newestId = nextEmails[0]?.id || ''
    const previousId = latestEmailIdRef.current
    if (!newestId) return
    if (previousId && newestId !== previousId) {
      const newItems = nextEmails.slice(0, Math.max(1, nextEmails.findIndex((email) => email.id === previousId)))
      // Only urgent and high-priority mail raises an alert, unless "alert on every email" is switched on.
      newItems.filter((email) => alertAllRef.current || ['urgent', 'high'].includes(email.ticket?.priority)).slice(0, 3).forEach((email) => {
        const urgent = email.ticket?.priority === 'urgent'
        const message = `${urgent ? 'Urgent email' : 'New email'} from ${senderLabel(email.from)}: ${email.subject || '(No subject)'}`
        notify?.(message)
        if (notificationPermissionRef.current === 'granted') {
          const browserNotification = new Notification(`${urgent ? 'Urgent: ' : 'Nexora Support: '}${senderLabel(email.from)}`, {
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
    try { window.localStorage.setItem(LAST_EMAIL_KEY, newestId) } catch { /* optional */ }
  }

  function trackFresh(nextEmails) {
    const ids = nextEmails.map((email) => email.id)
    if (knownIdsRef.current) {
      const added = ids.filter((id) => !knownIdsRef.current.has(id))
      if (added.length) setFreshIds((current) => new Set([...current, ...added]))
    }
    knownIdsRef.current = new Set(ids)
  }

  async function refreshAll({ reopen = true, silent = false } = {}) {
    if (syncRunningRef.current) { syncPendingRef.current = true; return }
    syncRunningRef.current = true
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const [inboxResult, activityResult] = await Promise.allSettled([listReceivedEmails(), listEmailActivity()])
      if (inboxResult.status === 'fulfilled') {
        announceNewEmails(inboxResult.value.emails)
        trackFresh(inboxResult.value.emails)
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
      if (syncPendingRef.current) {
        syncPendingRef.current = false
        refreshAll({ reopen: false, silent: true })
      }
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live: a tiny "did anything change?" call every few seconds; the full list is fetched only when it did.
  useEffect(() => {
    let stopped = false
    let timer = 0
    const loop = async () => {
      if (stopped) return
      const visible = document.visibilityState === 'visible'
      try {
        const { version } = await getInboxPulse()
        if (stopped) return
        setLiveStatus('live')
        setLiveAt(Date.now())
        const changed = Boolean(pulseVersionRef.current) && version !== pulseVersionRef.current
        pulseVersionRef.current = version
        if (changed) refreshRef.current?.({ reopen: false, silent: true })
      } catch {
        if (!stopped) setLiveStatus('retry')
      }
      if (!stopped) timer = window.setTimeout(loop, visible ? PULSE_MS : PULSE_HIDDEN_MS)
    }
    loop()
    const wake = () => { if (document.visibilityState === 'visible') { window.clearTimeout(timer); loop() } }
    document.addEventListener('visibilitychange', wake)
    return () => { stopped = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', wake) }
  }, [])

  // Slow full sync (mail that did not arrive through our own addresses) and a clock for "5m ago" labels.
  useEffect(() => {
    const sync = () => { if (document.visibilityState === 'visible') refreshRef.current?.({ reopen: false, silent: true }) }
    const full = window.setInterval(sync, FULL_SYNC_MS)
    const clock = window.setInterval(() => setTick((value) => value + 1), 15000)
    return () => { window.clearInterval(full); window.clearInterval(clock) }
  }, [])

  // Unread count in the browser tab title.
  useEffect(() => {
    const original = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = counts.unread ? `(${counts.unread}) ${original}` : original
    return () => { document.title = original }
  }, [counts.unread])

  // Keep the arrow-key selection in view.
  useEffect(() => {
    if (selectedId) document.querySelector(`[data-mail-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [selectedId])

  // Unsent reply text is kept per email, so switching emails never loses a draft.
  useEffect(() => {
    if (selectedEmail?.id) writeDraft(selectedEmail.id, reply)
  }, [reply, selectedEmail?.id])

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    notificationPermissionRef.current = permission
    setNotificationPermission(permission)
    notify?.(permission === 'granted' ? 'Live email notifications enabled' : 'Browser notifications were not enabled')
  }

  function toggleAlertAll() {
    const next = !alertAll
    setAlertAll(next)
    alertAllRef.current = next
    try { window.localStorage.setItem(ALERT_ALL_KEY, next ? '1' : '0') } catch { /* optional */ }
    notify?.(next ? 'Alerts on for every email' : 'Alerts only for urgent and high-priority email')
  }

  async function changeTicket(patch, message) {
    if (!selectedTicket?.ticketId) return
    setTicketBusy(true)
    try {
      const updated = await updateTicket(selectedTicket.ticketId, patch)
      setEmails((current) => current.map((item) => item.ticket?.ticketId === updated.ticketId ? { ...item, ticket: { ...item.ticket, ...updated } } : item))
      notify?.(message)
    } catch (requestError) {
      notify?.(requestError?.message || 'Ticket update failed.')
    } finally {
      setTicketBusy(false)
    }
  }

  async function changeState(patch, message, id = selectedEmail?.id) {
    if (!id) return
    setActionBusy(true)
    // Show the change at once; the server answer (or a refresh) corrects it if the call fails.
    setEmails((current) => current.map((item) => item.id === id ? { ...item, state: { ...item.state, ...patch } } : item))
    if (selectedEmail?.id === id) setSelectedEmail((current) => current ? { ...current, state: { ...current.state, ...patch } } : current)
    try {
      const state = await updateReceivedEmailState(id, patch)
      setEmails((current) => current.map((item) => item.id === id ? { ...item, state } : item))
      notify?.(message)
      await refreshAll({ reopen: false, silent: true })
      if (patch.folder && patch.folder !== folder && folder !== 'starred' && selectedEmail?.id === id) {
        const nextId = neighbourId(visibleEmails.filter((item) => item.id !== id), id, 0)
        if (nextId && window.matchMedia?.('(min-width: 1280px)').matches) openEmail(nextId)
        else closeDetail()
      }
    } catch (requestError) {
      notify?.(requestError?.message || 'Email action failed.')
      refreshAll({ reopen: false, silent: true })
    } finally {
      setActionBusy(false)
    }
  }

  async function moveToTrash(id = selectedEmail?.id) {
    if (!await confirmAction({ title: 'Move email to trash?', message: 'The email will leave the active inbox. You can restore it later from Trash.', confirmLabel: 'Move to Trash' })) return
    await changeState({ folder: 'trash' }, 'Email moved to trash', id)
  }

  async function bulkAct(action, message) {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (action === 'trash' && !await confirmAction({ title: `Move ${ids.length} emails to trash?`, message: 'They will leave the active inbox. You can restore them later from Trash.', confirmLabel: 'Move to Trash' })) return
    const patch = { read: { isRead: true }, unread: { isRead: false }, archive: { folder: 'archive' }, trash: { folder: 'trash' }, star: { isStarred: true }, unstar: { isStarred: false } }[action]
    setEmails((current) => current.map((item) => selectedIds.has(item.id) ? { ...item, state: { ...item.state, ...patch } } : item))
    setSelectedIds(new Set())
    if (selectedEmail && ids.includes(selectedEmail.id) && patch.folder) closeDetail()
    try {
      await bulkUpdateEmails(ids, action)
      notify?.(`${message} (${ids.length})`)
    } catch (requestError) {
      notify?.(requestError?.message || 'Bulk action failed.')
    }
    refreshAll({ reopen: false, silent: true })
  }

  async function downloadAttachment(attachment) {
    try {
      await downloadInboxAttachment(selectedEmail.id, attachment.id, attachment.filename || 'attachment')
    } catch (requestError) {
      notify?.(requestError?.message || 'Download failed.')
    }
  }

  function templateText(template) {
    return fillTemplate(template.text, { name: firstName(selectedEmail?.from), ticket: selectedTicket?.ticketId || '', agent: 'Nexora Support' })
  }

  function applyTemplate(template) {
    const text = templateText(template)
    setReply((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text))
    replyRef.current?.focus()
  }

  function addEmoji(emoji) {
    const box = replyRef.current
    const at = box?.selectionStart ?? reply.length
    const end = box?.selectionEnd ?? at
    setReply(`${reply.slice(0, at)}${emoji}${reply.slice(end)}`)
    box?.focus()
  }

  // One click: send the "resolved" email (branded, with the ticket reference) and close the ticket.
  async function resolveAndNotify() {
    if (!selectedEmail?.id || !selectedTicket?.ticketId) return
    if (!await confirmAction({ title: 'Resolve this ticket?', message: 'A "resolved" email is sent to the customer and the ticket is marked resolved. If they reply, it reopens by itself.', confirmLabel: 'Resolve and send' })) return
    setTicketBusy(true)
    try {
      const result = await replyToReceivedEmail(selectedEmail.id, { text: templateText(RESOLVED_TEMPLATE), cc: '', bcc: '' })
      const updated = await updateTicket(selectedTicket.ticketId, { status: 'resolved' })
      setEmails((current) => current.map((item) => item.ticket?.ticketId === updated.ticketId ? { ...item, ticket: { ...item.ticket, ...updated } } : item))
      notify?.(`Ticket resolved and email sent to ${result.recipient}`)
      refreshAll({ reopen: false, silent: true })
      openEmail(selectedEmail.id)
    } catch (requestError) {
      notify?.(`Could not resolve: ${requestError?.message || 'request failed'}`)
    } finally {
      setTicketBusy(false)
    }
  }

  function sendReply(...args) { return runOnce(flightKey('EmailInbox.sendReply', args), () => sendReplyOnce(...args), args[0]) }
  async function sendReplyOnce(event) {
    event?.preventDefault?.()
    if (!selectedEmail?.id || !reply.trim()) return
    setSending(true)
    try {
      const quote = includeQuote ? quoteOriginal({ from: senderLabel(selectedEmail.from), date: formatDate(selectedEmail.created_at), body: readableBody(selectedEmail) }) : ''
      const text = quote ? `${reply.trim()}\n\n${quote}` : reply.trim()
      const result = await replyToReceivedEmail(selectedEmail.id, { text, cc, bcc })
      setReply('')
      writeDraft(selectedEmail.id, '')
      setCc('')
      setBcc('')
      setIncludeQuote(false)
      notify?.(`Reply sent to ${result.recipient}`)
      await refreshAll({ reopen: false, silent: true })
      await openEmail(selectedEmail.id)
    } catch (requestError) {
      notify?.(`Reply failed: ${requestError?.message || 'Email could not be sent.'}`)
    } finally {
      setSending(false)
    }
  }

  // Keyboard shortcuts (see SHORTCUT_HELP). The handler is re-assigned every render so it never sees stale state.
  const handleShortcut = (event) => {
    const action = shortcutFor(event)
    if (!action) return
    if (showCompose) return
    if (action === 'escape') {
      if (/^(input|textarea|select)$/i.test(event.target?.tagName || '')) { event.target.blur(); return }
      if (showHelp) setShowHelp(false)
      else if (selectedId) closeDetail()
      return
    }
    if (action === 'send') {
      if (reply.trim() && selectedEmail) { event.preventDefault(); sendReply(event) }
      return
    }
    event.preventDefault()
    const current = selectedEmail?.id
    switch (action) {
      case 'next': case 'previous': {
        const id = neighbourId(visibleEmails, selectedId, action === 'next' ? 1 : -1)
        if (id && id !== selectedId) openEmail(id)
        break
      }
      case 'archive': if (current) changeState({ folder: 'archive' }, 'Email archived'); break
      case 'trash': if (current) moveToTrash(); break
      case 'star': if (current) changeState({ isStarred: !selectedEmail.state?.isStarred }, selectedEmail.state?.isStarred ? 'Star removed' : 'Email starred'); break
      case 'unread': if (current) changeState({ isRead: false }, 'Marked unread'); break
      case 'reply': replyRef.current?.focus(); break
      case 'select': if (selectedId) setSelectedIds((set) => toggleId(set, selectedId)); break
      case 'compose': setShowCompose(true); break
      case 'search': searchRef.current?.focus(); break
      case 'help': setShowHelp((value) => !value); break
      default: break
    }
  }
  // Always point the refs at the newest functions (they close over the latest state).
  useEffect(() => {
    refreshRef.current = refreshAll
    shortcutRef.current = handleShortcut
  })
  useEffect(() => {
    const onKey = (event) => shortcutRef.current?.(event)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const folders = [
    ['inbox', 'Inbox', HiOutlineInbox, counts.inbox],
    ['unread', 'Unread', HiOutlineEnvelope, counts.unread],
    ['starred', 'Starred', HiOutlineStar, counts.starred],
    ['archive', 'Archive', HiOutlineArchiveBox, counts.archive],
    ['trash', 'Trash', HiOutlineTrash, counts.trash],
    ['sent', 'Sent Activity', HiOutlineChartBar, activity.summary.total],
  ]
  const sentView = folder === 'sent'
  const allVisibleSelected = visibleEmails.length > 0 && visibleEmails.every((email) => selectedIds.has(email.id))
  const detailOpen = Boolean(selectedId) && !sentView
  const bulkButton = 'inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50'

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

      <EmailSendingLimits />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black text-slate-900">Email Operations</h2><LiveBadge status={liveStatus} ago={secondsAgo(liveAt)} /></div>
          <p className="flex items-center text-xs text-slate-500"><span>support@nexorasolution.us</span><CopyEmailButton email="support@nexorasolution.us" />{lastSyncedAt ? <span className="ml-1">· synced {lastSyncedAt.toLocaleTimeString()}</span> : ''}</p>
          <p className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">Also arrives here: hello@, info@, sales@, billing@, ai@ and any other address on nexorasolution.us and .online. Every mail becomes a ticket; a customer's answer to a ticket reference joins the same ticket.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowCompose(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800"><HiOutlinePencilSquare className="h-4 w-4" /> New email</button>
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' ? <button type="button" onClick={enableNotifications} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50"><HiOutlineBell className="h-4 w-4" /> Enable alerts</button> : null}
          <button type="button" onClick={toggleAlertAll} title="Choose which new mail raises an alert in this browser" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">{alertAll ? 'Alerts: every email' : 'Alerts: urgent only'}</button>
          <button type="button" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={() => setShowHelp(true)} className="hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 sm:grid"><HiOutlineCommandLine className="h-4 w-4" /></button>
          <button title="Sync now" aria-label="Sync now" type="button" onClick={() => refreshAll()} disabled={loading} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <HiOutlineArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid min-h-[38rem] xl:grid-cols-[180px_340px_minmax(0,1fr)]">
        <nav aria-label="Mail folders" className={`border-b border-slate-200 p-3 xl:block xl:border-b-0 xl:border-r ${detailOpen ? 'hidden' : ''}`}>
          <div className="flex gap-1 overflow-x-auto xl:block xl:space-y-1">
            {folders.map(([key, label, Icon, count]) => (
              <button key={key} type="button" onClick={() => { setFolder(key); closeDetail(); setSelectedIds(new Set()) }} aria-current={folder === key ? 'page' : undefined} className={`flex h-10 min-w-max items-center gap-2 rounded-lg px-3 text-sm font-bold xl:w-full ${folder === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span><span className={folder === key ? 'text-white/70' : 'text-slate-400'}>{count || 0}</span>
              </button>
            ))}
          </div>
        </nav>

        <aside aria-label="Message list" className={`border-b border-slate-200 xl:block xl:border-b-0 xl:border-r ${detailOpen ? 'hidden' : ''}`}>
          <label className="relative block border-b border-slate-100 p-3">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${folder}...  ( / )`} aria-label={`Search ${folder}`} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
          </label>
          {!sentView ? (selectedIds.size ? (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-blue-100 bg-blue-50/70 px-3 py-2" role="toolbar" aria-label="Bulk actions">
              <span className="mr-1 text-xs font-black text-blue-800">{selectedIds.size} selected</span>
              <button type="button" onClick={() => bulkAct('read', 'Marked read')} className={bulkButton}>Read</button>
              <button type="button" onClick={() => bulkAct('unread', 'Marked unread')} className={bulkButton}>Unread</button>
              <button type="button" onClick={() => bulkAct('star', 'Starred')} className={bulkButton}><HiOutlineStar className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => bulkAct('archive', 'Archived')} className={bulkButton}><HiOutlineArchiveBox className="h-3.5 w-3.5" /> Archive</button>
              <button type="button" onClick={() => bulkAct('trash', 'Moved to trash')} className={`${bulkButton} !border-rose-200 !text-rose-600`}><HiOutlineTrash className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection" className="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-white"><HiOutlineXMark className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2">
              <input type="checkbox" aria-label="Select all shown" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleEmails.map((email) => email.id)))} className="mr-1 h-4 w-4 rounded border-slate-300" />
              {TICKET_FILTERS.map(([key, label]) => <button key={key} type="button" onClick={() => setTicketFilter(key)} aria-pressed={ticketFilter === key} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ticketFilter === key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label} {ticketCounts[key] || 0}</button>)}
            </div>
          )) : null}
          <div className="max-h-[34rem] overflow-y-auto">
            {loading && !emails.length ? <ListSkeleton /> : visibleEmails.length ? visibleEmails.map((email) => {
              const unread = !sentView && !email.state?.isRead
              const fresh = freshIds.has(email.id)
              const checked = selectedIds.has(email.id)
              const who = sentView ? (email.to || []).join(', ') : senderLabel(email.from)
              return (
                <div key={email.id} data-mail-id={email.id} role="button" tabIndex={sentView ? -1 : 0} aria-current={selectedId === email.id ? 'true' : undefined} onClick={() => !sentView && openEmail(email.id)} onKeyDown={(event) => { if (!sentView && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); openEmail(email.id) } }} className={`flex w-full gap-3 border-b border-slate-100 border-l-4 px-3 py-3 text-left outline-none transition focus-visible:bg-blue-50 ${unread ? 'border-l-blue-500' : 'border-l-transparent'} ${selectedId === email.id ? 'bg-blue-50' : checked ? 'bg-blue-50/50' : fresh ? 'bg-emerald-50/60' : 'hover:bg-slate-50'} ${sentView ? 'cursor-default' : 'cursor-pointer'}`}>
                  {sentView ? null : <input type="checkbox" aria-label={`Select email from ${who}`} checked={checked} onClick={(event) => event.stopPropagation()} onChange={() => setSelectedIds((set) => toggleId(set, email.id))} className="mt-2.5 h-4 w-4 shrink-0 rounded border-slate-300" />}
                  <Avatar name={who} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2"><span className={`truncate text-sm text-slate-900 ${unread ? 'font-black' : 'font-semibold'}`}>{who}</span><span className="shrink-0 text-[11px] text-slate-400" title={formatDate(email.created_at)}>{relativeTime(email.created_at)}</span></span>
                    <span className={`mt-0.5 block truncate text-[13px] ${unread ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>{email.subject || '(No subject)'}</span>
                    {email.snippet ? <span className="mt-0.5 block truncate text-xs text-slate-400">{email.snippet}</span> : null}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      {fresh ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">✨ New</span> : null}
                      {sentView ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${eventTone(email.last_event)}`}>{email.last_event || 'sent'}</span> : null}
                      {email.ticket ? <>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_META[email.ticket.status]?.chip || ''}`}>{STATUS_META[email.ticket.status]?.emoji} {STATUS_META[email.ticket.status]?.label || email.ticket.status}</span>
                        {PRIORITY_META[email.ticket.priority]?.chip ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_META[email.ticket.priority].chip}`}>{PRIORITY_META[email.ticket.priority].emoji} {PRIORITY_META[email.ticket.priority].label}</span> : null}
                        {slaState(email.ticket)?.overdue ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700" title={slaState(email.ticket).label}>⚠️ Overdue</span> : null}
                        <span className="text-[10px] font-semibold text-slate-400">{email.ticket.ticketId}{email.ticket.count > 1 ? ` · ${email.ticket.count} messages` : ''}</span>
                      </> : null}
                      {email.autoReply ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700" title={`Automatic reply sent (${email.autoReply.ticket})`}>🤖 Auto-replied</span> : null}
                      {email.attachments?.length ? <HiOutlinePaperClip className="h-3.5 w-3.5 text-slate-400" aria-label="Has attachments" /> : null}
                      {email.state?.isStarred ? <HiStar className="h-3.5 w-3.5 text-amber-500" aria-label="Starred" /> : null}
                    </span>
                  </span>
                </div>
              )
            }) : <div className="px-5 py-12 text-center"><HiOutlineEnvelope className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">{query || ticketFilter !== 'all' ? 'Nothing matches your search or filter' : folder === 'inbox' ? 'You are all caught up' : `No emails in ${folder}`}</p>{query || ticketFilter !== 'all' ? <button type="button" onClick={() => { setQuery(''); setTicketFilter('all') }} className="mt-2 text-xs font-bold text-blue-700">Clear search and filters</button> : null}</div>}
          </div>
        </aside>

        <div className={`min-w-0 p-4 sm:p-5 xl:block ${detailOpen ? '' : 'hidden'}`}>
          {sentView ? (
            <div className="grid min-h-[30rem] place-items-center text-center"><div><HiOutlineChartBar className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Sent delivery activity</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Delivery, opens and clicks update from Resend. Enable the custom tracking domain to activate open and click events.</p></div></div>
          ) : detailLoading ? (
            <div className="grid min-h-[30rem] place-items-center text-sm text-slate-400" role="status">Loading message...</div>
          ) : selectedEmail ? (
            <div className="space-y-5">
              <header className="border-b border-slate-100 pb-4">
                <button type="button" onClick={closeDetail} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 xl:hidden"><HiOutlineArrowLeft className="h-4 w-4" /> Back to list</button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3"><Avatar name={senderLabel(selectedEmail.from)} size="h-11 w-11 text-sm" /><div className="min-w-0"><h3 className="break-words text-xl font-black text-slate-950">{selectedEmail.subject || '(No subject)'}</h3><p className="mt-1 break-all text-xs text-slate-500"><span className="font-bold text-slate-700">From:</span> {senderLabel(selectedEmail.from)} &lt;{senderEmail(selectedEmail.from)}&gt;</p><p className="break-all text-xs text-slate-400"><span className="font-bold text-slate-500">To:</span> {(selectedEmail.to || []).join(', ') || selectedEmail.received_at_address || 'support@nexorasolution.us'}</p></div></div>
                  <div className="flex items-center gap-1">
                    <button title={selectedEmail.state?.isStarred ? 'Remove star (s)' : 'Star (s)'} aria-label={selectedEmail.state?.isStarred ? 'Remove star' : 'Star'} type="button" disabled={actionBusy} onClick={() => changeState({ isStarred: !selectedEmail.state?.isStarred }, selectedEmail.state?.isStarred ? 'Star removed' : 'Email starred')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineStar className={`h-4 w-4 ${selectedEmail.state?.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} /></button>
                    {selectedEmail.state?.folder === 'trash' ? <button title="Restore" aria-label="Restore" type="button" disabled={actionBusy} onClick={() => changeState({ folder: 'inbox' }, 'Email restored')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineArrowUturnLeft className="h-4 w-4" /></button> : <>
                      <button title="Archive (e)" aria-label="Archive" type="button" disabled={actionBusy} onClick={() => changeState({ folder: 'archive' }, 'Email archived')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><HiOutlineArchiveBox className="h-4 w-4" /></button>
                      <button title="Move to trash (#)" aria-label="Move to trash" type="button" disabled={actionBusy} onClick={() => moveToTrash()} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
                    </>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><time className="text-xs text-slate-400" dateTime={selectedEmail.created_at}>{formatDate(selectedEmail.created_at)} · {relativeTime(selectedEmail.created_at)}</time><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => navigator.clipboard.writeText(senderEmail(selectedEmail.from)).then(() => notify?.('Sender email copied'))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-700"><HiOutlineClipboardDocument className="h-4 w-4" /> Copy sender</button>{selectedEmail.raw?.download_url ? <a href={selectedEmail.raw.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-700"><HiOutlineDocumentText className="h-4 w-4" /> Original</a> : null}<button type="button" onClick={() => changeState({ isRead: false }, 'Marked unread')} className="text-xs font-bold text-blue-700 hover:underline">Mark unread</button></div></div>
              </header>

              <CustomerCard customer={customerInfo.email === selectedSender ? customerInfo.customer : null} loading={customerInfo.email !== selectedSender} email={selectedSender} />
                <TicketPanel ticket={selectedTicket} sla={slaState(selectedTicket)} onResolveNotify={resolveAndNotify} draft={ticketDraft} setDraft={setTicketDraft} busy={ticketBusy} onChange={changeTicket} thread={ticketThread} currentId={selectedEmail.id} onOpen={openEmail} senderLabel={senderLabel} />

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

              {selectedEmail.attachments?.length ? <div><p className="text-xs font-black uppercase text-slate-500">Attachments ({selectedEmail.attachments.length})</p><div className="mt-2 flex flex-wrap gap-2">{selectedEmail.attachments.map((attachment) => {
                const label = <><HiOutlinePaperClip className="h-4 w-4" /> {attachment.filename || 'Attachment'}{attachment.size ? <span className="font-semibold text-slate-400">{formatBytes(attachment.size)}</span> : null}{attachment.download_url || attachment.stored ? <HiOutlineArrowDownTray className="h-4 w-4 text-blue-600" /> : null}</>
                const base = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700'
                if (attachment.download_url) return <a key={attachment.id} href={attachment.download_url} target="_blank" rel="noreferrer" className={`${base} hover:bg-slate-50`}>{label}</a>
                if (attachment.stored) return <button key={attachment.id} type="button" onClick={() => downloadAttachment(attachment)} className={`${base} hover:bg-slate-50`}>{label}</button>
                return <span key={attachment.id} title="Too large to keep here. The file is in the Gmail copy of this email." className={`${base} opacity-60`}>{label}</span>
              })}</div></div> : null}

              {selectedEmail.replies?.length ? <div className="border-t border-slate-100 pt-4"><p className="text-xs font-black uppercase text-slate-500">Reply history</p><div className="mt-2 space-y-2">{selectedEmail.replies.map((item) => <div key={item.id} className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><div className="flex justify-between gap-3 text-[11px] text-slate-500"><span className="font-bold text-blue-700">Sent to {item.recipient}</span><span>{formatDate(item.sent_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body_text}</p></div>)}</div></div> : null}

              {selectedEmail.state?.folder !== 'trash' ? <form onSubmit={sendReply} className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between"><label className="text-xs font-black uppercase text-slate-500" htmlFor="support-reply">Reply</label><button type="button" onClick={() => setShowCopies((value) => !value)} className="text-xs font-bold text-blue-700">CC / BCC</button></div>
                <div className="mt-2 flex flex-wrap gap-1.5">{REPLY_TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => applyTemplate(template)} title={`Insert "${template.label}"`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{template.emoji} {template.label}</button>)}</div>
                {showCopies ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="CC addresses" aria-label="CC addresses" className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400" /><input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="BCC addresses" aria-label="BCC addresses" className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400" /></div> : null}
                <textarea ref={replyRef} id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${senderEmail(selectedEmail.from)}...`} className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" />
                <div className="mt-1.5 flex flex-wrap items-center gap-0.5" aria-label="Insert emoji">{QUICK_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => addEmoji(emoji)} aria-label={`Insert ${emoji}`} className="grid h-8 w-8 place-items-center rounded-lg text-base hover:bg-slate-100">{emoji}</button>)}</div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={includeQuote} onChange={(event) => setIncludeQuote(event.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Include original message</label><div className="flex items-center gap-3"><button type="button" onClick={() => setShowPreview(true)} disabled={!reply.trim()} className="text-xs font-bold text-blue-700 disabled:opacity-40">Preview email</button><span className="hidden text-[11px] text-slate-400 lg:inline">{reply.trim() ? 'Draft saved · Ctrl/Cmd + Enter' : 'Ctrl/Cmd + Enter to send'}</span><button type="submit" disabled={sending || !reply.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><HiOutlinePaperAirplane className="h-4 w-4" />{sending ? 'Sending...' : 'Send Reply'}</button></div></div>
              </form> : null}
            </div>
          ) : <div className="grid min-h-[30rem] place-items-center text-center"><div><HiOutlineEnvelope className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Select an email</p><p className="mt-1 text-xs text-slate-400">Use j / k to move, r to reply, ? for all shortcuts</p></div></div>}
        </div>
      </div>

      {showCompose ? <ComposeModal onClose={() => setShowCompose(false)} notify={notify} /> : null}
      {showHelp ? <ShortcutsHelp onClose={() => setShowHelp(false)} /> : null}
      {showPreview && selectedEmail ? <EmailPreview text={includeQuote ? `${reply.trim()}\n\n${quoteOriginal({ from: senderLabel(selectedEmail.from), date: formatDate(selectedEmail.created_at), body: readableBody(selectedEmail) })}` : reply} ticketId={selectedTicket?.ticketId} subject={selectedEmail.subject} status="pending" onClose={() => setShowPreview(false)} /> : null}
    </section>
  )
}
