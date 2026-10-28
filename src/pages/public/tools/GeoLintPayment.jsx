import { useCallback, useEffect, useState } from 'react'
import { cancelMyOrder, getFixService, getMyOrder, startPolarCheckout } from '../../../lib/geolintClient.js'
import { formatMoney, orderErrorMessage } from '../../../lib/geolintFix.js'
import { canPayByCard, returnedFromCheckout } from '../../../lib/geolintPayment.js'
import { ActionButton } from './GeoLintFixShared.jsx'
import { GlLoader } from './GeoLintLoader.jsx'

const WALLETS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay']

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)

const Step = ({ n, children }) => (
  <li className="flex items-start gap-3 text-[14px] leading-5 text-slate-600">
    <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{n}</span>
    <span>{children}</span>
  </li>
)

/**
 * Pay for an order by card. The card is paid on Polar's secure page and the engine marks the order paid from
 * Polar's webhook; the browser never decides that. After paying, Polar sends the client back here (?paid=1)
 * and the page looks for the change for about a minute.
 */
export default function PaymentPanel({ order, onChange }) {
  const [service, setService] = useState(undefined)
  const [waiting, setWaiting] = useState(() => typeof window !== 'undefined' && returnedFromCheckout(window.location.search))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const submitted = order.status === 'payment_submitted'

  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setService(s || null)).catch(() => live && setService(null))
    return () => { live = false }
  }, [])

  const loading = service === undefined
  const cardReady = canPayByCard(service, order.plan)

  // back from Polar: the webhook marks the order paid a moment later, so look for it for a minute
  useEffect(() => {
    if (!waiting) return undefined
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      getMyOrder(order.id)
        .then((r) => { if (r.order.status !== order.status) { setWaiting(false); onChange(r.order) } })
        .catch(() => {})
      if (tries >= 20) { clearInterval(timer); setWaiting(false) }
    }, 3000)
    return () => clearInterval(timer)
  }, [waiting, order.id, order.status, onChange])

  const payByCard = useCallback(async () => {
    setBusy('card')
    setError('')
    try {
      window.location.assign(await startPolarCheckout(order.id))
    } catch (e) {
      setError(orderErrorMessage(e))
      setBusy('')
    }
  }, [order.id])

  const cancel = async () => {
    setBusy('cancel')
    setError('')
    try {
      const r = await cancelMyOrder(order.id)
      onChange(r.order)
    } catch (e) {
      setError(orderErrorMessage(e))
      setConfirmCancel(false)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="gx-card overflow-hidden p-0" aria-labelledby="pay">
      <div className="px-5 pb-6 pt-7 text-center sm:px-8 sm:pt-9">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500">Amount due</p>
        <h2 id="pay" className="sr-only">Pay to start your order</h2>
        <p className="mt-2 font-display text-[46px] font-bold leading-none tracking-tight tabular-nums text-slate-950 sm:text-[56px]">{formatMoney(order.price)}</p>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-slate-600">{order.host ? <>One-time payment for the fix on <strong className="font-semibold text-slate-900">{order.host}</strong>.</> : 'One-time payment for your GeoLint website fix.'} We begin as soon as it goes through.</p>
      </div>

      <div className="border-t border-slate-200/80 bg-slate-50/70 px-5 py-6 sm:px-8">
        {submitted ? (
          <p className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[14px] leading-6 text-blue-900">You told us earlier that you paid with <strong>{order.payment?.method}</strong> (reference <strong>{order.payment?.reference}</strong>). We are checking it. You can also pay by card below.</p>
        ) : null}

        {loading ? <GlLoader title="Loading payment" bar={false} /> : null}

        {!loading && cardReady ? (
          <div>
            <ActionButton tone="dark" onClick={payByCard} busy={busy === 'card'} disabled={Boolean(busy) || waiting} full className="!min-h-[56px] !w-full !rounded-full !text-[17px]">Pay {formatMoney(order.price)} by card</ActionButton>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[13px] leading-5 text-slate-500"><LockIcon />Secure checkout on Polar. We never see your card details.</p>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5" aria-label="Accepted payment methods">
              {WALLETS.map((w) => <li key={w} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">{w}</li>)}
            </ul>
            {waiting ? <p role="status" className="mt-4 text-center text-[14px] font-semibold text-blue-700">Payment received. Confirming your order…</p> : null}
            <ol className="mx-auto mt-6 max-w-sm space-y-2.5 border-t border-slate-200 pt-5">
              <Step n="1">You pay on Polar's secure page.</Step>
              <Step n="2">You come back here and your order starts by itself.</Step>
              <Step n="3">We ask for access to your site, make the fixes and re-audit.</Step>
            </ol>
          </div>
        ) : null}

        {!loading && !cardReady ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-[14px] leading-6 text-amber-900">Card payment is not available for this order right now. Write to <a className="font-semibold underline" href={`mailto:support@nexorasolution.us?subject=Order%20${order.id}`}>support@nexorasolution.us</a> with order number <strong>{order.id}</strong> and we will help you straight away.</p>
        ) : null}

        {error ? <p role="alert" className="mt-4 text-center text-[14px] font-semibold text-rose-700">{error}</p> : null}
      </div>

      <div className="border-t border-slate-200/80 px-5 py-4 text-center sm:px-8">
        {confirmCancel ? (
          <p className="flex flex-wrap items-center justify-center gap-3 text-[14px] text-slate-700">
            Cancel this order?
            <button type="button" onClick={cancel} disabled={Boolean(busy)} className="gx-focus min-h-[40px] rounded-xl bg-rose-600 px-4 text-[14px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Yes, cancel it</button>
            <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-[40px] rounded-full px-4 text-[14px] font-semibold text-slate-700 hover:underline">Keep it</button>
          </p>
        ) : (
          <button type="button" onClick={() => setConfirmCancel(true)} disabled={Boolean(busy)} className="text-[13px] font-semibold text-slate-500 hover:text-rose-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60">Cancel this order</button>
        )}
      </div>
    </section>
  )
}
