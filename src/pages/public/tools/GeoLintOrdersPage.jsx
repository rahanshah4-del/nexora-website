import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH, GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import { fetchOrderFile, getMyOrder, getOrderMessages, listMyOrders, sendOrderMessage, signOutClient, uploadOrderFile } from '../../../lib/geolintClient.js'
import { ACCESS_OPTIONS, DEFAULT_TARGET, PLATFORM_OPTIONS, formatMoney, isOpen, optionLabel, orderErrorMessage, planLabel, statusInfo } from '../../../lib/geolintFix.js'
import { loadDraft } from '../../../lib/geolintDraft.js'
import { formatLocalTime } from '../../../lib/geolint.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ChatIntro, ScoreBars, ScoreCompare, SignInCard, StatusPill, Stepper } from './GeoLintFixShared.jsx'
import PaymentPanel from './GeoLintPayment.jsx'
import CompleteCard from './GeoLintComplete.jsx'
import { downloadOrderReport } from '../../../lib/geolintReportPdf.js'
import { useFixClient } from './geolintFixHooks.js'
import { GscConnect, GscData } from './GeoLintGsc.jsx'
import GeoLintChat, { BubbleIcon, ChatLauncher } from './GeoLintChat.jsx'
import './geolint.css'
import { GlLoader, GlSkeleton } from './GeoLintLoader.jsx'

const NEEDS_PAYMENT = ['awaiting_payment', 'payment_submitted']
const chatFrom = (order) => (order?.chat ? { messages: order.messages || [], state: order.chat.state, unread: order.chat.unread, staffReadAt: order.chat.staffReadAt } : null)

function Shell({ children, title = 'Dashboard', detail = false }) {
  return (
    <PublicPageShell stickyBar={false} backTo={detail ? GEOLINT_ORDERS_PATH : GEOLINT_PATH} backLabel={detail ? 'Back to dashboard' : 'Back to GeoLint'}>
      <PageSeo title={`${title} | GeoLint`} description="Your GeoLint fix orders." canonical={`https://nexorasolution.us${GEOLINT_ORDERS_PATH}/`} path={GEOLINT_ORDERS_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-8">{children}</div>
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

const BASE_TABS = [
  { id: 'progress', label: 'Progress' },
  { id: 'results', label: 'Results' },
  { id: 'search', label: 'Search data' },
  { id: 'details', label: 'Order details' },
]
const MESSAGES_TAB = { id: 'messages', label: 'Messages', icon: BubbleIcon }

const DETAIL_ICONS = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.5-3.6 3-5.5 6-5.5s5.5 1.9 6 5.5M16 5.2a3.2 3.2 0 0 1 0 5.8M18 14.8c1.6.8 2.7 2.4 3 5.2" /></>,
}
const DETAIL_TONES = { blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', slate: 'bg-slate-100 text-slate-600' }

/** One fact of the order in its own small card. */
function DetailCard({ icon, label, tone = 'slate', children }) {
  return (
    <section className="gx-card flex gap-3.5 p-4 sm:p-5" aria-label={label}>
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${DETAIL_TONES[tone] || DETAIL_TONES.slate}`} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{DETAIL_ICONS[icon]}</svg>
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-1 text-[14.5px] font-semibold leading-6 text-slate-900">{children}</div>
      </div>
    </section>
  )
}

/** Downloads the PDF report of the order. */
const CRAWL_TONE = { high: 'bg-rose-100 text-rose-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-700' }

/** The whole-website crawl: how many pages were checked, the site-wide findings, and a table of every page (weakest first). */
function CrawlSection({ crawl }) {
  const d = crawl.distribution || {}
  const stats = [
    ['Pages checked', crawl.pagesAudited],
    ['Site score', crawl.score?.indexable ?? '—'],
    ['Weak pages', (d.fair || 0) + (d.poor || 0)],
    ['Findings', crawl.issues?.length || 0],
  ]
  return (
    <section className="gx-card p-5 sm:p-6" aria-labelledby="crawl">
      <h2 id="crawl" className="text-[18px] font-bold text-slate-950">Your whole website, page by page</h2>
      <p className="mt-1 text-[14px] leading-6 text-slate-600">We checked {crawl.pagesAudited} page{crawl.pagesAudited === 1 ? '' : 's'}{crawl.pagesDiscovered > crawl.pagesAudited ? ` of the ${crawl.pagesDiscovered} we found` : ''}. The full list is also in your PDF report.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-slate-50 p-3">
            <dt className="text-[12px] font-semibold text-slate-500">{k}</dt>
            <dd className="mt-0.5 text-[22px] font-extrabold text-slate-950">{v}</dd>
          </div>
        ))}
      </dl>
      {crawl.issues?.length ? (
        <details className="mt-4" open>
          <summary className="cursor-pointer text-[14px] font-semibold text-blue-700">Site-wide findings ({crawl.issues.length})</summary>
          <ul className="mt-2 space-y-2">
            {crawl.issues.slice(0, 15).map((i) => (
              <li key={i.title} className="rounded-xl border border-slate-200 p-3 text-[14px] leading-6 text-slate-700">
                <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-black uppercase ${CRAWL_TONE[i.severity] || CRAWL_TONE.low}`}>{i.severity}</span>
                <span className="font-semibold text-slate-950">{i.title}</span> <span className="text-slate-500">({i.count} page{i.count === 1 ? '' : 's'})</span>
                {i.steps?.[0] ? <span className="mt-1 block text-[13px] text-slate-600">Fix: {i.steps[0]}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {crawl.pages?.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-[14px] font-semibold text-blue-700">All pages, weakest first ({crawl.pages.length}{crawl.pagesOmitted ? ` of ${crawl.pages.length + crawl.pagesOmitted}` : ''})</summary>
          <ul className="mt-2 divide-y divide-slate-100">
            {crawl.pages.map((p) => (
              <li key={p.url} className="flex items-start gap-3 py-2">
                <span className="w-12 shrink-0 rounded-lg bg-slate-100 px-1 py-0.5 text-center text-[13px] font-extrabold text-slate-900">{p.scorePercent ?? (p.status ? p.status : '—')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-[13px] font-semibold text-slate-900">{p.url.replace(/^https?:\/\//, '')}</span>
                  {p.top?.length ? <span className="block text-[12px] leading-5 text-slate-500">{p.top.join(' · ')}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function ReportButton({ order, target }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function go() {
    setBusy(true)
    setFailed(false)
    try { await downloadOrderReport(order, { target }) } catch { setFailed(true) } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={go} disabled={busy} className="gx-focus inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
        {busy ? 'Building your PDF…' : 'Download PDF report'}
      </button>
      {failed ? <span role="alert" className="text-[13px] font-semibold text-rose-700">Could not build the PDF. Try again.</span> : null}
    </div>
  )
}

/** Section switcher: a pill group that scrolls sideways on a phone instead of wrapping. */
function Tabs({ tabs, tab, onTab, badges = [] }) {
  return (
    <div role="tablist" aria-label="Order sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-slate-100 p-1 sm:min-w-0">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => onTab(t.id)} className={`gx-focus inline-flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-[14px] font-semibold transition sm:flex-none ${tab === t.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}>
            {t.icon ? <span className="inline-flex text-[#0a84ff]" aria-hidden="true"><t.icon size={17} /></span> : null}{t.label}{badges.includes(t.id) ? <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="needs attention" /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderDetail({ id }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, order: null, instructions: null, target: DEFAULT_TARGET, error: '', chat: null })
  const [tab, setTab] = useState('progress')
  const apply = useCallback((order) => setState((s) => ({ ...s, order, chat: chatFrom(order), instructions: NEEDS_PAYMENT.includes(order.status) ? s.instructions : null })), [])

  useEffect(() => {
    let live = true
    getMyOrder(id)
      .then((r) => live && setState({ loading: false, order: r.order, instructions: r.paymentInstructions, target: r.targetScore || DEFAULT_TARGET, error: '', chat: chatFrom(r.order) }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e?.status === 404 ? 'We could not find this order in your account.' : orderErrorMessage(e) })))
    return () => { live = false }
  }, [id])

  // keep the order live while the page is open: when the team confirms the payment, runs the re-audit or completes the order, it changes here
  // within seconds and on returning to the tab, with no refresh. A banner says what changed.
  const status = state.order?.status
  const signature = state.order ? `${state.order.status}|${state.order.updatedAt}|${state.order.events?.length}|${state.order.before?.scorePercent}|${state.order.after?.scorePercent}` : ''
  const [update, setUpdate] = useState(null)
  useEffect(() => {
    if (!status || status === 'cancelled' || status === 'refunded') return undefined
    let stop = false
    const check = () => {
      if (stop || (typeof document !== 'undefined' && document.hidden)) return
      getMyOrder(id).then((r) => {
        if (stop) return
        const o = r.order
        const next = `${o.status}|${o.updatedAt}|${o.events?.length}|${o.before?.scorePercent}|${o.after?.scorePercent}`
        if (next === signature) return
        apply(o)
        if (o.status !== status) setUpdate({ status: o.status, key: Date.now() })
      }).catch(() => {})
    }
    const timer = setInterval(check, 8000)
    const wake = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', check)
    return () => { stop = true; clearInterval(timer); document.removeEventListener('visibilitychange', wake); window.removeEventListener('focus', check) }
  }, [id, status, signature, apply])

  // the chat: refresh every few seconds while the page is open, and tell the team the messages were read once the tab is open
  const chatState = state.chat?.state || 'hidden'
  useEffect(() => {
    if (chatState === 'hidden') return undefined
    const refresh = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      getOrderMessages(id, { markRead: tab === 'messages' })
        .then((r) => setState((s) => ({ ...s, chat: { messages: r.messages, state: r.chat.state, unread: tab === 'messages' ? 0 : r.chat.unread, staffReadAt: r.chat.staffReadAt } })))
        .catch(() => {})
    }
    if (tab === 'messages') refresh()
    const timer = setInterval(refresh, 10000)
    return () => clearInterval(timer)
  }, [id, chatState, tab])

  async function sendChat(payload) {
    const r = await sendOrderMessage(id, payload)
    setState((s) => ({ ...s, chat: { messages: r.messages, state: r.chat.state, unread: 0, staffReadAt: r.chat.staffReadAt } }))
  }
  const uploadChatFile = useCallback((file) => uploadOrderFile(id, file), [id])
  const loadChatFile = useCallback((fileId) => fetchOrderFile(id, fileId), [id])

  const { loading, order, target, error } = state
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
  const hasResults = Boolean(order.before || order.after || order.siteCrawl || order.competitors?.some((c) => c.scorePercent !== null))

  const nextText = info.text
  return (
    <div className="space-y-6">
      {location.state?.fresh ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-900">Order placed. Your order number is {order.id}.{order.status === 'awaiting_payment' ? ' Last step: pay below and we start.' : ''}</p> : null}

      {update ? (
        <div key={update.key} role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[14px] font-semibold text-blue-950 shadow-sm" style={{ animation: 'gc-rise 0.35s cubic-bezier(0.2,1,0.3,1) both' }}>
          <span className="min-w-0 flex-1">{update.status === 'completed' ? 'Your order is complete. Your result is ready.' : `Update: ${statusInfo(update.status).label}.`}</span>
          <button type="button" className="gx-focus rounded-full bg-blue-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700" onClick={() => { setTab('progress'); setUpdate(null); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{update.status === 'completed' ? 'See my result' : 'See progress'}</button>
          <button type="button" className="gx-focus rounded-full px-2 py-1.5 text-[13px] font-bold text-blue-800 hover:bg-blue-100" onClick={() => setUpdate(null)} aria-label="Dismiss">Dismiss</button>
        </div>
      ) : null}

      {chatState !== 'hidden' && tab !== 'messages' ? <ChatLauncher unread={state.chat?.unread || 0} onClick={() => { setTab('messages'); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }} /> : null}

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="break-words font-display text-[26px] font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{order.host}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14px] text-slate-600"><StatusPill status={order.status} /><span>Order {order.id}</span><span aria-hidden="true" className="text-slate-300">/</span><span>{planLabel(order.plan)}, {formatMoney(order.price)}</span></p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="min-w-0 space-y-6">
      <Tabs tabs={chatState === 'hidden' ? BASE_TABS : [BASE_TABS[0], MESSAGES_TAB, ...BASE_TABS.slice(1)]} tab={tab} onTab={setTab} badges={[needsPayment ? 'progress' : '', state.chat?.unread > 0 && tab !== 'messages' ? 'messages' : ''].filter(Boolean)} />

      {tab === 'progress' ? (
        <div role="tabpanel" id="panel-progress" aria-labelledby="tab-progress" className="space-y-6">
          {order.status === 'completed' ? <CompleteCard order={order} target={target} onSeeResults={() => setTab('results')} /> : null}
          <section className="gx-card p-5 sm:p-6" aria-label="Progress">
            <Stepper status={order.status} />
            {!closed ? <p className="mt-4 text-[14px] leading-6 text-slate-700">{info.text}</p> : null}
          </section>
          {order.status === 'awaiting_payment' || order.status === 'payment_submitted' ? <PaymentPanel order={order} onChange={apply} /> : null}
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

      {tab === 'messages' && state.chat ? (
        <div role="tabpanel" id="panel-messages" aria-labelledby="tab-messages" className="space-y-3">
          <ChatIntro />
          <GeoLintChat
            messages={state.chat.messages}
            mine="client"
            otherReadAt={state.chat.staffReadAt ?? null}
            title="Nexora team"
            subtitle={`Order ${order.id} · ${order.host}`}
            canWrite={state.chat.state === 'open'}
            closedText={order.status === 'completed' ? 'Your order is complete, so this chat is now read-only. You can still read everything above. For anything new, write to support@nexorasolution.us with your order number.' : 'This chat is closed. You can still read the messages above. For anything else, write to support@nexorasolution.us with your order number.'}
            emptyText="No messages yet. Say hello and tell us anything we should know about your website."
            onUpload={uploadChatFile}
            loadFile={loadChatFile}
            onSend={sendChat}
          />
        </div>
      ) : null}

      {tab === 'results' ? (
        <div role="tabpanel" id="panel-results" aria-labelledby="tab-results" className="space-y-6">
          {!hasResults ? <p className="gx-card p-5 text-[14px] leading-6 text-slate-700">Your score appears here once the first audit is attached to the order.</p> : null}
          {order.before || order.after ? (
            <section className="gx-card p-5 sm:p-6" aria-labelledby="score">
              <h2 id="score" className="text-[18px] font-bold text-slate-950">Your score</h2>
              <div className="mt-4"><ScoreCompare before={order.before} after={order.after} target={target} /></div>
              {order.before ? <div className="mt-4"><ReportButton order={order} target={target} /></div> : null}
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
          {order.siteCrawl ? <CrawlSection crawl={order.siteCrawl} /> : null}
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
        <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="space-y-4">
          <h2 className="sr-only">Order details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailCard icon="globe" label="Website" tone="blue">
              <a href={order.siteUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-blue-700 hover:underline">{order.siteUrl}</a>
            </DetailCard>
            <DetailCard icon="layers" label="Platform" tone="violet">{optionLabel(PLATFORM_OPTIONS, order.platform) || '—'}</DetailCard>
            <DetailCard icon="mail" label="Contact" tone="emerald">
              <span className="block break-all">{order.email}</span>
              {order.whatsapp ? <span className="block text-slate-600">{order.whatsapp} <span className="text-slate-400">(WhatsApp)</span></span> : null}
            </DetailCard>
            <DetailCard icon="tag" label="Plan" tone="amber">
              {planLabel(order.plan)}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-700">{formatMoney(order.price)}</span>
            </DetailCard>
            <DetailCard icon="clock" label="Placed">{formatLocalTime(order.createdAt)}</DetailCard>
            {order.payment?.method ? (
              <DetailCard icon="card" label="Payment" tone="emerald">
                {order.payment.method}
                {order.payment.reference ? <span className="block text-[13px] font-medium text-slate-500">Reference: {order.payment.reference}</span> : null}
                {order.payment.paidAt ? <span className="block text-[13px] font-medium text-emerald-700">Confirmed {formatLocalTime(order.payment.paidAt)}</span> : null}
              </DetailCard>
            ) : null}
            {order.accessMethod ? (
              <DetailCard icon="key" label="How we get access" tone="violet">
                {optionLabel(ACCESS_OPTIONS, order.accessMethod) || order.accessMethod}
                {order.accessNotes ? <span className="block text-[13px] font-medium text-slate-500">{order.accessNotes}</span> : null}
              </DetailCard>
            ) : null}
            {order.competitors?.length ? (
              <DetailCard icon="users" label="Competitors compared" tone="rose">
                <span className="block space-y-0.5">{order.competitors.map((c) => <span key={c.host || c.title} className="block break-all">{c.title || c.host}</span>)}</span>
              </DetailCard>
            ) : null}
          </div>
          {order.notes ? (
            <section className="gx-card p-5" aria-label="Your note">
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Your note to us</p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[14.5px] leading-6 text-slate-800">{order.notes}</p>
            </section>
          ) : null}
        </div>
      ) : null}
        </div>

        <div className="lg:sticky lg:top-24">
        <aside className="gx-card p-5" aria-label="Order summary">
          <h2 className="text-[15px] font-bold text-slate-950">Order summary</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Plan</dt><dd className="text-right font-semibold text-slate-900">{planLabel(order.plan)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Placed</dt><dd className="text-right font-semibold text-slate-900">{formatLocalTime(order.createdAt)}</dd></div>
            <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3"><dt className="text-slate-700">Total</dt><dd className="font-display text-xl font-bold tabular-nums text-slate-950">{formatMoney(order.price)}</dd></div>
          </dl>
          {nextText ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[13.5px] leading-5 text-slate-700"><strong className="block text-slate-950">{closed ? info.label : 'What happens next'}</strong>{nextText}</p> : null}
          <p className="mt-4 text-[13px] text-slate-500">Questions? Write to <a href="mailto:support@nexorasolution.us" className="font-semibold text-blue-700 hover:underline">support@nexorasolution.us</a> with your order number.</p>
        </aside>
        </div>
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
