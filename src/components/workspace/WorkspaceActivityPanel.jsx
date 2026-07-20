import { HiOutlineArrowPath, HiOutlineChartBar, HiOutlineClock, HiOutlineFire, HiOutlineXMark } from 'react-icons/hi2'

function ActivityBarChart({ hourlyBuckets = [], maxValue = 0 }) {
  const peak = maxValue || Math.max(1, ...hourlyBuckets)
  const now = new Date()
  const currentHour = now.getHours()

  return (
    <div className="flex items-end gap-[3px]" style={{ height: 100 }} aria-label="Hourly activity chart">
      {hourlyBuckets.map((count, hour) => {
        const heightPct = peak > 0 ? Math.max(2, (count / peak) * 100) : 2
        const isCurrentHour = hour === currentHour
        const isActive = count > 0
        return (
          <div
            key={hour}
            className="group relative flex-1"
            title={`${String(hour).padStart(2, '0')}:00 — ${count} action${count !== 1 ? 's' : ''}`}
          >
            <div
              className={`w-full rounded-t-sm transition-all duration-300 ${
                isCurrentHour
                  ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                  : isActive
                    ? 'bg-gradient-to-t from-slate-400 to-slate-300'
                    : 'bg-slate-100'
              }`}
              style={{ height: `${heightPct}%` }}
            />
            {/* Hour label every 3 hours */}
            {hour % 3 === 0 ? (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400">
                {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
              </span>
            ) : null}
            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 whitespace-nowrap">
              {count} action{count !== 1 ? 's' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function WorkspaceActivityPanel({ open, onClose, activity, moduleLabel = 'Workspace' }) {
  if (!open) return null

  const stats = activity || {}
  const todayActive = stats.activeHoursToday > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-3 py-4 backdrop-blur-sm sm:px-5" role="dialog" aria-modal="true">
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl shadow-slate-950/20">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Activity Dashboard</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">{moduleLabel}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-300">
              {todayActive ? 'Real-time activity insights for your workspace.' : 'Activity will appear here as you use the workspace.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close activity dashboard"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:px-6">
            <StatCard
              icon={HiOutlineFire}
              value={stats.todayCount || 0}
              label="Today"
              tone="bg-orange-50 text-orange-600"
            />
            <StatCard
              icon={HiOutlineClock}
              value={stats.activeHoursToday || 0}
              label="Active Hours"
              suffix="h"
              tone="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={HiOutlineChartBar}
              value={stats.totalCount || 0}
              label="All Time"
              tone="bg-violet-50 text-violet-600"
            />
            <StatCard
              icon={HiOutlineArrowPath}
              value={stats.lastActiveLabel || '—'}
              label="Last Active"
              tone="bg-emerald-50 text-emerald-600"
              isText
            />
          </div>

          {/* Hourly graph */}
          <div className="border-t border-slate-100 px-5 pt-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Activity today</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Each bar shows actions per hour — hover for counts
                </p>
              </div>
              {stats.todayCount > 0 ? (
                <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700">
                  {stats.todayCount} total today
                </span>
              ) : null}
            </div>
            <div className="mt-4 pb-8">
              <ActivityBarChart hourlyBuckets={stats.hourlyBuckets || []} maxValue={Math.max(...(stats.hourlyBuckets || []))} />
            </div>
          </div>

          {/* Recent actions */}
          <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
            <h3 className="text-sm font-black text-slate-950">Recent actions</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Latest activity recorded for this workspace.</p>
            <div className="mt-4 space-y-2">
              {stats.recentActions && stats.recentActions.length > 0 ? (
                stats.recentActions.map((action) => (
                  <div
                    key={action.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      action.isToday
                        ? 'border-blue-100 bg-blue-50/50'
                        : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${action.isToday ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{action.action}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{action.module}</span>
                      </div>
                      {action.description ? (
                        <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{action.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{action.timeLabel}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                  <HiOutlineChartBar className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-600">No activity recorded yet</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Activity will appear here as you use this workspace module.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <span className="mr-auto text-[11px] font-semibold text-slate-400">
            {stats.rawCount || 0} activity records loaded
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, suffix = '', tone = '', isText = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-lg font-black text-slate-950">
        {isText ? (
          <span className="text-xs">{String(value)}</span>
        ) : (
          <>{value}{suffix ? <span className="text-xs font-semibold text-slate-400 ml-0.5">{suffix}</span> : null}</>
        )}
      </p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
    </div>
  )
}
