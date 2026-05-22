import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import EmptyState from '../system/EmptyState.jsx'

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function fmtDate(d) {
  if (!d) return '—'
  return d.toISOString().slice(0, 10)
}

export default function RecentReportActivity({ activityLogs }) {
  const items = (activityLogs || [])
    .slice()
    .sort((a, b) => {
      const at = toDateValue(a.createdAt)?.getTime?.() || 0
      const bt = toDateValue(b.createdAt)?.getTime?.() || 0
      return bt - at
    })
    .slice(0, 8)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent Report Activity</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Latest system/user actions (activityLogs)</p>
        </div>
        <Badge variant="purple">Activity</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((it) => (
            <div key={it.id} className="glass-muted rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {it.module || 'System'} — {it.action || 'Action'}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">{it.description || ''}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(toDateValue(it.createdAt))}
                </span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No recent activity" description="Activity logs will appear here when actions occur." />
        )}
      </div>
    </Card>
  )
}

