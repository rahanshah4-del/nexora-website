import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { formatBytes } from '../../../lib/inboxUtils.js'
import { SENDERS } from '../../../../workers/shared/senders.js'

/** One mail Nexora sent, read-only. */
export default function SentDetail({ item, onBack, onOpenConversation }) {
  if (!item) return <div className="grid min-h-[30rem] place-items-center text-center text-sm text-slate-400">Select a sent email to read it.</div>
  const dept = SENDERS.find((s) => item.from?.startsWith(`${s.id}@`))
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 xl:hidden"><HiOutlineArrowLeft className="h-4 w-4" /> Back to list</button>
      <header className="border-b border-slate-100 pb-3">
        <p className="text-[11px] font-black text-emerald-700">📤 {item.kind === 'compose' ? 'New email' : 'Reply'} · sent</p>
        <h3 className="mt-1 break-words text-xl font-black text-slate-950">{item.subject || '(No subject)'}</h3>
        <p className="mt-1 break-all text-xs text-slate-500"><span className="font-bold text-slate-700">From:</span> {dept ? `${dept.emoji} ${dept.name} ` : ''}&lt;{item.from}&gt;</p>
        <p className="break-all text-xs text-slate-500"><span className="font-bold text-slate-700">To:</span> {item.to}{item.cc ? <> · <span className="font-bold text-slate-700">CC:</span> {item.cc}</> : null}</p>
        <p className="text-xs text-slate-400">{new Date(item.sentAt).toLocaleString()}</p>
        {item.ticketId ? <p className="mt-1 text-[11px] font-bold text-slate-500">Ticket {item.ticketId}</p> : null}
      </header>
      <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{item.text}</div>
      {item.attachments?.length ? <div className="flex flex-wrap gap-2">{item.attachments.map((a, i) => <span key={`${a.filename}-${i}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">📎 {a.filename}{a.size ? <span className="font-semibold text-slate-400">{formatBytes(a.size)}</span> : null}</span>)}</div> : null}
      {item.inboundId ? <button type="button" onClick={() => onOpenConversation(item.inboundId)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Open the conversation</button> : null}
    </div>
  )
}
