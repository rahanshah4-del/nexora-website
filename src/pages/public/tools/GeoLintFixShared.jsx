import { useEffect, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import { GEOLINT_FIX_PATH } from '../../../lib/geolintLaunch.js'
import { clientSignInMessage, getFixService, signInWithGoogle } from '../../../lib/geolintClient.js'
import { DEFAULT_PRICE, DEFAULT_TARGET, STEPS, compareScores, signed, statusInfo } from '../../../lib/geolintFix.js'
import { Pill } from './GeoLintVisuals.jsx'

const PILL_TONE = { emerald: 'emerald', amber: 'amber', blue: 'slate', violet: 'slate', slate: 'slate', rose: 'rose', orange: 'orange' }

/** Google's own four-colour "G". Colours are Google's brand colours and are not themed. */
export function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** The Google button: white, Google logo on the left, big enough to tap, clear focus ring. */
export function GoogleButton({ children, onClick, busy = false, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-6 py-3 text-[15px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(60,64,67,.3),0_2px_8px_-2px_rgba(60,64,67,.25)] transition hover:border-slate-400 hover:shadow-[0_2px_4px_rgba(60,64,67,.3),0_8px_20px_-6px_rgba(60,64,67,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="grid h-6 w-6 place-items-center">{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" /> : <GoogleLogo />}</span>
      <span className="text-slate-800">{children}</span>
    </button>
  )
}

/** Primary action button used on the fix pages. */
export function ActionButton({ children, onClick, busy = false, disabled = false, type = 'button', tone = 'primary', className = '' }) {
  const look = tone === 'primary'
    ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,.7)] hover:from-blue-500 hover:to-blue-700'
    : 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[15px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

/** Sign-in card: one Google button, honest about what happens with the account. */
export function SignInCard({ title = 'Sign in to continue', text }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const go = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(clientSignInMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="gl-card p-6 text-center sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-slate-600">
        {text || 'Sign in with Google so we can keep your order and your audit report together. We only see your name and email address.'}
      </p>
      <div className="mt-5 flex justify-center">
        <GoogleButton onClick={go} busy={busy}>Continue with Google</GoogleButton>
      </div>
      {error ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

export function StatusPill({ status }) {
  const info = statusInfo(status)
  return <Pill tone={PILL_TONE[info.tone] || 'slate'}>{info.label}</Pill>
}

/** Four-step line: Payment, We fix your site, Re-audit, Done. Closed orders show a note instead. */
export function Stepper({ status }) {
  const info = statusInfo(status)
  if (info.step < 0) return <p className="text-sm font-semibold text-slate-600">{info.text}</p>
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const done = index < info.step || (info.step === 3 && index === 3)
        const current = index === info.step && !done
        return (
          <li key={step.id} className="text-center" aria-current={current ? 'step' : undefined}>
            <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black ${done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-slate-200 text-slate-600'}`}>
              {done ? '✓' : index + 1}
            </span>
            <span className={`mt-1.5 block text-[12px] font-semibold leading-4 ${current || done ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Before → after. Shows the measured numbers only; the target is a goal, never a promise. */
export function ScoreCompare({ before, after, target }) {
  const c = compareScores(before, after, target)
  if (c.before === null && c.after === null) return null
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
      <div className="rounded-2xl bg-slate-100 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Before</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{c.before ?? '—'}</p>
      </div>
      <span aria-hidden="true" className="text-2xl font-black text-slate-400">→</span>
      <div className={`rounded-2xl p-4 ${c.after === null ? 'bg-slate-100' : c.reachedTarget ? 'bg-emerald-100' : 'bg-amber-100'}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">After</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{c.after ?? 'soon'}</p>
        {c.gain !== null ? <p className="mt-0.5 text-xs font-bold text-slate-700">{signed(c.gain)} points</p> : null}
      </div>
    </div>
  )
}

/** Report page call to action: "do not want to fix this yourself?" Hidden while orders are paused. */
export function FixCta({ report }) {
  const [service, setService] = useState(null)
  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setService(s)).catch(() => {})
    return () => { live = false }
  }, [])
  if (service && service.enabled === false) return null
  const price = service?.priceUsd ?? DEFAULT_PRICE
  const target = service?.targetScore ?? DEFAULT_TARGET
  return (
    <div className="gl-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="max-w-xl">
        <p className="text-[17px] font-bold text-slate-950">Do not want to fix this yourself?</p>
        <p className="mt-1 text-[14px] leading-6 text-slate-600">
          Nexora fixes your website for <strong className="text-slate-900">${price}</strong> per website address and re-runs this audit to show your score before and after. Our target is {target}+; we report the real number. No coding on your side.
        </p>
      </div>
      <Link to={report?.url ? `${GEOLINT_FIX_PATH}?url=${encodeURIComponent(report.url)}` : GEOLINT_FIX_PATH} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-blue-600 to-blue-700 px-6 py-2.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,.7)] hover:from-blue-500 hover:to-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        Get it fixed for you
      </Link>
    </div>
  )
}
