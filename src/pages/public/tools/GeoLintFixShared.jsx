import { useEffect, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_SIGNIN_PATH } from '../../../lib/geolintLaunch.js'
import { useFixClient } from './geolintFixHooks.js'
import { clientSignInMessage, getFixService, signInWithGoogle } from '../../../lib/geolintClient.js'
import { DEFAULT_PRICE, JOURNEY, STEPS, compareScores, comparisonRows, optionLabel, PLATFORM_OPTIONS, rankOf, signed, statusInfo } from '../../../lib/geolintFix.js'
import { Pill } from './GeoLintVisuals.jsx'
import './GeoLintStepper.css'

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
      className={`group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-6 py-3 text-[15px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(60,64,67,.3),0_2px_8px_-2px_rgba(60,64,67,.25)] transition hover:border-slate-400 hover:shadow-[0_2px_4px_rgba(60,64,67,.3),0_8px_20px_-6px_rgba(60,64,67,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="grid h-6 w-6 place-items-center">{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" /> : <GoogleLogo />}</span>
      <span className="text-slate-800">{children}</span>
    </button>
  )
}

/** Button used on the fix pages: 48px tall, one corner radius, clear focus ring. `full` makes it full width on phones. */
export function ActionButton({ children, onClick, busy = false, disabled = false, type = 'button', tone = 'primary', full = false, className = '' }) {
  const look = tone === 'dark'
    ? 'gx-btn-dark bg-slate-950 text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,.7)] hover:bg-slate-800 hover:shadow-[0_18px_34px_-16px_rgba(15,23,42,.65)] active:bg-slate-900'
    : tone === 'primary'
    ? 'bg-blue-600 text-white shadow-[0_1px_0_rgba(255,255,255,.18)_inset,0_8px_20px_-8px_rgba(37,99,235,.65)] hover:bg-blue-700 active:bg-blue-800'
    : tone === 'ghost'
      ? 'text-slate-700 hover:bg-slate-100'
      : 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      className={`gx-focus inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 enabled:active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${tone === 'dark' ? 'min-h-[56px] rounded-full text-[17px]' : 'min-h-[48px] rounded-xl text-[15px]'} ${full ? 'w-full sm:w-auto' : ''} ${tone === 'dark' ? 'group' : ''} ${look} ${className}`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
      {children}
      {tone === 'dark' && !busy ? <span aria-hidden="true" className="gx-arrow">→</span> : null}
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
    <div className="gx-card p-6 text-center sm:p-8">
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

/** Four-step line: Payment, We fix your site, Re-audit, Done. The line fills up and the current step breathes. Closed orders show a note instead. */
export function Stepper({ status }) {
  const info = statusInfo(status)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  if (info.step < 0) return <p className="text-sm font-semibold text-slate-600">{info.text}</p>
  const last = STEPS.length - 1
  const filled = info.step === last ? 1 : info.step / last
  return (
    <ol className={`gs ${ready ? 'is-ready' : ''}`} style={{ '--gs-fill': filled }} aria-label="Order progress">
      <li className="gs-track" aria-hidden="true"><span className="gs-fill" /></li>
      {STEPS.map((step, index) => {
        const done = index < info.step || (info.step === last && index === last)
        const current = index === info.step && !done
        return (
          <li key={step.id} className={`gs-step ${done ? 'is-done' : current ? 'is-current' : 'is-next'}`} style={{ '--gs-i': index }} aria-current={current ? 'step' : undefined}>
            <span className="gs-node">
              {current ? <span className="gs-halo" aria-hidden="true" /> : null}
              {done ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="gs-check" d="m5.5 12.8 4.2 4.2L18.5 7.5" /></svg>
              ) : <span className="gs-num">{index + 1}</span>}
            </span>
            <span className="gs-label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** The short note above the chat: what it is for, with a clear "no passwords" line. */
export function ChatIntro() {
  return (
    <div className="flex gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] text-white shadow-[0_8px_18px_-8px_rgba(10,132,255,0.8)]" style={{ background: 'linear-gradient(180deg,#5ac8fa,#0a84ff)' }} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-5.52 0-10 3.8-10 8.5 0 2.55 1.3 4.82 3.38 6.38-.2 1.25-.85 2.4-1.8 3.3-.2.2-.05.54.22.52 1.8-.12 3.35-.78 4.55-1.7.52.12 1.07.2 1.65.26.67.07 1.33.1 2 .1 5.52 0 10-3.8 10-8.5S17.52 2.5 12 2.5z" /></svg>
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-slate-950">Message our team</p>
        <p className="mt-0.5 text-[14px] leading-6 text-slate-600">Tell us what to change and where to find things. Ask questions, and attach screenshots or files. We answer here and by email.</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12.5px] font-semibold text-amber-800">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z" /></svg>
          Never send passwords. Invite us to your site instead.
        </p>
      </div>
    </div>
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

/**
 * The floating "get it fixed" button on the report page. It stays in view while the person reads the result,
 * goes to sign-in (or straight to the order if they are already signed in), and can be dismissed.
 */
export function FixFloat({ report }) {
  const { user, ready } = useFixClient()
  const [service, setService] = useState(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setService(s)).catch(() => {})
    return () => { live = false }
  }, [])
  if (hidden || (service && service.enabled === false)) return null
  const price = service?.priceUsd ?? DEFAULT_PRICE
  const query = report?.url ? `?url=${encodeURIComponent(report.url)}` : ''
  const to = ready && user ? `${GEOLINT_FIX_PATH}${query}` : `${GEOLINT_SIGNIN_PATH}${report?.url ? `?next=${encodeURIComponent(`${GEOLINT_FIX_PATH}${query}`)}` : ''}`
  return (
    <div className="gl-float fixed inset-x-3 bottom-3 z-40 flex items-center justify-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5" role="region" aria-label="Get your website fixed">
      <Link
        to={to}
        className="group inline-flex min-h-[52px] flex-1 items-center justify-center gap-3 rounded-full bg-gradient-to-b from-blue-600 to-blue-700 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_18px_40px_-12px_rgba(37,99,235,.85)] ring-1 ring-white/20 transition hover:from-blue-500 hover:to-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-none"
      >
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[15px]">&#9889;</span>
        <span>Get it fixed for you <span className="font-bold">from ${price}</span></span>
      </Link>
      <button type="button" onClick={() => setHidden(true)} aria-label="Hide this button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 shadow-md hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  )
}

/** The path beside the sign-in page and the wizard: what happens, in order, with the current step lit. */
export function JourneySteps({ current, className = '' }) {
  const index = Math.max(0, JOURNEY.findIndex((s) => s.id === current))
  return (
    <aside className={`gx-card p-5 sm:p-6 ${className}`} aria-label="How ordering works">
      <h2 className="text-[15px] font-bold text-slate-950">How it works</h2>
      <ol className="mt-4 space-y-4">
        {JOURNEY.map((step, i) => {
          const done = i < index
          const active = i === index
          return (
            <li key={step.id} className="flex gap-3" aria-current={active ? 'step' : undefined}>
              <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-slate-200 text-slate-600'}`}>{done ? '✓' : i + 1}</span>
              <span>
                <span className={`block text-[14px] font-bold ${active || done ? 'text-slate-950' : 'text-slate-600'}`}>{step.title}</span>
                <span className={`block text-[13px] leading-5 ${active ? 'text-slate-700' : 'text-slate-500'}`}>{step.text}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

/** A website's name, logo and platform as we read them from its home page. `compact` is the smaller card used in lists. */
export function ProfileCard({ profile, label, compact = false, children }) {
  const host = profile.host || ''
  const initial = (profile.title || host || '?').trim().charAt(0).toUpperCase()
  const size = compact ? 'h-11 w-11' : 'h-14 w-14'
  return (
    <div className="flex h-full items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-500`}>
        {profile.logo ? <img src={profile.logo} alt="" width="56" height="56" loading="lazy" className="h-full w-full object-contain p-1.5" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span aria-hidden="true">{initial}</span>}
      </span>
      <span className="min-w-0 flex-1">
        {label ? <span className="mb-0.5 block text-[12.5px] font-medium text-slate-500">{label}</span> : null}
        <span className="block truncate text-[16px] font-bold leading-snug text-slate-950">{profile.title || host}</span>
        <span className="block truncate text-[13px] text-slate-500">{host}</span>
        {profile.description ? <span className={`mt-1.5 block text-[13.5px] leading-5 text-slate-600 ${compact ? '[-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden' : ''}`}>{profile.description}</span> : null}
        {profile.platform && profile.platform !== 'other' && profile.platformEvidence ? (
          <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-semibold text-blue-700 ring-1 ring-blue-200">Built with {optionLabel(PLATFORM_OPTIONS, profile.platform)}</span>
        ) : null}
        {children}
      </span>
    </div>
  )
}

/** You against your rivals as horizontal bars. Each row also states its number as text. */
export function ScoreBars({ own, competitors }) {
  const rows = comparisonRows(own, competitors)
  if (rows.length === 0) return null
  const rank = rankOf(rows)
  return (
    <figure>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className={`truncate ${r.you ? 'font-bold text-slate-950' : 'font-semibold text-slate-700'}`}>{r.label}{r.you ? ' (you)' : ''}</span>
              <span className="font-black tabular-nums text-slate-900">{r.percent}</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className={`h-full rounded-full ${r.you ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${Math.max(2, Math.min(100, r.percent))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {rank ? <figcaption className="mt-3 text-[13px] leading-5 text-slate-600">{rank.place === 1 ? 'You are ahead of the competitors you named.' : `Your site is number ${rank.place} of ${rank.of}.`} Scores come from the same GeoLint audit, out of 100.</figcaption> : null}
    </figure>
  )
}
