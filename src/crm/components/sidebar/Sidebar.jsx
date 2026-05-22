import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import Badge from '../ui/Badge.jsx'
import PricingModal from '../billing/PricingModal.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.js'
import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'

function Brand({ collapsed }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2`}>
      <NexoraLogo compact={collapsed} />
      {!collapsed ? (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">NEXORA SOLUTIONS</p>
          <p className="text-[11px] text-slate-500">CRM Admin</p>
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
    <div className="flex h-full flex-col">
      <Brand collapsed={collapsed} />
      <div className={`mt-2 px-2 ${collapsed ? 'hidden' : ''}`}>
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          CRM Panel
        </p>
      </div>
      <nav className={`mt-2 flex-1 px-2 ${collapsed ? 'space-y-3' : 'space-y-1'}`}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'focus-ring group flex items-center transition rounded-xl text-sm font-medium',
                  collapsed ? 'justify-center py-3 px-0' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-slate-900 text-white shadow-soft'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'text-lg transition',
                      isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-950',
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
          <div className="glass-muted rounded-2xl p-3">
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
              className="focus-ring mt-3 w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-soft disabled:opacity-70 hover:brightness-105"
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

      <div className={`p-3 ${collapsed ? 'text-center' : ''}`}>
        <button
          type="button"
          className="focus-ring inline-flex items-center justify-center w-full rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-900/5 dark:text-slate-200"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </div>
  )

  if (!mobile) {
    return (
      <>
        <aside className={`glass hidden lg:fixed lg:inset-y-0 lg:left-0 ${collapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'} lg:block lg:overflow-y-auto lg:rounded-r-[2rem] lg:border-r lg:border-slate-200 lg:bg-white/95 lg:p-4 lg:shadow-soft lg:transition-all lg:duration-300 lg:z-20`}>
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
        transition={{ duration: 0.2 }}
        className="glass h-full w-[18rem] rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-soft"
      >
        {content}
      </motion.aside>
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  )
}
