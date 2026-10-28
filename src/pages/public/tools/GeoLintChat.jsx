import { useEffect, useRef, useState } from 'react'

const MAX_CHARS = 2000

function timeOf(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * The order chat, drawn the same for the client and for the team.
 * `mine` is who is looking ('client' or 'staff'): their messages sit on the right.
 * `canWrite` false keeps the history readable and replaces the box with `closedText`.
 */
export default function GeoLintChat({ messages = [], mine = 'client', canWrite = true, closedText = '', theirName = 'Nexora team', myName = 'You', onSend, emptyText = 'No messages yet.', hint = '' }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const lastId = messages.at(-1)?.id || ''

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId])

  async function submit(event) {
    event?.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    setError('')
    try {
      await onSend(value)
      setText('')
    } catch (err) {
      setError(err?.message || 'Your message was not sent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <div ref={listRef} className="max-h-[420px] min-h-[220px] space-y-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p> : null}
        {messages.map((m) => {
          const own = m.from === mine
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-6 ${own ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-900'}`}>
                <p className={`text-[11px] font-semibold ${own ? 'text-blue-100' : 'text-slate-500'}`}>{own ? myName : theirName} · {timeOf(m.at)}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          )
        })}
      </div>
      {canWrite ? (
        <form onSubmit={submit} className="border-t border-slate-200 p-3">
          {hint ? <p className="mb-2 text-xs text-slate-500">{hint}</p> : null}
          {error ? <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
              rows={2}
              placeholder="Write a message…"
              aria-label="Message"
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-[14px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button type="submit" disabled={busy || !text.trim()} className="min-h-[48px] rounded-xl bg-blue-600 px-5 text-[14px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send'}</button>
          </div>
        </form>
      ) : (
        <p className="border-t border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-600">{closedText}</p>
      )}
    </div>
  )
}
