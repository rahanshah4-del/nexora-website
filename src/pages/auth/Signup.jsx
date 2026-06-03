import { useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth, db } from '../../lib/firebase.js'
import { createSignupUserProfile, ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import useAuth from '../../context/useAuth.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { motion } from 'framer-motion'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { sendCustomVerificationEmail } from '../../lib/emailVerificationService.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { sendWorkerEmail, welcomeEmail } from '../../lib/transactionalEmail.js'

export default function Signup() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)

  if (!loading && user && !verificationSent) {
    return <Navigate to="/workspace" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!auth) {
      setError('Authentication is not available right now. Please try again later.')
      return
    }
    if (!db) {
      setError('Workspace setup is not available right now. Please try again later.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords must match before you continue.')
      return
    }

    setSubmitting(true)
    try {
      await trackAnalyticsEvent('signup_started', { email: email.trim().toLowerCase(), phone: phone.trim(), page: '/signup' })
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const userRecord = credentials.user
      await createSignupUserProfile(userRecord, email.trim().toLowerCase())
      await ensureUserWorkspace(userRecord, {
        fullName: fullName.trim(),
        company: company.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        provider: 'password',
        allowUnverifiedProfile: true,
      })
      const emailResult = await sendCustomVerificationEmail(userRecord)
      if (!emailResult.ok) {
        setError(emailResult.error || 'Could not send verification email right now.')
        return
      }
      const welcome = welcomeEmail({ name: fullName.trim() || userRecord.displayName || 'there' })
      const welcomeResult = await sendWorkerEmail({ to: userRecord.email || email.trim().toLowerCase(), ...welcome })
      setVerificationSent(true)
      setInfo(welcomeResult.ok ? 'Welcome and verification emails sent.' : `Verification email sent. Welcome email failed: ${welcomeResult.error}`)
      await trackAnalyticsEvent('signup_completed', { userId: userRecord.uid, email: email.trim().toLowerCase(), phone: phone.trim(), page: '/signup', status: 'verification_sent' })
    } catch (err) {
      setError(clientSafeMessage(err, 'Unable to create account. Please try again.', { context: 'Signup with email' }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setInfo('')

    if (!auth) {
      setError('Google sign-up is not configured. Please try email sign up instead.')
      return
    }
    if (!db) {
      setError('Workspace setup is not available right now. Please try again later.')
      return
    }

    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await trackAnalyticsEvent('signup_started', { email: email.trim().toLowerCase(), phone: phone.trim(), page: '/signup', buttonLabel: 'Google signup' })
      const result = await signInWithPopup(auth, provider)
      const signedUser = result.user

      if (signedUser?.uid) {
        await ensureUserWorkspace(signedUser, {
          fullName: signedUser.displayName || fullName.trim(),
          company: company.trim(),
          email: signedUser.email || email.trim().toLowerCase(),
          phone: phone.trim(),
          provider: 'google',
        })
      }

      navigate('/workspace', { replace: true })
      await trackAnalyticsEvent('signup_completed', { userId: signedUser.uid, email: signedUser.email || email.trim().toLowerCase(), phone: phone.trim(), page: '/signup', status: 'google' })
    } catch (err) {
      setError(clientSafeMessage(err, 'Google signup failed. Please try again.', { context: 'Signup with Google' }))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative overflow-hidden py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_26%),radial-gradient(circle_at_70%_18%,_rgba(129,140,248,0.16),_transparent_24%)]" />
        <div className="pointer-events-none absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-gradient-to-br from-sky-400/20 to-violet-400/15 blur-3xl" />
        <div className="pointer-events-none absolute left-0 bottom-0 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-300/15 to-slate-200/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-200/70 bg-sky-50/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                Nexora account builder
              </div>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Nexora Solutions</p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Create your Nexora account and power your business operations.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600">
                  A polished signup experience for teams, stores, hospitals, and service providers. Get access to CRM, invoicing, inventory, and live dashboards with a secure account.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-950">Verified onboarding</h2>
                  <p className="mt-3 text-sm text-slate-600">Quick user setup with guided account creation and business profile details.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-950">Google friendly</h2>
                  <p className="mt-3 text-sm text-slate-600">Sign up with your Google account and save time on secure access.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Designed for business growth</p>
                <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">Tailored workflows for retail, healthcare, and logistics.</div>
                  <div className="rounded-3xl bg-slate-50 p-4">Automatic account provisioning and secure session handling.</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-[0_35px_80px_-35px_rgba(15,23,42,0.18)] backdrop-blur-xl"
            >
              <div className="absolute -right-16 top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 opacity-70 blur-3xl" />
              <div className="absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-200 to-slate-200 opacity-80 blur-3xl" />
              <div className="relative space-y-7">
                <div className="flex items-center justify-between gap-4 pb-4">
                  <NexoraLogo compact />
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Secure sign up
                  </p>
                </div>

                {error ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                {info ? (
                  <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                    {info}
                  </div>
                ) : null}

                {verificationSent ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                    <p className="text-base font-semibold text-emerald-900">Verification email sent.</p>
                    <p className="mt-2 leading-6">Check your inbox, open the email, and verify your account before creating a workspace.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email', { replace: true })}
                      className="mt-4 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Continue to verification
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignUp}
                      disabled={googleLoading}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <AiOutlineGoogle className="h-5 w-5 text-slate-700" />
                      {googleLoading ? 'Connecting with Google…' : 'Sign up with Google'}
                    </button>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-px flex-1 bg-slate-200" />
                      <span>or continue with email</span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Full name</span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="John Doe"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Company / location</span>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="Nexora Retail"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Email address</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Phone number</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="0312 3456789"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Password</span>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="Create a strong password"
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span>Confirm password</span>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        placeholder="Re-enter password"
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Creating account…' : 'Create account'}
                  </button>
                    </form>
                  </>
                )}

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Why join Nexora?</p>
                  <p className="mt-2 leading-6">
                    One secure account to manage customers, invoices, stock, and live dashboards. Your data is ready for growth from day one.
                  </p>
                </div>

                <div className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-slate-900 hover:text-slate-700">
                    Sign in
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
