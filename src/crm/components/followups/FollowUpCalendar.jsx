import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'

export default function FollowUpCalendar() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Follow-up Calendar</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Calendar view for scheduled follow-ups</p>
        </div>
        <Badge variant="default">Coming Soon</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Today</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Follow-ups scheduled</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overdue</p>
          <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-200">Needs attention</p>
        </div>
      </div>
    </Card>
  )
}
