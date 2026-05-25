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

const priorityRoutes = [
  '/app/dashboard',
  '/app/client-portal',
  '/app/customers',
  '/app/leads',
  '/app/leads/scoring',
  '/app/ai-assistant',
  '/app/pipeline',
  '/app/follow-ups',
  '/app/team',
  '/app/invoices',
  '/app/subscriptions',
  '/app/support',
  '/app/analytics',
  '/app/settings',
]

const compactLabels = {
  '/app/leads/scoring': 'AI Lead Scoring',
  '/app/pipeline': 'Sales Pipeline',
  '/app/follow-ups': 'Follow-Up Automation',
  '/app/team': 'Team Management',
  '/app/support': 'Support Tickets',
  '/app/analytics': 'Analytics',
  '/app/activity-logs': 'Activity',
}

const sidebarItems = [
  ...priorityRoutes.map((route) => navItems.find((item) => item.to === route)).filter(Boolean),
  ...navItems.filter((item) => !priorityRoutes.includes(item.to)),
]

function Brand({ collapsed }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-1.5`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950 p-1.5 shadow-sm">
        <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">Nexora CRM</p>
          <p className="truncate text-[10px] font-medium text-slate-500">Admin workspace</p>
        </div>
      ) : null}
    </div>
  )
}

function UpgradeCard({ plan, isBusiness, onUpgrade, onViewPlans }) {
  return (
    <div className="px-2 pt-2">
      <div className="rounded-[1rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-2.5 shadow-[0_16px_42px_-36px_rgba(14,165,233,0.5)]">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold text-slate-950">Upgrade to Business</p>
          {isBusiness ? (
            <Badge variant="success" className="px-2 py-0.5 text-[10px]">Business</Badge>
          ) : plan === 'Starter' ? (
            <Badge variant="info" className="px-2 py-0.5 text-[10px]">Starter</Badge>
          ) : (
            <Badge variant="default" className="px-2 py-0.5 text-[10px]">Free</Badge>
          )}
        </div>
        <p className="mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-500">
          Advanced reports and team permissions.
        </p>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
          <button
            className="focus-ring h-8 rounded-xl bg-slate-950 px-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-70"
            onClick={onUpgrade}
            disabled={isBusiness}
            type="button"
          >
            {isBusiness ? 'Active' : 'Upgrade'}
          </button>
          <button
            type="button"
            className="focus-ring h-8 rounded-xl px-2 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-500/10"
            onClick={onViewPlans}
          >
            Plans
          </button>
        </div>
      </div>
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
      <div className={`mt-1 px-2 ${collapsed ? 'hidden' : ''}`}>
        <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">Operations Console</p>
        </div>
      </div>

      {!collapsed && (
        <UpgradeCard
          plan={plan}
          isBusiness={isBusiness}
          onUpgrade={() => navigate('/upgrade-business')}
          onViewPlans={() => setPricingOpen(true)}
        />
      )}

      <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pr-1.5 ${collapsed ? 'space-y-1.5' : 'space-y-0.5'}`}>
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const label = compactLabels[item.to] || item.label
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'focus-ring group relative flex items-center rounded-xl text-[13px] font-semibold transition duration-200 ease-out',
                  collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5',
                  isActive
                    ? 'border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 text-slate-950 shadow-sm'
                    : 'border border-transparent text-slate-600 hover:-translate-y-0.5 hover:border-slate-200/80 hover:bg-white hover:text-slate-950 hover:shadow-sm',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed ? (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-400 to-indigo-500" />
                  ) : null}
                  <Icon
                    className={cn(
                      'h-[17px] w-[17px] shrink-0 transition',
                      isActive ? 'text-sky-700' : 'text-slate-500 group-hover:text-sky-700',
                    )}
                  />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )

  if (!mobile) {
    return (
      <>
        <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:border-r lg:border-slate-200/80 lg:bg-white/[0.9] lg:shadow-[18px_0_70px_-58px_rgba(15,23,42,0.55)] lg:backdrop-blur-2xl lg:transition-all lg:duration-300 ${collapsed ? 'lg:w-[72px] lg:p-2' : 'lg:w-[236px] lg:p-2.5'}`}>
          {content}
          {onToggleCollapse ? (
            <button
              type="button"
              className="focus-ring absolute -right-3 bottom-7 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-[0_14px_35px_-20px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '›' : '‹'}
            </button>
          ) : null}
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
