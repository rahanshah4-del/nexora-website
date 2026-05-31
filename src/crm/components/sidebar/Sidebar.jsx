import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import Badge from '../ui/Badge.jsx'
import PricingModal from '../billing/PricingModal.jsx'
import { memo, useCallback, useMemo, useState } from 'react'
import { useUser } from '../../hooks/useUser.js'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { selectedModulesForSidebar } from '../../data/moduleAccess.js'

const priorityRoutes = [
  '/app/dashboard',
  '/app/client-portal',
  '/app/customers',
  '/app/products',
  '/app/leads',
  '/app/leads/scoring',
  '/app/ai-assistant',
  '/app/pipeline',
  '/app/follow-ups',
  '/app/team',
  '/app/hr',
  '/app/invoices',
  '/app/expenses',
  '/app/accounts',
  '/app/accounts/statements',
  '/app/approvals',
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
  '/app/hr': 'HR Dashboard',
  '/app/support': 'Support Tickets',
  '/app/analytics': 'Analytics',
  '/app/activity-logs': 'Activity',
  '/app/products': 'Products',
  '/app/accounts': 'Accounts',
  '/app/accounts/statements': 'Statements',
  '/app/approvals': 'Approvals',
}

const orderedSidebarItems = [
  ...priorityRoutes.map((route) => navItems.find((item) => item.to === route)).filter(Boolean),
  ...navItems.filter((item) => !priorityRoutes.includes(item.to)),
]

const SidebarNavItem = memo(function SidebarNavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon
  const label = compactLabels[item.to] || item.label

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex items-center rounded-xl text-[13px] font-semibold transition-colors duration-150 ease-out',
          collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5',
          isActive
            ? 'border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 text-slate-950 shadow-sm'
            : 'border border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-white hover:text-slate-950',
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
})

function Brand({ collapsed }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-1.5`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950 p-1.5 shadow-sm">
        <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">Nexora CRM</p>
          <p className="truncate text-[10px] font-medium text-slate-500">Business workspace</p>
        </div>
      ) : null}
    </div>
  )
}

function UpgradeCard({ isBusiness, isTrialActive, isTrialExpired, onViewPlans }) {
  const badgeLabel = isBusiness ? (isTrialActive ? 'Trial' : 'Active') : isTrialExpired ? 'Expired' : 'Basic'
  const badgeVariant = isBusiness ? 'success' : isTrialExpired ? 'warning' : 'default'

  return (
    <div className="px-2 pt-2">
      <div className="relative overflow-hidden rounded-[1.05rem] border border-sky-100/90 bg-gradient-to-br from-white via-sky-50/90 to-violet-50/80 p-2.5 shadow-[0_18px_50px_-36px_rgba(14,165,233,0.7)]">
        <div className="pointer-events-none absolute right-0 top-0 h-12 w-12 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-[12px] font-semibold leading-4 text-slate-950">Standard Package</p>
          <Badge variant={badgeVariant} className="shrink-0 px-2 py-0.5 text-[10px]">
            {badgeLabel}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          PKR 5,999/month with priority support
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-sky-100/80 pt-2">
          <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Nexora
          </span>
          <button
            type="button"
            className="focus-ring shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-500/10 hover:text-sky-900"
            onClick={onViewPlans}
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse, onSwitchProduct }) {
  const [pricingOpen, setPricingOpen] = useState(false)
  const { accessPlan, isTrialActive, isTrialExpired, userDoc } = useUser()
  const isBusiness = accessPlan === 'Business' || accessPlan === 'Enterprise'
  const sidebarItems = useMemo(() => {
    const allowedRoutes = new Set(
      selectedModulesForSidebar({
        enabledModules: userDoc?.enabledModules,
        onboardingCompleted: userDoc?.onboardingCompleted,
        plan: accessPlan,
      }).map((module) => module.route),
    )
    return orderedSidebarItems.filter((item) => allowedRoutes.has(item.to))
  }, [accessPlan, userDoc?.enabledModules, userDoc?.onboardingCompleted])

  const handleSwitchProduct = useCallback(() => {
    onNavigate?.()
    onSwitchProduct?.()
  }, [onNavigate, onSwitchProduct])

  const content = useMemo(() => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Brand collapsed={collapsed} />
      <div className={`mt-1 px-2 ${collapsed ? 'hidden' : ''}`}>
        <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">Operations Console</p>
        </div>
      </div>

      <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pr-1.5 ${collapsed ? 'space-y-1.5' : 'space-y-0.5'}`}>
        {sidebarItems.map((item) => (
          <SidebarNavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && (
        <div className="shrink-0 space-y-2 pb-1">
          <div className="px-2">
            <button
              type="button"
              className="focus-ring flex h-8 w-full items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:border-sky-200 hover:text-sky-700"
              onClick={handleSwitchProduct}
            >
              Switch Product
            </button>
          </div>
          <UpgradeCard
            isBusiness={isBusiness}
            isTrialActive={isTrialActive}
            isTrialExpired={isTrialExpired}
            onViewPlans={() => setPricingOpen(true)}
          />
        </div>
      )}
    </div>
  ), [collapsed, handleSwitchProduct, isBusiness, isTrialActive, isTrialExpired, onNavigate, sidebarItems])

  if (!mobile) {
    return (
      <>
        <aside className={`hidden print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:border-r lg:border-slate-200/80 lg:bg-white/[0.95] lg:shadow-[12px_0_44px_-38px_rgba(15,23,42,0.45)] lg:backdrop-blur-sm ${collapsed ? 'lg:w-[72px] lg:p-2' : 'lg:w-[236px] lg:p-2.5'}`}>
          {content}
          {onToggleCollapse ? (
            <button
              type="button"
              className="focus-ring absolute -right-3 bottom-7 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm transition-colors duration-150 hover:border-sky-200 hover:text-sky-700"
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
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="h-full w-[17rem] rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] print:hidden"
      >
        {content}
      </motion.aside>
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  )
}

export default memo(Sidebar)
