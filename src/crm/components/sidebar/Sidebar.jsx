import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import { memo, useCallback, useMemo } from 'react'
import { useUser } from '../../hooks/useUser.js'
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess.js'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { isDeveloperOwnerAccount, labelForBusinessType, normalizeBusinessType, selectedModulesForSidebar } from '../../data/moduleAccess.js'
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

const SALES_HUB_SIDEBAR_ORDER = [
  'dashboard',
  'salesPipeline',
  'leads',
  'customers',
  'deals',
  'tasks',
  'activities',
  'quotations',
  'invoices',
  'salesProducts',
  'expenses',
  'accounts',
  'accountStatements',
  'team',
  'reports',
  'notifications',
  'approvals',
  'settings',
]

function orderSalesHubSidebar(items) {
  return [...items].sort((a, b) => {
    const aIndex = SALES_HUB_SIDEBAR_ORDER.indexOf(a.key)
    const bIndex = SALES_HUB_SIDEBAR_ORDER.indexOf(b.key)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

// Retail / POS workspace only: explicit leading sidebar order by module key.
// Items not listed here keep their current relative order; Settings always stays last.
const RETAIL_POS_SIDEBAR_ORDER = [
  'dashboard',
  'pos',
  'customers',
  'inventory',
  'invoices',
  'expenses',
  'accounts',
  'accountStatements',
  'team',
]

function orderRetailPosSidebar(items) {
  const rankFor = (item) => {
    if (item.key === 'settings') return Number.MAX_SAFE_INTEGER
    const index = RETAIL_POS_SIDEBAR_ORDER.indexOf(item.key)
    // Unlisted items sort after the explicit block but before Settings,
    // preserving their existing relative order via the original index.
    return index === -1 ? RETAIL_POS_SIDEBAR_ORDER.length + items.indexOf(item) : index
  }
  return [...items].sort((a, b) => rankFor(a) - rankFor(b))
}

const RESTAURANT_POS_SIDEBAR_ORDER = [
  'dashboard',
  'ordersKot',
  'orders',
  'menuManagement',
  'customers',
  'tables',
  'kitchenDisplay',
  'invoices',
  'expenses',
  'accounts',
  'accountStatements',
  'team',
  'approvals',
  'notifications',
  'reports',
  'settings',
]

function orderRestaurantPosSidebar(items) {
  return [...items].sort((a, b) => {
    const aIndex = RESTAURANT_POS_SIDEBAR_ORDER.indexOf(a.key)
    const bIndex = RESTAURANT_POS_SIDEBAR_ORDER.indexOf(b.key)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

const TRANSPORT_RENTAL_SIDEBAR_ORDER = [
  'fleetDashboard',
  'transportVehicles',
  'transportBookings',
  'transportCustomers',
  'transportPayments',
  'expenses',
  'accounts',
  'accountStatements',
  'reports',
  'team',
  'notifications',
  'settings',
]

const SCHOOL_ERP_SIDEBAR_ORDER = [
  'dashboard',
  'customers',
  'attendance',
  'invoices',
  'expenses',
  'accounts',
  'accountStatements',
  'approvals',
  'team',
  'notifications',
  'reports',
  'settings',
]

function orderSchoolErpSidebar(items) {
  return [...items].sort((a, b) => {
    if (a.key === 'settings') return 1
    if (b.key === 'settings') return -1
    const aIndex = SCHOOL_ERP_SIDEBAR_ORDER.indexOf(a.key)
    const bIndex = SCHOOL_ERP_SIDEBAR_ORDER.indexOf(b.key)
    const aRank = aIndex === -1 ? SCHOOL_ERP_SIDEBAR_ORDER.length + items.indexOf(a) : aIndex
    const bRank = bIndex === -1 ? SCHOOL_ERP_SIDEBAR_ORDER.length + items.indexOf(b) : bIndex
    return aRank - bRank
  })
}

function orderTransportRentalSidebar(items) {
  // Transport workspace uses the Fleet Dashboard as its home; hide the generic dashboard entry.
  return [...items]
    .filter((item) => item.key !== 'dashboard')
    .sort((a, b) => {
      const aIndex = TRANSPORT_RENTAL_SIDEBAR_ORDER.indexOf(a.key)
      const bIndex = TRANSPORT_RENTAL_SIDEBAR_ORDER.indexOf(b.key)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
}

// WhatsApp CRM workspace only: dedicated WhatsApp-first sidebar. Only the keys
// below are shown (everything else — invoices, expenses, accounts, account
// statements, approvals, notifications, generic leads/follow-ups/support — is
// hidden so the sidebar reads as a dedicated WhatsApp CRM, not General CRM).
// The list is also the display order. Settings always stays last.
const WHATSAPP_CRM_SIDEBAR_ORDER = [
  'dashboard',
  'whatsappInbox',
  'whatsappLeads',
  'customers',
  'whatsappFollowUps',
  'whatsappTemplates',
  'campaigns', // Broadcast Campaigns (Coming Soon)
  'autoReplies', // Coming Soon — kept in place near messaging tools
  'reports',
  'team',
  'settings',
]

// WhatsApp CRM relabels: present the WhatsApp-specific modules with the concise
// labels the dedicated CRM uses, without touching the shared module catalog.
const WHATSAPP_CRM_SIDEBAR_LABELS = {
  whatsappInbox: 'WhatsApp Inbox',
  whatsappLeads: 'WhatsApp Leads',
  whatsappFollowUps: 'Follow-Ups',
  whatsappTemplates: 'Templates',
  campaigns: 'Broadcast Campaigns',
  team: 'Team Management',
}

const iconToneClasses = [
  'border-sky-100 bg-sky-50 text-sky-700',
  'border-violet-100 bg-violet-50 text-violet-700',
  'border-emerald-100 bg-emerald-50 text-emerald-700',
  'border-amber-100 bg-amber-50 text-amber-700',
  'border-cyan-100 bg-cyan-50 text-cyan-700',
  'border-rose-100 bg-rose-50 text-rose-700',
  'border-lime-100 bg-lime-50 text-lime-700',
  'border-slate-200 bg-slate-50 text-slate-700',
]

function iconToneForItem(item = {}) {
  const text = `${item.key || ''} ${item.label || ''} ${item.to || ''}`.toLowerCase()
  if (text.includes('setting') || text.includes('maintenance')) return iconToneClasses[7]
  if (text.includes('whatsapp') || text.includes('support') || text.includes('notification')) return iconToneClasses[2]
  if (text.includes('invoice') || text.includes('fee') || text.includes('account') || text.includes('payment') || text.includes('expense')) return iconToneClasses[3]
  if (text.includes('report') || text.includes('analytic') || text.includes('dashboard')) return iconToneClasses[0]
  if (text.includes('school') || text.includes('attendance') || text.includes('team') || text.includes('customer') || text.includes('student')) return iconToneClasses[1]
  if (text.includes('transport') || text.includes('fleet') || text.includes('vehicle') || text.includes('booking')) return iconToneClasses[4]
  if (text.includes('order') || text.includes('menu') || text.includes('table') || text.includes('kitchen') || text.includes('pos')) return iconToneClasses[5]
  return iconToneClasses[Math.abs(String(item.to || item.label || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % iconToneClasses.length]
}

function HdSidebarIcon({ icon: Icon, tone, active = false, disabled = false }) {
  return (
    <span
      className={cn(
        'grid h-7 w-7 shrink-0 place-items-center rounded-xl border transition duration-150',
        tone,
        active ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm' : 'group-hover:border-sky-200 group-hover:bg-white group-hover:text-sky-700',
        disabled ? 'opacity-45 grayscale' : '',
      )}
    >
      <Icon className="h-[16px] w-[16px] stroke-[2.1]" />
    </span>
  )
}

function orderWhatsappCrmSidebar(items) {
  const allowed = new Set(WHATSAPP_CRM_SIDEBAR_ORDER)
  return items
    .filter((item) => allowed.has(item.key))
    .map((item) => ({ ...item, label: WHATSAPP_CRM_SIDEBAR_LABELS[item.key] || item.label }))
    .sort((a, b) => WHATSAPP_CRM_SIDEBAR_ORDER.indexOf(a.key) - WHATSAPP_CRM_SIDEBAR_ORDER.indexOf(b.key))
}

const SidebarNavItem = memo(function SidebarNavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon || HiOutlineSquares2X2
  const label = item.label || compactLabels[item.to]
  const disabled = Boolean(item.comingSoon)
  const tone = iconToneForItem(item)
  const content = (
    <>
      {!disabled ? null : (
        <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 group-hover:bg-slate-200 sm:inline">
          Soon
        </span>
      )}
      <HdSidebarIcon icon={Icon} tone={tone} disabled={disabled} />
      {!collapsed ? <span className="truncate pr-9">{label}</span> : null}
      {collapsed ? (
        <span className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg group-hover:block">
          {label}
        </span>
      ) : null}
    </>
  )

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={cn(
          'focus-ring group relative flex w-full cursor-not-allowed items-center rounded-xl border border-transparent text-[13px] font-semibold text-slate-400 transition-colors duration-150 ease-out hover:border-slate-200/80 hover:bg-white hover:text-slate-600',
          collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5',
        )}
        title={`${label} - Coming Soon / Not included in your selected business type`}
      >
        {content}
      </button>
    )
  }

  return (
    <NavLink
      to={item.to}
      onClick={() => {
        if (item.to === '/app/inventory') {
          console.log('[Inventory Route] clicked')
          console.log('[Inventory Route] target', item.to)
        }
        onNavigate?.()
      }}
      title={label}
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
          <HdSidebarIcon icon={Icon} tone={tone} active={isActive} />
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
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">NEXORA SOLUTION</p>
          <p className="truncate text-[10px] font-medium text-slate-500">{businessTitle} / {workspaceName}</p>
        </div>
      ) : null}
    </div>
  )
}

function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse, onSwitchProduct }) {
  const { accessPlan, businessType, userDoc, userId, firebaseUser, isAdmin: userIsAdmin, isOwner: userIsOwner, workspaceId, role } = useUser()
  const access = useWorkspaceAccess()
  const businessTitle = labelForBusinessType(businessType)
  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)
  const ownerAdminBypass = Boolean(developerOverride || userIsOwner || userIsAdmin || access.isAdmin)
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
    const modules = selectedModulesForSidebar({
      enabledModules: userDoc?.enabledModules,
      onboardingCompleted: userDoc?.onboardingCompleted,
      plan: accessPlan,
      businessType,
      developerOverride,
      teamOverride: access.isAdmin || access.hasPermission('settingsAccess'),
    })
    const allowedRoutes = new Set(modules.map((module) => module.route))
    const normalizedType = normalizeBusinessType(businessType)
    const items = modules.map((module) => {
      const navItem = orderedSidebarItems.find((item) => item.to === module.route)
      return {
        ...(navItem || module),
        key: module.key,
        to: module.route,
        label: module.label,
        comingSoon: module.comingSoon,
      }
    }).filter((item) => {
      if (item.key === 'support') return false
      const forceSchoolReports =
        normalizedType === 'School ERP' &&
        item.key === 'reports' &&
        item.to === '/app/reports'
      if (forceSchoolReports) return true
      if (!ownerAdminBypass && access.isStaff && !access.hasModulePermission(item.key, 'view')) {
        console.warn('[Sales Hub Access Denied]', {
          source: 'Sidebar',
          role: role || access.role || '',
          workspaceId: workspaceId || '',
          moduleKey: item.key,
          permissionKey: `module.${item.key}.view`,
          denialReason: 'sidebar_missing_module_view_permission',
        })
        return false
      }
      if (item.to === '/app/team' && !ownerAdminBypass && !access.hasModulePermission('team', 'view')) {
        console.warn('[Sales Hub Access Denied]', {
          source: 'Sidebar',
          role: role || access.role || '',
          workspaceId: workspaceId || '',
          moduleKey: 'team',
          permissionKey: 'module.team.view',
          denialReason: 'sidebar_missing_team_view_permission',
        })
        return false
      }
      return allowedRoutes.has(item.to) || item.comingSoon
    })
    if (!items.some((item) => item.key === 'reports')) {
      const navItem = orderedSidebarItems.find((item) => item.to === '/app/reports')
      items.push({
        ...(navItem || {}),
        key: 'reports',
        to: '/app/reports',
        label: normalizedType === 'School ERP' ? 'School Reports Center' : 'Reports',
        comingSoon: false,
      })
    }
    if (normalizedType === 'General CRM') return orderSalesHubSidebar(items)
    if (normalizedType === 'Retail / POS') return orderRetailPosSidebar(items)
    if (normalizedType === 'School ERP') return orderSchoolErpSidebar(items)
    if (normalizedType === 'Restaurant POS') return orderRestaurantPosSidebar(items)
    if (normalizedType === 'Transport / Rental') return orderTransportRentalSidebar(items)
    if (normalizedType === 'WhatsApp CRM') return orderWhatsappCrmSidebar(items)
    return items
  }, [access, accessPlan, businessType, developerOverride, ownerAdminBypass, role, userDoc?.enabledModules, userDoc?.onboardingCompleted, workspaceId])

  const handleSwitchProduct = useCallback(() => {
    onNavigate?.()
    onSwitchProduct?.()
  }, [onNavigate, onSwitchProduct])

  const shouldCollapse = !mobile && collapsed

  const content = useMemo(() => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Brand collapsed={shouldCollapse} workspaceName={workspaceName} businessTitle={businessTitle} />
      <div className={`mt-1 px-2 ${shouldCollapse ? 'hidden' : ''}`}>
        <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{businessTitle}</p>
        </div>
      </div>

      <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pr-1.5 ${shouldCollapse ? 'space-y-1.5' : 'space-y-0.5'}`}>
        {sidebarItems.map((item) => (
          <SidebarNavItem key={item.to} item={item} collapsed={shouldCollapse} onNavigate={onNavigate} />
        ))}
      </nav>

      {!shouldCollapse && (
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
  ), [businessTitle, handleSwitchProduct, onNavigate, shouldCollapse, sidebarItems, workspaceName])

  if (!mobile) {
    return (
      <>
        <aside
          className="sidebar-aside hidden print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:border-r lg:border-slate-200/80 lg:bg-white/[0.95] lg:shadow-[12px_0_44px_-38px_rgba(15,23,42,0.45)] lg:backdrop-blur-sm"
          data-sidebar={shouldCollapse ? 'collapsed' : 'expanded'}
        >
          <div className={shouldCollapse ? 'sidebar-shell sidebar-shell-collapsed' : 'sidebar-shell sidebar-shell-expanded'}>
            {content}
          </div>
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
        className="sidebar-mobile h-full rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] print:hidden"
      >
        {content}
      </motion.aside>
    </>
  )
}

export default memo(Sidebar)
