import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const adminNav = [
  { to: '/admin/control-centre', label: 'Control Centre' },
  { to: '/admin/upgrade-requests', label: 'Upgrade Requests' },
]

export default function AdminLayout() {
  const location = useLocation()
  if (location.pathname === '/admin/control-centre') return <Outlet />

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/app/dashboard" className="text-sm font-semibold tracking-wide text-white">
              NEXORA SOLUTION Admin
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">Business Suite</span>
          </div>
          <Link
            to="/app/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10"
          >
            Back to App
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-8 lg:px-8">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-3 lg:sticky lg:top-6 lg:h-[calc(100vh-5.5rem)]">
          <nav className="space-y-1">
            {adminNav.map((item) => (
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
