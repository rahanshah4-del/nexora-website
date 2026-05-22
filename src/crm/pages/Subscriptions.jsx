import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useNavigate } from 'react-router-dom'
import { useSubscriptions } from '../hooks/useSubscriptions.js'
import PlanCards from '../components/subscriptions/PlanCards.jsx'
import SubscriptionStatus from '../components/subscriptions/SubscriptionStatus.jsx'
import UsageTracker from '../components/subscriptions/UsageTracker.jsx'
import PlanComparison from '../components/subscriptions/PlanComparison.jsx'
import SubscriptionHistory from '../components/subscriptions/SubscriptionHistory.jsx'

export default function SubscriptionsPage() {
  const navigate = useNavigate()
  const subs = useSubscriptions()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="SaaS Subscriptions"
        subtitle="Plan badges, feature locking, usage tracking, billing cycles, and manual upgrade approvals."
        right={
          <Button className="rounded-2xl" onClick={() => navigate('/upgrade-business')}>
            Upgrade / Request Approval
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge variant={subs.source === 'firestore' ? 'success' : 'default'}>
          {subs.loading ? 'Loading…' : subs.source === 'firestore' ? 'Live' : 'Demo'}
        </Badge>
        {subs.error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <PlanCards plans={subs.plans} currentPlan={subs.subscription.plan} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SubscriptionStatus subscription={subs.subscription} reminder={subs.renewalReminder} />
        <UsageTracker usage={subs.subscription.usage} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PlanComparison plans={subs.plans} />
        <SubscriptionHistory rows={subs.history} loading={subs.loading && subs.source === 'firestore'} />
      </div>
    </motion.div>
  )
}
