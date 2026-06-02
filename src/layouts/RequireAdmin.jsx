import { useContext } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/auth-context.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'
import { isBackendAdminEmail } from '../lib/roles.js'

function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-2xl font-black text-rose-600">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You do not have permission to open the Nexora Backend Control Centre. Sign in with a system admin or super admin account.
        </p>
        <a
          className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          href="/app/dashboard"
        >
          Back to CRM
        </a>
      </section>
    </main>
  )
}

function AuthProviderMissing() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Admin auth is not available</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The Backend Control Centre could not find AuthProvider. Reload the app or sign in again.
        </p>
        <a className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white" href="/login">
          Go to Login
        </a>
      </section>
    </main>
  )
}

export default function RequireAdmin({ children }) {
  const location = useLocation()
  const auth = useContext(AuthContext)

  if (!auth) {
    return <AuthProviderMissing />
  }

  const { user, isAdmin, loading } = auth
  const adminAllowed = isBackendAdminEmail(user?.email)

  if (loading) {
    return <PageLoader stage="auth" />
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!adminAllowed) {
    return <AccessDenied />
  }

  return children || <Outlet />
}
