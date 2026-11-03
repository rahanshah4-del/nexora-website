import { useEffect, useRef, useState } from 'react'
import { HiOutlinePaperAirplane, HiOutlineXMark } from 'react-icons/hi2'
import { composeEmail } from '../../../lib/emailInbox.js'
import { fillTemplate } from '../../../../workers/shared/emailTemplate.js'
import EmailPreview from './EmailPreview.jsx'
import { QUICK_EMOJIS, REPLY_TEMPLATES } from './replyTemplates.js'

const EMPTY = { to: '', cc: '', bcc: '', subject: '', text: '' }

/** Write a brand-new email from support@nexorasolution.us. */
export default function ComposeModal({ onClose, notify, initial = EMPTY }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [showCopies, setShowCopies] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const toRef = useRef(null)
  const textRef = useRef(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const ready = form.to.trim() && form.subject.trim() && form.text.trim()

  useEffect(() => { toRef.current?.focus() }, [])

  function addText(value) {
    const box = textRef.current
    setForm((current) => {
      const at = box?.selectionStart ?? current.text.length
      const end = box?.selectionEnd ?? at
      return { ...current, text: `${current.text.slice(0, at)}${value}${current.text.slice(end)}` }
    })
    box?.focus()
  }

  function insertTemplate(template) {
    const text = fillTemplate(template.text, { name: '', ticket: '' }).replace(/^Hi ,/, 'Hi,').replace(/\s*\(\)/g, '')
    setForm((current) => ({ ...current, text: current.text.trim() ? `${current.text.trim()}\n\n${text}` : text }))
    textRef.current?.focus()
  }

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
          <div className="flex flex-wrap gap-1.5">{REPLY_TEMPLATES.filter((t) => ['demo', 'trial', 'details', 'call', 'follow'].includes(t.id)).map((t) => <button key={t.id} type="button" onClick={() => insertTemplate(t)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{t.emoji} {t.label}</button>)}</div>
          <textarea ref={textRef} value={form.text} onChange={set('text')} placeholder="Write your message..." aria-label="Message" className="min-h-[180px] w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" />
          <div className="flex flex-wrap items-center gap-1" aria-label="Insert emoji">{QUICK_EMOJIS.map((e) => <button key={e} type="button" onClick={() => addText(e)} className="grid h-8 w-8 place-items-center rounded-lg text-base hover:bg-slate-100" aria-label={`Insert ${e}`}>{e}</button>)}</div>
          {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="flex items-center gap-3"><button type="button" onClick={() => setPreview(true)} disabled={!form.text.trim()} className="text-xs font-bold text-blue-700 disabled:opacity-40">Preview email</button><span className="hidden text-[11px] text-slate-400 sm:inline">Ctrl/Cmd + Enter to send</span></span><button type="submit" disabled={!ready || sending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><HiOutlinePaperAirplane className="h-4 w-4" />{sending ? 'Sending...' : 'Send'}</button></div>
      </form>
      {preview ? <EmailPreview text={form.text} subject={form.subject} onClose={() => setPreview(false)} /> : null}
    </div>
  )
}
