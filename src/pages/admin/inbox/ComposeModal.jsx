import { useEffect, useRef, useState } from 'react'
import { HiOutlinePaperAirplane, HiOutlineXMark } from 'react-icons/hi2'
import { composeEmail } from '../../../lib/emailInbox.js'

const EMPTY = { to: '', cc: '', bcc: '', subject: '', text: '' }

/** Write a brand-new email from support@nexorasolution.us. */
export default function ComposeModal({ onClose, notify, initial = EMPTY }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [showCopies, setShowCopies] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const toRef = useRef(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const ready = form.to.trim() && form.subject.trim() && form.text.trim()

  useEffect(() => { toRef.current?.focus() }, [])

  async function send(event) {
    event?.preventDefault()
    if (!ready || sending) return
    setSending(true)
    setError('')
    try {
      const result = await composeEmail(form)
      notify?.(`Email sent to ${(result.to || []).join(', ')}`)
      onClose()
    } catch (requestError) {
      setError(requestError?.message || 'Email could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const field = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400'
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/40 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="New email" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) send(event) }}>
      <form onSubmit={send} className="w-full max-w-xl rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">New email <span className="font-semibold text-slate-400">from support@nexorasolution.us</span></h3><button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><HiOutlineXMark className="h-4 w-4" /></button></div>
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2"><input ref={toRef} value={form.to} onChange={set('to')} placeholder="To (comma separated)" aria-label="To" className={field} /><button type="button" onClick={() => setShowCopies((v) => !v)} className="shrink-0 text-xs font-bold text-blue-700">CC / BCC</button></div>
          {showCopies ? <div className="grid gap-2 sm:grid-cols-2"><input value={form.cc} onChange={set('cc')} placeholder="CC" aria-label="CC" className={field} /><input value={form.bcc} onChange={set('bcc')} placeholder="BCC" aria-label="BCC" className={field} /></div> : null}
          <input value={form.subject} onChange={set('subject')} placeholder="Subject" aria-label="Subject" maxLength={200} className={field} />
          <textarea value={form.text} onChange={set('text')} placeholder="Write your message..." aria-label="Message" className="min-h-[180px] w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" />
          {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[11px] text-slate-400">Ctrl/Cmd + Enter to send. Replies come back to this Inbox.</span><button type="submit" disabled={!ready || sending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><HiOutlinePaperAirplane className="h-4 w-4" />{sending ? 'Sending...' : 'Send'}</button></div>
      </form>
    </div>
  )
}
