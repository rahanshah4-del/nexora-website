import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import { useQueueJobs } from '../../hooks/useQueueJobs.js'

const statusTone = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
}

function formatDate(value) {
  if (!value) return '—'
  return value.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function progressText(job) {
  const progress = job.progress || {}
  const total = Number(progress.total || 0)
  const completed = Number(progress.completed || 0)
  if (!total) return ''
  return `${Math.min(completed, total)}/${total}`
}

export default function QueueStatusMonitor() {
  const api = useQueueJobs({ limitCount: 40 })

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Queue Status</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Background jobs for POS, campaigns, messages, and alerts.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="warning">Pending {api.counts.pending}</Badge>
          <Badge variant="info">Processing {api.counts.processing}</Badge>
          <Badge variant="success">Completed {api.counts.completed}</Badge>
          <Badge variant="danger">Failed {api.counts.failed}</Badge>
        </div>
      </div>

      {api.error ? <div className="mt-3"><Badge variant="danger">{api.error}</Badge></div> : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/5">
          <span>Job</span>
          <span>Status</span>
          <span>Progress</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {api.loading ? (
            <div className="px-3 py-8 text-center text-sm text-slate-500">Loading queue...</div>
          ) : api.jobs.length ? (
            api.jobs.slice(0, 8).map((job) => (
              <div key={job.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{job.label || job.type}</p>
                  <p className="truncate text-xs text-slate-500">
                    {job.type} · {formatDate(job.updatedAt || job.createdAt)}
                    {job.error ? ` · ${job.error}` : ''}
                  </p>
                </div>
                <Badge variant={statusTone[job.status] || 'warning'}>{job.statusLabel}</Badge>
                <span className="text-right text-xs font-semibold text-slate-500">{progressText(job)}</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-slate-500">No queue jobs yet.</div>
          )}
        </div>
      </div>
    </Card>
  )
}
