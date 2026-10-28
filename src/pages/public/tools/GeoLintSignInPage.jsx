import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_PATH, GEOLINT_SIGNIN_PATH } from '../../../lib/geolintLaunch.js'
import {
  clientSignInMessage, refreshClient, resendVerification, sendResetEmail, signInWithEmail, signInWithGoogle, signOutClient, signUpWithEmail, validateCredentials,
} from '../../../lib/geolintClient.js'
import { safeNext } from '../../../lib/geolintFix.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ActionButton, GoogleButton, JourneySteps } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'
import './geolint.css'
import { GlLoader } from './GeoLintLoader.jsx'

const inputClass = 'w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600'

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-slate-900">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

/** The account has an email that is not confirmed yet: explain, let them resend, and check again. */
export function VerifyPanel({ user, onVerified }) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const check = async () => {
    setBusy('check')
    setError('')
    setNote('')
    try {
      const fresh = await refreshClient()
      if (fresh?.emailVerified) onVerified()
      else setNote('Not confirmed yet. Open the link in the email we sent, then press this button again.')
    } catch (e) {
      setError(clientSignInMessage(e))
    } finally {
      setBusy('')
    }
  }
  const resend = async () => {
    setBusy('resend')
    setError('')
    setNote('')
    try {
      await resendVerification()
      setNote('We sent the email again. Check your inbox and spam folder.')
    } catch (e) {
      setError(clientSignInMessage(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="gl-card p-6 sm:p-8" role="region" aria-label="Confirm your email">
      <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">Confirm your email</h2>
      <p className="mt-2 text-[14px] leading-6 text-slate-600">We sent a link to <strong className="text-slate-900">{user.email}</strong>. Open it, then come back and press the button. We ask for this so only you can see your orders.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ActionButton onClick={check} busy={busy === 'check'} disabled={Boolean(busy)}>I have confirmed my email</ActionButton>
        <button type="button" onClick={resend} disabled={Boolean(busy)} className="gx-pill disabled:opacity-60">Send the email again</button>
        <button type="button" onClick={() => signOutClient()} className="gx-pill">Use another account</button>
      </div>
      {note ? <p role="status" className="mt-3 text-[14px] font-semibold text-emerald-700">{note}</p> : null}
      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

function AuthCard({ onDone }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const signup = mode === 'signup'
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const switchTo = (next) => { setMode(next); setErrors({}); setError(''); setNote('') }

  const google = async () => {
    setBusy('google')
    setError('')
    try {
      await signInWithGoogle()
      onDone()
    } catch (e) {
      setError(clientSignInMessage(e))
    } finally {
      setBusy('')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = validateCredentials(form, mode)
    setErrors(found)
    setError('')
    setNote('')
    if (Object.keys(found).length) return
    setBusy('email')
    try {
      const user = signup ? await signUpWithEmail(form) : await signInWithEmail(form)
      if (user.emailVerified) onDone()
    } catch (e) {
      setError(clientSignInMessage(e))
    } finally {
      setBusy('')
    }
  }

  const reset = async () => {
    const found = validateCredentials({ email: form.email }, 'reset')
    if (found.email) { setErrors({ email: found.email }); return }
    setErrors({})
    try {
      await sendResetEmail(form.email)
      setNote('If there is an account with this email, we sent a link to choose a new password.')
    } catch (e) {
      setError(clientSignInMessage(e))
    }
  }

  const tab = (id, label) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={mode === id}
      aria-controls="auth-panel"
      tabIndex={mode === id ? 0 : -1}
      onClick={() => switchTo(id)}
      className={`min-h-[44px] flex-1 rounded-full px-4 text-[15px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${mode === id ? 'bg-white text-slate-950 shadow' : 'text-slate-600 hover:text-slate-900'}`}
    >{label}</button>
  )

  return (
    <div className="gl-card p-5 sm:p-8">
      <div role="tablist" aria-label="Sign in or create an account" className="flex gap-1 rounded-full bg-slate-100 p-1">
        {tab('signin', 'Sign in')}
        {tab('signup', 'Create account')}
      </div>
      <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="mt-6">
        <GoogleButton onClick={google} busy={busy === 'google'} disabled={Boolean(busy)} className="w-full">{signup ? 'Sign up with Google' : 'Continue with Google'}</GoogleButton>
        <div className="my-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500" aria-hidden="true"><span className="h-px flex-1 bg-slate-200" />or with email<span className="h-px flex-1 bg-slate-200" /></div>
        <form onSubmit={submit} noValidate className="space-y-4">
          {signup ? (
            <Field id="auth-name" label="Your name" error={errors.name}>
              <input id="auth-name" className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} />
            </Field>
          ) : null}
          <Field id="auth-email" label="Email" error={errors.email}>
            <input id="auth-email" type="email" className={inputClass} value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} />
          </Field>
          <Field id="auth-password" label="Password" error={errors.password}>
            <input id="auth-password" type="password" className={inputClass} value={form.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'auth-password-error' : undefined} />
          </Field>
          {signup ? (
            <Field id="auth-confirm" label="Repeat the password" error={errors.confirm}>
              <input id="auth-confirm" type="password" className={inputClass} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'auth-confirm-error' : undefined} />
            </Field>
          ) : null}
          <ActionButton type="submit" busy={busy === 'email'} disabled={Boolean(busy)} className="w-full">{signup ? 'Create my account' : 'Sign in'}</ActionButton>
        </form>
        {!signup ? <button type="button" onClick={reset} className="mt-3 text-[14px] font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Forgot your password?</button> : null}
        {note ? <p role="status" className="mt-3 text-[14px] font-semibold text-emerald-700">{note}</p> : null}
        {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}
        <p className="mt-5 text-[12px] leading-5 text-slate-500">We only use your name and email to keep your order and report together. We never ask for the password of your website.</p>
      </div>
    </div>
  )
}

/** /tools/geo-audit/sign-in/: its own page (not a pop-up), with the whole path shown beside the form. */
export default function GeoLintSignInPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, ready } = useFixClient()
  const navigate = useNavigate()
  const go = () => navigate(next, { replace: true })

  // confirmed account (Google, or email that is verified): on to the order
  if (ready && user?.emailVerified) return <Navigate to={next} replace />

  return (
    <PublicPageShell backTo={GEOLINT_PATH} backLabel="Back to GeoLint">
      <PageSeo title="Sign in | GeoLint fix service" description="Sign in to order a GeoLint website fix." canonical={`https://nexorasolution.us${GEOLINT_SIGNIN_PATH}/`} path={GEOLINT_SIGNIN_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="sr-only"><Link to={GEOLINT_PATH} className="font-semibold text-blue-700 hover:underline">GeoLint</Link> <span aria-hidden="true">/</span> Sign in</nav>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Sign in to get your website fixed</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-7 text-slate-600">One quick step. After this we read your website for you, so there is very little to type.</p>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            {!ready ? <div className="gl-card"><GlLoader title="Getting things ready" bar={false} /></div> : user && !user.emailVerified ? <VerifyPanel user={user} onVerified={go} /> : <AuthCard onDone={go} />}
          </div>
          <JourneySteps current="signin" />
        </div>
      </div>
    </PublicPageShell>
  )
}
