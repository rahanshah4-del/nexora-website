import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useSubscriptions } from '../hooks/useSubscriptions.js'
import Card from '../components/ui/Card.jsx'

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function TrialStatusCard({ trial }) {
  const active = trial?.active
  const expired = trial?.expired
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Trial Status</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Trial access is included for the first 7 days.
          </p>
        </div>
        <Badge variant={active ? 'success' : 'warning'}>{active ? 'Trial Active' : 'Trial Expired'}</Badge>
      </div>
      {expired ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
          Your 7-day trial has expired. Please contact your workspace administrator for continued access.
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Days Remaining</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{active ? trial.daysRemaining : 0}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Trial Ends</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(trial?.endsAt)}</p>
        </div>
      </div>
    </Card>
  )
}

export default function SubscriptionsPage() {
  const subs = useSubscriptions()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Subscriptions"
        subtitle="7-day trial status."
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge variant={subs.loading ? 'default' : 'success'}>{subs.loading ? 'Loading…' : 'Live Sync'}</Badge>
        {subs.error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <div className="grid gap-4">
        <TrialStatusCard trial={subs.trial} />
      </div>
    </motion.div>
  )
}
