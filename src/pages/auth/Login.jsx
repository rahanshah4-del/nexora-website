import { useEffect, useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import { FaApple, FaMicrosoft } from 'react-icons/fa'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineBuildingLibrary,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloud,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineGlobeAlt,
  HiOutlineHomeModern,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import useAuth from '../../context/useAuth.js'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import { motion } from 'framer-motion'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { getCustomEmailVerificationStatus } from '../../lib/emailVerificationService.js'
import { createPasswordResetLink, passwordResetEmail, sendWorkerEmail } from '../../lib/transactionalEmail.js'
import { getPostLoginRoute } from '../../lib/authRouteState.js'

const modules = [
  { name: 'CRM', detail: 'Customer Relationship Management', icon: HiOutlineUserGroup, color: 'bg-blue-600' },
  { name: 'School ERP', detail: 'School & Student Management', icon: HiOutlineBuildingLibrary, color: 'bg-emerald-500' },
  { name: 'Property ERP', detail: 'Property & Tenant Management', icon: HiOutlineHomeModern, color: 'bg-violet-600' },
  { name: 'POS', detail: 'Point of Sale Management', icon: HiOutlineShoppingCart, color: 'bg-amber-500' },
  { name: 'WhatsApp CRM', detail: 'WhatsApp Business Automation', icon: HiOutlineChatBubbleLeftRight, color: 'bg-rose-500' },
  { name: 'Reports', detail: 'Analytics & Business Intelligence', icon: HiOutlineChartBarSquare, color: 'bg-cyan-500' },
]

const trustBadges = [
  { title: 'Cloud Based', detail: 'Secure & Reliable', icon: HiOutlineCloud },
  { title: 'Secure Data', detail: 'Your data is safe', icon: HiOutlineShieldCheck },
  { title: 'Always Updated', detail: 'Latest Features', icon: HiOutlineArrowPath },
]

const footerBadges = [
  { title: '100% Secure', detail: 'Enterprise Grade Security', icon: HiOutlineShieldCheck },
  { title: '24/7 Support', detail: 'We are here to help you', icon: HiOutlineUsers },
  { title: 'Trusted by Businesses', detail: 'Growing together', icon: HiOutlineUserGroup },
]

const languageOptions = ['English', 'Urdu', 'Arabic', 'Hindi']

function BrandLogo({ dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${dark ? 'bg-white' : 'bg-slate-950'} p-2 shadow-sm`}>
        <img src={logoUrl} alt="Nexora Solutions" className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[1.55rem] font-extrabold leading-none tracking-[0.08em] ${dark ? 'text-white' : 'text-slate-950'}`}>
          NEXORA
        </span>
        <span className={`mt-1 block text-xs font-semibold uppercase tracking-[0.34em] ${dark ? 'text-blue-100' : 'text-slate-500'}`}>
          Solutions
        </span>
      </span>
    </div>
  )
}

function BusinessSuiteLogo() {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-2">
          <img src={logoUrl} alt="Nexora Business Suite" className="h-full w-full object-contain" />
        </span>
        <span>
          <span className="block text-3xl font-extrabold leading-none tracking-[0.18em] text-slate-950">NEXORA</span>
          <span className="mt-1 block text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-600">
            Business Suite
          </span>
        </span>
      </div>
    </div>
  )
}

function ModuleCard({ module }) {
  const Icon = module.icon

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.12] p-4 text-center shadow-[0_14px_35px_-28px_rgba(0,0,0,0.7)] backdrop-blur">
      <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${module.color} text-white shadow-lg shadow-slate-950/15`}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-sm font-bold text-white">{module.name}</h3>
      <p className="mt-2 text-xs leading-5 text-blue-100">{module.detail}</p>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-900">{label}</span>
      {children}
    </label>
  )
}

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState(languageOptions[0])
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [existingUserRoute, setExistingUserRoute] = useState('')

  useEffect(() => {
    let cancelled = false

    async function resolveExistingUserRoute() {
      if (loading || !user) {
        setExistingUserRoute('')
        return
      }

      const customVerified = await getCustomEmailVerificationStatus(user)
      if (!user.emailVerified && !customVerified) {
        if (!cancelled) setExistingUserRoute(getPostLoginRoute({ ...user, emailVerifiedCustom: false }))
        return
      }

      const workspaceResult = await ensureUserWorkspace(user)
      if (!cancelled) {
        setExistingUserRoute(getPostLoginRoute({
          ...user,
          emailVerifiedCustom: customVerified,
          onboardingCompleted: workspaceResult?.onboardingCompleted,
        }))
      }
    }

    resolveExistingUserRoute().catch((err) => {
      if (!cancelled) {
        console.error('[Post Login Route]', { error: err?.message || err })
        setExistingUserRoute('/workspace')
      }
    })

    return () => {
      cancelled = true
    }
  }, [loading, user])

  if (!loading && user && existingUserRoute) return <Navigate to={existingUserRoute} replace />

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
      await trackAnalyticsEvent('login_started', { email: email.trim().toLowerCase(), page: '/login' })
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      const customVerified = await getCustomEmailVerificationStatus(credentials.user)
      console.log('[Login Verification Gate]', {
        firebaseEmailVerified: credentials.user.emailVerified,
        customVerified,
      })
      if (!credentials.user.emailVerified && !customVerified) {
        navigate('/verify-email', { replace: true })
        return
      }
      const workspaceResult = await ensureUserWorkspace(credentials.user, { provider: 'password' })
      await trackAnalyticsEvent('login_completed', { userId: credentials.user.uid, email: credentials.user.email || email.trim().toLowerCase(), page: '/login', status: 'success' })
      navigate(getPostLoginRoute({
        ...credentials.user,
        emailVerifiedCustom: customVerified,
        onboardingCompleted: workspaceResult?.onboardingCompleted,
      }), { replace: true })
    } catch (err) {
      await trackAnalyticsEvent('login_failed', { email: email.trim().toLowerCase(), page: '/login', status: err?.code || 'failed' })
      setError(clientSafeMessage(err, 'Unable to sign in. Please verify your credentials.', { context: 'Login with email' }))
    } finally {
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
      await trackAnalyticsEvent('login_started', { page: '/login', buttonLabel: 'Google sign in' })
      const result = await signInWithPopup(auth, provider)
      const workspaceResult = await ensureUserWorkspace(result.user, { provider: 'google' })
      await trackAnalyticsEvent('login_completed', { userId: result.user.uid, email: result.user.email || '', page: '/login', status: 'google' })
      navigate(getPostLoginRoute({
        ...result.user,
        emailVerifiedCustom: true,
        onboardingCompleted: workspaceResult?.onboardingCompleted,
      }), { replace: true })
    } catch (err) {
      await trackAnalyticsEvent('login_failed', { page: '/login', status: err?.code || 'google_failed' })
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
      setInfo('Password reset email sent.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="relative flex min-h-screen flex-col overflow-x-hidden">
        <div className="absolute right-4 top-4 z-30 sm:right-8 sm:top-7">
          <label className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
            <HiOutlineGlobeAlt className="h-5 w-5" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="bg-transparent text-sm font-semibold outline-none"
              aria-label="Select language"
            >
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="grid flex-1 lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="relative overflow-hidden bg-[#06295c] px-6 pb-10 pt-8 text-white sm:px-10 lg:min-h-[calc(100vh-92px)] lg:px-12"
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,15,35,0.35),rgba(6,41,92,0)_45%),radial-gradient(circle_at_88%_44%,rgba(59,130,246,0.2),transparent_28%)]" />
            <div className="absolute right-[-8rem] top-[-3rem] hidden h-[125%] w-56 rounded-[50%] bg-slate-50 lg:block" />
            <div className="absolute bottom-[-4rem] left-0 h-36 w-[80%] rounded-tr-[100%] bg-white/[0.06]" />

            <div className="relative z-10 mx-auto max-w-xl lg:mx-0">
              <Link to="/" aria-label="Nexora Solutions home" className="inline-flex">
                <BrandLogo dark />
              </Link>

              <div className="mt-12 max-w-md">
                <h1 className="text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl lg:text-[2.65rem]">
                  One Platform, All Business Solutions
                </h1>
                <p className="mt-6 text-base leading-8 text-blue-100">
                  Manage your CRM, School, Property, POS and more in one secure platform.
                </p>
                <span className="mt-9 block h-1 w-20 rounded-full bg-blue-400" />
              </div>

              <div className="mt-8">
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-300">Our Modules</p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {modules.map((module) => (
                    <ModuleCard key={module.name} module={module} />
                  ))}
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {trustBadges.map((badge) => {
                  const Icon = badge.icon
                  return (
                    <div key={badge.title} className="flex items-center gap-3">
                      <Icon className="h-7 w-7 shrink-0 text-blue-300" />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white">{badge.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-blue-100">{badge.detail}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.aside>

          <section className="relative flex min-h-[680px] items-center justify-center px-5 py-20 sm:px-8 lg:min-h-[calc(100vh-92px)] lg:py-16">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(219,234,254,0.72),rgba(255,255,255,0.88)_45%,rgba(239,246,255,0.92))]" />
            <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:42px_42px]" />

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.08, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-[540px] rounded-[1.75rem] border border-slate-200 bg-white px-5 py-7 shadow-[0_28px_85px_-36px_rgba(15,23,42,0.35)] sm:px-9 sm:py-9"
            >
              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">Welcome Back!</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">Login to your Nexora Solutions account</p>
              </div>

              <div className="mt-7">
                <BusinessSuiteLogo />
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  {info}
                </div>
              ) : null}

              <form className="mt-7 space-y-5" onSubmit={onSubmit}>
                <FormField label="Email / Username">
                  <div className="relative mt-2">
                    <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Enter your email or username"
                      autoComplete="email"
                    />
                  </div>
                </FormField>

                <FormField label="Password">
                  <div className="relative mt-2">
                    <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormField>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-sm font-bold text-blue-600 transition hover:text-blue-800"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                  <HiOutlineArrowRight className="h-5 w-5" />
                </button>
              </form>

              <div className="my-7 flex items-center gap-5 text-sm font-medium text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                <span>or continue with</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-65"
                  aria-label="Continue with Google"
                >
                  <AiOutlineGoogle className="h-6 w-6 text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setInfo('Microsoft sign-in is not configured for this workspace.')}
                  className="flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Continue with Microsoft"
                >
                  <FaMicrosoft className="h-5 w-5 text-slate-800" />
                </button>
                <button
                  type="button"
                  onClick={() => setInfo('Apple sign-in is not configured for this workspace.')}
                  className="flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-50"
                  aria-label="Continue with Apple"
                >
                  <FaApple className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                <p className="text-sm font-medium text-slate-600">Don&apos;t have an account?</p>
                <Link
                  to="/signup"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-blue-700 sm:w-auto"
                >
                  Create Account
                </Link>
              </div>
            </motion.div>
          </section>
        </section>

        <footer className="relative z-20 border-t border-slate-200 bg-white/95 px-5 py-5">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
            {footerBadges.map((badge) => {
              const Icon = badge.icon
              return (
                <div key={badge.title} className="flex items-center justify-center gap-3 text-center sm:text-left">
                  <Icon className="h-7 w-7 shrink-0 text-blue-500" />
                  <span>
                    <span className="block text-sm font-extrabold text-slate-900">{badge.title}</span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{badge.detail}</span>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-5 text-center text-xs font-medium text-slate-500">
            © 2025 Nexora Solutions. All rights reserved.
          </p>
        </footer>

        <Link
          to="/"
          className="fixed bottom-4 left-4 z-30 hidden items-center gap-2 rounded-full border border-white/15 bg-slate-950/25 px-3 py-2 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-slate-950/40 lg:inline-flex"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Website
        </Link>
      </div>
    </main>
  )
}
