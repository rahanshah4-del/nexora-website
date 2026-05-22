import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Subscriptions() {
  const { items: subscriptions, loading, error } = useCollectionData('subscriptions', { orderByField: 'renewalDate', direction: 'asc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Subscriptions</h1>
            <p className="mt-2 text-sm text-slate-300">Track recurring services, renewal dates, and active subscription plans.</p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Fetching...' : `${subscriptions.length} subscriptions`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading subscriptions…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load subscriptions.</div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No active subscriptions</h2>
          <p className="mt-2 text-sm text-slate-400">Set up subscriptions to automate recurring billing for your clients.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{subscription.client || 'Client name'}</h2>
              <p className="mt-1 text-sm text-slate-400">Plan: {subscription.plan || 'Standard'}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Renewal: <span className="font-semibold text-white">{subscription.renewalDate || 'TBD'}</span></p>
                <p>Status: <span className="font-semibold text-white">{subscription.status || 'Active'}</span></p>
                <p>Amount: <span className="font-semibold text-white">${subscription.amount ?? '0.00'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
