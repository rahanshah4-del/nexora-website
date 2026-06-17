import { useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingStorefront,
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineHomeModern,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { motion } from 'framer-motion'
import { auth, authPersistenceReady } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { getCustomEmailVerificationStatus } from '../../lib/emailVerificationService.js'
import { createPasswordResetLink, passwordResetEmail, sendWorkerEmail } from '../../lib/transactionalEmail.js'
import { VERIFY_EMAIL_ROUTE, WORKSPACE_ROUTE } from '../../lib/authRouteState.js'

// Modules showcased on the sign-in panel — mirrors the workspace catalog.
const LOGIN_MODULES = [
  { name: 'General CRM', icon: HiOutlineUserGroup, tone: 'bg-sky-500/20 text-sky-300' },
  { name: 'Restaurant POS', icon: HiOutlineBuildingStorefront, tone: 'bg-rose-500/20 text-rose-300' },
  { name: 'Retail / POS', icon: HiOutlineShoppingBag, tone: 'bg-amber-500/20 text-amber-300' },
  { name: 'School ERP', icon: HiOutlineAcademicCap, tone: 'bg-emerald-500/20 text-emerald-300' },
  { name: 'Property ERP', icon: HiOutlineHomeModern, tone: 'bg-violet-500/20 text-violet-300' },
  { name: 'Transport / Rental', icon: HiOutlineTruck, tone: 'bg-cyan-500/20 text-cyan-300' },
  { name: 'WhatsApp CRM', icon: HiOutlineChatBubbleLeftRight, tone: 'bg-green-500/20 text-green-300' },
]

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Already authenticated? Redirect optimistically to the workspace. The
  // /workspace route + RequireAuth own the not-verified bounce, so we never
  // block the login screen on a verification read.
  if (!loading && user) return <Navigate to={WORKSPACE_ROUTE} replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!auth) {
      setError('Authentication is not configured. Please check your setup and try again.')
      return
    }

    setSubmitting(true)
    try {
      const loginEmail = email.trim().toLowerCase()
      trackAnalyticsEvent('login_started', { email: loginEmail, page: '/login' }).catch(() => {})
      console.log('[LOGIN STEP 1] Firebase auth start', { email: loginEmail })
      await authPersistenceReady
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      console.log('[LOGIN STEP 2] Firebase auth success', { uid: credentials.user.uid })
      console.log('[LOGIN STEP 3] Read users doc', { uid: credentials.user.uid })
      const customVerified = credentials.user.emailVerified === true ? true : await getCustomEmailVerificationStatus(credentials.user)
      console.log('[LOGIN STEP 4] Users doc success', { uid: credentials.user.uid, customVerified })
      if (!credentials.user.emailVerified && !customVerified) {
        console.log('[LOGIN STEP 7] Route decision', { route: VERIFY_EMAIL_ROUTE, reason: 'email_not_verified' })
        navigate(VERIFY_EMAIL_ROUTE, { replace: true })
        console.log('[LOGIN STEP 8] Navigation success', { route: VERIFY_EMAIL_ROUTE })
        return
      }
      trackAnalyticsEvent('login_completed', { userId: credentials.user.uid, email: credentials.user.email || loginEmail, page: '/login', status: 'success' }).catch(() => {})
      console.log('[LOGIN STEP 7] Route decision', { route: WORKSPACE_ROUTE, reason: 'verified' })
      navigate(WORKSPACE_ROUTE, { replace: true })
      console.log('[LOGIN STEP 8] Navigation success', { route: WORKSPACE_ROUTE })
    } catch (err) {
      console.error('[LOGIN ERROR]', { code: err?.code || '', message: err?.message || String(err || '') })
      trackAnalyticsEvent('login_failed', { email: email.trim().toLowerCase(), page: '/login', status: err?.code || 'failed' }).catch(() => {})
      setError(clientSafeMessage(err, 'Unable to sign in. Please verify your credentials.', { context: 'Login with email' }))
    } finally {
      // Guarantee the spinner always clears — success, error, or unexpected
      // throw. No path may leave "Signing In..." stuck.
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setInfo('')
    if (!auth) {
      setError('Google sign-in is not available. Please try email sign in.')
      return
    }
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      trackAnalyticsEvent('login_started', { page: '/login', buttonLabel: 'Google sign in' }).catch(() => {})
      await authPersistenceReady
      const result = await signInWithPopup(auth, provider)
      trackAnalyticsEvent('login_completed', { userId: result.user.uid, email: result.user.email || '', page: '/login', status: 'google' }).catch(() => {})
      navigate(WORKSPACE_ROUTE, { replace: true })
    } catch (err) {
      trackAnalyticsEvent('login_failed', { page: '/login', status: err?.code || 'google_failed' }).catch(() => {})
      setError(clientSafeMessage(err, 'Google sign-in failed. Please try again.', { context: 'Login with Google' }))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setError('')
    setInfo('')
    const to = email.trim().toLowerCase()
    if (!to) {
      setError('Enter your email first, then request a password reset.')
      return
    }
    setSubmitting(true)
    try {
      const resetLink = await createPasswordResetLink(to)
      if (!resetLink.ok) {
        setError(resetLink.error || 'Could not create password reset link.')
        return
      }
      const template = passwordResetEmail({ link: resetLink.link })
      const sent = await sendWorkerEmail({ to, ...template })
      if (!sent.ok) {
        setError(sent.error || 'Could not send password reset email.')
        return
      }
      setInfo('Password reset email sent. Check your inbox.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand + modules showcase — desktop only */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
          </div>

          <div className="relative">
            <NexoraLogo />
            <h2 className="mt-12 max-w-md text-3xl font-black leading-tight tracking-tight text-white xl:text-4xl">
              One platform for every business you run.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              CRM, Restaurant POS, Retail, School &amp; Property ERP, Transport and WhatsApp — manage them all from a single Nexora workspace.
            </p>
          </div>

          <div className="relative mt-10 grid grid-cols-2 gap-3">
            {LOGIN_MODULES.map((module) => (
              <div
                key={module.name}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${module.tone}`}>
                  <module.icon className="h-5 w-5" />
                </span>
                <span className="truncate text-sm font-semibold text-slate-100">{module.name}</span>
              </div>
            ))}
          </div>

          <p className="relative mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Nexora Solution — All rights reserved 2019-2026.
          </p>
        </aside>

        {/* Sign-in form */}
        <section className="relative flex min-h-screen flex-col px-4 py-8">
          <div className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),radial-gradient(circle_at_72%_8%,_rgba(129,140,248,0.16),_transparent_42%)]" />
            <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/25 to-violet-300/20 blur-3xl" />
          </div>

          <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center">
            <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/80 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center justify-between">
            <NexoraLogo compact />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Sign in
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your Nexora Solution account.</p>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700"
            >
              {error}
            </motion.div>
          ) : null}
          {info ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700"
            >
              {info}
            </motion.div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5 text-sm text-slate-700">
              <span className="font-medium">Email address</span>
              <div className="relative">
                <HiOutlineUser className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block space-y-1.5 text-sm text-slate-700">
              <span className="font-medium">Password</span>
              <div className="relative">
                <HiOutlineLockClosed className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white/70 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <button type="button" onClick={handlePasswordReset} className="text-sm font-semibold text-sky-700 transition hover:text-sky-900">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <HiOutlineArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AiOutlineGoogle className="h-5 w-5 text-slate-700" />
            {googleLoading ? 'Connecting with Google…' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-slate-900 hover:text-slate-700">
              Create account
            </Link>
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <HiOutlineShieldCheck className="h-4 w-4 text-emerald-500" />
            Enterprise-grade security · Your data is safe
          </div>
            </motion.div>
          </div>

          <p className="relative mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            NEXORA SOLUTION — All rights reserved 2019-2026.
          </p>
        </section>
      </div>
    </main>
  )
}
