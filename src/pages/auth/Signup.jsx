import { useEffect, useMemo, useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi2'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { auth, db } from '../../lib/firebase.js'
import { createSignupUserProfile, ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import useAuth from '../../context/useAuth.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { sendCustomVerificationEmail } from '../../lib/emailVerificationService.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { safeTrackMetaEventOnce } from '../../lib/metaPixel.js'

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAKISTAN_MOBILE_RE = /^03\d{9}$/
const SIGNUP_SESSION_MS = 5 * 60 * 1000

function validateField(name, value, all) {
  const phoneDigits = normalizePhone(value)
  switch (name) {
    case 'fullName':
      return value.trim() ? '' : 'Enter your full name.'
    case 'company':
      return value.trim() ? '' : 'Enter your company or location.'
    case 'email':
      if (!value.trim()) return 'Enter your email address.'
      return EMAIL_RE.test(value.trim()) ? '' : 'Enter a valid email address.'
    case 'phone':
      if (!value.trim()) return 'Enter your phone number.'
      if (!/^\d+$/.test(value.trim())) return 'Use digits only, for example 03194329754.'
      if (phoneDigits.length !== 11) return 'Phone number must be exactly 11 digits, for example 03194329754.'
      return PAKISTAN_MOBILE_RE.test(phoneDigits) ? '' : 'Phone number must start with 03, for example 03194329754.'
    case 'password':
      if (value.length < 8) return 'Password must be at least 8 characters.'
      return /[A-Za-z]/.test(value) && /\d/.test(value) ? '' : 'Password must include at least one letter and one number.'
    case 'confirmPassword':
      if (!value) return 'Re-enter your password.'
      return value === all.password ? '' : 'Passwords do not match.'
    default:
      return ''
  }
}

function Field({ label, name, type = 'text', value, error, touched, onChange, onBlur, placeholder, autoComplete }) {
  const showError = touched && error
  const valid = touched && !error && value
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          onBlur={() => onBlur(name)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-white/70 px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 ${
            showError
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 focus:border-sky-400 focus:ring-sky-100'
          }`}
        />
        {showError ? (
          <HiOutlineExclamationCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-400" />
        ) : valid ? (
          <HiOutlineCheckCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-400" />
        ) : null}
      </div>
      {showError ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  )
}

export default function Signup() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', company: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSessionExpired(true)
      setError('Your signup session expired. Please refresh the page and start again.')
    }, SIGNUP_SESSION_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const errors = useMemo(() => {
    const next = {}
    Object.keys(form).forEach((key) => {
      const msg = validateField(key, form[key], form)
      if (msg) next[key] = msg
    })
    return next
  }, [form])

  const formValid = Object.keys(errors).length === 0

  if (!loading && user && !verificationSent && !submitting && !googleLoading) {
    return <Navigate to={user.emailVerified ? '/workspace' : '/verify-email'} replace />
  }

  const handleChange = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    if (error && !sessionExpired) setError('')
  }

  const handleBlur = (name) => setTouched((current) => ({ ...current, [name]: true }))

  const markAllTouched = () =>
    setTouched({ fullName: true, company: true, email: true, phone: true, password: true, confirmPassword: true })

  async function ensureUniquePhone(normalizedPhone) {
    if (!db || !normalizedPhone) return true
    try {
      const snap = await getDoc(doc(db, 'phoneRegistry', normalizedPhone))
      if (snap.exists()) {
        setError('This phone number is already registered.')
        return false
      }
      return true
    } catch (phoneError) {
      // A read failure here (transient/network/rules) must never block a
      // legitimate signup. The uniqueness check is best-effort — the registry
      // doc is still written after the account is created. Log and proceed.
      console.warn('[Phone Check] uniqueness read failed, proceeding', {
        code: phoneError?.code || '',
        message: phoneError?.message || '',
      })
      return true
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    markAllTouched()
    if (sessionExpired) {
      setError('Your signup session expired. Please refresh the page and start again.')
      return
    }
    if (!formValid) return

    if (!auth) {
      setError('Authentication is not available right now. Please try again later.')
      return
    }
    if (!db) {
      setError('Workspace setup is not available right now. Please try again later.')
      return
    }

    const signupEmail = form.email.trim().toLowerCase()
    const trimmedFullName = form.fullName.trim()
    const trimmedPhone = form.phone.trim()
    const normalizedPhone = normalizePhone(trimmedPhone)

    setSubmitting(true)
    try {
      if (!(await ensureUniquePhone(normalizedPhone))) {
        setSubmitting(false)
        return
      }

      await trackAnalyticsEvent('signup_started', { email: signupEmail, phone: trimmedPhone, page: '/signup' }).catch(() => {})
      const credentials = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      const userRecord = credentials.user
      await updateProfile(userRecord, { displayName: trimmedFullName }).catch(() => {})

      try {
        await createSignupUserProfile(userRecord, {
          fullName: trimmedFullName,
          company: form.company.trim(),
          email: signupEmail,
          phone: trimmedPhone,
          phoneNormalized: normalizedPhone,
          provider: 'password',
        })
      } catch {
        setError('Account profile could not be created. Please try again.')
        return
      }

      const emailResult = await sendCustomVerificationEmail(userRecord)
      if (!emailResult.ok) {
        setError(emailResult.error || 'Could not send verification email right now.')
        return
      }
      setVerificationSent(true)
      trackAnalyticsEvent('signup_completed', { userId: userRecord.uid, email: signupEmail, phone: trimmedPhone, page: '/signup', status: 'verification_sent' }).catch(() => {})
      navigate('/verify-email', { replace: true })
    } catch (err) {
      setError(clientSafeMessage(err, 'Unable to create account. Please try again.', { context: 'Signup with email' }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    if (!auth || !db) {
      setError('Google sign-up is not available right now. Please try email sign up instead.')
      return
    }
    setTouched((current) => ({ ...current, fullName: true, phone: true }))
    if (sessionExpired) {
      setError('Your signup session expired. Please refresh the page and start again.')
      return
    }
    const trimmedFullName = form.fullName.trim()
    const trimmedPhone = form.phone.trim()
    if (!trimmedFullName) {
      setError('Enter your full name before continuing with Google.')
      return
    }
    if (!trimmedPhone) {
      setError('Enter your phone number before continuing with Google.')
      return
    }
    const normalizedPhone = normalizePhone(trimmedPhone)

    setGoogleLoading(true)
    try {
      if (!(await ensureUniquePhone(normalizedPhone))) {
        setGoogleLoading(false)
        return
      }
      const provider = new GoogleAuthProvider()
      await trackAnalyticsEvent('signup_started', { email: form.email.trim().toLowerCase(), phone: trimmedPhone, page: '/signup', buttonLabel: 'Google signup' }).catch(() => {})
      const result = await signInWithPopup(auth, provider)
      const signedUser = result.user

      if (signedUser?.uid) {
        await updateProfile(signedUser, { displayName: trimmedFullName }).catch(() => {})
        // Google accounts are already email-verified, so provisioning runs now.
        const workspaceResult = await ensureUserWorkspace(signedUser, {
          fullName: trimmedFullName,
          company: form.company.trim(),
          email: signedUser.email || form.email.trim().toLowerCase(),
          phone: trimmedPhone,
          phoneNormalized: normalizedPhone,
          provider: 'google',
        })
        if (workspaceResult?.workspaceId) {
          safeTrackMetaEventOnce('StartTrial', undefined, `nexora_meta_starttrial:${signedUser.uid}`, 'local')
        }
      }

      trackAnalyticsEvent('signup_completed', { userId: signedUser.uid, email: signedUser.email || '', phone: trimmedPhone, page: '/signup', status: 'google' }).catch(() => {})
      navigate('/workspace', { replace: true })
    } catch (err) {
      setError(clientSafeMessage(err, 'Google signup failed. Please try again.', { context: 'Signup with Google' }))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),radial-gradient(circle_at_72%_8%,_rgba(129,140,248,0.16),_transparent_42%)]" />
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/25 to-violet-300/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-200/25 to-slate-200/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/80 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center justify-between">
            <NexoraLogo compact />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Sign up
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Create your Nexora account</h1>
            <p className="mt-1.5 text-sm text-slate-500">Set up your business workspace in a few seconds.</p>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{error}</span>
                {sessionExpired ? (
                  <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white">
                    Refresh
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || submitting || sessionExpired}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AiOutlineGoogle className="h-5 w-5 text-slate-700" />
            {googleLoading ? 'Connecting with Google…' : 'Sign up with Google'}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or sign up with email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="fullName" value={form.fullName} error={errors.fullName} touched={touched.fullName} onChange={handleChange} onBlur={handleBlur} placeholder="John Doe" autoComplete="name" />
              <Field label="Company / location" name="company" value={form.company} error={errors.company} touched={touched.company} onChange={handleChange} onBlur={handleBlur} placeholder="Nexora Retail" autoComplete="organization" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email address" name="email" type="email" value={form.email} error={errors.email} touched={touched.email} onChange={handleChange} onBlur={handleBlur} placeholder="you@example.com" autoComplete="email" />
              <Field label="Phone number" name="phone" type="tel" value={form.phone} error={errors.phone} touched={touched.phone} onChange={handleChange} onBlur={handleBlur} placeholder="03194329754" autoComplete="tel" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" name="password" type="password" value={form.password} error={errors.password} touched={touched.password} onChange={handleChange} onBlur={handleBlur} placeholder="At least 8 characters" autoComplete="new-password" />
              <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} error={errors.confirmPassword} touched={touched.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="Re-enter password" autoComplete="new-password" />
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading || sessionExpired}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-slate-900 hover:text-slate-700">
              Sign in
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  )
}
