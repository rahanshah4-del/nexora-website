import { relativeTime } from '../../../lib/inboxUtils.js'
import { PRIORITY_META, STATUS_META } from './inboxMeta.js'

/** Status, priority, owner and private note for the open ticket, plus the other messages on it. */
export default function TicketPanel({ ticket, draft, setDraft, busy, onChange, thread, currentId, onOpen, senderLabel }) {
  if (!ticket) return null
  const unchanged = draft.assignee === (ticket.assignee || '') && draft.note === (ticket.note || '')
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-700">Ticket {ticket.ticketId}</p>
        <div className="flex flex-wrap gap-1">{Object.entries(STATUS_META).map(([key, meta]) => <button key={key} type="button" disabled={busy} aria-pressed={ticket.status === key} onClick={() => ticket.status !== key && onChange({ status: key }, `Ticket marked ${meta.label.toLowerCase()}`)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${ticket.status === key ? meta.on : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{meta.label}</button>)}</div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr]">
        <select aria-label="Priority" value={ticket.priority} disabled={busy} onChange={(event) => onChange({ priority: event.target.value }, `Priority set to ${event.target.value}`)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">{Object.entries(PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label} priority</option>)}</select>
        <input aria-label="Assigned to" value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} placeholder="Assigned to (name)" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-400" />
      </div>
      <textarea aria-label="Internal note" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Internal note (only you see this)" className="mt-2 min-h-[56px] w-full rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-400" />
      <div className="mt-2 flex justify-end"><button type="button" disabled={busy || unchanged} onClick={() => onChange({ assignee: draft.assignee, note: draft.note }, 'Ticket details saved')} className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40">Save details</button></div>
      {thread.length > 1 ? (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="text-[11px] font-black uppercase text-slate-500">Conversation ({thread.length} messages)</p>
          <ul className="mt-1 space-y-1">{thread.map((item) => <li key={item.id}><button type="button" onClick={() => onOpen(item.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${item.id === currentId ? 'bg-white font-bold text-slate-900' : 'text-slate-600 hover:bg-white'}`}><span className="truncate">{senderLabel(item.from)}: {item.subject || '(No subject)'}</span><span className="shrink-0 text-[10px] text-slate-400">{relativeTime(item.created_at)}</span></button></li>)}</ul>
        </div>
      ) : null}
    </div>
  )
}
