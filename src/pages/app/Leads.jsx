import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Leads() {
  const { items: leads, loading, error } = useCollectionData('leads', { orderByField: 'createdAt', direction: 'desc', limitCount: 15 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="mt-2 text-sm text-slate-300">Manage incoming leads, status updates, and nurture follow-ups.</p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading leads…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load leads.</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No leads found</h2>
          <p className="mt-2 text-sm text-slate-400">Capture leads from forms, ads, and manual entries to begin selling faster.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{lead.name || 'New lead'}</h2>
                <span className="rounded-full bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {lead.stage || 'New'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{lead.company || 'No company listed'}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Owner: {lead.owner || 'Unassigned'}</p>
                <p>Source: {lead.source || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

