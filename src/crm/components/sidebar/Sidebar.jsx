import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import { memo, useCallback, useMemo } from 'react'
import { useUser } from '../../hooks/useUser.js'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { businessWorkspaceForType, selectedModulesForSidebar } from '../../data/moduleAccess.js'
import { resolveWorkspaceName } from '../../../lib/workspaceName.js'
import { HiOutlineSquares2X2 } from 'react-icons/hi2'

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
  '/app/approvals': 'Approval Center',
}

const orderedSidebarItems = [
  ...priorityRoutes.map((route) => navItems.find((item) => item.to === route)).filter(Boolean),
  ...navItems.filter((item) => !priorityRoutes.includes(item.to)),
]

const SidebarNavItem = memo(function SidebarNavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon || HiOutlineSquares2X2
  const label = item.label || compactLabels[item.to]
  const disabled = Boolean(item.comingSoon)
  const content = (
    <>
      {!disabled ? null : (
        <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 group-hover:bg-slate-200 sm:inline">
          Soon
        </span>
      )}
      <Icon className="h-[17px] w-[17px] shrink-0 text-slate-500 transition group-hover:text-sky-700" />
      {!collapsed ? <span className="truncate pr-9">{label}</span> : null}
    </>
  )

  if (disabled) {
    return (
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={cn(
          'focus-ring group relative flex items-center rounded-xl border border-transparent text-[13px] font-semibold text-slate-400 transition-colors duration-150 ease-out hover:border-slate-200/80 hover:bg-white hover:text-slate-600',
          collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5',
        )}
      >
        {content}
      </NavLink>
    )
  }

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

function Brand({ collapsed, workspaceName, businessTitle }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-1.5`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950 p-1.5 shadow-sm">
        <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{businessTitle}</p>
          <p className="truncate text-[10px] font-medium text-slate-500">{workspaceName}</p>
        </div>
      ) : null}
    </div>
  )
}

function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse, onSwitchProduct }) {
  const { accessPlan, userDoc, userId } = useUser()
  const businessWorkspace = businessWorkspaceForType(userDoc?.businessType)
  const workspaceName = useMemo(
    () =>
      resolveWorkspaceName({
        accountData: userDoc,
        userId,
        fallback: 'Nexora Workspace',
      }),
    [userDoc, userId],
  )
  const sidebarItems = useMemo(() => {
    const allowedRoutes = new Set(
      selectedModulesForSidebar({
        enabledModules: userDoc?.enabledModules,
        onboardingCompleted: userDoc?.onboardingCompleted,
        plan: accessPlan,
        businessType: userDoc?.businessType,
      }).map((module) => module.route),
    )
    return selectedModulesForSidebar({
      enabledModules: userDoc?.enabledModules,
      onboardingCompleted: userDoc?.onboardingCompleted,
      plan: accessPlan,
      businessType: userDoc?.businessType,
    }).map((module) => {
      const navItem = orderedSidebarItems.find((item) => item.to === module.route)
      return {
        ...(navItem || module),
        to: module.route,
        label: module.label,
        comingSoon: module.comingSoon,
      }
    }).filter((item) => allowedRoutes.has(item.to) || item.comingSoon)
  }, [accessPlan, userDoc?.businessType, userDoc?.enabledModules, userDoc?.onboardingCompleted])

  const handleSwitchProduct = useCallback(() => {
    onNavigate?.()
    onSwitchProduct?.()
  }, [onNavigate, onSwitchProduct])

  const content = useMemo(() => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Brand collapsed={collapsed} workspaceName={workspaceName} businessTitle={businessWorkspace.title} />
      <div className={`mt-1 px-2 ${collapsed ? 'hidden' : ''}`}>
        <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{businessWorkspace.title}</p>
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
        </div>
      )}
    </div>
  ), [collapsed, handleSwitchProduct, onNavigate, sidebarItems, workspaceName])

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
    </>
  )
}

export default memo(Sidebar)
