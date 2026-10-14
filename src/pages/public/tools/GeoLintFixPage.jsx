import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_ORDERS_PATH, GEOLINT_PATH, GEOLINT_FIX_PATH } from '../../../lib/geolintLaunch.js'
import { getFixService, placeOrder, signOutClient } from '../../../lib/geolintClient.js'
import { ACCESS_OPTIONS, DEFAULT_PRICE, DEFAULT_TARGET, PLATFORM_OPTIONS, orderErrorMessage, validateOrderForm } from '../../../lib/geolintFix.js'
import { loadReport } from '../../../lib/geolintReport.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ActionButton, SignInCard } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'
import './geolint.css'

const STEPS = [
  { title: 'Run the free audit', text: 'You already have your score. It shows exactly what AI search crawlers cannot read on your site.' },
  { title: 'Order the fix', text: 'Sign in with Google, tell us your platform and how to give us access. No passwords, ever: you invite us.' },
  { title: 'We fix your website', text: 'Our team makes the changes: crawler access, answer-first text, structured data, llms.txt and more.' },
  { title: 'Proof you can check', text: 'We run the same audit again and show your score before and after. Whatever it measures is what you see.' },
]

const INCLUDED = [
  'Fixes for every issue in your GeoLint audit that can be changed on your site',
  'robots.txt, llms.txt, meta and structured data (schema) set up correctly',
  'Answer-first openings and server-readable text for your key pages',
  'A new audit after the work, with a before and after score',
  'A plain-language summary of what we changed',
]

const NOT_INCLUDED = [
  'A guaranteed score. We aim for 90+, but we report the number the audit really gives.',
  'Rewriting your whole site or changing your design',
  'Ranking or traffic promises. AI search results depend on many things outside a website.',
]

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-slate-900">{label}</label>
      {hint ? <p id={`${id}-hint`} className="mt-0.5 text-[13px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

const inputClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600'

function OrderForm({ user, price, target, initial }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    siteUrl: initial.siteUrl,
    auditId: initial.auditId,
    name: user.name || '',
    whatsapp: '',
    platform: '',
    accessMethod: 'invite-admin-user',
    accessNotes: '',
    notes: '',
    authorized: false,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const found = validateOrderForm(form)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const payload = {
        siteUrl: form.siteUrl.trim(),
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        platform: form.platform,
        accessMethod: form.accessMethod,
        accessNotes: form.accessNotes.trim(),
        notes: form.notes.trim(),
        authorized: true,
        ...(form.auditId ? { auditId: form.auditId } : {}),
      }
      const { order } = await placeOrder(payload)
      navigate(`${GEOLINT_ORDERS_PATH}/${order.id}`, { state: { fresh: true } })
    } catch (error) {
      if (error?.code === 'DUPLICATE' && error.orderId) {
        navigate(`${GEOLINT_ORDERS_PATH}/${error.orderId}`)
        return
      }
      setServerError(orderErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="gl-card space-y-5 p-5 sm:p-8" aria-label="Order form">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-600">
        <span>Signed in as <strong className="text-slate-900">{user.email}</strong></span>
        <button type="button" onClick={() => signOutClient()} className="font-semibold text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Use another account</button>
      </div>

      <Field id="siteUrl" label="Website address" hint={form.auditId ? 'Your audit report will be attached to the order.' : 'The site you want fixed.'} error={errors.siteUrl}>
        <input id="siteUrl" className={inputClass} value={form.siteUrl} onChange={set('siteUrl')} placeholder="https://example.com" inputMode="url" autoComplete="url" aria-describedby={form.auditId ? 'siteUrl-hint' : undefined} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" error={errors.name}>
          <input id="name" className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" />
        </Field>
        <Field id="whatsapp" label="WhatsApp number (optional)" hint="So we can reach you quickly." error={errors.whatsapp}>
          <input id="whatsapp" className={inputClass} value={form.whatsapp} onChange={set('whatsapp')} placeholder="+92 300 1234567" inputMode="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field id="platform" label="What is your website built with?" error={errors.platform}>
        <select id="platform" className={inputClass} value={form.platform} onChange={set('platform')}>
          <option value="">Choose…</option>
          {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      <fieldset>
        <legend className="text-[14px] font-semibold text-slate-900">How will you give us access?</legend>
        <p className="mt-0.5 text-[13px] leading-5 text-slate-500">Never send us a password. An invite lets you stay in control and remove our access when we are done.</p>
        <div className="mt-2 space-y-2">
          {ACCESS_OPTIONS.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-[14px] ${form.accessMethod === o.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="accessMethod" value={o.value} checked={form.accessMethod === o.value} onChange={set('accessMethod')} className="mt-1 h-4 w-4 accent-blue-600" />
              <span><span className="block font-semibold text-slate-900">{o.label}</span><span className="block text-[13px] text-slate-500">{o.hint}</span></span>
            </label>
          ))}
        </div>
        {errors.accessMethod ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{errors.accessMethod}</p> : null}
      </fieldset>

      <Field id="accessNotes" label="Anything we should know about access? (optional)" hint="For example: the admin email you will invite. Not a password." error={errors.accessNotes}>
        <input id="accessNotes" className={inputClass} value={form.accessNotes} onChange={set('accessNotes')} maxLength={500} />
      </Field>

      <Field id="notes" label="Anything else? (optional)" hint="Pages that matter most, things we must not touch, deadlines.">
        <textarea id="notes" rows={3} className={inputClass} value={form.notes} onChange={set('notes')} maxLength={1000} />
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-6 text-slate-800">
          <input type="checkbox" checked={form.authorized} onChange={set('authorized')} className="mt-1.5 h-4 w-4 accent-blue-600" aria-describedby={errors.authorized ? 'authorized-error' : undefined} />
          <span>I own this website or I am allowed to change it, and I agree that Nexora Solutions may edit it to apply the fixes.</span>
        </label>
        {errors.authorized ? <p id="authorized-error" role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{errors.authorized}</p> : null}
      </div>

      <div className="rounded-2xl bg-slate-100 p-4 text-[14px] leading-6 text-slate-700">
        <p><strong className="text-slate-900">${price} per website address.</strong> You pay after you order, by the method shown on the next page. We start once we confirm your payment.</p>
        <p className="mt-1">We re-run the audit when we finish and show your real score before and after. Our target is {target}+; we never promise a number.</p>
      </div>

      {serverError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] font-semibold text-rose-800">{serverError}</p> : null}

      <ActionButton type="submit" busy={busy} className="w-full sm:w-auto">Place order, ${price}</ActionButton>
    </form>
  )
}

/** /tools/geo-audit/fix/: what the paid fix is, then sign-in and the order form. */
export default function GeoLintFixPage() {
  const { user, ready } = useFixClient()
  const [params] = useSearchParams()
  const [service, setService] = useState(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setService(s)).catch(() => live && setUnavailable(true))
    return () => { live = false }
  }, [])

  const initial = useMemo(() => {
    const report = typeof window === 'undefined' ? null : loadReport()
    const queryUrl = params.get('url') || ''
    return { siteUrl: queryUrl || report?.url || '', auditId: !queryUrl && report?.id ? String(report.id) : '' }
  }, [params])

  const price = service?.priceUsd ?? DEFAULT_PRICE
  const target = service?.targetScore ?? DEFAULT_TARGET
  const closed = service && service.enabled === false

  return (
    <PublicPageShell>
      <PageSeo title="Get your website fixed for AI search | GeoLint" description="Order the GeoLint fix service: we apply the fixes from your audit and show your score before and after." canonical={`https://nexorasolution.online${GEOLINT_FIX_PATH}/`} path={GEOLINT_FIX_PATH} robots="noindex,follow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
          <Link to={GEOLINT_PATH} className="font-semibold text-blue-700 hover:underline">GeoLint</Link> <span aria-hidden="true">/</span> Fix service
        </nav>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">We fix your website for AI search</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-600">
          No coding needed. Send us your audit, we make the changes, and we show your score again afterwards. <strong className="text-slate-900">${price} per website address.</strong>
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="gl-card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-sm font-black text-white" aria-hidden="true">{i + 1}</span>
              <h2 className="mt-3 text-[16px] font-bold text-slate-950">{s.title}</h2>
              <p className="mt-1 text-[14px] leading-6 text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="gl-card p-5" aria-labelledby="inc">
            <h2 id="inc" className="text-[16px] font-bold text-slate-950">What you get</h2>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-slate-700">
              {INCLUDED.map((t) => <li key={t} className="flex gap-2"><span className="font-black text-emerald-600" aria-hidden="true">✓</span><span>{t}</span></li>)}
            </ul>
          </section>
          <section className="gl-card p-5" aria-labelledby="exc">
            <h2 id="exc" className="text-[16px] font-bold text-slate-950">What we do not promise</h2>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-slate-700">
              {NOT_INCLUDED.map((t) => <li key={t} className="flex gap-2"><span className="font-black text-slate-400" aria-hidden="true">–</span><span>{t}</span></li>)}
            </ul>
          </section>
        </div>

        <section className="mt-12" aria-labelledby="order">
          <h2 id="order" className="font-display text-2xl font-bold tracking-tight text-slate-950">Order your fix</h2>
          <div className="mt-4">
            {closed ? (
              <div className="gl-card p-6 text-[15px] leading-7 text-slate-700">New orders are paused for now. Please check back soon.</div>
            ) : !ready ? (
              <div className="gl-card p-6 text-[15px] text-slate-500" role="status">Loading…</div>
            ) : !user ? (
              <SignInCard title="Sign in to place your order" />
            ) : (
              <OrderForm user={user} price={price} target={target} initial={initial} />
            )}
            {unavailable ? <p className="mt-3 text-[13px] text-slate-500">We could not load the current price. The order page will show the final price.</p> : null}
          </div>
          {user ? (
            <p className="mt-4 text-[14px] text-slate-600">Already ordered? <Link to={GEOLINT_ORDERS_PATH} className="font-semibold text-blue-700 hover:underline">See your orders</Link>.</p>
          ) : null}
        </section>
      </div>
    </PublicPageShell>
  )
}
