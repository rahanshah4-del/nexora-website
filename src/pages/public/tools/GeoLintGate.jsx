import { useEffect, useRef, useState } from 'react'
import {
  clientSignInMessage, signInWithEmail, signInWithGoogle, signUpWithEmail, validateCredentials,
} from '../../../lib/geolintClient.js'
import { emailGeolintReport, saveGeolintLead } from '../../../lib/geolintLead.js'
import { hostLabel } from '../../../lib/geolintReport.js'
import { GoogleLogo } from './GeoLintFixShared.jsx'
import { VerifyPanel } from './GeoLintSignInPage.jsx'
import { useFixClient } from './geolintFixHooks.js'

const field = 'w-full h-12 rounded-xl border border-black/10 bg-[#f5f5f7] px-4 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/15'

function Logo() {
  return (
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_10px_30px_-10px_rgba(79,70,229,.7)]" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
    </div>
  )
}

function GateCard({ host, optIn, setOptIn, user }) {
  const [emailMode, setEmailMode] = useState(false)
  const [signup, setSignup] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const google = async () => {
    setBusy('google'); setError('')
    try { await signInWithGoogle() } catch (e) { setError(clientSignInMessage(e)) } finally { setBusy('') }
  }
  const submit = async (e) => {
    e.preventDefault()
    const mode = signup ? 'signup' : 'signin'
    const found = validateCredentials(form, mode)
    setErrors(found); setError('')
    if (Object.keys(found).length) return
    setBusy('email')
    try { await (signup ? signUpWithEmail(form) : signInWithEmail(form)) } catch (err) { setError(clientSignInMessage(err)) } finally { setBusy('') }
  }

  if (user && !user.emailVerified) return <VerifyPanel user={user} onVerified={() => {}} />

  return (
    <div>
      <Logo />
      <h2 id="gl-gate-title" className="mt-5 text-center text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#1d1d1f]">Your report is ready</h2>
      <p className="mx-auto mt-2 max-w-[22rem] text-center text-[15px] leading-6 text-[#6e6e73]">
        Sign in to see the full GeoLint report{host ? <> for <strong className="font-semibold text-[#1d1d1f]">{host}</strong></> : null}, and to download the PDF.
      </p>

      {!emailMode ? (
        <div className="mt-7 space-y-3">
          <button type="button" onClick={google} disabled={Boolean(busy)} className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#1d1d1f] text-[15px] font-semibold text-white transition hover:bg-black active:scale-[.99] disabled:opacity-60">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white">{busy === 'google' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" /> : <GoogleLogo size={16} />}</span>
            Continue with Google
          </button>
          <button type="button" onClick={() => setEmailMode(true)} className="h-12 w-full rounded-full bg-[#f5f5f7] text-[15px] font-semibold text-[#1d1d1f] transition hover:bg-[#ebebed]">Continue with email</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-3">
          {signup ? <div><input className={field} placeholder="Your name" value={form.name} onChange={set('name')} autoComplete="name" aria-label="Your name" />{errors.name ? <p role="alert" className="mt-1 text-[13px] font-medium text-rose-600">{errors.name}</p> : null}</div> : null}
          <div><input className={field} type="email" placeholder="Email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" aria-label="Email" />{errors.email ? <p role="alert" className="mt-1 text-[13px] font-medium text-rose-600">{errors.email}</p> : null}</div>
          <div><input className={field} type="password" placeholder="Password" value={form.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} aria-label="Password" />{errors.password ? <p role="alert" className="mt-1 text-[13px] font-medium text-rose-600">{errors.password}</p> : null}</div>
          {signup ? <div><input className={field} type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" aria-label="Repeat the password" />{errors.confirm ? <p role="alert" className="mt-1 text-[13px] font-medium text-rose-600">{errors.confirm}</p> : null}</div> : null}
          <button type="submit" disabled={Boolean(busy)} className="h-12 w-full rounded-full bg-[#0071e3] text-[15px] font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60">{busy === 'email' ? 'Please wait…' : signup ? 'Create account and view report' : 'Sign in and view report'}</button>
          <div className="flex items-center justify-between text-[14px] font-medium text-[#0071e3]">
            <button type="button" onClick={() => { setSignup(!signup); setErrors({}); setError('') }} className="hover:underline">{signup ? 'I already have an account' : 'Create an account'}</button>
            <button type="button" onClick={() => { setEmailMode(false); setError('') }} className="text-[#6e6e73] hover:underline">Back</button>
          </div>
        </form>
      )}

      {error ? <p role="alert" className="mt-4 text-center text-[14px] font-medium text-rose-600">{error}</p> : null}

      <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 text-[#6e6e73]">
        <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0071e3]" />
        <span>Send me GeoLint tips and offers by email. You can unsubscribe at any time.</span>
      </label>
      <p className="mt-3 text-center text-[12px] leading-5 text-[#86868b]">We only use your name and email to show your report. We never ask for your website password.</p>
    </div>
  )
}

/**
 * Shows the report blurred until the visitor has signed in (a confirmed account), with a sign-in card over it.
 * The first time someone gets past the card, their address is saved for the GeoLint emails.
 */
export default function GeoLintGate({ report, children }) {
  const { user, ready } = useFixClient()
  const unlocked = Boolean(user?.emailVerified)
  const showCard = ready && !unlocked
  const [optIn, setOptIn] = useState(true)
  const wasLocked = useRef(false)
  const saved = useRef(false)

  useEffect(() => { if (showCard) wasLocked.current = true }, [showCard])
  useEffect(() => {
    if (!unlocked || !wasLocked.current || saved.current) return
    saved.current = true
    saveGeolintLead(user, { host: hostLabel(report?.url || ''), score: report?.score?.earned, optIn })
    emailGeolintReport(user, report)
  }, [unlocked, user, report, optIn])

  useEffect(() => {
    if (!showCard) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [showCard])

  return (
    <>
      <div
        inert={!unlocked}
        aria-hidden={!unlocked}
        style={unlocked ? undefined : { filter: 'blur(14px)', pointerEvents: 'none', userSelect: 'none', maxHeight: '100vh', overflow: 'hidden' }}
      >
        {children}
      </div>
      {showCard ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-white/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="gl-gate-title">
          <div className="w-full max-w-[26rem] rounded-[28px] bg-white/95 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.35),0_0_0_1px_rgba(0,0,0,.05)] sm:p-9">
            <GateCard host={hostLabel(report?.url || '')} optIn={optIn} setOptIn={setOptIn} user={user} />
          </div>
        </div>
      ) : null}
    </>
  )
}
