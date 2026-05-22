import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'

function tone(score) {
  if (score >= 85) return 'emerald'
  if (score >= 65) return 'amber'
  return 'indigo'
}

export default function StaffPerformanceCards({ members }) {
  const top = [...members]
    .filter((m) => (m.performanceScore ?? 0) > 0)
    .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
    .slice(0, 4)

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {top.map((m) => (
        <Card key={m.id} className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{m.role}</p>
            </div>
            <Badge variant="info">{m.status}</Badge>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Performance</span>
              <span className="font-semibold text-slate-900 dark:text-white">{m.performanceScore}</span>
            </div>
            <ProgressBar value={m.performanceScore} tone={tone(m.performanceScore)} className="mt-2" />
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Last active: <span className="font-semibold text-slate-900 dark:text-white">{m.lastActive || '—'}</span>
          </p>
        </Card>
      ))}
    </div>
  )
}

