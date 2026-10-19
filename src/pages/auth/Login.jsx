import { useEffect, useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBeaker,
  HiOutlineBuildingStorefront,
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineFingerPrint,
  HiOutlineKey,
  HiOutlineHomeModern,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { signInWithCustomToken, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { motion } from 'framer-motion'
import { auth, authPersistenceReady, functions } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { getCustomEmailVerificationStatus } from '../../lib/emailVerificationService.js'
import { createPasswordResetLink, sendWorkerEmail } from '../../lib/transactionalEmail.js'
import { VERIFY_EMAIL_ROUTE, WORKSPACE_ROUTE } from '../../lib/authRouteState.js'
import useMobileDarkScheme from '../../lib/mobileDarkScheme.js'
import { passkeysSupported, recordLoginHistory, signInWithPasskey } from '../../lib/passkeys.js'

// Modules showcased on the sign-in panel — mirrors the workspace catalog.
const LOGIN_MODULES = [
  { name: 'General CRM', icon: HiOutlineUserGroup, tone: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/30' },
  { name: 'Restaurant POS', icon: HiOutlineBuildingStorefront, tone: 'bg-gradient-to-br from-rose-400 to-pink-600 shadow-lg shadow-rose-500/30' },
  { name: 'Retail / POS', icon: HiOutlineShoppingBag, tone: 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30' },
  { name: 'Pharmacy', icon: HiOutlineBeaker, tone: 'bg-gradient-to-br from-teal-400 to-emerald-600 shadow-lg shadow-teal-500/30' },
  { name: 'School ERP', icon: HiOutlineAcademicCap, tone: 'bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/30' },
  { name: 'Property ERP', icon: HiOutlineHomeModern, tone: 'bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-violet-500/30' },
  { name: 'Transport / Rental', icon: HiOutlineTruck, tone: 'bg-gradient-to-br from-cyan-400 to-teal-600 shadow-lg shadow-cyan-500/30' },
  { name: 'WhatsApp CRM', icon: HiOutlineChatBubbleLeftRight, tone: 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30' },
]

const SHOW_STAFF_CASHIER_LOGIN = false

export default function Login() {
  const { user, loading } = useAuth()
  useMobileDarkScheme(1023)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [staffLoginOpen, setStaffLoginOpen] = useState(false)
  const [staffWorkspaceCode, setStaffWorkspaceCode] = useState('')
  const [staffLoginId, setStaffLoginId] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [staffSubmitting, setStaffSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false)

  useEffect(() => {
    const storedNotice = window.sessionStorage.getItem('nexora:loginNotice')
    if (storedNotice) {
      setInfo(storedNotice)
      setSessionExpiredNotice(true)
      window.sessionStorage.removeItem('nexora:loginNotice')
      return
    }
    if (location.state?.reason === 'workspace_inactivity') {
      setInfo('Your workspace session expired after 15 minutes of inactivity. Please sign in again. If you enabled passkey, use “Sign in with Passkey”.')
      setSessionExpiredNotice(true)
    }
  }, [location.state])

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
      recordLoginHistory({ method: 'password', status: 'success', userId: credentials.user.uid, email: credentials.user.email || loginEmail }).catch(() => {})
      trackAnalyticsEvent('login_completed', { userId: credentials.user.uid, email: credentials.user.email || loginEmail, page: '/login', status: 'success' }).catch(() => {})
      window.sessionStorage.removeItem('nexora:loginNotice')
      console.log('[LOGIN STEP 7] Route decision', { route: WORKSPACE_ROUTE, reason: 'verified' })
      navigate(WORKSPACE_ROUTE, { replace: true })
      console.log('[LOGIN STEP 8] Navigation success', { route: WORKSPACE_ROUTE })
    } catch (err) {
      console.error('[LOGIN ERROR]', { code: err?.code || '', message: err?.message || String(err || '') })
      trackAnalyticsEvent('login_failed', { email: email.trim().toLowerCase(), page: '/login', status: err?.code || 'failed' }).catch(() => {})
      recordLoginHistory({ method: 'password', status: 'failed', email: email.trim().toLowerCase(), error: err?.code || err?.message || 'failed' }).catch(() => {})
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
      recordLoginHistory({ method: 'google', status: 'success', userId: result.user.uid, email: result.user.email || '' }).catch(() => {})
      trackAnalyticsEvent('login_completed', { userId: result.user.uid, email: result.user.email || '', page: '/login', status: 'google' }).catch(() => {})
      window.sessionStorage.removeItem('nexora:loginNotice')
      navigate(WORKSPACE_ROUTE, { replace: true })
    } catch (err) {
      trackAnalyticsEvent('login_failed', { page: '/login', status: err?.code || 'google_failed' }).catch(() => {})
      recordLoginHistory({ method: 'google', status: 'failed', error: err?.code || err?.message || 'google_failed' }).catch(() => {})
      setError(clientSafeMessage(err, 'Google sign-in failed. Please try again.', { context: 'Login with Google' }))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    setError('')
    setInfo('')
    if (!passkeysSupported()) {
      setError('Passkey is not supported on this browser or device.')
      return
    }
    setPasskeyLoading(true)
    try {
      trackAnalyticsEvent('login_started', { page: '/login', buttonLabel: 'Passkey sign in' }).catch(() => {})
      const { credentials } = await signInWithPasskey()
      trackAnalyticsEvent('login_completed', { userId: credentials.user.uid, email: credentials.user.email || '', page: '/login', status: 'passkey' }).catch(() => {})
      window.sessionStorage.removeItem('nexora:loginNotice')
      navigate(WORKSPACE_ROUTE, { replace: true })
    } catch (err) {
      trackAnalyticsEvent('login_failed', { page: '/login', status: err?.code || 'passkey_failed' }).catch(() => {})
      setError(clientSafeMessage(err, 'Passkey sign-in failed. Use password or Google, then register a new passkey from Security settings.', { context: 'Login with passkey' }))
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleStaffSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    if (!auth || !functions) {
      setError('Staff login service is not available right now.')
      return
    }
    const workspaceCode = staffWorkspaceCode.trim().toUpperCase()
    const staffId = staffLoginId.trim().toUpperCase()
    const pin = staffPin.trim()
    if (!workspaceCode || !staffId || !pin) {
      setError('Workspace code, Staff ID, aur PIN enter karein.')
      return
    }
    setStaffSubmitting(true)
    try {
      await authPersistenceReady
      const loginStaff = httpsCallable(functions, 'teamStaffLogin')
      const response = await loginStaff({ workspaceCode, staffLoginId: staffId, pin })
      const result = response?.data || {}
      if (!result.success || !result.customToken) {
        setError('Staff login details verify nahi ho sakay.')
        return
      }
      const credentials = await signInWithCustomToken(auth, result.customToken)
      recordLoginHistory({
        method: 'team-pin',
        status: 'success',
        userId: credentials.user.uid,
        email: result.staff?.email || credentials.user.email || '',
      }).catch(() => {})
      trackAnalyticsEvent('login_completed', {
        userId: credentials.user.uid,
        page: '/login',
        status: 'team-pin',
        role: result.staff?.role || 'staff',
      }).catch(() => {})
      window.sessionStorage.removeItem('nexora:loginNotice')
      navigate(WORKSPACE_ROUTE, { replace: true })
    } catch (err) {
      trackAnalyticsEvent('login_failed', { page: '/login', status: err?.code || 'team_pin_failed' }).catch(() => {})
      recordLoginHistory({ method: 'team-pin', status: 'failed', error: err?.code || err?.message || 'team_pin_failed' }).catch(() => {})
      setError(clientSafeMessage(err, 'Staff login failed. Workspace code, Staff ID, aur PIN check karein.', { context: 'Staff PIN login' }))
    } finally {
      setStaffSubmitting(false)
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
      // Signed-out: the worker only accepts the password_reset template and
      // builds the link itself.
      const sent = await sendWorkerEmail({ to, type: 'password_reset', data: { resetUrl: resetLink.link } })
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
              CRM, Restaurant POS, Retail, Pharmacy, School &amp; Property ERP, Transport and WhatsApp — unified, secure, real-time.
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
        <section className="relative flex min-h-screen flex-col items-center overflow-y-auto px-4 py-5 max-lg:items-stretch max-lg:justify-between max-lg:px-0 max-lg:py-0 sm:px-5 sm:py-8">
          {/* Mobile-only brand header on the dark backdrop (the card below becomes a bottom sheet) */}
          <div className="relative px-6 pb-7 pt-[max(2rem,env(safe-area-inset-top))] lg:hidden">
            <NexoraLogo size="xs" invert className="max-w-full" />
            <h2 className="mt-6 text-[26px] font-black leading-[1.12] tracking-tight text-white">
              Run every business
              <span className="block bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">from one workspace.</span>
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">CRM, POS, Pharmacy, School &amp; Property ERP and WhatsApp in one secure place.</p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="my-auto w-full max-w-[21rem] rounded-3xl border border-white/15 bg-white/95 p-4 shadow-[0_32px_90px_-42px_rgba(2,6,23,0.9)] backdrop-blur-2xl max-lg:my-0 max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-[2rem] max-lg:border-0 max-lg:bg-[#0b1226] max-lg:px-6 max-lg:pb-[max(1.75rem,env(safe-area-inset-bottom))] max-lg:pt-7 max-lg:shadow-[0_-24px_60px_-30px_rgba(2,6,23,0.9)] max-lg:ring-1 max-lg:ring-white/10 sm:p-5"
          >
            {/* Logo on mobile (left panel hidden) — compact so it never overlaps */}
            <div className="mb-3 hidden items-center justify-between gap-2">
              <NexoraLogo compact className="min-w-0" />
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Sign in
              </span>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-600/40 max-lg:hidden">
              <HiOutlineLockClosed className="h-[18px] w-[18px]" />
            </div>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-950 max-lg:mt-0 max-lg:text-2xl max-lg:text-white sm:text-xl">Welcome back</h1>
            <p className="mt-1 text-xs text-slate-500 max-lg:text-sm max-lg:text-slate-400">Sign in to your Nexora Solution account.</p>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 max-h-16 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold leading-5 text-rose-700 max-lg:max-h-none max-lg:border-rose-400/30 max-lg:bg-rose-500/10 max-lg:px-4 max-lg:py-3 max-lg:text-sm max-lg:text-rose-200"
              >
                {error}
              </motion.div>
            ) : null}
            {info ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`mt-4 text-center ${
                  sessionExpiredNotice
                    ? 'rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-4 shadow-[0_18px_55px_-36px_rgba(245,158,11,0.75)]'
                    : 'rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-[13px] font-medium text-sky-700 max-lg:border-sky-400/30 max-lg:bg-sky-500/10 max-lg:text-sky-200'
                }`}
              >
                {sessionExpiredNotice ? (
                  <>
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-2xl shadow-sm">
                      ⏳
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-950">Session expired</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{info}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => setSessionExpiredNotice(false)} className="min-h-10 rounded-xl bg-slate-950 px-3 text-xs font-black text-white">
                        Re-login
                      </button>
                      <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
                        Reload
                      </button>
                    </div>
                  </>
                ) : info}
              </motion.div>
            ) : null}

            <form className="mt-4 space-y-3 max-lg:mt-5 max-lg:space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-1 text-xs text-slate-700 max-lg:space-y-1.5 max-lg:text-sm max-lg:text-slate-200">
                <span className="font-semibold">Email address</span>
                <div className="relative">
                  <HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-[13px] max-lg:h-[52px] max-lg:rounded-2xl max-lg:pl-11 max-lg:text-base max-lg:border-white/10 max-lg:bg-white/5 max-lg:text-white max-lg:placeholder:text-slate-500 max-lg:focus:border-sky-400 max-lg:focus:bg-white/10 max-lg:focus:ring-sky-400/20 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block space-y-1 text-xs text-slate-700 max-lg:space-y-1.5 max-lg:text-sm max-lg:text-slate-200">
                <span className="font-semibold">Password</span>
                <div className="relative">
                  <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-[13px] max-lg:h-[52px] max-lg:rounded-2xl max-lg:pl-11 max-lg:pr-12 max-lg:text-base max-lg:border-white/10 max-lg:bg-white/5 max-lg:text-white max-lg:placeholder:text-slate-500 max-lg:focus:border-sky-400 max-lg:focus:bg-white/10 max-lg:focus:ring-sky-400/20 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 max-lg:h-10 max-lg:w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 max-lg:text-slate-300 max-lg:hover:bg-white/10"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiOutlineEyeSlash className="h-[18px] w-[18px]" /> : <HiOutlineEye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <button type="button" onClick={handlePasswordReset} className="text-xs font-semibold text-sky-700 transition hover:text-sky-900 max-lg:text-sky-300 max-lg:-my-1 max-lg:px-1 max-lg:py-2 max-lg:text-sm">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl max-lg:h-[52px] max-lg:rounded-2xl max-lg:text-base bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600 bg-[length:200%_auto] text-[13px] font-bold text-white shadow-lg shadow-indigo-600/35 transition hover:bg-right hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="my-3 flex items-center gap-3 text-[10px] text-slate-400 max-lg:my-5 max-lg:text-xs">
              <span className="h-px flex-1 bg-slate-200 max-lg:bg-white/10" />
              <span className="uppercase tracking-wide">or</span>
              <span className="h-px flex-1 bg-slate-200 max-lg:bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl max-lg:h-[52px] max-lg:rounded-2xl max-lg:text-[15px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 max-lg:border-white/15 max-lg:bg-white/5 max-lg:text-white max-lg:hover:bg-white/10 transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AiOutlineGoogle className="h-[18px] w-[18px] text-slate-700 max-lg:text-white" />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <button
              type="button"
              disabled
              className="mt-2.5 flex h-10 w-full cursor-not-allowed max-lg:hidden items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-semibold text-slate-400"
              title="Microsoft sign-in is future ready"
            >
              Continue with Microsoft
            </button>

            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={passkeyLoading}
              className="group mt-2.5 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl max-lg:mt-3 max-lg:h-[52px] max-lg:rounded-2xl max-lg:text-[15px] border border-slate-900 bg-slate-950 text-[13px] font-black text-white shadow-lg shadow-slate-950/20 max-lg:border-white max-lg:bg-white max-lg:text-slate-950 max-lg:shadow-none max-lg:hover:bg-slate-100 transition hover:-translate-y-0.5 hover:bg-slate-900 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-white to-slate-200 text-slate-950 shadow-sm ring-1 ring-white/40 max-lg:from-slate-800 max-lg:to-slate-950 max-lg:text-white max-lg:ring-0 transition group-hover:scale-105">
                <HiOutlineFingerPrint className="h-[17px] w-[17px] stroke-[2.4]" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-slate-950 bg-cyan-300" />
              </span>
              {passkeyLoading ? 'Opening passkey…' : 'Sign in with Passkey'}
            </button>

            {SHOW_STAFF_CASHIER_LOGIN ? (
              <button
                type="button"
                onClick={() => {
                  setStaffLoginOpen((open) => !open)
                  setError('')
                  setInfo('')
                }}
                className="mt-2.5 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-[13px] font-black text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.99]"
              >
                <HiOutlineKey className="h-[18px] w-[18px]" />
                {staffLoginOpen ? 'Hide Staff / Cashier Login' : 'Staff / Cashier Login'}
              </button>
            ) : null}

            {SHOW_STAFF_CASHIER_LOGIN && staffLoginOpen ? (
              <form className="mt-3 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3" onSubmit={handleStaffSignIn}>
                <label className="block space-y-1 text-xs text-slate-700">
                  <span className="font-semibold">Workspace code</span>
                  <input
                    type="text"
                    required
                    value={staffWorkspaceCode}
                    onChange={(event) => setStaffWorkspaceCode(event.target.value.toUpperCase())}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold uppercase text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="NX1234"
                    autoComplete="organization"
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-700">
                  <span className="font-semibold">Staff ID</span>
                  <input
                    type="text"
                    required
                    value={staffLoginId}
                    onChange={(event) => setStaffLoginId(event.target.value.toUpperCase())}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold uppercase text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="CSH-1234"
                    autoComplete="username"
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-700">
                  <span className="font-semibold">PIN</span>
                  <input
                    type="password"
                    required
                    value={staffPin}
                    onChange={(event) => setStaffPin(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="6 digit PIN"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-[13px] font-black text-white transition hover:bg-slate-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {staffSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Verifying…
                    </>
                  ) : (
                    'Login as Staff / Cashier'
                  )}
                </button>
              </form>
            ) : null}

            <p className="mt-4 text-center text-xs text-slate-500 max-lg:mt-6 max-lg:text-[15px] max-lg:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-bold text-slate-900 hover:text-slate-700 max-lg:text-white">
                Create account
              </Link>
            </p>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 max-lg:mt-4 max-lg:text-xs">
              <HiOutlineShieldCheck className="h-4 w-4 text-emerald-500" />
              Enterprise-grade security · Your data is safe
            </div>
          </motion.div>

          <p className="hidden">
            NEXORA SOLUTION — All rights reserved 2019-2026.
          </p>
        </section>
      </div>
    </main>
  )
}
