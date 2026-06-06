import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { FaWindows } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth.js'
import Badge from '../components/ui/Badge.jsx'
import { auth } from '../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createPasswordResetLink, passwordResetEmail, sendWorkerEmail } from '../../lib/transactionalEmail.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, signup, busy, error, setError } = useAuth()
  const [mode, setMode] = useState('login') // login | signup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [googleBusy, setGoogleBusy] = useState(false)
  const [info, setInfo] = useState('')

  const canSubmit = useMemo(
    () => email.trim() && password.trim() && (mode === 'login' || fullName.trim()) && !busy,
    [email, fullName, mode, password, busy],
  )

  async function onSubmit() {
    setError('')
    setInfo('')
    const trimmedFullName = fullName.trim()
    if (mode === 'signup' && !trimmedFullName) {
      setError('Enter your full name before you continue.')
      return
    }
    const ok = mode === 'signup'
      ? await signup(email.trim(), password, { fullName: trimmedFullName })
      : await login(email.trim(), password)
    if (ok) navigate(mode === 'signup' ? '/verify-email' : '/workspace')
  }

  async function onGoogle() {
    setError('')
    setInfo('')
    if (!auth) {
      setError('Google Sign In is not available right now.')
      return
    }
    const trimmedFullName = fullName.trim()
    if (mode === 'signup' && !trimmedFullName) {
      setError('Enter your full name before you continue.')
      return
    }
    setGoogleBusy(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      if (mode === 'signup' && trimmedFullName) {
        await updateProfile(result.user, { displayName: trimmedFullName }).catch((profileError) => {
          console.warn('[User Profile] displayName update failed', { code: profileError?.code || '', message: profileError?.message || '' })
        })
        console.log('[User Profile] fullName', trimmedFullName)
        console.log('[User Profile] displayName', trimmedFullName)
        console.log('[User Profile] profile source', 'signup.fullName')
      }
      ensureUserWorkspace(result.user, { provider: 'google', ...(trimmedFullName ? { fullName: trimmedFullName } : {}) })
        .then((workspaceResult) => {
          console.log('[Auth Flow] workspace ensure success', {
            source: 'crm-google-login',
            uid: result.user?.uid || '',
            workspaceId: workspaceResult?.workspaceId || '',
          })
        })
        .catch((workspaceError) => {
          console.warn('[Auth Flow] workspace ensure failed', {
            source: 'crm-google-login',
            code: workspaceError?.code || '',
            message: workspaceError?.message || String(workspaceError || ''),
          })
        })
      navigate('/workspace')
    } catch (err) {
      setError(clientSafeMessage(err, 'Google Sign In failed. Please try again.'))
    } finally {
      setGoogleBusy(false)
    }
  }

  async function onPasswordReset() {
    setError('')
    setInfo('')
    const to = email.trim().toLowerCase()
    if (!to) {
      setError('Enter your email first, then request a password reset.')
      return
    }
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
  }

  return (
    <div className="nexora-bg flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-nexora-gradient text-white shadow-glow">
              <span className="text-sm font-bold tracking-tight">N</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">NEXORA SOLUTIONS</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Business Suite Workspace</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-start gap-3">
            <Link
              to="/"
              className="focus-ring glass inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold hover:brightness-105 transition-transform transform hover:scale-105"
            >
              <HiOutlineArrowLeft className="text-lg" />
              <span>Back to Website</span>
            </Link>

            <div className="flex flex-col">
              <a
                href="/downloads/nexora-business-suite-windows.exe"
                className="focus-ring inline-flex items-center gap-3 rounded-2xl px-3 py-2 bg-gradient-to-r from-sky-600 to-violet-600 text-white shadow-soft transition-transform transform hover:scale-105"
              >
                <FaWindows className="text-xl" />
                <div className="text-left leading-tight">
                  <span className="text-sm font-semibold">Download Windows App</span>
                  <span className="block text-xs opacity-90">Free Trial Available</span>
                </div>
              </a>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Use Nexora Suite on your desktop with the same account.</p>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {mode === 'signup' ? 'Create account' : 'Welcome back'}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`focus-ring rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    mode === 'login'
                      ? 'bg-nexora-gradient text-white shadow-glow'
                      : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`focus-ring rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    mode === 'signup'
                      ? 'bg-nexora-gradient text-white shadow-glow'
                      : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                  onClick={() => setMode('signup')}
                >
                  Signup
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {mode === 'signup'
                ? 'Create an account to use the dashboard and upgrade flow.'
                : 'Sign in to manage customers, leads, and reports.'}
            </p>

            <div className="mt-6 space-y-3">
              <Button variant="subtle" className="h-11 w-full rounded-2xl" onClick={onGoogle} type="button" disabled={googleBusy || busy}>
                {googleBusy ? 'Connecting…' : 'Continue with Google'}
              </Button>

              {mode === 'signup' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
                  <Input
                    className="mt-1"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              ) : null}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  {info}
                </div>
              ) : null}

              <Button
                className="h-11 w-full rounded-2xl"
                onClick={onSubmit}
                type="button"
                disabled={!canSubmit}
              >
                {busy ? 'Working…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <Badge variant="default">Secure Access</Badge>
                <button className="focus-ring text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300" type="button" onClick={onPasswordReset}>
                  Forgot password?
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-300">
              Your session stays available across web and desktop.
            </p>
          </Card>
        </motion.div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          By signing in you agree to our <Link className="underline" to="/login">terms</Link>.
        </p>
      </div>
    </div>
  )
}
