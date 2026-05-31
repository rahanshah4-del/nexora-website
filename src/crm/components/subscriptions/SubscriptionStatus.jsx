import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import { packageNameForPlan } from '../../data/moduleAccess.js'

function planBadgeVariant(plan) {
  if (plan === 'Business') return 'success'
  if (plan === 'Enterprise') return 'warning'
  return 'default'
}

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default function SubscriptionStatus({ subscription, reminder }) {
  const packageName = packageNameForPlan(subscription.plan)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Subscription Status</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Expiry, billing cycle, and renewal reminders</p>
        </div>
        <Badge variant={planBadgeVariant(subscription.plan)}>{packageName}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Package Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription.planStatus}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Billing Cycle</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription.billingCycle || 'monthly'}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Next Billing</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(subscription.nextBillingDate || subscription.renewsOn)}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Expires On</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(subscription.subscriptionExpiresAt || subscription.expiresOn)}</p>
        </div>
      </div>

      {reminder ? (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
          <p className="text-sm font-semibold">{reminder.message}</p>
        </div>
      ) : null}
    </Card>
  )
}
