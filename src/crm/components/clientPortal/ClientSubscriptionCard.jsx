import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { useNavigate } from 'react-router-dom'

export default function ClientSubscriptionCard({ subscription }) {
  const navigate = useNavigate()
  const plan = subscription?.plan || 'Free'
  const active = subscription?.planStatus === 'active' || plan !== 'Free'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Subscription</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Plan status and billing cycle</p>
        </div>
        <Badge variant={active ? 'success' : 'default'}>{active ? 'Active' : 'Free'}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Plan</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{plan}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Billing</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription?.billingCycle || '—'}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Next billing</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription?.nextBillingDate || '—'}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Seats</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription?.seats ?? 1}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="rounded-2xl" type="button" onClick={() => navigate('/upgrade-business')}>
          Upgrade
        </Button>
        <Button variant="ghost" className="rounded-2xl" type="button">
          Download invoice
        </Button>
      </div>
    </Card>
  )
}
