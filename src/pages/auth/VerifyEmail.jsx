import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import useAuth from '../../context/useAuth.js'
import { auth } from '../../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { sendCustomVerificationEmail } from '../../lib/emailVerificationService.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import Toast from '../../crm/components/ui/Toast.jsx'

export default function VerifyEmail() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  function showToast(nextToast, timeout = 2400) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), timeout)
  }

  if (!loading && !user) return <Navigate to="/login" replace />
  if (!loading && user?.emailVerified) return <Navigate to="/workspace" replace />

  const handleRefreshStatus = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser) return
    setChecking(true)
    setMessage('')
    setError('')
    try {
      await currentUser.reload()
      if (currentUser.emailVerified) {
        await ensureUserWorkspace(currentUser, { provider: 'password' })
        navigate('/workspace', { replace: true })
        return
      }
      setMessage('Not verified yet. Open the email link, then refresh status again.')
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
      const resendResult = await sendCustomVerificationEmail(currentUser)
      if (!resendResult.ok) {
        const nextError = resendResult.error || 'Could not send verification email right now.'
        setError(nextError)
        showToast({ tone: 'error', message: nextError })
        return
      }
      const nextMessage = resendResult.message || 'Verification email sent.'
      setMessage(nextMessage)
      showToast({ tone: 'success', message: nextMessage })
    } catch (err) {
      const nextError = clientSafeMessage(err, 'Could not send verification email right now.', { context: 'Resend email verification' })
      setError(nextError)
      showToast({ tone: 'error', message: nextError })
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = async () => {
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
              Open the verification email sent to <span className="font-semibold text-slate-900">{user?.email}</span>, verify your account, then refresh your status.
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
            <div className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">2. Open email</div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">3. Verify account</div>
          </div>

          {message ? <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">{message}</div> : null}
          {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={checking}
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checking ? 'Checking...' : 'Refresh Status'}
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

          <button type="button" onClick={handleSignOut} className="mt-5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
            Sign in with another account
          </button>
        </div>
      </section>
    </main>
  )
}
