import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'

export default function Login() {
  const location = useLocation()
  const { user, loading, firebaseEnabled } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const from = useMemo(() => location.state?.from || '/app/dashboard', [location.state])

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  const switchMode = () => {
    const next = mode === 'login' ? 'signup' : 'login'
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('mode', next)
      return p
    })
    setError('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!firebaseEnabled || !auth) {
      setError('Firebase auth is not configured. Set VITE_FIREBASE_* env vars and redeploy.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (e) {
      setError(e?.message || 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-300">NEXORA BUSINESS SUITE</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'signup' ? 'Start Free Trial' : 'Login'}</h1>
          <p className="mt-2 text-sm text-slate-200/80">
            {mode === 'signup' ? 'Create an account to access the CRM dashboard.' : 'Sign in to open your dashboard.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-semibold text-slate-200">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500/60"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-200">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500/60"
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
              />
            </div>

            {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300">
            <button type="button" onClick={switchMode} className="font-semibold text-slate-100 hover:underline">
              {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
            </button>
            <Link to="/" className="font-semibold text-slate-100 hover:underline">
              Back to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
