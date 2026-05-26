import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'

function pct(used, limit) {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export default function UsageTracker({ usage }) {
  const rows = [
    { label: 'Storage', used: usage.storageUsedGb, limit: usage.storageLimitGb, tone: 'indigo', suffix: 'GB' },
    { label: 'Team Members', used: usage.teamMembersUsed, limit: usage.teamMembersLimit, tone: 'emerald', suffix: '' },
    { label: 'Reports', used: usage.reportsGenerated, limit: usage.reportsLimit, tone: 'amber', suffix: '' },
    { label: 'Sync Actions', used: usage.apiRequests, limit: usage.apiRequestsLimit, tone: 'rose', suffix: '' },
  ]

  const high = rows.some((r) => pct(r.used, r.limit) >= 85)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Usage Tracker</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Usage progress bars with upgrade warning</p>
        </div>
        <Badge variant={high ? 'warning' : 'default'}>{high ? 'High Usage' : 'Normal'}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r) => {
          const p = pct(r.used, r.limit)
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{r.label}</span>
                <span>
                  {r.used}
                  {r.suffix ? ` ${r.suffix}` : ''} / {r.limit}
                  {r.suffix ? ` ${r.suffix}` : ''} ({p}%)
                </span>
              </div>
              <ProgressBar value={p} tone={r.tone} className="mt-2" />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
