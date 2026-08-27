import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useUser } from '../../hooks/useUser.js'
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess.js'
import { useFeatureDiscovery } from '../../hooks/useFeatureDiscovery.js'
import FeatureBadge from '../ui/FeatureBadge.jsx'
import { featureKeyForRoute } from '../../lib/featureRegistry.js'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { isDeveloperOwnerAccount, labelForBusinessModule, labelForBusinessType, moduleCatalog, normalizeBusinessType, selectedModulesForSidebar, teamManagementEnabledForBusinessType } from '../../data/moduleAccess.js'
import { resolveWorkspaceName } from '../../../lib/workspaceName.js'
import { categoriesForModule, reportsForModule } from '../../lib/reportCatalog.js'
import {
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineChevronDown,
  HiOutlineClipboardDocumentList,
  HiOutlineCube,
  HiOutlineDocumentChartBar,
  HiOutlineFire,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineBuildingOffice2,
  HiOutlineChartPie,
  HiOutlinePresentationChartBar,
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlineCog6Tooth,
  HiOutlineComputerDesktop,
  HiOutlineCalendarDays,
  HiOutlineStar,
  HiOutlineMapPin,
  HiOutlineReceiptPercent,
  HiOutlineCurrencyDollar,
  HiOutlineCalculator,
  HiOutlineArrowUturnLeft,
  HiOutlineExclamationTriangle,
  HiOutlineGift,
  HiOutlineSparkles,
  HiOutlineSquaresPlus,
  HiOutlineTableCells,
  HiOutlineInboxStack,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineChevronRight,
} from 'react-icons/hi2'

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

function markDisabledModules(items) {
  return items
}

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
  'business_services',
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
  'posOrders',
  'posDiscounts',
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

/* ── Restaurant POS accordion group definitions ── */
const RESTAURANT_ACCORDION_GROUPS = [
  { id: 'operations',  label: 'Operations',  icon: HiOutlinePresentationChartBar, color: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30',      moduleKeys: ['ordersKot', 'kitchenDisplay', 'tables'] },
  { id: 'menu',        label: 'Menu',        icon: HiOutlineSquaresPlus,            color: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30',        moduleKeys: ['menuManagement', 'kitchenProduction'] },
  { id: 'customers',   label: 'Customers',   icon: HiOutlineUserGroup,              color: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30', moduleKeys: ['customers', 'loyalty', 'reservations'] },
  { id: 'billing',     label: 'Billing',     icon: HiOutlineReceiptPercent,         color: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30',     moduleKeys: ['invoices'] },
  { id: 'finance',     label: 'Finance',     icon: HiOutlineCurrencyDollar,         color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30', moduleKeys: ['expenses', 'accounts', 'accountStatements'] },
  { id: 'admin',       label: 'Administration', icon: HiOutlineShieldCheck,         color: 'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-900/30',         moduleKeys: ['notifications', 'approvals'] },
  { id: 'settings',    label: 'Settings',    icon: HiOutlineCog6Tooth,              color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',        moduleKeys: ['settings'] },
]

/** Find which group a module key belongs to */
function restaurantGroupForKey(key) {
  if (key === 'dashboard') return null
  if (key === 'reports') return 'reports'
  if (key === 'waitlist' || key === 'reservations') return 'customers'
  if (key === 'loyalty') return 'customers'
  for (const g of RESTAURANT_ACCORDION_GROUPS) {
    if (g.moduleKeys.includes(key)) return g.id
  }
  return null
}

function orderRestaurantPosSidebar(items) {
  // Sort: Dashboard first, then grouped items in group order, Settings last
  return [...items].sort((a, b) => {
    if (a.key === 'dashboard') return -1
    if (b.key === 'dashboard') return 1
    if (a.key === 'settings') return 1
    if (b.key === 'settings') return -1
    const aGroup = RESTAURANT_ACCORDION_GROUPS.findIndex(g => g.moduleKeys.includes(a.key) || g.id === a.key)
    const bGroup = RESTAURANT_ACCORDION_GROUPS.findIndex(g => g.moduleKeys.includes(b.key) || g.id === b.key)
    const aRank = aGroup === -1 ? 99 : aGroup
    const bRank = bGroup === -1 ? 99 : bGroup
    if (aRank !== bRank) return aRank - bRank
    // Within same group, keep original order
    return items.indexOf(a) - items.indexOf(b)
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
  'schoolPayroll',
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

function SidebarIcon({ icon: Icon, active = false, disabled = false, className }) {
  return (
    <Icon
      className={cn(
        'h-[18px] w-[18px] shrink-0 stroke-[1.8] transition-colors duration-150',
        active ? 'text-[#4F46E5]' : 'text-slate-500',
        disabled ? 'opacity-45 grayscale' : '',
        className,
      )}
    />
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
  const { isNew, markSeen } = useFeatureDiscovery()
  const featureKey = featureKeyForRoute(item.to)
  const showBadge = featureKey && isNew(featureKey)

  function handleNav() {
    if (featureKey) markSeen(featureKey)
    onNavigate?.()
  }

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={cn(
          'focus-ring group relative flex w-full cursor-not-allowed items-center rounded-[10px] text-[13px] font-medium text-slate-400 transition-colors duration-150 ease-out hover:text-slate-600',
          collapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2.5 py-1.5',
        )}
        title={`${label} - Coming Soon / Not included in your selected business type`}
      >
        {!disabled ? null : (
          <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 group-hover:bg-slate-200 sm:inline">
            Soon
          </span>
        )}
        <SidebarIcon icon={Icon} disabled={disabled} />
        {!collapsed ? <span className="truncate">{label}</span> : null}
      </button>
    )
  }

  return (
    <NavLink
      to={item.to}
      target={item.openInNewWindow ? '_blank' : undefined}
      rel={item.openInNewWindow ? 'noopener noreferrer' : undefined}
      onClick={handleNav}
      title={label}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex w-full items-center rounded-[10px] text-[13px] transition-colors duration-150 ease-out',
          collapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2.5 py-1.5',
          isActive
            ? 'bg-[#EEEEFF] font-semibold text-[#4F46E5]'
            : 'font-medium text-slate-600 hover:text-[#4F46E5]',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed ? (
            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#4F46E5]" />
          ) : null}
          <SidebarIcon icon={Icon} active={isActive} />
          {!collapsed ? <span className="truncate">{label}</span> : null}
          {collapsed ? (
            <span className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1E2130] px-3 py-1.5 text-xs font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] group-hover:block">
              {label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
})

/* Accordion sub-item — 4px dot bullet + label, indented. No icon container. */
const AccordionSubItem = memo(function AccordionSubItem({ item, collapsed, onNavigate }) {
  const label = item.label || compactLabels[item.to]
  const disabled = Boolean(item.comingSoon)
  const { isNew, markSeen } = useFeatureDiscovery()
  const featureKey = featureKeyForRoute(item.to)

  function handleNav() {
    if (featureKey) markSeen(featureKey)
    onNavigate?.()
  }

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        title={`${label} - Coming Soon`}
        className={cn(
          'focus-ring group relative flex w-full cursor-not-allowed items-center rounded-[10px] py-1 text-[13px] text-slate-400 transition-colors duration-150 hover:text-slate-600',
          collapsed ? 'justify-center' : 'pl-3',
        )}
      >
        <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
        {!collapsed ? <span className="ml-2.5 truncate">{label}</span> : null}
      </button>
    )
  }

  return (
    <NavLink
      to={item.to}
      onClick={handleNav}
      title={label}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex w-full items-center rounded-[10px] py-1 text-[13px] transition-colors duration-150 ease-out',
          collapsed ? 'justify-center' : 'pl-3',
          isActive
            ? 'bg-[#EEEEFF] font-semibold text-[#4F46E5]'
            : 'font-medium text-[#4A5068] hover:text-[#4F46E5]',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed ? (
            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#4F46E5]" />
          ) : null}
          <span className={cn('h-1 w-1 shrink-0 rounded-full', isActive ? 'bg-[#4F46E5]' : 'bg-[#CBD0E0] group-hover:bg-[#4F46E5]')} />
          {!collapsed ? <span className="ml-2.5 truncate">{label}</span> : null}
          {collapsed ? (
            <span className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1E2130] px-3 py-1.5 text-xs font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] group-hover:block">
              {label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
})

const CATEGORY_ICON_MAP = {
  finance: HiOutlineBanknotes,
  sales: HiOutlineShoppingBag,
  purchase: HiOutlineClipboardDocumentList,
  inventory: HiOutlineCube,
  customer: HiOutlineUserGroup,
  supplier: HiOutlineTruck,
  crm: HiOutlineChartBar,
  school: HiOutlineBuildingOffice2,
  transport: HiOutlineTruck,
  restaurant: HiOutlineFire,
  overview: HiOutlineChartPie,
}

/**
 * ReportsNavGroup — expandable sub-menu under the Reports sidebar item.
 * Shows category headings with a dot indicator, exactly like an enterprise ERP.
 * Module isolation: only categories/reports available for the current businessType.
 */
function ReportsNavGroup({ collapsed, onNavigate, businessType }) {
  const normalized = normalizeBusinessType(businessType || '')
  const categories = useMemo(() => categoriesForModule(normalized), [normalized])
  const reports = useMemo(() => reportsForModule(normalized), [normalized])
  const [expanded, setExpanded] = useState(false)

  // Don't render at all if collapsed or no reports available
  if (collapsed || !categories.length) return null

  const activeCat = null // Future: could track active report category

  return (
    <div className="ml-1 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-2">
      {categories.map((cat) => {
        const CatIcon = CATEGORY_ICON_MAP[cat.key] || HiOutlineDocumentChartBar
        const catReportCount = reports.filter((r) => r.category === cat.key).length
        if (!catReportCount) return null
        return (
          <NavLink
            key={cat.key}
            to={`/app/reports?category=${cat.key}`}
            onClick={onNavigate}
            title={cat.description}
            className={({ isActive }) =>
              cn(
                'focus-ring group relative flex items-center rounded-lg text-xs font-medium transition-colors duration-150 ease-out',
                'gap-2 px-3 py-1',
                isActive
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )
            }
          >
            <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 group-hover:bg-sky-400" />
            <CatIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate">{cat.label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

/* ── Restaurant POS accordion sidebar ── */
const RestaurantAccordionSidebar = memo(function RestaurantAccordionSidebar({ items, collapsed, onNavigate, businessType }) {
  const location = useLocation()
  const pathname = location.pathname
  const [groups, setGroups] = useState(() => {
    const initial = {}
    for (const g of RESTAURANT_ACCORDION_GROUPS) {
      const hasActive = items.some(item => g.moduleKeys.includes(item.key) && pathname.startsWith(item.to))
      initial[g.id] = hasActive
    }
    initial.reports = pathname.startsWith('/app/reports')
    return initial
  })

  const dashboardItem = items.find(item => item.key === 'dashboard')
  const posTillItem = items.find(item => item.key === 'orders')
  const reportsItem = items.find(item => item.key === 'reports')
  const otherItems = items.filter(item => item.key !== 'dashboard' && item.key !== 'orders' && item.key !== 'reports' && !RESTAURANT_ACCORDION_GROUPS.some(g => g.moduleKeys.includes(item.key)))
  const { isNew, markSeen } = useFeatureDiscovery()
  const [posTillOpen, setPosTillOpen] = useState(false)

  useEffect(() => {
    /* Fast poll to detect if POS Till tab is still open (within ~3s).
     * RestaurantPOS.jsx and RestaurantOrders.jsx write a heartbeat every 3s.
     * localStorage (not sessionStorage) because the POS Till opens in a
     * separate tab and sessionStorage is per-tab. If the heartbeat stops
     * for more than 5s, show closed state. */
    const check = setInterval(() => {
      const ts = localStorage.getItem('nexora:posTill:open') || sessionStorage.getItem('nexora:posTill:open')
      if (!ts) { setPosTillOpen(false); return }
      const age = Date.now() - Number(ts)
      setPosTillOpen((prev) => { const next = age <= 8000; return next !== prev ? next : prev })
    }, 5000)
    return () => clearInterval(check)
  }, [])

  /* Open POS Till via a plain <a> click — avoids React Router interception and
   * popup-blocker issues that window.open() triggers. The browser handles the
   * new tab natively without touching the parent page's navigation. */
  function handlePosTillClick() {
    if (featureKeyForRoute(posTillItem?.to)) markSeen(featureKeyForRoute(posTillItem.to))
    const a = document.createElement('a')
    a.href = posTillItem.to
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setPosTillOpen(true)
  }

  /* Apple-style single-accordion: opening one group closes all others */
  const toggleGroup = useCallback((id) => {
    setGroups(prev => {
      const next = {}
      for (const key of Object.keys(prev)) {
        next[key] = key === id ? !prev[key] : false
      }
      return next
    })
  }, [])

  /* Sync active group when pathname changes — closes stale groups */
  useEffect(() => {
    setGroups(() => {
      const next = {}
      for (const g of RESTAURANT_ACCORDION_GROUPS) {
        const hasActive = items.some(item => g.moduleKeys.includes(item.key) && pathname.startsWith(item.to))
        next[g.id] = hasActive
      }
      next.reports = pathname.startsWith('/app/reports')
      return next
    })
  }, [pathname, items])

  return (
    <nav className="sidebar-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {/* Dashboard first */}
      {dashboardItem ? (
        <div className="mb-1">
          <SidebarNavItem item={dashboardItem} collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      ) : null}

      {/* POS Till — Primary action, highlighted right after Dashboard */}
      {posTillItem ? (
        <div className="mb-2">
          <button
            type="button"
            onClick={handlePosTillClick}
            title={posTillItem.label}
            className={cn(
              'focus-ring group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1 text-[13px] font-semibold transition-all duration-150',
              collapsed ? 'justify-center px-0 py-1.5' : '',
              'border border-amber-100/70 bg-gradient-to-r from-amber-50/60 via-white/80 to-orange-50/60 text-amber-800 hover:border-amber-300 hover:shadow-sm hover:shadow-amber-200/40',
            )}
          >
            <HiOutlineCalculator className="h-[18px] w-[18px] shrink-0 stroke-[1.8] text-amber-600" />
            {!collapsed ? (
              <span className="flex flex-1 items-center justify-between truncate">
                <span className="truncate">{posTillItem.label}</span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]',
                  posTillOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500',
                )}>
                  {posTillOpen ? (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      <circle cx="12" cy="16.5" r="1" />
                      <line x1="12" y1="12" x2="12" y2="15" />
                    </svg>
                  )}
                </span>
              </span>
            ) : null}
            {collapsed ? (
              <span className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg group-hover:block">
                {posTillItem.label}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {/* Accordion groups */}
      {RESTAURANT_ACCORDION_GROUPS.map((group) => {
        const groupItems = items.filter(item =>
          (group.moduleKeys.includes(item.key) && item.key !== 'orders') ||
          (group.id === 'menu' && (item.key === 'recipes' || item.key === 'ingredients' || item.key === 'inventory'))
        )
        if (!groupItems.length) return null
        const GroupIcon = group.icon
        const isOpen = groups[group.id] || false
        return (
          <div key={group.id} className="mb-0.5">
            {/* Group header */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleGroup(group.id) }}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleGroup(group.id) } }}
              className={cn(
                'focus-ring flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150',
                isOpen ? 'text-[#4F46E5]' : 'text-[#3E4460] hover:text-[#4F46E5]',
              )}
              aria-expanded={isOpen}
            >
              <GroupIcon className={cn('h-3.5 w-3.5 shrink-0 stroke-[1.8]', isOpen ? 'text-[#4F46E5]' : 'text-[#8890A4]')} />
              <span className="flex-1 truncate text-left">{group.label}</span>
              <HiOutlineChevronDown className={cn('h-2.5 w-2.5 shrink-0 transition-transform duration-200', isOpen ? '' : '-rotate-90')} />
            </button>

            {/* Group items — smooth framer-motion height animation */}
            <motion.div
              initial={false}
              animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5">
                {groupItems.map(item => (
                  <AccordionSubItem key={item.key} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
                {group.id === 'menu' && (
                  <CompactNavLink to="/app/kitchen-production/reports" label="Production Reports" collapsed={collapsed} onNavigate={onNavigate} />
                )}
              </div>
            </motion.div>
          </div>
        )
      })}

      {/* Reports (compact) */}
      {reportsItem ? (
        <div className="mb-0.5">
          <SidebarNavItem item={reportsItem} collapsed={collapsed} onNavigate={onNavigate} />
          {!collapsed ? (
            <ReportsNavGroup collapsed={false} onNavigate={onNavigate} businessType={businessType} />
          ) : null}
        </div>
      ) : null}

      {/* Remaining items */}
      {otherItems.length > 0 ? (
        <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1 dark:border-slate-700">
          {otherItems.map(item => (
            <SidebarNavItem key={item.key} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </nav>
  )
})

/* Compact nav link for sub-items — dot bullet, no icon container. */
function CompactNavLink({ to, label, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={label}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex items-center rounded-[10px] py-1 text-[13px] transition-colors duration-150 ease-out',
          collapsed ? 'justify-center' : 'pl-3',
          isActive
            ? 'bg-[#EEEEFF] font-semibold text-[#4F46E5]'
            : 'font-medium text-[#4A5068] hover:text-[#4F46E5]',
        )
      }
    >
      <span className={cn('h-1 w-1 shrink-0 rounded-full', 'bg-[#CBD0E0] group-hover:bg-[#4F46E5]')} />
      {!collapsed ? <span className="ml-2.5 truncate">{label}</span> : null}
    </NavLink>
  )
}

function Brand({ collapsed, workspaceName, businessTitle, onToggleCollapse }) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="focus-ring mx-auto grid h-8 w-8 shrink-0 place-items-center"
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <img src={logoUrl} alt="Nexora logo" className="h-7 w-7 rounded-lg object-contain" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <img src={logoUrl} alt="Nexora logo" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">{businessTitle}</p>
        <p className="truncate text-[10px] font-medium text-slate-400">{workspaceName}</p>
      </div>
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <HiOutlineBars3 className="h-5 w-5 stroke-[1.8]" />
        </button>
      ) : null}
    </div>
  )
}

function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse, onSwitchProduct }) {
  const { accessPlan, businessType, userDoc, userId, firebaseUser, isAdmin: userIsAdmin, isOwner: userIsOwner, workspaceId, role } = useUser()
  const access = useWorkspaceAccess()
  const businessTitle = labelForBusinessType(businessType)
  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)
  const staffAccount = Boolean(userDoc?.isStaff === true || (access.isStaff && !userIsOwner && !userIsAdmin))
  const ownerAdminBypass = !staffAccount && Boolean(developerOverride || userIsOwner || userIsAdmin || access.isAdmin)
  const workspaceName = useMemo(
    () =>
      resolveWorkspaceName({
        accountData: userDoc,
        userId,
        fallback: 'Nexora Workspace',
      }),
    [userDoc, userId],
  )
  // Don't render until Firebase data is available — prevents all-modules flash
  const dataReady = Boolean(userDoc && businessType)

  const sidebarItems = useMemo(() => {
    if (!dataReady) return []
    const staffPermissionModules = staffAccount
      ? Array.from(new Set([
          'dashboard',
          ...access.permissionKeys
            .filter((permission) => permission.action === 'view' && access.hasModulePermission(permission.moduleKey, 'view'))
            .map((permission) => permission.moduleKey),
        ]))
          .filter((moduleKey) => moduleKey !== 'team' || teamManagementEnabledForBusinessType(businessType))
          .map((moduleKey) => {
            const module = moduleCatalog.find((item) => item.key === moduleKey)
            return module
              ? {
                  ...module,
                  label: labelForBusinessModule(module.key, businessType),
                  comingSoon: false,
                }
              : null
          })
          .filter(Boolean)
          .filter((module) => !module.hidden)
      : null
    const modules = staffPermissionModules || selectedModulesForSidebar({
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
      if (staffAccount && !item.alwaysEnabled && !access.hasModulePermission(item.key, 'view')) {
        return false
      }
      if (item.to === '/app/team' && staffAccount && !access.hasModulePermission('team', 'view')) {
        return false
      }
      return allowedRoutes.has(item.to) || item.comingSoon
    })
    if (normalizedType === 'School ERP' && items.some((item) => item.key === 'team') && !items.some((item) => item.key === 'schoolPayroll')) {
      const teamIndex = items.findIndex((item) => item.key === 'team')
      items.splice(teamIndex + 1, 0, {
        key: 'schoolPayroll',
        to: '/app/payroll',
        label: 'Salary / Payroll',
        icon: HiOutlineBanknotes,
        comingSoon: false,
      })
    }
    const canShowReports = ownerAdminBypass || (!staffAccount && access.hasModulePermission('reports', 'view')) || (staffAccount && access.hasModulePermission('reports', 'view'))
    if (canShowReports && !items.some((item) => item.key === 'reports')) {
      const navItem = orderedSidebarItems.find((item) => item.to === '/app/reports')
      items.push({
        ...(navItem || {}),
        key: 'reports',
        to: '/app/reports',
        label: normalizedType === 'School ERP' ? 'School Reports Center' : 'Reports',
        comingSoon: false,
      })
    }
    const disabledItems = markDisabledModules(items)
    const orderedItems =
      normalizedType === 'General CRM' ? orderSalesHubSidebar(disabledItems)
        : normalizedType === 'Retail / POS' ? orderRetailPosSidebar(disabledItems)
          : normalizedType === 'School ERP' ? orderSchoolErpSidebar(disabledItems)
            : normalizedType === 'Restaurant POS' ? orderRestaurantPosSidebar(disabledItems)
              : normalizedType === 'Transport / Rental' ? orderTransportRentalSidebar(disabledItems)
                : normalizedType === 'WhatsApp CRM' ? orderWhatsappCrmSidebar(disabledItems)
                  : disabledItems
    return orderedItems
  }, [access, accessPlan, businessType, developerOverride, ownerAdminBypass, role, staffAccount, userDoc?.enabledModules, userDoc?.isStaff, userDoc?.onboardingCompleted, workspaceId])

  const handleSwitchProduct = useCallback(() => {
    onNavigate?.()
    onSwitchProduct?.()
  }, [onNavigate, onSwitchProduct])

  const shouldCollapse = !mobile && collapsed

  const userName = useMemo(
    () => firebaseUser?.displayName || userDoc?.displayName || userDoc?.name || workspaceName || 'Nexora User',
    [firebaseUser, userDoc, workspaceName],
  )
  const userInitials = useMemo(() => {
    const parts = (userName || '').split(/\s+/).filter(Boolean).slice(0, 2)
    return parts.map((part) => part[0]?.toUpperCase()).join('') || 'N'
  }, [userName])
  const userRole = userIsOwner ? 'Owner' : userIsAdmin ? 'Admin' : 'Member'

  const content = useMemo(() => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Brand collapsed={shouldCollapse} workspaceName={workspaceName} businessTitle={businessTitle} onToggleCollapse={onToggleCollapse} />

      {/* Workspace card */}
      <div className="mt-2 px-2">
        {shouldCollapse ? (
          <button
            type="button"
            onClick={handleSwitchProduct}
            className="focus-ring mx-auto grid h-[26px] w-[26px] place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white"
            aria-label="Switch workspace"
            title="Switch workspace"
          >
            {businessTitle ? businessTitle.charAt(0).toUpperCase() : 'N'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSwitchProduct}
            className="focus-ring flex w-full items-center gap-2.5 rounded-[10px] border border-[#EAECF0] bg-[#F8F9FC] px-2.5 py-2 text-left transition-colors duration-150 hover:border-slate-300"
          >
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white">
              {businessTitle ? businessTitle.charAt(0).toUpperCase() : 'N'}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-medium text-slate-800">{businessTitle}</span>
              <span className="block truncate text-[10px] text-slate-400">Workspace</span>
            </span>
            <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        )}
      </div>

      <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pr-1.5 ${shouldCollapse ? 'space-y-1.5' : 'space-y-0.5'}`}>
        {!dataReady ? (
          <div className="space-y-2 px-1 py-4">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-0.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : normalizeBusinessType(businessType) === 'Restaurant POS' && !shouldCollapse ? (
          <RestaurantAccordionSidebar items={sidebarItems} collapsed={shouldCollapse} onNavigate={onNavigate} businessType={businessType} />
        ) : (
          sidebarItems.map((item) => {
            const isReports = item.key === 'reports' && item.to === '/app/reports'
            return (
              <React.Fragment key={item.to}>
                <SidebarNavItem item={item} collapsed={shouldCollapse} onNavigate={onNavigate} />
                {isReports && (
                  <ReportsNavGroup
                    collapsed={shouldCollapse}
                    onNavigate={onNavigate}
                    businessType={businessType}
                  />
                )}
              </React.Fragment>
            )
          })
        )}
      </nav>

      {/* User card — pinned bottom */}
      <div className="shrink-0 border-t border-[#EAECF0] px-2 pb-1 pt-2">
        {shouldCollapse ? (
          <button
            type="button"
            onClick={handleSwitchProduct}
            className="focus-ring mx-auto grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white"
            aria-label="Account"
            title={`${userName} — ${userRole}`}
          >
            {userInitials}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 py-1">
            <button
              type="button"
              onClick={handleSwitchProduct}
              className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white">
                {userInitials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-xs font-medium text-slate-800">{userName}</span>
                <span className="block truncate text-[10px] text-slate-400">{userRole}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={handleSwitchProduct}
              className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Switch product"
              title="Switch product"
            >
              <HiOutlineArrowRightOnRectangle className="h-[18px] w-[18px] stroke-[1.8]" />
            </button>
          </div>
        )}
      </div>
    </div>
  ), [businessTitle, businessType, handleSwitchProduct, onNavigate, onToggleCollapse, shouldCollapse, sidebarItems, userInitials, userName, userRole, workspaceName])

  if (!mobile) {
    return (
      <>
        <aside
          className="sidebar-aside hidden print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:border-r lg:border-[#E8EAF0] lg:bg-white" style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          data-sidebar={shouldCollapse ? 'collapsed' : 'expanded'}
        >
          <div className={shouldCollapse ? 'sidebar-shell sidebar-shell-collapsed' : 'sidebar-shell sidebar-shell-expanded'}>
            {content}
          </div>
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
