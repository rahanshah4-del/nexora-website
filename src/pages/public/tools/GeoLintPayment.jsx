import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelMyOrder, getFixService, getMyOrder, getPaymentSettings, openPaddleCheckout, submitPayment } from '../../../lib/geolintClient.js'
import { formatMoney, orderErrorMessage } from '../../../lib/geolintFix.js'
import { buildPaymentMethods, methodName, referenceFields, usdToPkr, validatePaymentProof } from '../../../lib/geolintPayment.js'
import { ActionButton } from './GeoLintFixShared.jsx'

const inputClass = 'w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus-visible:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-600/40'

/** platformSettings (the Control Centre's payment accounts) and the live USD to PKR rate. Both are public data. */
function usePaymentSources() {
  const [state, setState] = useState({ settingsDocs: null, rates: null })
  useEffect(() => {
    let live = true
    Promise.all([
      getPaymentSettings(),
      import('../../../lib/multiCurrency.js').then((fx) => fx.loadExchangeRates()).then((r) => r.rates).catch(() => null),
    ]).then(([settingsDocs, rates]) => live && setState({ settingsDocs, rates }))
    return () => { live = false }
  }, [])
  return state
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked: the number is still on screen to select */ }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="inline-flex min-h-[32px] items-center rounded-full border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

function AccountRow({ label, value, copy = true }) {
  if (!value) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="break-all text-[16px] font-bold text-slate-950">{value}</p>
      </div>
      {copy ? <CopyButton value={value} label={label} /> : null}
    </div>
  )
}

const ICONS = {
  card: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Zm0 2.5h18M7 15h3" />,
  phone: <path d="M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3Zm3 15.5h2" />,
  bank: <path d="M3 9.5 12 4l9 5.5M5 10v7m4-7v7m6-7v7m4-7v7M3 20h18" />,
  coin: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.5-11.5c-.4-1-1.3-1.5-2.5-1.5-1.4 0-2.5.7-2.5 2s1.2 1.7 2.5 2 2.5.7 2.5 2-1.1 2-2.5 2c-1.2 0-2.1-.5-2.5-1.5M12 6.5V8m0 8v1.5" />,
}
const iconFor = (id) => (id === 'card' ? ICONS.card : id === 'bank_transfer' ? ICONS.bank : id === 'crypto' ? ICONS.coin : ICONS.phone)

function MethodCard({ method, selected, onSelect }) {
  return (
    <label className={`gx-focus relative flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${selected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <input type="radio" name="payment-method" value={method.id} checked={selected} onChange={() => onSelect(method.id)} className="sr-only" />
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconFor(method.id)}</svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-slate-950">{method.label}</span>
        {method.badge ? <span className="block text-[12.5px] text-slate-500">{method.badge}</span> : null}
      </span>
      <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[11px] ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{selected ? '✓' : ''}</span>
    </label>
  )
}

/**
 * Pay for an order. The methods are the ones on the upgrade page (card, JazzCash, Easypaisa, bank, crypto).
 * Card is paid in Paddle's window and the engine marks the order paid from its webhook; every other method
 * is paid outside the site and confirmed by staff after the client sends the transaction number.
 */
export default function PaymentPanel({ order, instructions, onChange }) {
  const { settingsDocs, rates } = usePaymentSources()
  const [paddle, setPaddle] = useState(undefined)
  const [selected, setSelected] = useState('')
  const [reference, setReference] = useState('')
  const [manualName, setManualName] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const submitted = order.status === 'payment_submitted'

  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setPaddle(s.paddle || null)).catch(() => live && setPaddle(null))
    return () => { live = false }
  }, [])

  const methods = useMemo(() => (paddle === undefined || settingsDocs === null ? [] : buildPaymentMethods({ paddle, settingsDocs })), [paddle, settingsDocs])
  const loading = paddle === undefined || settingsDocs === null
  const method = methods.find((m) => m.id === selected) || methods[0] || null
  const pkr = usdToPkr(order.price?.amount, rates)

  // after the card is accepted the engine marks the order paid from Paddle's webhook; look for it for a minute
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
      await openPaddleCheckout({ paddle, order, onCompleted: () => setWaiting(true) })
    } catch (e) {
      setError(orderErrorMessage(e))
    } finally {
      setBusy('')
    }
  }, [paddle, order])

  const send = async (event) => {
    event.preventDefault()
    const name = method ? methodName(method) : manualName.trim()
    const problem = validatePaymentProof({ method: name, reference })
    if (problem) { setError(problem); return }
    setBusy('pay')
    setError('')
    try {
      const r = await submitPayment(order.id, { method: name, reference: reference.trim() })
      setReference('')
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
      setConfirmCancel(false)
    } finally {
      setBusy('')
    }
  }

  const fields = referenceFields(method)

  return (
    <section className="gx-card p-5 sm:p-7" aria-labelledby="pay">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="pay" className="font-display text-xl font-bold leading-tight text-slate-950">Pay to start your order</h2>
          <p className="mt-1 text-[14px] text-slate-600">We begin as soon as your payment is confirmed.</p>
        </div>
        <p className="text-right"><span className="block text-[12.5px] text-slate-500">Amount due</span><strong className="font-display text-[28px] font-bold leading-none tabular-nums text-slate-950">{formatMoney(order.price)}</strong>{pkr ? <span className="mt-1 block text-[13px] text-slate-500">about PKR {pkr.toLocaleString('en-US')}</span> : null}</p>
      </div>

      {submitted ? (
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[14px] leading-6 text-blue-900">You told us you paid with <strong>{order.payment?.method}</strong> (reference <strong>{order.payment?.reference}</strong>). We are checking it. Paid with a different reference? Send it again below.</p>
      ) : null}

      {loading ? <p role="status" className="mt-4 text-[14px] text-slate-500">Loading payment options…</p> : null}

      {!loading && methods.length > 0 ? (
        <>
          <fieldset className="mt-6">
            <legend className="text-[14px] font-semibold text-slate-900">Choose how you want to pay</legend>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {methods.map((m) => <MethodCard key={m.id} method={m} selected={method?.id === m.id} onSelect={(id) => { setSelected(id); setError('') }} />)}
            </div>
          </fieldset>

          {method?.kind === 'card' ? (
            <div className="gx-card-flat mt-5 p-5">
              <ActionButton onClick={payByCard} busy={busy === 'card'} disabled={Boolean(busy) || waiting} full>Pay {formatMoney(order.price)} now</ActionButton>
              <p className="mt-2 text-[13px] leading-5 text-slate-600">{method.note} We never see your card details.</p>
              {waiting ? <p role="status" className="mt-2 text-[14px] font-semibold text-blue-700">Payment received. Confirming your order…</p> : null}
            </div>
          ) : null}

          {method && method.kind !== 'card' ? (
            <div className="mt-6 grid gap-6 border-t border-slate-200 pt-6 lg:grid-cols-2">
              <div>
                <p className="flex items-center gap-2.5 text-[15px] font-bold text-slate-950"><span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[12px] text-white">1</span>Send {formatMoney(order.price)}{pkr && method.kind === 'manual' ? ` (about PKR ${pkr.toLocaleString('en-US')})` : ''}</p>
                {method.kind === 'manual' ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4">
                    <AccountRow label="Bank" value={method.bankName} copy={false} />
                    <AccountRow label="Account title" value={method.accountTitle} />
                    <AccountRow label={method.id === 'bank_transfer' ? 'Account number or IBAN' : 'Account number'} value={method.accountNumber} />
                    <AccountRow label="Amount" value={pkr ? `PKR ${pkr.toLocaleString('en-US')}` : formatMoney(order.price)} />
                    <AccountRow label="Reference to write" value={order.id} />
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                    <a href={method.paymentUrl} target="_blank" rel="noopener noreferrer" className="gx-focus inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-[15px] font-semibold text-white hover:bg-slate-700 sm:w-auto">Open crypto payment page ↗</a>
                    <p className="mt-2 text-[13px] leading-5 text-slate-600">Pay exactly {formatMoney(order.price)} and write <strong>{order.id}</strong> in the note if the page asks for one.</p>
                  </div>
                )}
                {method.instructions ? <p className="mt-2 text-[13px] leading-5 text-slate-600">{method.instructions}</p> : null}
              </div>
              <form onSubmit={send} noValidate>
                <p className="flex items-center gap-2.5 text-[15px] font-bold text-slate-950"><span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[12px] text-white">2</span>Tell us you paid</p>
                <label htmlFor="pay-ref" className="mt-2 block text-[13px] font-semibold text-slate-800">{fields.label}</label>
                {fields.hint ? <p className="text-[12.5px] text-slate-500">{fields.hint}</p> : null}
                <input id="pay-ref" className={`${inputClass} mt-1`} value={reference} onChange={(e) => { setReference(e.target.value); setError('') }} maxLength={160} autoComplete="off" />
                <p className="mt-2 text-[13px] leading-5 text-slate-600">{method.note}</p>
                <div className="mt-4"><ActionButton type="submit" busy={busy === 'pay'} disabled={Boolean(busy)} full>{submitted ? 'Send again' : 'I have paid'}</ActionButton></div>
              </form>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && methods.length === 0 ? (
        <form onSubmit={send} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
          {instructions ? <p className="whitespace-pre-line rounded-2xl bg-slate-100 p-4 text-[14px] leading-6 text-slate-800 sm:col-span-2">{instructions}</p> : <p className="rounded-2xl bg-amber-50 p-4 text-[14px] leading-6 text-amber-900 sm:col-span-2">Payment details are not showing right now. Write to support@nexorasolution.online with your order number {order.id} and we will send them.</p>}
          <div>
            <label htmlFor="pay-method" className="block text-[13px] font-semibold text-slate-800">How did you pay?</label>
            <input id="pay-method" className={`${inputClass} mt-1`} value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="JazzCash, Easypaisa, bank…" maxLength={40} />
          </div>
          <div>
            <label htmlFor="pay-ref" className="block text-[13px] font-semibold text-slate-800">Reference or transaction number</label>
            <input id="pay-ref" className={`${inputClass} mt-1`} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={160} />
          </div>
          <div className="sm:col-span-2"><ActionButton type="submit" busy={busy === 'pay'} disabled={Boolean(busy)} full>I have paid</ActionButton></div>
        </form>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}

      <div className="mt-5 border-t border-slate-200 pt-4">
        {confirmCancel ? (
          <p className="flex flex-wrap items-center gap-3 text-[14px] text-slate-700">
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
