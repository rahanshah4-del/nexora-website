import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH } from '../../../lib/geolintLaunch.js'
import { cancelMyOrder, getFixService, getMyOrder, listMyOrders, openPaddleCheckout, signOutClient, submitPayment } from '../../../lib/geolintClient.js'
import { DEFAULT_TARGET, PLATFORM_OPTIONS, formatMoney, optionLabel, orderErrorMessage, planLabel, statusInfo } from '../../../lib/geolintFix.js'
import { formatLocalTime } from '../../../lib/geolint.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ActionButton, ScoreBars, ScoreCompare, SignInCard, StatusPill, Stepper } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'
import { GscConnect, GscData } from './GeoLintGsc.jsx'
import './geolint.css'

const inputClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600'

function Shell({ children, title = 'Your orders' }) {
  return (
    <PublicPageShell>
      <PageSeo title={`${title} | GeoLint`} description="Your GeoLint fix orders." canonical={`https://nexorasolution.online${GEOLINT_ORDERS_PATH}/`} path={GEOLINT_ORDERS_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">{children}</div>
    </PublicPageShell>
  )
}

function OrderList({ user }) {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  useEffect(() => {
    let live = true
    listMyOrders()
      .then((r) => live && setState({ loading: false, items: r.items, error: '' }))
      .catch((e) => live && setState({ loading: false, items: [], error: orderErrorMessage(e) }))
    return () => { live = false }
  }, [])
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">Your orders</h1>
      <p className="mt-2 text-[14px] text-slate-600">Signed in as <strong className="text-slate-900">{user.email}</strong>. <button type="button" onClick={() => signOutClient()} className="font-semibold text-blue-700 hover:underline">Sign out</button></p>
      <div className="mt-6 space-y-3" aria-live="polite">
        {state.loading ? <p className="text-slate-500" role="status">Loading…</p> : null}
        {state.error ? <p role="alert" className="font-semibold text-rose-700">{state.error}</p> : null}
        {!state.loading && !state.error && state.items.length === 0 ? (
          <div className="gl-card p-6 text-[15px] text-slate-700">You have no orders yet. <Link to={GEOLINT_FIX_PATH} className="font-semibold text-blue-700 hover:underline">Order a fix</Link>.</div>
        ) : null}
        {state.items.map((o) => (
          <Link key={o.id} to={`${GEOLINT_ORDERS_PATH}/${o.id}`} className="gl-card flex flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <span>
              <span className="block text-[16px] font-bold text-slate-950">{o.host}</span>
              <span className="block text-[13px] text-slate-500">{o.id} · {planLabel(o.plan)} · {formatLocalTime(o.createdAt)}</span>
            </span>
            <span className="flex items-center gap-3">
              {o.after !== null ? <span className="text-[13px] font-bold text-slate-700">{o.before ?? '—'} → {o.after}</span> : null}
              <StatusPill status={o.status} />
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

function PaymentCard({ order, instructions, onChange }) {
  const [paddle, setPaddle] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const submitted = order.status === 'payment_submitted'

  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setPaddle(s.paddle || null)).catch(() => {})
    return () => { live = false }
  }, [])

  // after the card is accepted the engine marks the order paid from Paddle's webhook; look for it for a minute
  useEffect(() => {
    if (!waiting) return undefined
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      getMyOrder(order.id)
        .then((r) => {
          if (r.order.status !== order.status) { setWaiting(false); onChange(r.order) }
        })
        .catch(() => {})
      if (tries >= 20) { clearInterval(timer); setWaiting(false) }
    }, 3000)
    return () => clearInterval(timer)
  }, [waiting, order.id, order.status, onChange])

  const payByCard = async () => {
    setBusy('card')
    setError('')
    try {
      await openPaddleCheckout({ paddle, order, onCompleted: () => setWaiting(true) })
    } catch (e) {
      setError(orderErrorMessage(e))
    } finally {
      setBusy('')
    }
  }

  const send = async (event) => {
    event.preventDefault()
    if (method.trim().length < 2 || reference.trim().length < 2) {
      setError('Enter how you paid and the payment reference or transaction number.')
      return
    }
    setBusy('pay')
    setError('')
    try {
      const r = await submitPayment(order.id, { method: method.trim(), reference: reference.trim() })
      onChange(r.order)
    } catch (e) {
      setError(orderErrorMessage(e))
    } finally {
      setBusy('')
    }
  }
  const cancel = async () => {
    setBusy('cancel')
    setError('')
    try {
      const r = await cancelMyOrder(order.id)
      onChange(r.order)
    } catch (e) {
      setError(orderErrorMessage(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="gl-card p-5 sm:p-6" aria-labelledby="pay">
      <h2 id="pay" className="text-[18px] font-bold text-slate-950">Pay {formatMoney(order.price)}</h2>
      {paddle ? (
        <div className="mt-4">
          <ActionButton onClick={payByCard} busy={busy === 'card'} disabled={Boolean(busy) || waiting}>Pay {formatMoney(order.price)} by card</ActionButton>
          <p className="mt-2 text-[13px] leading-5 text-slate-500">Secure card payment by Paddle. Your order updates by itself a moment after you pay. We never see your card details.</p>
          {waiting ? <p role="status" className="mt-2 text-[14px] font-semibold text-blue-700">Payment received. Confirming your order…</p> : null}
          <p className="mt-4 text-[14px] font-semibold text-slate-700">Or pay by bank or mobile wallet</p>
        </div>
      ) : null}
      {instructions ? <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-100 p-4 text-[14px] leading-6 text-slate-800">{instructions}</p> : null}
      {submitted ? (
        <p className="mt-4 text-[14px] leading-6 text-slate-700">You told us you paid with <strong>{order.payment.method}</strong> (reference <strong>{order.payment.reference}</strong>). We will confirm it shortly. Paid with a different reference? Send it again below.</p>
      ) : null}
      <form onSubmit={send} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="pm" className="block text-[13px] font-semibold text-slate-800">How did you pay?</label>
          <input id="pm" className={`${inputClass} mt-1`} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="JazzCash, Easypaisa, bank, card…" maxLength={40} />
        </div>
        <div>
          <label htmlFor="pr" className="block text-[13px] font-semibold text-slate-800">Reference or transaction number</label>
          <input id="pr" className={`${inputClass} mt-1`} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={160} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <ActionButton type="submit" busy={busy === 'pay'} disabled={Boolean(busy)}>I have paid</ActionButton>
          <button type="button" onClick={cancel} disabled={Boolean(busy)} className="min-h-[44px] rounded-full px-4 text-[14px] font-semibold text-slate-600 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60">Cancel this order</button>
        </div>
      </form>
      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}
    </section>
  )
}

function OrderDetail({ id }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, order: null, instructions: null, target: DEFAULT_TARGET, error: '' })
  const apply = useCallback((order) => setState((s) => ({ ...s, order, instructions: ['awaiting_payment', 'payment_submitted'].includes(order.status) ? s.instructions : null })), [])

  useEffect(() => {
    let live = true
    getMyOrder(id)
      .then((r) => live && setState({ loading: false, order: r.order, instructions: r.paymentInstructions, target: r.targetScore || DEFAULT_TARGET, error: '' }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e?.status === 404 ? 'We could not find this order in your account.' : orderErrorMessage(e) })))
    return () => { live = false }
  }, [id])

  const { loading, order, instructions, target, error } = state
  if (loading) return <p className="text-slate-500" role="status">Loading…</p>
  if (error || !order) return <p role="alert" className="font-semibold text-rose-700">{error || 'Order not found.'}</p>
  const info = statusInfo(order.status)
  const closed = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500"><Link to={GEOLINT_ORDERS_PATH} className="font-semibold text-blue-700 hover:underline">Your orders</Link> <span aria-hidden="true">/</span> {order.id}</nav>
      {location.state?.fresh ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-800">Order placed. Your order number is {order.id}.</p> : null}

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">{order.host}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-slate-600"><span>Order {order.id}</span><StatusPill status={order.status} /><span>{planLabel(order.plan)}, {formatMoney(order.price)}</span></p>
      </header>

      <section className="gl-card p-5 sm:p-6" aria-label="Progress">
        <Stepper status={order.status} />
        {!closed ? <p className="mt-4 text-[14px] leading-6 text-slate-700">{info.text}</p> : null}
      </section>

      {order.status === 'awaiting_payment' || order.status === 'payment_submitted' ? <PaymentCard order={order} instructions={instructions} onChange={apply} /> : null}

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

      {!closed ? (
        <section className="gl-card p-5 sm:p-6" aria-labelledby="gsc">
          <h2 id="gsc" className="text-[18px] font-bold text-slate-950">Your search data (optional)</h2>
          <p className="mb-4 mt-1 text-[14px] leading-6 text-slate-600">Connect Google Search Console and we use the searches people really make to write better answers on your pages. You also see your clicks and rankings here.</p>
          <GscConnect order={order} onData={(gsc) => setState((s) => ({ ...s, order: { ...s.order, gsc } }))} />
          {order.gsc ? <div className="mt-6 border-t border-slate-200 pt-6"><GscData gsc={order.gsc} /></div> : null}
        </section>
      ) : null}

      <section className="gl-card p-5 sm:p-6" aria-labelledby="details">
        <h2 id="details" className="text-[18px] font-bold text-slate-950">Order details</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
          <div><dt className="text-slate-500">Website</dt><dd className="font-semibold text-slate-900 break-all">{order.siteUrl}</dd></div>
          <div><dt className="text-slate-500">Platform</dt><dd className="font-semibold text-slate-900">{optionLabel(PLATFORM_OPTIONS, order.platform)}</dd></div>
          <div><dt className="text-slate-500">Placed</dt><dd className="font-semibold text-slate-900">{formatLocalTime(order.createdAt)}</dd></div>
          <div><dt className="text-slate-500">Contact</dt><dd className="font-semibold text-slate-900">{order.email}{order.whatsapp ? `, ${order.whatsapp}` : ''}</dd></div>
        </dl>
      </section>

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
  )
}

/** /tools/geo-audit/orders/ and /tools/geo-audit/orders/:id/: the client's orders. */
export default function GeoLintOrdersPage() {
  const { id } = useParams()
  const { user, ready } = useFixClient()
  return (
    <Shell>
      {!ready ? <p className="text-slate-500" role="status">Loading…</p> : !user ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">Your orders</h1>
          <div className="mt-6"><SignInCard title="Sign in to see your orders" /></div>
        </>
      ) : id ? <OrderDetail key={id} id={id} /> : <OrderList user={user} />}
    </Shell>
  )
}
