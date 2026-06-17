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
  { name: 'General CRM', icon: HiOutlineUserGroup, tone: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/30' },
  { name: 'Restaurant POS', icon: HiOutlineBuildingStorefront, tone: 'bg-gradient-to-br from-rose-400 to-pink-600 shadow-lg shadow-rose-500/30' },
  { name: 'Retail / POS', icon: HiOutlineShoppingBag, tone: 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30' },
  { name: 'School ERP', icon: HiOutlineAcademicCap, tone: 'bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/30' },
  { name: 'Property ERP', icon: HiOutlineHomeModern, tone: 'bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-violet-500/30' },
  { name: 'Transport / Rental', icon: HiOutlineTruck, tone: 'bg-gradient-to-br from-cyan-400 to-teal-600 shadow-lg shadow-cyan-500/30' },
  { name: 'WhatsApp CRM', icon: HiOutlineChatBubbleLeftRight, tone: 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30' },
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
    <main className="relative min-h-screen overflow-hidden bg-[#070b1a] text-slate-950">
      {/* Ambient animated backdrop — vivid aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600/30 via-indigo-700/20 to-fuchsia-700/25" />
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-sky-500/50 blur-[130px]" />
        <div className="absolute right-[-10rem] top-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/45 blur-[130px]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-500/45 blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand + modules showcase — desktop only */}
        <aside className="relative hidden flex-col justify-between p-10 xl:p-14 lg:flex">
          <NexoraLogo size="lg" invert />

          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300 shadow-[0_0_10px_2px_rgba(56,189,248,0.8)]" />
              All-in-one business suite
            </span>
            <h2 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight xl:text-5xl">
              <span className="text-white">Run every business</span>
              <br />
              <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">from one workspace.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
              CRM, Restaurant POS, Retail, School &amp; Property ERP, Transport and WhatsApp — unified, secure, real-time.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              {LOGIN_MODULES.map((module, index) => (
                <motion.div
                  key={module.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * index, ease: 'easeOut' }}
                  className="group flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-1.5 pr-4 backdrop-blur-md transition hover:border-white/30 hover:bg-white/15"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${module.tone}`}>
                    <module.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-semibold text-white">{module.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Nexora Solution — All rights reserved 2019-2026.
          </p>
        </aside>

        {/* Sign-in form */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-[22rem] rounded-3xl border border-white/15 bg-white/95 p-6 shadow-[0_40px_120px_-40px_rgba(2,6,23,0.9)] backdrop-blur-2xl"
          >
            {/* Logo on mobile (left panel hidden) */}
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <NexoraLogo size="lg" />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Sign in
              </span>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-600/40">
              <HiOutlineLockClosed className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-[22px] font-black tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-1 text-[13px] text-slate-500">Sign in to your Nexora Solution account.</p>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[13px] font-medium text-rose-700"
              >
                {error}
              </motion.div>
            ) : null}
            {info ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-[13px] font-medium text-sky-700"
              >
                {info}
              </motion.div>
            ) : null}

            <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
              <label className="block space-y-1 text-[13px] text-slate-700">
                <span className="font-semibold">Email address</span>
                <div className="relative">
                  <HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block space-y-1 text-[13px] text-slate-700">
                <span className="font-semibold">Password</span>
                <div className="relative">
                  <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiOutlineEyeSlash className="h-[18px] w-[18px]" /> : <HiOutlineEye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <button type="button" onClick={handlePasswordReset} className="text-[13px] font-semibold text-sky-700 transition hover:text-sky-900">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600 bg-[length:200%_auto] text-[13px] font-bold text-white shadow-lg shadow-indigo-600/35 transition hover:bg-right hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <HiOutlineArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="uppercase tracking-wide">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AiOutlineGoogle className="h-[18px] w-[18px] text-slate-700" />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <p className="mt-5 text-center text-[13px] text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-bold text-slate-900 hover:text-slate-700">
                Create account
              </Link>
            </p>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <HiOutlineShieldCheck className="h-4 w-4 text-emerald-500" />
              Enterprise-grade security · Your data is safe
            </div>
          </motion.div>

          <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">
            NEXORA SOLUTION — All rights reserved 2019-2026.
          </p>
        </section>
      </div>
    </main>
  )
}
