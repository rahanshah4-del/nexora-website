import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Analytics() {
  const { items: metrics, loading, error } = useCollectionData('analyticsMetrics', { orderByField: 'createdAt', direction: 'desc', limitCount: 10 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Enterprise Analytics</h1>
            <p className="mt-2 text-sm text-slate-300">Track revenue trends, conversion metrics, and team performance in one place.</p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Analyzing...' : `${metrics.length} metrics`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading analytics…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load analytics data.</div>
      ) : metrics.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No analytics available</h2>
          <p className="mt-2 text-sm text-slate-400">Metric dashboards will populate when your team generates revenue, leads, and customer activity.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{metric.title || 'Metric'}</h2>
              <p className="mt-3 text-sm text-slate-400">{metric.description || 'Performance insight'}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>Value: <span className="font-semibold text-white">{metric.value || '—'}</span></p>
                <p>Trend: <span className="font-semibold text-white">{metric.trend || 'Stable'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
