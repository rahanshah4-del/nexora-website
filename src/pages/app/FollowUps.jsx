import { useCollectionData } from '../../lib/useCollectionData.js'

export default function FollowUps() {
  const { items: tasks, loading, error } = useCollectionData('followUps', { orderByField: 'dueDate', direction: 'asc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Follow-Up Automation</h1>
            <p className="mt-2 text-sm text-slate-300">
              Track outreach reminders, recurring follow-ups, and automated customer touchpoints.
            </p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Syncing...' : `${tasks.length} tasks`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading follow-up tasks…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Could not load follow-ups.</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No follow-up automation configured</h2>
          <p className="mt-2 text-sm text-slate-400">Create sequences and reminders to keep leads moving through the funnel.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{task.title || 'Follow-up task'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{task.contact || 'Unknown contact'}</p>
                </div>
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {task.status || 'Pending'}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Due: <span className="font-semibold text-white">{task.dueDate || 'TBD'}</span></p>
                <p>Sequence: <span className="font-semibold text-white">{task.sequence || 'Standard'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
