import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import Badge from '../ui/Badge.jsx'
import PricingModal from '../billing/PricingModal.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.js'
import logoUrl from '../../../assets/logo/nexora-logo.svg'

function Brand({ collapsed }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-2 py-2`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-1.5 shadow-sm">
        <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">Nexora CRM</p>
          <p className="truncate text-[11px] font-medium text-slate-500">Admin workspace</p>
        </div>
      ) : null}
    </div>
  )
}

export default function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse }) {
  const [pricingOpen, setPricingOpen] = useState(false)
  const navigate = useNavigate()
  const { plan } = useUser()
  const isBusiness = plan === 'Business'
  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <Brand collapsed={collapsed} />
      <div className={`mt-3 px-2 ${collapsed ? 'hidden' : ''}`}>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-700">Operations Console</p>
        </div>
      </div>
      <nav className={`mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-2 ${collapsed ? 'space-y-2' : 'space-y-1.5'}`}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'focus-ring group relative flex items-center rounded-2xl text-sm font-semibold transition duration-200 ease-out',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-slate-950 text-white shadow-[0_16px_42px_-28px_rgba(15,23,42,0.9)]'
                    : 'text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-sm',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed ? (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-400" />
                  ) : null}
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition',
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-sky-700',
                    )}
                  />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-3">
          <div className="rounded-[1.15rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Upgrade to Business</p>
              {isBusiness ? (
                <Badge variant="success">Business Active</Badge>
              ) : plan === 'Starter' ? (
                <Badge variant="info">Starter Plan</Badge>
              ) : (
                <Badge variant="default">Free Plan</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Unlock advanced reports and team permissions.
            </p>
            <button
              className="focus-ring mt-3 w-full rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-sky-700 disabled:opacity-70"
              onClick={() => navigate('/upgrade-business')}
              disabled={isBusiness}
              type="button"
            >
              {isBusiness ? 'Business Active' : 'Upgrade Now'}
            </button>
            <button
              type="button"
              className="focus-ring mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300"
              onClick={() => setPricingOpen(true)}
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {onToggleCollapse ? (
        <div className={`border-t border-slate-200/70 p-3 ${collapsed ? 'text-center' : ''}`}>
          <button
            type="button"
            className="focus-ring inline-flex w-full items-center justify-center rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-200"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
      ) : null}
    </div>
  )

  if (!mobile) {
    return (
      <>
        <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:border-r lg:border-slate-200/80 lg:bg-white/[0.88] lg:shadow-[18px_0_70px_-58px_rgba(15,23,42,0.55)] lg:backdrop-blur-2xl lg:transition-all lg:duration-300 ${collapsed ? 'lg:w-[76px] lg:p-2' : 'lg:w-[248px] lg:p-3'}`}>
          {content}
        </aside>
        <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      </>
    )
  }

  return (
    <>
      <motion.aside
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -40, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="h-full w-[17rem] rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.55)] backdrop-blur-2xl"
      >
        {content}
      </motion.aside>
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  )
}
