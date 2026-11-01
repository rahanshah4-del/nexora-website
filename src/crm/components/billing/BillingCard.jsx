import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { cardBrandLabel, daysLeft, fetchPolarBilling, finishCardReplacement } from '../../../lib/polarBilling.js'

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

const BRAND_THEME = {
  mastercard: 'from-[#2b2f3a] via-[#1d2029] to-[#12141b]',
  visa: 'from-[#1f3a8a] via-[#1b2f6e] to-[#111c45]',
  amex: 'from-[#0e7490] via-[#0b5d73] to-[#083b4a]',
  discover: 'from-[#9a3412] via-[#7c2d12] to-[#431407]',
  unionpay: 'from-[#7f1d1d] via-[#5b1a2b] to-[#1e3a5f]',
  jcb: 'from-[#14532d] via-[#1e3a8a] to-[#7f1d1d]',
}
const DEFAULT_THEME = 'from-[#334155] via-[#1e293b] to-[#0f172a]'

function BrandMark({ brand }) {
  const key = String(brand || '').toLowerCase()
  if (key === 'mastercard') {
    return (
      <svg viewBox="0 0 48 30" className="h-8 w-auto" role="img" aria-label="Mastercard">
        <circle cx="17" cy="15" r="13" fill="#eb001b" />
        <circle cx="31" cy="15" r="13" fill="#f79e1b" />
        <path d="M24 4.6a13 13 0 0 1 0 20.8 13 13 0 0 1 0-20.8z" fill="#ff5f00" />
      </svg>
    )
  }
  if (key === 'visa') {
    return <span className="text-[26px] font-black italic leading-none tracking-tight text-white" aria-label="Visa">VISA</span>
  }
  if (key === 'amex') {
    return <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-wide text-sky-800" aria-label="American Express">AMEX</span>
  }
  return <span className="text-sm font-bold uppercase tracking-wider text-white/90">{cardBrandLabel(brand)}</span>
}

function Chip() {
  return (
    <svg viewBox="0 0 40 30" className="h-8 w-auto" aria-hidden="true">
      <rect x="1" y="1" width="38" height="28" rx="5" fill="#e6c26a" />
      <rect x="1" y="1" width="38" height="28" rx="5" fill="url(#chipShine)" />
      <defs>
        <linearGradient id="chipShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6cf" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#c99a2e" stopOpacity="0.15" />
          <stop offset="1" stopColor="#f4d57c" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#8a6a1f" strokeWidth="1" opacity="0.7">
        <path d="M1 10h12v10H1M39 10H27v10h12M13 1v9M13 20v9M27 1v9M27 20v9M13 15h14" />
      </g>
    </svg>
  )
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M8 7.5a6.5 6.5 0 0 1 0 9M11.5 5a10 10 0 0 1 0 14M15 2.5a13.5 13.5 0 0 1 0 19" />
    </svg>
  )
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-[5px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => <span key={i} className="h-[6px] w-[6px] rounded-full bg-white/85" />)}
    </span>
  )
}

/** A card the way it looks in a wallet: chip, contactless, last four digits, expiry and the network's own mark. */
function CardVisual({ card }) {
  const theme = BRAND_THEME[String(card?.brand || '').toLowerCase()] || DEFAULT_THEME
  const expiry = card?.expMonth && card?.expYear ? `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}` : ''
  return (
    <div className={`relative mx-auto aspect-[1.586/1] w-full max-w-[22rem] overflow-hidden rounded-[18px] bg-gradient-to-br ${theme} p-5 text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.65)] ring-1 ring-white/10`}>
      <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_40%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <Chip />
          <Contactless />
        </div>
        <div>
          <div className="flex items-center gap-3" aria-label={card ? `Card ending in ${card.last4 || ''}` : 'No card on file'}>
            <Dots /><Dots /><Dots />
            <span className="text-[22px] font-semibold leading-none tabular-nums tracking-[0.12em]">{card ? card.last4 || '••••' : '••••'}</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">{card ? 'Valid thru' : 'No card on file'}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-wide">{expiry || (card ? '—' : 'Add a card')}</p>
            </div>
            <BrandMark brand={card?.brand} />
          </div>
        </div>
      </div>
    </div>
  )
}

const CARD_ERRORS = {
  processing_failed: 'The card was declined or could not be verified. Please try another card.',
  unauthorized: 'This page was open for too long. Refresh it and try again.',
  invalid_request: 'The card form could not start. Refresh the page and try again.',
}

const PAYMENT_BADGE = { paid: 'success', refunded: 'warning', partially_refunded: 'warning', pending: 'default' }

/**
 * Billing page for a workspace that pays through Polar: plan hero with the billing-period progress, payment
 * history, the saved card and the buttons that open Polar's secure portal. Renders nothing for workspaces without a
 * Polar subscription (the caller shows the trial card then).
 */
export default function BillingCard({ firebaseUser, onLoaded }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [reloadKey, setReloadKey] = useState(0)
  const [cardUi, setCardUi] = useState({ busy: false, notice: '', error: '' })
  const embedRef = useRef(null)

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
  }, [firebaseUser, onLoaded, reloadKey])

  /**
   * Replace the card without leaving Nexora: Polar's own secure card form opens on top of this page (the card number
   * goes to Polar and Stripe, never to us). On success the new card becomes the default and the old ones are removed.
   * If the form cannot open (for example this site is not allowed in Polar's embed settings) we fall back to Polar's page.
   */
  const replaceCard = useCallback(async (portalUrl, sessionToken) => {
    const goPortalPage = () => { if (portalUrl) window.location.assign(portalUrl) }
    if (!sessionToken) { goPortalPage(); return }
    setCardUi({ busy: true, notice: '', error: '' })
    let loaded = false
    let finished = false
    const fallback = setTimeout(() => {
      if (loaded || finished) return
      finished = true
      try { embedRef.current?.close() } catch { /* already gone */ }
      goPortalPage()
    }, 12000)
    try {
      const { PolarEmbedPaymentMethod } = await import('@polar-sh/checkout/payment-method')
      const embed = await PolarEmbedPaymentMethod.create({
        sessionToken,
        setAsDefault: true,
        locale: 'en',
        onLoaded: () => { loaded = true; clearTimeout(fallback) },
      })
      embedRef.current = embed
      embed.addEventListener('success', async (event) => {
        finished = true
        clearTimeout(fallback)
        try { embed.close() } catch { /* already closed */ }
        try {
          await finishCardReplacement(firebaseUser, event?.detail?.paymentMethodId)
          setCardUi({ busy: false, notice: 'Your new card is saved and is now your payment card.', error: '' })
        } catch (error) {
          setCardUi({ busy: false, notice: 'Your new card is saved and is now your default card.', error: `${error.message} You can remove it on Polar's page.` })
        }
        setReloadKey((key) => key + 1)
      })
      embed.addEventListener('error', (event) => {
        finished = true
        clearTimeout(fallback)
        setCardUi({ busy: false, notice: '', error: CARD_ERRORS[event?.detail?.code] || 'The card could not be saved. Please try again.' })
      })
      embed.addEventListener('close', () => {
        clearTimeout(fallback)
        setCardUi((current) => (current.busy ? { ...current, busy: false } : current))
      })
    } catch {
      clearTimeout(fallback)
      finished = true
      goPortalPage()
    }
  }, [firebaseUser])

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
            <button type="button" onClick={() => replaceCard(data.portalUrl, data.sessionToken)} disabled={cardUi.busy || (!data.sessionToken && !data.portalUrl)} className={`${portalButton} bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900`}>{cardUi.busy ? 'Opening secure form…' : card ? 'Replace card' : 'Add card'}</button>
            {card ? <button type="button" onClick={goPortal} disabled={!data.portalUrl} className={`${portalButton} border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300`}>Remove card</button> : null}
          </div>
          {cardUi.notice ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{cardUi.notice}</p> : null}
          {cardUi.error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{cardUi.error}</p> : null}
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">The card form is Polar's secure form, so Nexora never sees your card number. Your new card becomes your payment card and the old one is removed.</p>
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
