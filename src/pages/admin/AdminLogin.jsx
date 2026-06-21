import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { AuthContext } from '../../context/auth-context.js'
import { auth, authPersistenceReady } from '../../lib/firebase.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'

export default function AdminLogin() {
  const authState = useContext(AuthContext)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authState?.loading) return
    if (!authState?.user) return
    console.log('[Admin Auth] route guard email:', authState.user.email)
    if (isBackendAdminEmail(authState.user.email)) {
      console.log('[Admin Auth] allowed')
      navigate('/admin/control-centre', { replace: true })
      return
    }
    console.log('[Admin Auth] blocked')
    setError('Only backend admin can access this panel.')
  }, [authState?.loading, authState?.user, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!auth) {
      setError('Backend authentication is not configured.')
      return
    }

    setLoading(true)
    try {
      await authPersistenceReady
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      console.log('[Admin Auth] login email:', credentials.user.email)
      if (!isBackendAdminEmail(credentials.user.email)) {
        console.log('[Admin Auth] blocked')
        setError('Only backend admin can access this panel.')
        return
      }
      await credentials.user.reload()
      await credentials.user.getIdToken(true)
      if (!credentials.user.emailVerified) {
        setError('Backend admin email must be verified before access is allowed.')
        return
      }
      console.log('[Admin Auth] allowed')
      navigate('/admin/control-centre', { replace: true })
    } catch (err) {
      setError(clientSafeMessage(err, 'Unable to sign in to backend.', { context: 'Backend admin login' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#08172b] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-xl font-black text-white">
            N
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">Nexora Backend Control Centre</h1>
          <p className="mt-2 text-sm text-slate-500">System admin login. Firebase email/password only.</p>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button
            className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <Link className="mt-5 block text-center text-sm font-bold text-slate-500 hover:text-slate-950" to="/">
          Back to website
        </Link>
      </section>
    </main>
  )
}
