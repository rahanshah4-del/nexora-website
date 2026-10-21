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
import { GlLoader, GlSkeleton } from './GeoLintLoader.jsx'

const NEEDS_PAYMENT = ['awaiting_payment', 'payment_submitted']

function Shell({ children, title = 'Dashboard', detail = false }) {
  return (
    <PublicPageShell backTo={detail ? GEOLINT_ORDERS_PATH : GEOLINT_PATH} backLabel={detail ? 'Back to dashboard' : 'Back to GeoLint'}>
      <PageSeo title={`${title} | GeoLint`} description="Your GeoLint fix orders." canonical={`https://nexorasolution.us${GEOLINT_ORDERS_PATH}/`} path={GEOLINT_ORDERS_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">{children}</div>
    </PublicPageShell>
  )
}

/** Top of the dashboard: the title, who is signed in, and the one thing a client does here. */
function DashboardHeader({ user, title, sub, action = true }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        {sub ? <p className="mt-1.5 text-[15px] leading-6 text-slate-600">{sub}</p> : null}
        <div className="gx-account mt-3">
          <span className="gx-account-email">{user.email}</span>
          <button type="button" onClick={() => signOutClient()} className="gx-pill">Sign out</button>
        </div>
      </div>
      {action ? <Link to={GEOLINT_FIX_PATH} className="gx-focus inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,.18)_inset,0_8px_20px_-8px_rgba(37,99,235,.65)] hover:bg-blue-700 sm:w-auto">New order</Link> : null}
    </header>
  )
}

/** Four numbers in one strip, divided by hairlines. Quieter than four separate cards. */
function StatStrip({ stats }) {
  return (
    <dl className="gx-card grid grid-cols-2 sm:grid-cols-4 [&>div]:p-4 sm:[&>div]:p-5">
      {stats.map((s, i) => (
        <div key={s.label} className={`min-w-0 border-slate-200 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i > 0 ? 'sm:border-l' : ''}`}>
          <dt className="text-[13px] text-slate-500">{s.label}</dt>
          <dd className={`mt-1 font-display text-[28px] font-bold leading-none tabular-nums ${s.tone || 'text-slate-950'}`}>{s.value}</dd>
          {s.hint ? <dd className="mt-1 text-[12.5px] text-slate-500">{s.hint}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

/** Four segments (payment, fixing, re-audit, done) lit up to where the order is. */
function MiniProgress({ status }) {
  const info = statusInfo(status)
  if (info.step < 0) return null
  const lit = status === 'completed' ? 4 : info.step + 1
  return (
    <span className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full ${i < lit ? (status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600') : 'gx-seg-track'}`} />)}
    </span>
  )
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
      <div className="mt-7 space-y-5" aria-live="polite">
        {state.loading ? <GlSkeleton rows={3} label="Loading your orders" /> : null}
        {state.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 font-semibold text-rose-800">{state.error}</p> : null}

        {unpaid.length ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:px-5">
            <p className="min-w-0 flex-1 text-[14.5px] leading-6 text-amber-950"><strong>{unpaid.length === 1 ? `${unpaid[0].host} is waiting for payment.` : `${unpaid.length} orders are waiting for payment.`}</strong> We start as soon as it is paid.</p>
            <Link to={`${GEOLINT_ORDERS_PATH}/${unpaid[0].id}`} className="gx-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-600 px-5 text-[14.5px] font-semibold text-white hover:bg-amber-700 sm:w-auto">Pay now</Link>
          </div>
        ) : null}

        {draft ? (
          <div className="gx-card flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <p className="min-w-0 flex-1 text-[14.5px] leading-6 text-slate-700"><strong className="text-slate-950">You have an order in progress</strong> for {draft.site.profile.host}. Pick up where you stopped.</p>
            <Link to={`${GEOLINT_FIX_PATH}?step=${draft.step}`} className="gx-focus inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-[14.5px] font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 sm:w-auto">Continue order</Link>
          </div>
        ) : null}

        {!state.loading && !state.error && items.length > 0 ? (
          <StatStrip stats={[
            { label: 'Active orders', value: active.length, tone: 'text-blue-700' },
            { label: 'Waiting for payment', value: unpaid.length, tone: unpaid.length ? 'text-amber-600' : '' },
            { label: 'Completed', value: done.length, tone: 'text-emerald-600' },
            { label: 'Best score gain', value: bestGain === null ? '—' : `${bestGain > 0 ? '+' : ''}${Math.round(bestGain * 10) / 10}`, hint: bestGain === null ? 'After your first fix' : 'points after the fix' },
          ]} />
        ) : null}

        {!state.loading && !state.error && items.length === 0 ? (
          <div className="gx-card px-6 py-12 text-center">
            <h2 className="font-display text-xl font-bold text-slate-950">No orders yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-6 text-slate-600">Order a fix and we make your website readable for AI search. You see every step here, and your score before and after.</p>
            <div className="mt-6 flex justify-center"><Link to={GEOLINT_FIX_PATH} className="gx-focus inline-flex min-h-[48px] items-center rounded-xl bg-blue-600 px-7 text-[15px] font-semibold text-white hover:bg-blue-700">Order a fix</Link></div>
          </div>
        ) : null}

        {items.length ? (
          <section aria-labelledby="orders-h">
            <h2 id="orders-h" className="mb-3 mt-2 text-[17px] font-bold text-slate-950">Your orders</h2>
            <ul className="space-y-3">
              {items.map((o) => (
                <li key={o.id} className="gx-card relative p-4 transition-colors hover:border-blue-300 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <Link to={`${GEOLINT_ORDERS_PATH}/${o.id}`} className="gx-focus rounded-md text-[17px] font-bold text-slate-950 after:absolute after:inset-0 after:rounded-[1.25rem] hover:text-blue-700">{o.host}</Link>
                      <p className="mt-0.5 text-[13px] text-slate-500">{o.id} <span aria-hidden="true">·</span> {planLabel(o.plan)} <span aria-hidden="true">·</span> {formatLocalTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {o.after !== null ? <span className="text-[13px] font-bold tabular-nums text-slate-700">{o.before ?? '—'} → {o.after}</span> : null}
                      <StatusPill status={o.status} />
                    </div>
                  </div>
                  <MiniProgress status={o.status} />
                  {o.status === 'awaiting_payment' ? <p className="mt-3 text-[13.5px] font-semibold text-amber-700">Next step: pay to start.</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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

/** Section switcher: a pill group that scrolls sideways on a phone instead of wrapping. */
function Tabs({ tab, onTab, badge }) {
  return (
    <div role="tablist" aria-label="Order sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-slate-100 p-1 sm:min-w-0">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => onTab(t.id)} className={`gx-focus inline-flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-[14px] font-semibold transition sm:flex-none ${tab === t.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}>
            {t.label}{badge === t.id ? <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="needs attention" /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderDetail({ id }) {
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
  if (loading) return <GlLoader title="Loading your order" hint="Fetching its latest status." />
  if (error || !order) return (
    <div>
      <p role="alert" className="font-semibold text-rose-700">{error || 'Order not found.'}</p>
      <p className="mt-4"><Link to={GEOLINT_ORDERS_PATH} className="gx-pill gx-pill-primary">Back to your dashboard</Link></p>
    </div>
  )
  const info = statusInfo(order.status)
  const closed = order.status === 'cancelled' || order.status === 'refunded'
  const needsPayment = NEEDS_PAYMENT.includes(order.status)
  const hasResults = Boolean(order.before || order.after || order.competitors?.some((c) => c.scorePercent !== null))

  const nextText = info.text
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-[13px]"><Link to={GEOLINT_ORDERS_PATH} className="gx-focus rounded-md font-semibold text-blue-700 hover:underline">Dashboard</Link> <span aria-hidden="true" className="text-slate-300">/</span> <span className="text-slate-600">{order.id}</span></nav>
      {location.state?.fresh ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-900">Order placed. Your order number is {order.id}.{order.status === 'awaiting_payment' ? ' Last step: pay below and we start.' : ''}</p> : null}

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="break-words font-display text-[26px] font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{order.host}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14px] text-slate-600"><StatusPill status={order.status} /><span>Order {order.id}</span><span aria-hidden="true" className="text-slate-300">/</span><span>{planLabel(order.plan)}, {formatMoney(order.price)}</span></p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="min-w-0 space-y-6">
      <Tabs tab={tab} onTab={setTab} badge={needsPayment ? 'progress' : null} />

      {tab === 'progress' ? (
        <div role="tabpanel" id="panel-progress" aria-labelledby="tab-progress" className="space-y-6">
          <section className="gx-card p-5 sm:p-6" aria-label="Progress">
            <Stepper status={order.status} />
            {!closed ? <p className="mt-4 text-[14px] leading-6 text-slate-700">{info.text}</p> : null}
          </section>
          {order.status === 'awaiting_payment' || order.status === 'payment_submitted' ? <PaymentPanel order={order} instructions={instructions} onChange={apply} /> : null}
          {order.events?.length ? (
            <section className="gx-card p-5 sm:p-6" aria-labelledby="tl">
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
          {!hasResults ? <p className="gx-card p-5 text-[14px] leading-6 text-slate-700">Your score appears here once the first audit is attached to the order.</p> : null}
          {order.before || order.after ? (
            <section className="gx-card p-5 sm:p-6" aria-labelledby="score">
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
            <section className="gx-card p-5 sm:p-6" aria-labelledby="comp">
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
            <section className="gx-card p-5 sm:p-6" aria-labelledby="gsc">
              <h2 id="gsc" className="text-[18px] font-bold text-slate-950">Your search data (optional)</h2>
              <p className="mb-4 mt-1 text-[14px] leading-6 text-slate-600">Connect Google Search Console and we use the searches people really make to write better answers on your pages. You also see your clicks and rankings here.</p>
              <GscConnect order={order} onData={(gsc) => setState((s) => ({ ...s, order: { ...s.order, gsc } }))} />
              {order.gsc ? <div className="mt-6 border-t border-slate-200 pt-6"><GscData gsc={order.gsc} /></div> : null}
            </section>
          ) : <p className="gx-card p-5 text-[14px] text-slate-700">This order is closed, so search data is not available.</p>}
        </div>
      ) : null}

      {tab === 'details' ? (
        <div role="tabpanel" id="panel-details" aria-labelledby="tab-details">
          <section className="gx-card p-5 sm:p-6" aria-labelledby="details">
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

        <aside className="gx-card p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="text-[15px] font-bold text-slate-950">Order summary</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Plan</dt><dd className="text-right font-semibold text-slate-900">{planLabel(order.plan)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Placed</dt><dd className="text-right font-semibold text-slate-900">{formatLocalTime(order.createdAt)}</dd></div>
            <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3"><dt className="text-slate-700">Total</dt><dd className="font-display text-xl font-bold tabular-nums text-slate-950">{formatMoney(order.price)}</dd></div>
          </dl>
          {nextText ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[13.5px] leading-5 text-slate-700"><strong className="block text-slate-950">{closed ? info.label : 'What happens next'}</strong>{nextText}</p> : null}
          <p className="mt-4 text-[13px] text-slate-500">Questions? Write to <a href="mailto:support@nexorasolution.online" className="font-semibold text-blue-700 hover:underline">support@nexorasolution.online</a> with your order number.</p>
        </aside>
      </div>
    </div>
  )
}

/** /tools/geo-audit/orders/ and /tools/geo-audit/orders/:id/: the client's orders. */
export default function GeoLintOrdersPage() {
  const { id } = useParams()
  const { user, ready } = useFixClient()
  return (
    <Shell detail={Boolean(id)}>
      {!ready ? <GlLoader title="Checking your sign-in" bar={false} /> : !user ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <div className="mt-6"><SignInCard title="Sign in to open your dashboard" /></div>
        </>
      ) : id ? <OrderDetail key={id} id={id} /> : <OrderList user={user} />}
    </Shell>
  )
}
