import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import LeadScoreCard from './LeadScoreCard.jsx'

export default function LeadScoringPanel({ leads, loading, source, error }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Lead Scoring</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Seriousness score, conversion prediction, and auto priority (demo).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={source === 'firestore' ? 'success' : 'default'}>{source === 'firestore' ? 'Live' : 'Demo'}</Badge>
          <Badge variant="purple">AI Score</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Search leads (UI placeholder)..." />
        <Input placeholder="Filter (Hot/Warm/Cold) placeholder..." />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
          Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <div className="mt-6 grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
          No leads found.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {leads.map((l) => (
            <LeadScoreCard key={l.id} lead={l} />
          ))}
        </div>
      )}
    </Card>
  )
}

