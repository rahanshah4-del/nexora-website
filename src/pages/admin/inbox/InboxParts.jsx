import { HiOutlineXMark } from 'react-icons/hi2'
import { avatarTone, initials, SHORTCUT_HELP } from '../../../lib/inboxUtils.js'

export function Avatar({ name, size = 'h-9 w-9 text-xs' }) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-black ${size} ${avatarTone(name)}`}>{initials(name)}</span>
}

/** Green while the Inbox is being refreshed automatically, amber when it cannot reach the server. */
export function LiveBadge({ status, ago }) {
  const live = status === 'live'
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${live ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
      {live ? 'Live' : 'Reconnecting'}
      {ago ? <span className="font-semibold normal-case opacity-70">· {ago}</span> : null}
    </span>
  )
}

export function ShortcutsHelp({ onClose }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">Keyboard shortcuts</h3><button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><HiOutlineXMark className="h-4 w-4" /></button></div>
        <dl className="mt-3 space-y-1.5">{SHORTCUT_HELP.map(([keys, text]) => <div key={keys} className="flex items-center justify-between gap-3 text-sm"><dt><kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">{keys}</kbd></dt><dd className="text-slate-600">{text}</dd></div>)}</dl>
      </div>
    </div>
  )
}
