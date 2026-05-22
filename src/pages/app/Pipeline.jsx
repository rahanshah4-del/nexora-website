import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Pipeline() {
  const { items: deals, loading, error } = useCollectionData('pipelineDeals', { orderByField: 'value', direction: 'desc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Sales Pipeline</h1>
        <p className="mt-2 text-sm text-slate-300">Visualize deal stages and revenue potential across your active pipeline.</p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading pipeline deals…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load pipeline data.</div>
      ) : deals.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No deals in pipeline</h2>
          <p className="mt-2 text-sm text-slate-400">Add your first deal to track opportunities and forecast revenue.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {deals.map((deal) => (
            <div key={deal.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{deal.name || 'Deal'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{deal.account || 'Unknown account'}</p>
                </div>
                <span className="rounded-full bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {deal.stage || 'Prospect'}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>Value: <span className="font-semibold text-white">${deal.value ?? '0'}</span></p>
                <p>Close date: <span className="font-semibold text-white">{deal.closeDate || 'TBD'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

