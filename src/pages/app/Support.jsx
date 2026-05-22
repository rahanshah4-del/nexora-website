import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Support() {
  const { items: tickets, loading, error } = useCollectionData('supportTickets', { orderByField: 'updatedAt', direction: 'desc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Support Tickets</h1>
            <p className="mt-2 text-sm text-slate-300">Route client issues, monitor ticket status, and keep support workflows on track.</p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Fetching...' : `${tickets.length} tickets`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading tickets…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load support tickets.</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No open tickets</h2>
          <p className="mt-2 text-sm text-slate-400">Create support tickets from lead or customer records to centralize request tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{ticket.subject || 'Support issue'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{ticket.customer || 'Unassigned'}</p>
                </div>
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {ticket.status || 'Open'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
                <p>Priority: <span className="font-semibold text-white">{ticket.priority || 'Normal'}</span></p>
                <p>Updated: <span className="font-semibold text-white">{ticket.updatedAt || 'Unknown'}</span></p>
                <p>Owner: <span className="font-semibold text-white">{ticket.owner || 'TBD'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
