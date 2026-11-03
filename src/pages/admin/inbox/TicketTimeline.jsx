import { useEffect, useState } from 'react'
import { getTicketTimeline } from '../../../lib/emailInbox.js'
import { relativeTime } from '../../../lib/inboxUtils.js'

const EVENT = {
  created: { icon: '🆕', text: () => 'Ticket opened' },
  reopened: { icon: '🔁', text: () => 'Customer wrote again — ticket reopened', tone: 'text-amber-700' },
  customer_replied: { icon: '💬', text: () => 'Customer replied' },
  status: { icon: '🏷️', text: (d) => `Status: ${String(d).replace('->', '→')}` },
  priority: { icon: '🚩', text: (d) => `Priority: ${String(d).replace('->', '→')}` },
  assigned: { icon: '👤', text: (d) => `Assigned to ${d}` },
}
const when = (at) => new Date(at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const name = (v = '') => String(v).replace(/<.*>/, '').replace(/"/g, '').trim() || String(v).replace(/[<>]/g, '')

function describe(item) {
  if (item.type === 'inbound') return { icon: '📥', title: `${name(item.from)} wrote`, body: item.subject, tone: 'text-slate-900' }
  if (item.type === 'sent') return { icon: '📤', title: `Nexora replied${item.from ? ` (${item.from})` : ''}`, body: item.snippet, tone: 'text-blue-800' }
  if (item.type === 'auto') return { icon: '🤖', title: 'Automatic acknowledgement sent', body: '', tone: 'text-slate-500' }
  const meta = EVENT[item.kind] || { icon: '•', text: () => item.kind }
  return { icon: meta.icon, title: meta.text(item.detail), body: '', tone: item.kind === 'status' && /resolved/.test(item.detail) ? 'text-emerald-700' : (meta.tone || 'text-slate-600') }
}

/** The whole story of one ticket in order. `refreshKey` changes whenever the ticket or its mails change. */
export default function TicketTimeline({ ticketId, refreshKey, onOpen }) {
  const [state, setState] = useState({ key: '', items: [], error: '' })
  const key = `${ticketId}:${refreshKey}`

  useEffect(() => {
    let cancelled = false
    getTicketTimeline(ticketId)
      .then((items) => { if (!cancelled) setState({ key, items, error: '' }) })
      .catch((error) => { if (!cancelled) setState({ key, items: [], error: error?.message || 'Could not load the timeline.' }) })
    return () => { cancelled = true }
  }, [ticketId, key])

  if (state.key !== key && !state.items.length) return <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-400">Loading conversation timeline…</div>
  if (state.error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">❌ Timeline unavailable — {state.error}</div>
  const items = state.items
  if (!items.length) return null
  const resolved = [...items].reverse().find((i) => i.type === 'event' && i.kind === 'status' && /-> resolved/.test(i.detail))
  const reopens = items.filter((i) => i.type === 'event' && i.kind === 'reopened').length
  const mails = items.filter((i) => i.type === 'inbound').length
  const replies = items.filter((i) => i.type === 'sent').length
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black text-slate-700">🕘 Conversation timeline</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{mails} from customer · {replies} from Nexora{resolved ? ` · last resolved ${when(resolved.at)}` : ''}{reopens ? ` · reopened ${reopens}×` : ''}</p>
      <ol className="mt-3 space-y-0">
        {items.map((item, index) => {
          const last = index === items.length - 1
          const { icon, title, body, tone } = describe(item)
          const open = item.type === 'inbound' && onOpen ? () => onOpen(item.id) : null
          return (
            <li key={`${item.id}-${index}`} className="relative flex gap-3 pb-3">
              {!last ? <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" aria-hidden="true" /> : null}
              <span className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${tone}`}>{title} <span className="font-normal text-slate-400" title={when(item.at)}>· {relativeTime(item.at)}</span></p>
                {body ? (open ? <button type="button" onClick={open} className="mt-0.5 block max-w-full truncate text-left text-xs text-slate-500 hover:text-blue-700 hover:underline">{body}</button> : <p className="mt-0.5 line-clamp-2 break-words text-xs text-slate-500">{body}</p>) : null}
                {item.attachments ? <p className="text-[10px] text-slate-400">📎 {item.attachments} attachment{item.attachments > 1 ? 's' : ''}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
