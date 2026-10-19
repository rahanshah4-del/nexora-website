import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH, GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import { getMyOrder, listMyOrders, signOutClient } from '../../../lib/geolintClient.js'
import { DEFAULT_TARGET, PLATFORM_OPTIONS, formatMoney, isOpen, optionLabel, orderErrorMessage, planLabel, statusInfo } from '../../../lib/geolintFix.js'
import { loadDraft } from '../../../lib/geolintDraft.js'
import { formatLocalTime } from '../../../lib/geolint.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ScoreBars, ScoreCompare, SignInCard, StatusPill, Stepper } from './GeoLintFixShared.jsx'
import PaymentPanel from './GeoLintPayment.jsx'
import { useFixClient } from './geolintFixHooks.js'
import { GscConnect, GscData } from './GeoLintGsc.jsx'
import './geolint.css'

const NEEDS_PAYMENT = ['awaiting_payment', 'payment_submitted']

function Shell({ children, title = 'Dashboard', detail = false }) {
  return (
    <PublicPageShell backTo={detail ? GEOLINT_ORDERS_PATH : GEOLINT_PATH} backLabel={detail ? 'Back to dashboard' : 'Back to GeoLint'}>
      <PageSeo title={`${title} | GeoLint`} description="Your GeoLint fix orders." canonical={`https://nexorasolution.online${GEOLINT_ORDERS_PATH}/`} path={GEOLINT_ORDERS_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">{children}</div>
    </PublicPageShell>
  )
}

/** Top of the dashboard: who is signed in, and the two things a client does here. */
function DashboardHeader({ user, title, sub }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-blue-700">GeoLint dashboard</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        {sub ? <p className="mt-1 text-[14px] text-slate-600">{sub}</p> : null}
        <p className="mt-1 break-all text-[13px] text-slate-500">{user.email} · <button type="button" onClick={() => signOutClient()} className="font-semibold text-blue-700 hover:underline">Sign out</button></p>
      </div>
      <Link to={GEOLINT_FIX_PATH} className="inline-flex min-h-[44px] items-center rounded-full bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,.7)] hover:from-blue-500 hover:to-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">+ New order</Link>
    </header>
  )
}

function StatCard({ label, value, tone = 'slate', hint }) {
  const color = { slate: 'text-slate-950', amber: 'text-amber-600', emerald: 'text-emerald-600', blue: 'text-blue-700' }[tone]
  return (
    <div className="gl-card p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black tabular-nums ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[12.5px] text-slate-500">{hint}</p> : null}
    </div>
  )
}

/** A thin bar showing how far an order is: payment, fixing, re-audit, done. */
function MiniProgress({ status }) {
  const info = statusInfo(status)
  if (info.step < 0) return null
  const pct = status === 'completed' ? 100 : ((info.step + 0.5) / 4) * 100
  return <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className={`block h-full rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} /></span>
}

function OrderList({ user }) {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [draft] = useState(() => loadDraft(user.uid))
  useEffect(() => {
    let live = true
    listMyOrders()
      .then((r) => live && setState({ loading: false, items: r.items, error: '' }))
      .catch((e) => live && setState({ loading: false, items: [], error: orderErrorMessage(e) }))
    return () => { live = false }
  }, [])
  const { items } = state
  const unpaid = items.filter((o) => o.status === 'awaiting_payment')
  const active = items.filter((o) => isOpen(o.status))
  const done = items.filter((o) => o.status === 'completed')
  const gains = done.filter((o) => o.before !== null && o.after !== null).map((o) => o.after - o.before)
  const bestGain = gains.length ? Math.max(...gains) : null

  return (
    <>
      <DashboardHeader user={user} title="Dashboard" sub="Your orders, payments and results in one place." />
      <div className="mt-6 space-y-4" aria-live="polite">
        {state.loading ? <p className="text-slate-500" role="status">Loading your orders…</p> : null}
        {state.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-800">{state.error}</p> : null}

        {draft ? (
          <div className="gl-card flex flex-wrap items-center justify-between gap-3 border-blue-200 p-4">
            <p className="text-[14px] text-slate-800"><strong className="text-slate-950">You have an order in progress</strong> for {draft.site.profile.host}. Pick up where you stopped.</p>
            <Link to={`${GEOLINT_FIX_PATH}?step=${draft.step}`} className="inline-flex min-h-[40px] items-center rounded-full bg-blue-600 px-5 text-[14px] font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Continue</Link>
          </div>
        ) : null}

        {unpaid.length ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-[14px] font-semibold text-amber-900">{unpaid.length === 1 ? `${unpaid[0].host} is waiting for payment.` : `${unpaid.length} orders are waiting for payment.`} We start as soon as it is paid.</p>
            <Link to={`${GEOLINT_ORDERS_PATH}/${unpaid[0].id}`} className="inline-flex min-h-[40px] items-center rounded-full bg-amber-600 px-5 text-[14px] font-semibold text-white hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Pay now</Link>
          </div>
        ) : null}

        {!state.loading && !state.error && items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active orders" value={active.length} tone="blue" />
            <StatCard label="Waiting for payment" value={unpaid.length} tone={unpaid.length ? 'amber' : 'slate'} />
            <StatCard label="Completed" value={done.length} tone="emerald" />
            <StatCard label="Best score gain" value={bestGain === null ? '—' : `${bestGain > 0 ? '+' : ''}${Math.round(bestGain * 10) / 10}`} hint="points after the fix" />
          </div>
        ) : null}

        {!state.loading && !state.error && items.length === 0 ? (
          <div className="gl-card p-8 text-center">
            <h2 className="font-display text-xl font-bold text-slate-950">No orders yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-slate-600">Order a fix and we make your website readable for AI search. You see every step here, and your score before and after.</p>
            <div className="mt-5"><Link to={GEOLINT_FIX_PATH} className="inline-flex min-h-[44px] items-center rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white hover:bg-blue-700">Order a fix</Link></div>
          </div>
        ) : null}

        {items.length ? <h2 className="pt-2 text-[16px] font-bold text-slate-950">Your orders</h2> : null}
        {items.map((o) => (
          <Link key={o.id} to={`${GEOLINT_ORDERS_PATH}/${o.id}`} className="gl-card block p-4 transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-bold text-slate-950">{o.host}</span>
                <span className="block text-[13px] text-slate-500">{o.id} · {planLabel(o.plan)} · {formatLocalTime(o.createdAt)}</span>
              </span>
              <span className="flex items-center gap-3">
                {o.after !== null ? <span className="text-[13px] font-bold text-slate-700">{o.before ?? '—'} → {o.after}</span> : null}
                <StatusPill status={o.status} />
              </span>
            </span>
            <MiniProgress status={o.status} />
            {o.status === 'awaiting_payment' ? <span className="mt-2 block text-[13px] font-semibold text-amber-700">Next: pay to start →</span> : null}
          </Link>
        ))}
      </div>
    </>
  )
}

const TABS = [
  { id: 'progress', label: 'Progress' },
  { id: 'results', label: 'Results' },
  { id: 'search', label: 'Search data' },
  { id: 'details', label: 'Order details' },
]

function Tabs({ tab, onTab, badge }) {
  return (
    <div role="tablist" aria-label="Order sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => onTab(t.id)} className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${tab === t.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          {t.label}{badge === t.id ? <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="needs attention" /> : null}
        </button>
      ))}
    </div>
  )
}

function OrderDetail({ id, user }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, order: null, instructions: null, target: DEFAULT_TARGET, error: '' })
  const [tab, setTab] = useState('progress')
  const apply = useCallback((order) => setState((s) => ({ ...s, order, instructions: NEEDS_PAYMENT.includes(order.status) ? s.instructions : null })), [])

  useEffect(() => {
    let live = true
    getMyOrder(id)
      .then((r) => live && setState({ loading: false, order: r.order, instructions: r.paymentInstructions, target: r.targetScore || DEFAULT_TARGET, error: '' }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e?.status === 404 ? 'We could not find this order in your account.' : orderErrorMessage(e) })))
    return () => { live = false }
  }, [id])

  // keep the status fresh while the page is open: the team may confirm a payment or finish the fix at any time
  const status = state.order?.status
  useEffect(() => {
    if (!status || !isOpen(status)) return undefined
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      getMyOrder(id).then((r) => { if (r.order.status !== status || r.order.events?.length !== state.order?.events?.length) apply(r.order) }).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [id, status, apply, state.order?.events?.length])

  const { loading, order, instructions, target, error } = state
  if (loading) return <p className="text-slate-500" role="status">Loading…</p>
  if (error || !order) return (
    <div>
      <p role="alert" className="font-semibold text-rose-700">{error || 'Order not found.'}</p>
      <p className="mt-3"><Link to={GEOLINT_ORDERS_PATH} className="font-semibold text-blue-700 hover:underline">Back to your dashboard</Link></p>
    </div>
  )
  const info = statusInfo(order.status)
  const closed = order.status === 'cancelled' || order.status === 'refunded'
  const needsPayment = NEEDS_PAYMENT.includes(order.status)
  const hasResults = Boolean(order.before || order.after || order.competitors?.some((c) => c.scorePercent !== null))

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-[13px]"><Link to={GEOLINT_ORDERS_PATH} className="font-semibold text-blue-700 hover:underline">Dashboard</Link> <span aria-hidden="true">/</span> <span className="text-slate-600">{order.id}</span></nav>
      {location.state?.fresh ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-800">Order placed. Your order number is {order.id}.{order.status === 'awaiting_payment' ? ' Last step: pay below and we start.' : ''}</p> : null}

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">{order.host}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-slate-600"><span>Order {order.id}</span><StatusPill status={order.status} /><span>{planLabel(order.plan)}, {formatMoney(order.price)}</span></p>
        <p className="mt-1 break-all text-[12.5px] text-slate-500">{user.email}</p>
      </header>

      <Tabs tab={tab} onTab={setTab} badge={needsPayment ? 'progress' : null} />

      {tab === 'progress' ? (
        <div role="tabpanel" id="panel-progress" aria-labelledby="tab-progress" className="space-y-6">
          <section className="gl-card p-5 sm:p-6" aria-label="Progress">
            <Stepper status={order.status} />
            {!closed ? <p className="mt-4 text-[14px] leading-6 text-slate-700">{info.text}</p> : null}
          </section>
          {order.status === 'awaiting_payment' || order.status === 'payment_submitted' ? <PaymentPanel order={order} instructions={instructions} onChange={apply} /> : null}
          {order.events?.length ? (
            <section className="gl-card p-5 sm:p-6" aria-labelledby="tl">
              <h2 id="tl" className="text-[18px] font-bold text-slate-950">What happened</h2>
              <ol className="mt-3 space-y-3">
                {[...order.events].reverse().map((e, i) => (
                  <li key={`${e.at}-${i}`} className="border-l-2 border-blue-300 pl-4">
                    <p className="text-[12px] font-semibold text-slate-500">{formatLocalTime(e.at)}</p>
                    <p className="text-[14px] leading-6 text-slate-800">{e.note}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'results' ? (
        <div role="tabpanel" id="panel-results" aria-labelledby="tab-results" className="space-y-6">
          {!hasResults ? <p className="gl-card p-5 text-[14px] leading-6 text-slate-700">Your score appears here once the first audit is attached to the order.</p> : null}
          {order.before || order.after ? (
            <section className="gl-card p-5 sm:p-6" aria-labelledby="score">
              <h2 id="score" className="text-[18px] font-bold text-slate-950">Your score</h2>
              <div className="mt-4"><ScoreCompare before={order.before} after={order.after} target={target} /></div>
              <p className="mt-3 text-[13px] leading-5 text-slate-500">Both numbers come from the same GeoLint audit. Our target is {target}+. {order.after ? '' : 'The after score appears when we finish and re-run the audit.'}</p>
              {order.before?.issues?.length ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[14px] font-semibold text-blue-700">What the first audit found ({order.before.issues.length + (order.before.moreIssues || 0)})</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-6 text-slate-700">
                    {order.before.issues.map((i) => <li key={i.title}>{i.title}</li>)}
                  </ul>
                </details>
              ) : null}
            </section>
          ) : null}
          {order.competitors?.some((c) => c.scorePercent !== null) && order.before ? (
            <section className="gl-card p-5 sm:p-6" aria-labelledby="comp">
              <h2 id="comp" className="text-[18px] font-bold text-slate-950">You and your competitors</h2>
              <div className="mt-4"><ScoreBars own={{ scorePercent: order.after?.scorePercent ?? order.before.scorePercent, label: order.siteTitle || order.host }} competitors={order.competitors} /></div>
              <p className="mt-3 text-[13px] text-slate-500">{order.after ? 'Your bar shows your score after the fix.' : 'Your bar shows your score today. It moves after the fix.'}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'search' ? (
        <div role="tabpanel" id="panel-search" aria-labelledby="tab-search">
          {!closed ? (
            <section className="gl-card p-5 sm:p-6" aria-labelledby="gsc">
              <h2 id="gsc" className="text-[18px] font-bold text-slate-950">Your search data (optional)</h2>
              <p className="mb-4 mt-1 text-[14px] leading-6 text-slate-600">Connect Google Search Console and we use the searches people really make to write better answers on your pages. You also see your clicks and rankings here.</p>
              <GscConnect order={order} onData={(gsc) => setState((s) => ({ ...s, order: { ...s.order, gsc } }))} />
              {order.gsc ? <div className="mt-6 border-t border-slate-200 pt-6"><GscData gsc={order.gsc} /></div> : null}
            </section>
          ) : <p className="gl-card p-5 text-[14px] text-slate-700">This order is closed, so search data is not available.</p>}
        </div>
      ) : null}

      {tab === 'details' ? (
        <div role="tabpanel" id="panel-details" aria-labelledby="tab-details">
          <section className="gl-card p-5 sm:p-6" aria-labelledby="details">
            <h2 id="details" className="text-[18px] font-bold text-slate-950">Order details</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
              <div><dt className="text-slate-500">Website</dt><dd className="font-semibold text-slate-900 break-all">{order.siteUrl}</dd></div>
              <div><dt className="text-slate-500">Platform</dt><dd className="font-semibold text-slate-900">{optionLabel(PLATFORM_OPTIONS, order.platform)}</dd></div>
              <div><dt className="text-slate-500">Placed</dt><dd className="font-semibold text-slate-900">{formatLocalTime(order.createdAt)}</dd></div>
              <div><dt className="text-slate-500">Contact</dt><dd className="font-semibold text-slate-900">{order.email}{order.whatsapp ? `, ${order.whatsapp}` : ''}</dd></div>
              <div><dt className="text-slate-500">Plan</dt><dd className="font-semibold text-slate-900">{planLabel(order.plan)}, {formatMoney(order.price)}</dd></div>
              {order.payment?.method ? <div><dt className="text-slate-500">Payment</dt><dd className="font-semibold text-slate-900">{order.payment.method}{order.payment.reference ? `, ${order.payment.reference}` : ''}</dd></div> : null}
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  )
}

/** /tools/geo-audit/orders/ and /tools/geo-audit/orders/:id/: the client's orders. */
export default function GeoLintOrdersPage() {
  const { id } = useParams()
  const { user, ready } = useFixClient()
  return (
    <Shell detail={Boolean(id)}>
      {!ready ? <p className="text-slate-500" role="status">Loading…</p> : !user ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <div className="mt-6"><SignInCard title="Sign in to open your dashboard" /></div>
        </>
      ) : id ? <OrderDetail key={id} id={id} user={user} /> : <OrderList user={user} />}
    </Shell>
  )
}
