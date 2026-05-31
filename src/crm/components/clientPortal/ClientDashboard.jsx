import { HiOutlineLifebuoy } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import ActivityTimeline from '../dashboard/ActivityTimeline.jsx'
import { useNavigate } from 'react-router-dom'
import { packageNameForPlan } from '../../data/moduleAccess.js'

export default function ClientDashboard({ subscription, invoicesCount, paymentsCount, activity }) {
  const navigate = useNavigate()
  const packageName = packageNameForPlan(subscription?.plan)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Client Dashboard</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Invoices, payments, subscription status, and support shortcuts</p>
        </div>
        <Badge variant="purple">{packageName} Package</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Invoices</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{invoicesCount}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Payments</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{paymentsCount}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Support</p>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="info">Available</Badge>
            <Button
              variant="subtle"
              className="rounded-2xl"
              type="button"
              onClick={() => navigate('/app/support')}
            >
              <HiOutlineLifebuoy className="mr-2 text-lg" />
              New Ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Latest billing and project events</p>
        <div className="mt-3">
          {activity?.length ? (
            <ActivityTimeline items={activity} />
          ) : (
            <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
              No activity yet.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
