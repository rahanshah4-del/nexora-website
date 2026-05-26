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
import Card from '../components/ui/Card.jsx'

function isBusinessPlan(plan) {
  return ['business', 'enterprise'].includes(String(plan || '').toLowerCase())
}

function DesktopDownloadSection({ plan, onUpgrade }) {
  const business = isBusinessPlan(plan)
  const trial = ['trial', 'free'].includes(String(plan || '').toLowerCase())

  return (
    <Card className="mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Desktop Download</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Business plan users can download Nexora desktop app installers.
          </p>
        </div>
        <Badge variant={business ? 'success' : 'warning'}>{business ? 'Business Access' : 'Plan Locked'}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <a
          href={business ? '/downloads/nexora-business-suite-windows.exe' : '#trial-download'}
          className="focus-ring rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          onClick={(event) => {
            if (!business) event.preventDefault()
          }}
        >
          Download for Windows
          <span className="mt-1 block text-xs font-medium text-slate-500">Windows EXE placeholder link</span>
        </a>
        <button
          type="button"
          className="focus-ring rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          disabled={!business}
        >
          Download for Mac
          <span className="mt-1 block text-xs font-medium text-slate-500">Mac installer placeholder</span>
        </button>
        {business ? (
          <a
            href="/downloads/nexora-business-suite-windows.exe"
            className="focus-ring rounded-2xl bg-slate-950 p-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Windows EXE
            <span className="mt-1 block text-xs font-medium text-white/70">Placeholder download</span>
          </a>
        ) : (
          <button type="button" className="focus-ring rounded-2xl bg-slate-950 p-4 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" onClick={onUpgrade}>
            {trial ? 'Free Trial Download CTA' : 'Upgrade for Desktop App'}
            <span className="mt-1 block text-xs font-medium text-white/70">Business plan unlocks full desktop downloads.</span>
          </button>
        )}
      </div>
    </Card>
  )
}

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

      <DesktopDownloadSection plan={subs.subscription.plan} onUpgrade={() => navigate('/upgrade-business')} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PlanComparison plans={subs.plans} />
        <SubscriptionHistory rows={subs.history} loading={subs.loading && subs.source === 'firestore'} />
      </div>
    </motion.div>
  )
}
