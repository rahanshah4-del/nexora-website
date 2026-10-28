import { useState } from 'react'
import { syncPolarSubscription } from '../../lib/polarBilling.js'

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function dateLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

function Fact({ label, value, mono = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xs font-black text-slate-900 ${mono ? 'font-mono' : ''}`} title={String(value || '')}>{value || '—'}</p>
    </div>
  )
}

function stateOf(client = {}) {
  const polarStatus = String(client.polarStatus || '').toLowerCase()
  const planStatus = String(client.planStatus || client.subscriptionStatus || '').toLowerCase()
  if (!client.polarSubscriptionId) return { label: 'No Polar subscription', tone: 'slate' }
  if (polarStatus === 'trialing') return { label: 'Polar trial', tone: 'sky' }
  if (planStatus === 'canceled') return { label: 'Cancels at period end', tone: 'amber' }
  if (planStatus === 'active') return { label: 'Active · auto-renews', tone: 'emerald' }
  if (planStatus === 'past_due') return { label: 'Payment failed', tone: 'rose' }
  if (planStatus === 'expired') return { label: 'Ended', tone: 'rose' }
  return { label: planStatus || 'Unknown', tone: 'slate' }
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  rose: 'bg-rose-100 text-rose-800',
}

/**
 * Subscription + payments for one client, driven entirely by Polar. There is nothing to approve or mark paid:
 * the webhook updates the plan and writes each payment. "Sync from Polar" only re-reads Polar if a webhook was missed.
 */
export default function PolarSubscriptionPanel({ client, payments = [], user }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const workspaceId = client?.workspaceId || client?.id || ''
  const state = stateOf(client)
  const recent = [...payments]
    .sort((a, b) => (toDate(b.approvedAt || b.updatedAt || b.createdAt)?.getTime() || 0) - (toDate(a.approvedAt || a.updatedAt || a.createdAt)?.getTime() || 0))
    .slice(0, 5)

  async function sync() {
    setBusy(true)
    setMessage({ type: '', text: '' })
    try {
      const result = await syncPolarSubscription(user, workspaceId)
      setMessage({ type: 'ok', text: `Synced: ${result.status || 'ok'} · plan ${result.plan || '—'}.` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0f9ff_100%)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">Subscription & payments</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-600">Automatic through Polar. Plans, renewals and payments update by themselves.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${TONES[state.tone]}`}>{state.label}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Plan" value={client?.plan} />
        <Fact label="Billing" value={client?.billingCycle} />
        <Fact label="Next payment" value={client?.nextBillingDate ? dateLabel(client.nextBillingDate) : '—'} />
        <Fact label="Access until" value={dateLabel(client?.subscriptionExpiresAt)} />
        <Fact label="Polar trial ends" value={client?.polarTrialEndsAt ? dateLabel(client.polarTrialEndsAt) : '—'} />
        <Fact label="Currency" value={client?.billingCurrency} />
        <Fact label="Subscription ID" value={client?.polarSubscriptionId} mono />
        <Fact label="Customer ID" value={client?.polarCustomerId} mono />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-white/90">
        <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Recent payments</p>
        {recent.length ? (
          <ul className="divide-y divide-slate-100">
            {recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="font-mono text-slate-600">{row.transactionId || row.id}</span>
                <span className="font-black text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency || 'USD' }).format(Number(row.amount || 0))}</span>
                <span className="font-bold capitalize text-slate-600">{row.status || row.paymentStatus || '—'}</span>
                <span className="text-slate-500">{dateLabel(row.approvedAt || row.updatedAt || row.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-3 text-xs font-semibold text-slate-500">No payments yet. The first one appears here when Polar charges the card.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={sync} disabled={busy || !client?.polarSubscriptionId} className="inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-black text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Syncing…' : 'Sync from Polar'}
        </button>
        <a href="https://polar.sh/dashboard" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">
          Open Polar dashboard
        </a>
        {message.text ? <span className={`text-xs font-bold ${message.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{message.text}</span> : null}
      </div>
    </section>
  )
}
