import { useCollectionData } from '../../lib/useCollectionData.js'

export default function ActivityLogs() {
  const { items: events, loading, error } = useCollectionData('activityLogs', { orderByField: 'timestamp', direction: 'desc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Activity Logs</h1>
            <p className="mt-2 text-sm text-slate-300">Review recent account activity, team actions, and client interactions.</p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Fetching...' : `${events.length} events`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading activity events…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load activity logs.</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No activity yet</h2>
          <p className="mt-2 text-sm text-slate-400">Events from workflows, leads, and client updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{event.title || 'Activity event'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{event.subject || 'No details'}</p>
                </div>
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {event.timestamp || 'Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
