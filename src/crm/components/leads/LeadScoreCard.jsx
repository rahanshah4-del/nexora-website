import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'

function toneForType(type) {
  if (type === 'Hot Lead') return 'rose'
  if (type === 'Warm Lead') return 'amber'
  return 'indigo'
}

export default function LeadScoreCard({ lead }) {
  const tone = toneForType(lead.scoreType)
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{lead.name}</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-300">{lead.company}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge variant="purple">AI Score</Badge>
          <Badge variant={lead.scoreType === 'Hot Lead' ? 'danger' : lead.scoreType === 'Warm Lead' ? 'warning' : 'default'}>
            {lead.scoreType}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Seriousness score</span>
          <span className="font-semibold text-slate-900 dark:text-white">{lead.score}/100</span>
        </div>
        <ProgressBar value={lead.score} tone={tone} className="mt-2" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={lead.priority === 'High' ? 'danger' : lead.priority === 'Medium' ? 'warning' : 'default'}>
          Priority: {lead.priority}
        </Badge>
        <Badge variant="info">{lead.prediction}</Badge>
        {lead.lastContactDate ? <Badge variant="default">Last: {lead.lastContactDate}</Badge> : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Why this score</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(lead.reasons ?? []).map((r) => (
            <Badge key={r} variant="default">
              {r}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}

