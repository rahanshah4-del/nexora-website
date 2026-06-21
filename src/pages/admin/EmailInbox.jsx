import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowPath,
  HiOutlineEnvelope,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
} from 'react-icons/hi2'
import { getReceivedEmail, listReceivedEmails, replyToReceivedEmail } from '../../lib/emailInbox.js'

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

export default function EmailInbox({ notify }) {
  const [emails, setEmails] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')

  const filteredEmails = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return emails
    return emails.filter((email) => `${email.from} ${email.subject} ${(email.to || []).join(' ')}`.toLowerCase().includes(needle))
  }, [emails, query])

  async function openEmail(id) {
    setSelectedId(id)
    setDetailLoading(true)
    setError('')
    setReply('')
    try {
      setSelectedEmail(await getReceivedEmail(id))
    } catch (requestError) {
      setSelectedEmail(null)
      setError(requestError?.message || 'Could not load this email.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshInbox() {
    setLoading(true)
    setError('')
    try {
      const result = await listReceivedEmails()
      setEmails(result.emails)
      const nextId = selectedId && result.emails.some((email) => email.id === selectedId)
        ? selectedId
        : result.emails[0]?.id || ''
      if (nextId) await openEmail(nextId)
      else {
        setSelectedId('')
        setSelectedEmail(null)
      }
    } catch (requestError) {
      setEmails([])
      setError(requestError?.message || 'Could not load the support inbox.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshInbox()
  }, [])

  async function sendReply(event) {
    event.preventDefault()
    if (!selectedEmail?.id || !reply.trim()) return
    setSending(true)
    try {
      const result = await replyToReceivedEmail(selectedEmail.id, reply.trim())
      setReply('')
      notify?.(`Reply sent to ${result.recipient}`)
    } catch (requestError) {
      notify?.(`Reply failed: ${requestError?.message || 'Email could not be sent.'}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Support Inbox</h2>
          <p className="text-xs text-slate-500">support@nexorasolution.online</p>
        </div>
        <button
          type="button"
          onClick={refreshInbox}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <HiOutlineArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid min-h-[34rem] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <label className="relative block border-b border-slate-100 p-3">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search inbox..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <div className="max-h-[29rem] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Loading inbox...</p>
            ) : filteredEmails.length ? (
              filteredEmails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => openEmail(email.id)}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition ${selectedId === email.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{senderLabel(email.from)}</span>
                      <span className="mt-0.5 block truncate text-[13px] font-semibold text-slate-700">{email.subject || '(No subject)'}</span>
                    </span>
                    {email.attachments?.length ? <HiOutlinePaperClip className="mt-1 h-4 w-4 shrink-0 text-slate-400" /> : null}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">{formatDate(email.created_at)}</span>
                </button>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <HiOutlineEnvelope className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">No emails received</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Incoming client emails will appear here after Resend Receiving is enabled.</p>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          {detailLoading ? (
            <div className="grid min-h-[28rem] place-items-center text-sm text-slate-400">Loading message...</div>
          ) : selectedEmail ? (
            <div className="space-y-5">
              <header className="border-b border-slate-100 pb-4">
                <h3 className="break-words text-xl font-black text-slate-950">{selectedEmail.subject || '(No subject)'}</h3>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p><span className="font-bold text-slate-700">From:</span> {senderLabel(selectedEmail.from)} &lt;{senderEmail(selectedEmail.from)}&gt;</p>
                  <time>{formatDate(selectedEmail.created_at)}</time>
                </div>
              </header>

              <div className="max-h-[18rem] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {readableBody(selectedEmail)}
              </div>

              {selectedEmail.attachments?.length ? (
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Attachments</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.download_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 ${attachment.download_url ? 'hover:bg-slate-50' : 'pointer-events-none opacity-50'}`}
                      >
                        <HiOutlinePaperClip className="h-4 w-4" /> {attachment.filename || 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <form onSubmit={sendReply} className="border-t border-slate-100 pt-4">
                <label className="text-xs font-black uppercase text-slate-500" htmlFor="support-reply">Reply</label>
                <textarea
                  id="support-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={`Reply to ${senderEmail(selectedEmail.from)}...`}
                  className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <HiOutlinePaperAirplane className="h-4 w-4" />
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid min-h-[28rem] place-items-center text-center">
              <div>
                <HiOutlineEnvelope className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">Select an email</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
