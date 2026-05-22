import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Reports() {
  const { items: reports, loading, error } = useCollectionData('reports', { orderByField: 'updatedAt', direction: 'desc', limitCount: 10 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-2 text-sm text-slate-300">Generate sales, customer, and support reports for your Nexora business.
        </p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading reports…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load report items.</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No reports available</h2>
          <p className="mt-2 text-sm text-slate-400">Create a new report to evaluate revenue, conversion, and support KPIs.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{report.title || 'Report'}</h2>
              <p className="mt-3 text-sm text-slate-400">{report.summary || 'Summary not available'}</p>
              <div className="mt-4 text-sm text-slate-300">
                <p>Created: {report.updatedAt || 'Unknown'}</p>
                <p>Status: <span className="font-semibold text-white">{report.status || 'Ready'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

