import { SENDERS, senderEmail } from '../../../../workers/shared/senders.js'

/** "From" department for an outgoing email. `value` is a sender id (support, billing, ...). */
export default function SenderPicker({ value, onChange, hint, disabled }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      <span>From</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-label="Send from" className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400">
        {SENDERS.map((sender) => <option key={sender.id} value={sender.id}>{sender.emoji} {sender.name} &lt;{senderEmail(sender)}&gt;</option>)}
      </select>
      {hint ? <span className="font-normal text-slate-400">{hint}</span> : null}
    </label>
  )
}
