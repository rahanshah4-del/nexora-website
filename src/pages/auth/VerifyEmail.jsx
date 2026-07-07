import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineCheck, HiOutlineEnvelope, HiOutlineArrowLeft } from 'react-icons/hi2'
import useAuth from '../../context/useAuth.js'
import { auth } from '../../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { getCustomEmailVerificationStatus, sendCustomVerificationEmail, verifyCustomEmailOtp } from '../../lib/emailVerificationService.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import Toast from '../../crm/components/ui/Toast.jsx'
import { getPostVerificationRoute } from '../../lib/authRouteState.js'
import { clearAllUserCache } from '../../lib/authIsolation.js'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 45
const COMPLETE_REGISTRATION_TRACKED_KEY = 'nexora_complete_registration_tracked'

function trackCompleteRegistrationOnce() {
  if (typeof window === 'undefined') return
  if (window.sessionStorage.getItem(COMPLETE_REGISTRATION_TRACKED_KEY) === '1') return

  let attempts = 0
  const fire = () => {
    attempts += 1
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'CompleteRegistration')
      window.sessionStorage.setItem(COMPLETE_REGISTRATION_TRACKED_KEY, '1')
      return
    }
    if (attempts < 10) {
      window.setTimeout(fire, 300)
    }
  }

  fire()
}

function logAutoLogoutTrace(functionName, reason) {
  console.warn('[AUTO LOGOUT TRACE]', {
    file: 'src/pages/auth/VerifyEmail.jsx',
    function: functionName,
    reason,
    route: window.location.pathname,
    uid: auth?.currentUser?.uid,
    email: auth?.currentUser?.email,
    time: new Date().toISOString(),
    stack: new Error().stack,
  })
}

function clearLocalAuthWorkspaceState(userId) {
  if (typeof window === 'undefined') return

  const selectedWorkspaceUserId = window.localStorage.getItem('selectedWorkspaceUserId')
  if (!userId || selectedWorkspaceUserId === userId) {
    window.localStorage.removeItem('selectedWorkspace')
    window.localStorage.removeItem('selectedWorkspaceUserId')
  }
  if (userId) window.localStorage.removeItem(`selectedWorkspace:${userId}`)

  const selectedProductUserId = window.localStorage.getItem('selectedProductUserId')
  if (!userId || selectedProductUserId === userId) {
    window.localStorage.removeItem('selectedProduct')
    window.localStorage.removeItem('selectedProductUserId')
  }

  if (userId) {
    window.sessionStorage.removeItem(`nexoraSessionId:${userId}`)
    window.sessionStorage.removeItem(`nexoraSessionStartTime:${userId}`)
  }
  window.sessionStorage.removeItem('nexoraSessionId')
  window.sessionStorage.removeItem('nexoraSessionStartedAt')
  Object.keys(window.sessionStorage).forEach((key) => {
    if ((userId && key.startsWith(`nexoraWorkspaceModalSeen:${userId}:`)) || (!userId && key.startsWith('nexoraWorkspaceModalSeen:'))) {
      window.sessionStorage.removeItem(key)
    }
  })

  window.dispatchEvent(new CustomEvent('nexora:selectedWorkspaceChanged', { detail: { userId: userId || '', workspace: null } }))
}

export default function VerifyEmail() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const userId = user?.uid || ''
  const userEmail = user?.email || ''
  const firebaseEmailVerified = user?.emailVerified === true

  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputsRef = useRef([])
  const autoSubmittedOtpRef = useRef('')

  const otp = digits.join('')

  function showToast(nextToast, timeout = 2400) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), timeout)
  }

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const interval = window.setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [cooldown])

  // Focus the first box on mount.
  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const runBackgroundProvisioning = useCallback((currentUser, source) => {
    // Workspace ensure is a strictly background task (req #8) — it must never
    // block navigation and must never sign the user out on failure. The welcome
    // email is intentionally NOT sent here; it goes out once the client selects
    // a business module on /workspace, so the email matches their selection.
    ensureUserWorkspace(currentUser, { provider: 'password' })
      .then((workspaceResult) => {
        console.log('[Auth Flow] workspace ensure success', {
          source,
          uid: currentUser.uid,
          workspaceId: workspaceResult?.workspaceId || '',
        })
      })
      .catch((bgError) => {
        console.warn('[OTP Flow] background workspace ensure failed', { source, error: bgError?.message || bgError })
      })

    trackAnalyticsEvent('signup_completed', { userId: currentUser.uid, email: currentUser.email || '', page: '/verify-email', status: 'email_verified_custom' })
      .catch(() => {})
  }, [])

  const goToWorkspaceAfterSuccess = useCallback((currentUser, source) => {
    setSuccess(true)
    runBackgroundProvisioning(currentUser, source)
    const route = getPostVerificationRoute({ ...currentUser, emailVerifiedCustom: true })
    trackCompleteRegistrationOnce()
    // Brief success animation, then redirect.
    window.setTimeout(() => navigate(route, { replace: true }), 1100)
  }, [navigate, runBackgroundProvisioning])

  // If already verified (e.g. returning user lands here), redirect out.
  useEffect(() => {
    let cancelled = false
    async function redirectIfVerified() {
      if (loading || !userId) return
      try {
        const customVerified = await getCustomEmailVerificationStatus({ uid: userId, email: userEmail, emailVerified: firebaseEmailVerified })
        if (!cancelled && (firebaseEmailVerified || customVerified)) {
          navigate('/workspace', { replace: true })
        }
      } catch {
        // Stay on the page and let the user enter their code.
      }
    }
    redirectIfVerified()
    return () => {
      cancelled = true
    }
  }, [firebaseEmailVerified, loading, navigate, userEmail, userId])

  if (!loading && !user) return <Navigate to="/login" replace />

  const focusBox = (index) => {
    const node = inputsRef.current[index]
    if (node) {
      node.focus()
      node.select?.()
    }
  }

  const setDigitAt = (index, value) => {
    setDigits((current) => {
      const next = [...current]
      next[index] = value
      return next
    })
  }

  const handleChange = (index, rawValue) => {
    setError('')
    const value = rawValue.replace(/\D/g, '')
    if (!value) {
      setDigitAt(index, '')
      return
    }
    // Typing a single digit advances; pasting multiple fills forward.
    if (value.length === 1) {
      setDigitAt(index, value)
      if (index < OTP_LENGTH - 1) focusBox(index + 1)
      return
    }
    distribute(value, index)
  }

  const distribute = (value, startIndex = 0) => {
    const chars = value.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex).split('')
    if (!chars.length) return
    setDigits((current) => {
      const next = [...current]
      chars.forEach((char, offset) => {
        next[startIndex + offset] = char
      })
      return next
    })
    const lastFilled = Math.min(startIndex + chars.length, OTP_LENGTH - 1)
    focusBox(lastFilled)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        setDigitAt(index, '')
        return
      }
      if (index > 0) {
        setDigitAt(index - 1, '')
        focusBox(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusBox(index - 1)
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData?.getData('text') || ''
    if (!/\d/.test(pasted)) return
    event.preventDefault()
    setError('')
    distribute(pasted, 0)
  }

  const handleVerify = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser?.email) return
    if (otp.length !== OTP_LENGTH) {
      setError('Enter the 6-digit verification code.')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const result = await verifyCustomEmailOtp(currentUser, otp)
      if (!result.ok) {
        setError(result.error || 'Invalid verification code.')
        showToast({ tone: 'error', message: result.error || 'Invalid verification code.' })
        return
      }
      showToast({ tone: 'success', message: 'Email verified successfully.' })
      goToWorkspaceAfterSuccess(currentUser, 'otp-submit')
    } catch (err) {
      const nextError = clientSafeMessage(err, 'Could not verify code right now.', { context: 'Verify custom email OTP' })
      setError(nextError)
      showToast({ tone: 'error', message: nextError })
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (otp.length < OTP_LENGTH) {
      autoSubmittedOtpRef.current = ''
      return undefined
    }
    if (!/^\d{6}$/.test(otp) || verifying || success || autoSubmittedOtpRef.current === otp) return undefined
    autoSubmittedOtpRef.current = otp
    const timer = window.setTimeout(() => {
      handleVerify()
    }, 180)
    return () => window.clearTimeout(timer)
  }, [otp, verifying, success])

  const handleResend = async () => {
    const currentUser = auth?.currentUser || user
    if (!currentUser?.email || cooldown > 0) return
    setSending(true)
    setError('')
    try {
      const emailResult = await sendCustomVerificationEmail(currentUser)
      if (!emailResult.ok) {
        const nextError = emailResult.error || 'Could not send a new code right now.'
        setError(nextError)
        showToast({ tone: 'error', message: nextError })
        return
      }
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setDigits(Array(OTP_LENGTH).fill(''))
      focusBox(0)
      showToast({ tone: 'success', message: emailResult.message || 'New code sent. Check your inbox.' })
    } catch (err) {
      const nextError = clientSafeMessage(err, 'Could not send a new code right now.', { context: 'Send email verification' })
      setError(nextError)
      showToast({ tone: 'error', message: nextError })
    } finally {
      setSending(false)
    }
  }

  const handleLeaveVerification = async () => {
    const currentUser = auth?.currentUser || user
    const currentUid = currentUser?.uid || ''
    setLeaving(true)
    setError('')
    try {
      clearAllUserCache(currentUid)
      clearLocalAuthWorkspaceState(currentUid)
      if (auth) {
        logAutoLogoutTrace('handleLeaveVerification', 'user_clicked_leave_verification')
        await signOut(auth)
      }
      if (auth?.currentUser) {
        logAutoLogoutTrace('handleLeaveVerification', 'user_clicked_leave_verification_retry_current_user_still_set')
        await signOut(auth)
      }
    } catch (err) {
      setError(clientSafeMessage(err, 'Could not sign out. Please try again.', { context: 'Leave email verification' }))
      setLeaving(false)
      return
    }
    trackAnalyticsEvent('logout', { userId: currentUid, email: currentUser?.email || '', page: '/verify-email' }).catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 text-slate-950">
      {/* Ambient light/glass background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),radial-gradient(circle_at_70%_10%,_rgba(129,140,248,0.16),_transparent_42%)]" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-300/30 to-violet-300/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-200/30 to-slate-200/20 blur-3xl" />
      </div>

      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/80 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                >
                  <HiOutlineCheck className="h-10 w-10" />
                </motion.span>
                <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-950">Email verified</h1>
                <p className="mt-2 text-sm text-slate-500">Setting up your workspace…</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between">
                  <NexoraLogo compact />
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                    <HiOutlineEnvelope className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-6">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">Verify your email</h1>
                  <p className="mt-2 text-sm leading-5 text-slate-500">
                    Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{userEmail}</span>.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Check your Spam or Junk folder if you don&apos;t see it.</p>
                </div>

                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <div className="mt-6 flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
                  {digits.map((digit, index) => (
                    <input
                      key={`otp-${index}`}
                      ref={(node) => {
                        inputsRef.current[index] = node
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      disabled={verifying}
                      onChange={(event) => handleChange(index, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      onFocus={(event) => event.target.select()}
                      className={`h-12 w-full min-w-0 rounded-xl border bg-white text-center text-xl font-black text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 sm:h-14 ${
                        digit ? 'border-sky-300' : 'border-slate-200'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying || otp.length !== OTP_LENGTH}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Verifying…
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-sm">
                  <span className="text-slate-500">Didn&apos;t get the code?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={sending || cooldown > 0}
                    className="font-semibold text-sky-700 transition hover:text-sky-900 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLeaveVerification}
                    disabled={leaving}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <HiOutlineArrowLeft className="h-4 w-4" />
                    {leaving ? 'Signing out…' : 'Use a different account'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </main>
  )
}
