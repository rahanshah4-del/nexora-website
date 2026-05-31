import { useState } from 'react'
import { AiOutlineGoogle } from 'react-icons/ai'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link, Navigate } from 'react-router-dom'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth, firebaseEnabled } from '../../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import useAuth from '../../context/useAuth.js'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { motion } from 'framer-motion'

export default function Login() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!loading && user) {
    console.log('Redirecting to workspace')
    return <Navigate to="/workspace" replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!firebaseEnabled || !auth) {
      setError('Authentication is not configured. Please check your setup and try again.')
      return
    }

    setSubmitting(true)
    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      await ensureUserWorkspace(credentials.user, { provider: 'password' })
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please verify your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setInfo('')

    if (!firebaseEnabled || !auth) {
      setError('Google sign-in is not available. Please try email sign in.')
      return
    }

    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await ensureUserWorkspace(result.user, { provider: 'google' })
    } catch (err) {
      setError(err?.message || 'Google sign-in failed. Please try again.')
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
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back to Website
          </Link>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-200/70 bg-sky-50/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                Nexora secure access
              </div>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-600">Nexora Solutions</p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Sign in to your Nexora Suite account.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600">
                  Access CRM, sales pipelines, reporting, and customer workflows from one premium business portal.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-950">Fast access</h2>
                  <p className="mt-3 text-sm text-slate-600">Login quickly with email and password or Google.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-950">Secure sessions</h2>
                  <p className="mt-3 text-sm text-slate-600">Encrypted authentication and safe app access for your team.</p>
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
                    CRM sign in
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

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AiOutlineGoogle className="h-5 w-5 text-slate-700" />
                  {googleLoading ? 'Connecting with Google…' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span>or continue with email</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition duration-200 ease-out focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setInfo('Password reset is not available. Contact support for help.')}
                        className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition duration-200 ease-out focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Not registered yet?</p>
                  <p className="mt-2 leading-6">
                    Create a Nexora account to manage your customers, invoices, and reports from any device.
                  </p>
                </div>

                <div className="text-center text-sm text-slate-500">
                  New to Nexora?{' '}
                  <Link to="/signup" className="font-semibold text-slate-900 hover:text-slate-700">
                    Create account
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
