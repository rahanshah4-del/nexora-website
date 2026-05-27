import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useNavigate } from 'react-router-dom'
import { useSubscriptions } from '../hooks/useSubscriptions.js'
import PlanCards from '../components/subscriptions/PlanCards.jsx'
import SubscriptionStatus from '../components/subscriptions/SubscriptionStatus.jsx'
import SubscriptionHistory from '../components/subscriptions/SubscriptionHistory.jsx'
import Card from '../components/ui/Card.jsx'

function isBusinessPlan(plan) {
  return ['business', 'enterprise'].includes(String(plan || '').toLowerCase())
}

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function TrialStatusCard({ trial }) {
  const active = trial?.active
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Trial Status</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Full Business access is included for the first 30 days.
          </p>
        </div>
        <Badge variant={active ? 'success' : 'warning'}>{active ? 'Trial Active' : 'Trial Expired'}</Badge>
      </div>
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

function CurrentPlanCard({ subscription, currentPlan, onUpgrade }) {
  const business = isBusinessPlan(currentPlan)
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Current Plan</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {business ? 'Business features are available in this workspace.' : 'Free mode keeps core CRM tools available.'}
          </p>
        </div>
        <Badge variant={business ? 'success' : 'default'}>{business ? 'Business' : 'Free'}</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Billing Currency</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subscription.billingCurrency || 'PKR'}</p>
        </div>
        <div className="glass-muted rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Next Billing Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(subscription.nextBillingDate)}</p>
        </div>
      </div>
      {!business ? (
        <Button className="mt-4 rounded-2xl" type="button" onClick={onUpgrade}>
          Upgrade to Business
        </Button>
      ) : null}
    </Card>
  )
}

function DesktopDownloadSection({ accessPlan, onUpgrade }) {
  const business = isBusinessPlan(accessPlan)

  return (
    <Card className="mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Desktop Download</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Desktop access is included with Business access.</p>
        </div>
        <Badge variant={business ? 'success' : 'warning'}>{business ? 'Available' : 'Upgrade Required'}</Badge>
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
          <span className="mt-1 block text-xs font-medium text-slate-500">Windows app access</span>
        </a>
        <button
          type="button"
          className="focus-ring rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          disabled={!business}
        >
          Download for Mac
          <span className="mt-1 block text-xs font-medium text-slate-500">Mac installer coming soon</span>
        </button>
        {business ? (
          <a
            href="/downloads/nexora-business-suite-windows.exe"
            className="focus-ring rounded-2xl bg-slate-950 p-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Windows EXE
            <span className="mt-1 block text-xs font-medium text-white/70">Download Windows App</span>
          </a>
        ) : (
          <button type="button" className="focus-ring rounded-2xl bg-slate-950 p-4 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" onClick={onUpgrade}>
            Upgrade for Desktop App
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
        title="Subscriptions"
        subtitle="Free trial, Business access, and Enterprise contact options."
        right={
          <Button className="rounded-2xl" onClick={() => navigate('/upgrade-business')}>
            Upgrade to Business
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge variant={subs.loading ? 'default' : 'success'}>{subs.loading ? 'Loading…' : 'Live Sync'}</Badge>
        {subs.error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrialStatusCard trial={subs.trial} />
        <CurrentPlanCard subscription={subs.subscription} currentPlan={subs.currentPlan} onUpgrade={() => navigate('/upgrade-business')} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SubscriptionStatus subscription={subs.subscription} reminder={subs.renewalReminder} />
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Enterprise</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Multi-branch, custom integrations, dedicated support, white-label, and enterprise deployment.
              </p>
            </div>
            <Badge variant="warning">Contact Sales</Badge>
          </div>
          <Button variant="subtle" className="mt-4 rounded-2xl" type="button" onClick={() => navigate('/app/settings')}>
            Contact Sales
          </Button>
        </Card>
      </div>

      <DesktopDownloadSection accessPlan={subs.currentPlan} onUpgrade={() => navigate('/upgrade-business')} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PlanCards plans={subs.plans} currentPlan={subs.subscription.plan} />
        <SubscriptionHistory rows={subs.history} loading={subs.loading && subs.source === 'firestore'} />
      </div>
    </motion.div>
  )
}
