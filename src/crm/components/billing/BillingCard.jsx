import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { cardBrandLabel, daysLeft, fetchPolarBilling } from '../../../lib/polarBilling.js'

function formatDate(value, style = 'long') {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: style }).format(date)
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount || 0))
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`
  }
}

/** How far through the current billing period we are, 0-100. */
export function periodProgress(start, end, now = Date.now()) {
  const from = new Date(start || '').getTime()
  const to = new Date(end || '').getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0
  return Math.min(Math.max(Math.round(((now - from) / (to - from)) * 100), 0), 100)
}

const STATUS_STYLE = {
  success: 'bg-emerald-500/15 text-emerald-100 ring-emerald-300/30',
  warning: 'bg-amber-400/15 text-amber-100 ring-amber-300/30',
  danger: 'bg-rose-500/15 text-rose-100 ring-rose-300/30',
}

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

function CardVisual({ card }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-indigo-500/25 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">{card ? cardBrandLabel(card.brand) : 'No card'}</span>
        <span className="h-6 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" aria-hidden="true" />
      </div>
      <p className="mt-6 font-mono text-lg tracking-[0.25em]">{card ? `•••• •••• •••• ${card.last4 || '••••'}` : '•••• •••• •••• ••••'}</p>
      <div className="mt-4 flex items-end justify-between text-xs text-slate-300">
        <span>{card ? 'Saved on Polar' : 'Add a card to renew'}</span>
        <span className="font-semibold">{card?.expMonth && card?.expYear ? `Exp ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}` : ''}</span>
      </div>
    </div>
  )
}

const PAYMENT_BADGE = { paid: 'success', refunded: 'warning', partially_refunded: 'warning', pending: 'default' }

/**
 * Billing page for a workspace that pays through Polar: plan hero with the billing-period progress, payment
 * history, the saved card and the buttons that open Polar's secure portal. Renders nothing for workspaces without a
 * Polar subscription (the caller shows the trial card then).
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

  if (state.loading) return <Card className="p-6"><p className="text-sm text-slate-600 dark:text-slate-300">Loading billing…</p></Card>
  if (state.error) return <Card className="p-6"><p className="text-sm font-semibold text-rose-700">{state.error}</p></Card>
  const { data } = state
  if (!data?.hasSubscription) return null

  const billing = data.billing
  const ended = !billing.active
  const statusLabel = ended ? 'Ended' : billing.cancelAtPeriodEnd ? 'Cancels at period end' : billing.trialing ? 'Free trial' : 'Active'
  const tone = ended ? 'danger' : billing.cancelAtPeriodEnd ? 'warning' : 'success'
  const periodDays = daysLeft(billing.periodEnd)
  const progress = periodProgress(billing.periodStart, billing.periodEnd)
  const card = billing.card
  const price = billing.nextAmount || billing.amount
  const interval = billing.interval === 'year' ? 'year' : 'month'
  const payments = Array.isArray(data.payments) ? data.payments : []
  const goPortal = () => { if (data.portalUrl) window.location.assign(data.portalUrl) }
  const portalButton = 'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:opacity-50'

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-4 lg:col-span-2">
        <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current plan</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{billing.planName || 'Nexora plan'}</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_STYLE[tone]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{statusLabel}
            </span>
          </div>

          <p className="relative mt-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tight sm:text-5xl">{price ? formatMoney(price, billing.currency) : 'Card billing'}</span>
            {price ? <span className="text-sm font-medium text-slate-400">/ {interval}</span> : null}
          </p>
          {billing.firstPaymentDiscounted ? <p className="relative mt-1 text-xs text-slate-400">Full price from your second payment. Your first payment had a discount.</p> : null}

          {!ended ? (
            <div className="relative mt-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{formatDate(billing.periodStart, 'medium')}</span>
                <span className="font-semibold text-slate-200">{periodDays ? `${periodDays} day${periodDays === 1 ? '' : 's'} left in this period` : 'Renews today'}</span>
                <span>{formatDate(billing.periodEnd, 'medium')}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Billing period progress">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="relative mt-6 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-3">
            {billing.trialing ? <Stat label="Free trial ends" value={formatDate(billing.trialEnd)} hint={`${daysLeft(billing.trialEnd)} days left`} /> : null}
            {billing.nextPaymentDate ? (
              <Stat label="Next payment" value={formatDate(billing.nextPaymentDate)} hint={price ? formatMoney(price, billing.currency) : ''} />
            ) : (
              <Stat label={ended ? 'Plan ended on' : 'Access until'} value={formatDate(billing.endsAt || billing.periodEnd)} hint={!ended && periodDays ? `${periodDays} days left` : ''} />
            )}
            <Stat label="Billing period" value={interval === 'year' ? 'Yearly' : 'Monthly'} />
            <Stat label="Billed by" value="Polar" hint="Secure card payment" />
          </div>

          {billing.cancelAtPeriodEnd && !ended ? (
            <p className="relative mt-5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Your subscription will not renew. You keep full access until {formatDate(billing.endsAt || billing.periodEnd)}.
            </p>
          ) : null}
        </section>

        <Card className="p-0">
          <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment history</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Every payment for this workspace.</p>
            </div>
            <button type="button" onClick={goPortal} disabled={!data.portalUrl} className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-300">Invoices &amp; receipts</button>
          </div>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  <tr><th className="px-5 py-2.5 sm:px-6">Date</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-5 py-2.5 text-right sm:px-6">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300 sm:px-6">{formatDate(payment.date, 'medium')}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{payment.description}</p>
                        {payment.discount > 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(payment.discount, payment.currency)} discount off {formatMoney(payment.listAmount, payment.currency)}</p> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(payment.amount, payment.currency)}</td>
                      <td className="px-5 py-3 text-right sm:px-6"><Badge variant={PAYMENT_BADGE[payment.status] || 'default'}>{String(payment.status).replace('_', ' ')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t border-slate-200 px-5 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 sm:px-6">Your payments will appear here.</p>
          )}
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment method</h3>
          <div className="mt-3"><CardVisual card={card} /></div>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={goPortal} disabled={!data.portalUrl} className={`${portalButton} bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900`}>{card ? 'Replace card' : 'Add card'}</button>
            {card ? <button type="button" onClick={goPortal} disabled={!data.portalUrl} className={`${portalButton} border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300`}>Remove card</button> : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Cards are added and removed on Polar's secure page, so Nexora never sees your card number. Add the new card first, then remove the old one.</p>
        </Card>

        {!ended ? (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Manage subscription</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Download invoices and receipts{billing.cancelAtPeriodEnd ? ', or resume your plan' : ', or cancel your plan'} on Polar's secure page.</p>
            <button type="button" onClick={goPortal} disabled={!data.portalUrl} className={`${portalButton} mt-3 w-full border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10`}>
              {billing.cancelAtPeriodEnd ? 'Resume or manage plan' : 'Manage / cancel plan'}
            </button>
          </Card>
        ) : (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Start again</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Your plan has ended. Choose a plan to get your modules back.</p>
            <Link to="/upgrade-business" className={`${portalButton} mt-3 w-full bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900`}>Choose a plan</Link>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Need help with billing?</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Write to <a className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300" href="mailto:support@nexorasolution.us">support@nexorasolution.us</a> and we will sort it out.</p>
        </Card>
      </div>
    </div>
  )
}
