import { Link, NavLink, Outlet } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import useAuth from '../context/useAuth.js'

const appNav = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/customers', label: 'Customers' },
  { to: '/app/leads', label: 'Leads' },
  { to: '/app/pipeline', label: 'Pipeline' },
  { to: '/app/reports', label: 'Reports' },
  { to: '/app/settings', label: 'Settings' },
]

export default function AppLayout() {
  const { user, isAdmin } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold tracking-wide text-white">
              NEXORA
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">Business Suite</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin/upgrade-requests"
                className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10 sm:inline-flex"
              >
                Admin
              </Link>
            ) : null}
            <span className="hidden max-w-[12rem] truncate text-xs text-slate-300 sm:inline">{user?.email ?? ''}</span>
            <button
              type="button"
              onClick={() => (auth ? signOut(auth) : undefined)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-8 lg:px-8">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-3 lg:sticky lg:top-6 lg:h-[calc(100vh-5.5rem)]">
          <nav className="space-y-1">
            {appNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'block rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-white/10 text-white' : 'text-slate-200/80 hover:bg-white/10 hover:text-white',
                  ].join(' ')
                }
                end
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
