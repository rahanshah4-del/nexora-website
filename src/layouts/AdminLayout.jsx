import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const adminNav = [
  { to: '/admin/control-centre', label: 'Control Centre' },
  { to: '/admin/client-command-center', label: 'Command Center' },
  { to: '/admin/upgrade-requests', label: 'Upgrade Requests' },
]

export default function AdminLayout() {
  const location = useLocation()
  if (location.pathname === '/admin/control-centre') return <Outlet />
  const lightMode = location.pathname === '/admin/client-command-center'
  const shellClass = lightMode ? 'min-h-screen bg-slate-50 text-slate-950' : 'min-h-screen bg-slate-950 text-white'
  const headerClass = lightMode ? 'border-b border-slate-200 bg-white/90 backdrop-blur' : 'border-b border-white/10 bg-slate-950/60 backdrop-blur'
  const brandClass = lightMode ? 'text-sm font-semibold tracking-wide text-slate-950' : 'text-sm font-semibold tracking-wide text-white'
  const subtitleClass = lightMode ? 'hidden text-xs text-slate-500 sm:inline' : 'hidden text-xs text-slate-400 sm:inline'
  const backClass = lightMode
    ? 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700'
    : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10'
  const asideClass = lightMode
    ? 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-5.5rem)]'
    : 'rounded-2xl border border-white/10 bg-white/5 p-3 lg:sticky lg:top-6 lg:h-[calc(100vh-5.5rem)]'
  const navClass = (isActive) =>
    [
      'block rounded-xl px-3 py-2 text-sm font-semibold transition',
      lightMode
        ? isActive
          ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        : isActive
          ? 'bg-white/10 text-white'
          : 'text-slate-200/80 hover:bg-white/10 hover:text-white',
    ].join(' ')

  return (
    <div className={shellClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/app/dashboard" className={brandClass}>
              NEXORA SOLUTION Admin
            </Link>
            <span className={subtitleClass}>Business Suite</span>
          </div>
          <Link
            to="/app/dashboard"
            className={backClass}
          >
            Back to App
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-8 lg:px-8">
        <aside className={asideClass}>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navClass(isActive)}
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
