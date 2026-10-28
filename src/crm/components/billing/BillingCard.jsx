import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { cardBrandLabel, daysLeft, fetchPolarBilling } from '../../../lib/polarBilling.js'

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date)
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount || 0))
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`
  }
}

function Fact({ label, value, hint }) {
  return (
    <div className="glass-muted rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  )
}

/**
 * Card and renewal details for a workspace that pays through Polar: the saved card, when the plan renews or ends,
 * and buttons that open Polar's secure portal to add, replace or remove the card. Renders nothing for workspaces
 * without a Polar subscription (the caller shows the trial card then).
 */
export default function BillingCard({ firebaseUser, onLoaded }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })

  useEffect(() => {
    let cancelled = false
    if (!firebaseUser) return undefined
    fetchPolarBilling(firebaseUser)
      .then((data) => {
        if (cancelled) return
        setState({ loading: false, error: '', data })
        onLoaded?.(Boolean(data.hasSubscription))
      })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, data: null }) })
    return () => { cancelled = true }
  }, [firebaseUser, onLoaded])

  if (state.loading) return <Card className="p-5"><p className="text-sm text-slate-600 dark:text-slate-300">Loading billing…</p></Card>
  if (state.error) return <Card className="p-5"><p className="text-sm font-semibold text-rose-700">{state.error}</p></Card>
  const { data } = state
  if (!data?.hasSubscription) return null

  const billing = data.billing
  const ended = !billing.active
  const statusLabel = ended ? 'Ended' : billing.cancelAtPeriodEnd ? 'Cancels at period end' : billing.trialing ? 'Free trial' : 'Active'
  const variant = ended ? 'danger' : billing.cancelAtPeriodEnd ? 'warning' : 'success'
  const periodDays = daysLeft(billing.periodEnd)
  const card = billing.card
  const goPortal = () => { if (data.portalUrl) window.location.assign(data.portalUrl) }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Plan & billing</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {billing.amount ? `${formatMoney(billing.amount, billing.currency)} per ${billing.interval || 'month'}` : 'Billed by card through Polar'}
          </p>
        </div>
        <Badge variant={variant}>{statusLabel}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {billing.trialing ? <Fact label="Free trial ends" value={formatDate(billing.trialEnd)} hint={`${daysLeft(billing.trialEnd)} days left`} /> : null}
        {billing.nextPaymentDate ? (
          <Fact label="Next payment" value={formatDate(billing.nextPaymentDate)} hint={billing.amount ? formatMoney(billing.amount, billing.currency) : ''} />
        ) : (
          <Fact label={ended ? 'Plan ended on' : 'Plan ends on'} value={formatDate(billing.endsAt || billing.periodEnd)} hint={!ended && periodDays ? `${periodDays} days of access left` : ''} />
        )}
        <Fact label="Billing period" value={billing.interval === 'year' ? 'Yearly' : 'Monthly'} />
      </div>

      {billing.cancelAtPeriodEnd && !ended ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
          Your subscription will not renew. You keep full access until {formatDate(billing.endsAt || billing.periodEnd)}.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Payment card</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            {card ? `${cardBrandLabel(card.brand)} •••• ${card.last4 || '••••'}` : 'No card on file'}
            {card?.expMonth && card?.expYear ? <span className="ml-2 text-xs font-medium text-slate-500">Expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={goPortal} disabled={!data.portalUrl} className="inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            {card ? 'Add / replace card' : 'Add card'}
          </button>
          {card ? (
            <button type="button" onClick={goPortal} disabled={!data.portalUrl} className="inline-flex h-10 items-center rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300">
              Remove card
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Cards are added and removed on Polar's secure page, so Nexora never sees your card number. While a plan is active, add the new card first, then remove the old one.
        {ended ? <> <Link to="/upgrade-business" className="font-semibold underline">Choose a plan</Link> to start again.</> : null}
      </p>
    </Card>
  )
}
