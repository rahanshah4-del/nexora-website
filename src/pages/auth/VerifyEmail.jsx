import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import useAuth from '../../context/useAuth.js'
import { auth } from '../../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { getCustomEmailVerificationStatus, sendCustomVerificationEmail, verifyCustomEmailOtp } from '../../lib/emailVerificationService.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import Toast from '../../crm/components/ui/Toast.jsx'

export default function VerifyEmail() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [toast, setToast] = useState(null)

  function showToast(nextToast, timeout = 2400) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), timeout)
  }

  if (!loading && !user) return <Navigate to="/login" replace />
  const handleRefreshStatus = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser) return
    setChecking(true)
    setMessage('')
    setError('')
    try {
      const verified = currentUser.emailVerified || await getCustomEmailVerificationStatus(currentUser)
      if (verified) {
        await ensureUserWorkspace(currentUser, { provider: 'password' })
        await trackAnalyticsEvent('signup_completed', { userId: currentUser.uid, email: currentUser.email || '', page: '/verify-email', status: 'email_verified_custom' })
        navigate('/workspace', { replace: true })
        return
      }
      setMessage('Not verified yet. Enter the 6 digit code from your email, or send a new code.')
    } catch (err) {
      setError(clientSafeMessage(err, 'Could not refresh verification status. Please try again.', { context: 'Refresh email verification' }))
    } finally {
      setChecking(false)
    }
  }

  const handleResend = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser?.email) return
    setSending(true)
    setMessage('')
    setError('')
    try {
      const emailResult = await sendCustomVerificationEmail(currentUser)
      if (!emailResult.ok) {
        const nextError = emailResult.error || 'Verification email sent. Please check inbox/spam.'
        setError(nextError)
        showToast({ tone: 'error', message: nextError })
        return
      }
      const nextMessage = emailResult.message || 'Verification email sent. Please check inbox/spam.'
      setMessage(nextMessage)
      showToast({ tone: 'success', message: nextMessage })
    } catch (err) {
      const nextError = clientSafeMessage(err, 'Could not send verification email right now.', { context: 'Send email verification' })
      setError(nextError)
      showToast({ tone: 'error', message: nextError })
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser?.email) return
    setChecking(true)
    setMessage('')
    setError('')
    try {
      const result = await verifyCustomEmailOtp(currentUser, otp)
      if (!result.ok) {
        setError(result.error || 'Invalid verification code.')
        showToast({ tone: 'error', message: result.error || 'Invalid verification code.' })
        return
      }
      await ensureUserWorkspace(currentUser, { provider: 'password' })
      await trackAnalyticsEvent('signup_completed', { userId: currentUser.uid, email: currentUser.email || '', page: '/verify-email', status: 'email_verified_custom' })
      showToast({ tone: 'success', message: 'Email verified successfully.' })
      navigate('/workspace', { replace: true })
    } catch (err) {
      const nextError = clientSafeMessage(err, 'Could not verify code right now.', { context: 'Verify custom email OTP' })
      setError(nextError)
      showToast({ tone: 'error', message: nextError })
    } finally {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    await trackAnalyticsEvent('logout', { userId: user?.uid || '', email: user?.email || '', page: '/verify-email' })
    if (auth) await signOut(auth)
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_28px_85px_-44px_rgba(15,23,42,0.38)] sm:p-9">
          <NexoraLogo compact />
          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Check your inbox</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Verify your account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter the 6 digit verification code sent to <span className="font-semibold text-slate-900">{user?.email}</span>.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              If you don&apos;t see the verification email, please check your Spam, Junk, Promotions, or Updates folder.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Email na mile to Spam/Junk folder bhi check karein.
            </p>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">1. Check your inbox</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">2. Copy the 6 digit code</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">3. Verify account</div>
          </div>

          {message ? <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">{message}</div> : null}
          {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-700" htmlFor="verification-otp">Verification code</label>
            <input
              id="verification-otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-lg font-black tracking-[0.35em] text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="000000"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={checking || otp.length !== 6}
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checking ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>

          <button type="button" onClick={handleRefreshStatus} disabled={checking} className="mt-4 text-sm font-semibold text-sky-700 transition hover:text-sky-900">
            {checking ? 'Checking...' : 'Refresh verification status'}
          </button>

          <button type="button" onClick={handleSignOut} className="mt-5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
            Sign in with another account
          </button>
        </div>
      </section>
    </main>
  )
}
