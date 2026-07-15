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
} from 'react-icons/hi2'

function traceSidebar(event, payload = {}) {
  if (import.meta.env.DEV) {
    console.log(`[SidebarTrace] ${event}`, payload)
  }
}

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
  { id: 'delivery',    label: 'Delivery',    icon: HiOutlineTruck,                  color: 'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30',  moduleKeys: ['delivery', 'deliveryDrivers', 'deliveryZones'] },
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
        'grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition duration-150',
        tone,
        active ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm' : 'group-hover:border-sky-200 group-hover:bg-white group-hover:text-sky-700',
        disabled ? 'opacity-45 grayscale' : '',
      )}
    >
      <Icon className="h-[18px] w-[18px] stroke-[2.1]" />
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
  const { isNew, markSeen } = useFeatureDiscovery()
  const featureKey = featureKeyForRoute(item.to)
  const showBadge = featureKey && isNew(featureKey)

  function handleNav() {
    if (featureKey) markSeen(featureKey)
    onNavigate?.()
  }

  const content = (
    <>
      {!disabled ? null : (
        <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 group-hover:bg-slate-200 sm:inline">
          Soon
        </span>
      )}
      {showBadge && !collapsed ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <FeatureBadge />
        </span>
      ) : null}
      <HdSidebarIcon icon={Icon} tone={tone} disabled={disabled} />
      {!collapsed ? <span className={`truncate ${showBadge ? 'pr-14' : 'pr-9'}`}>{label}</span> : null}
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
          collapsed ? 'justify-center px-0 py-1.5' : 'gap-2.5 px-2.5 py-0.5',
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
      target={item.openInNewWindow ? '_blank' : undefined}
      rel={item.openInNewWindow ? 'noopener noreferrer' : undefined}
      onClick={() => {
        if (item.to === '/app/inventory') {
          console.log('[Inventory Route] clicked')
          console.log('[Inventory Route] target', item.to)
        }
        handleNav()
      }}
      title={label}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex items-center rounded-xl text-[13px] font-semibold transition-colors duration-150 ease-out',
          collapsed ? 'justify-center px-0 py-1.5' : 'gap-2.5 px-2.5 py-0.5',
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
    /* Poll sessionStorage to detect if POS Till tab is still open.
     * The POS Till page (RestaurantOrders.jsx) writes a heartbeat.
     * If the heartbeat stops for more than 10s, show closed state. */
    const check = setInterval(() => {
      const ts = sessionStorage.getItem('nexora:posTill:open')
      if (!ts) { setPosTillOpen(false); return }
      const age = Date.now() - Number(ts)
      if (age > 12000) setPosTillOpen(false)
    }, 2000)
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

  const toggleGroup = useCallback((id) => {
    setGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

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
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-amber-200/60 bg-amber-50 text-amber-600 shadow-sm group-hover:border-amber-300 group-hover:bg-amber-100 group-hover:text-amber-700">
              <HiOutlineCalculator className="h-[18px] w-[18px] stroke-[2.1]" />
            </span>
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
        const groupItems = items.filter(item => group.moduleKeys.includes(item.key) && item.key !== 'orders' || (group.id === 'menu' && (item.key === 'recipes' || item.key === 'ingredients' || item.key === 'inventory')))
        if (!groupItems.length) return null
        const GroupIcon = group.icon
        const isOpen = groups[group.id] || false
        return (
          <div key={group.id} className="mb-0.5">
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="focus-ring flex w-full items-center gap-2 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200"
              aria-expanded={isOpen}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${group.color}`}>
                <GroupIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-left">{group.label}</span>
              <motion.span
                animate={{ rotate: isOpen ? 0 : -90 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="shrink-0"
              >
                <HiOutlineChevronDown className="h-3 w-3" />
              </motion.span>
            </button>

            {/* Group items — animated height */}
            <div className="restaurant-group-collapse" style={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}>
              <div className="ml-2 space-y-0.5 border-l-2 border-slate-100 pl-2 dark:border-slate-700">
                {groupItems.map(item => (
                  <SidebarNavItem key={item.key} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
                {group.id === 'menu' && (
                  <>
                    <CompactNavLink to="/app/kitchen-production/reports" label="Production Reports" icon={HiOutlineDocumentChartBar} collapsed={collapsed} onNavigate={onNavigate} />
                  </>
                )}
              </div>
            </div>
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

/* Compact nav link for sub-items */
function CompactNavLink({ to, label, icon: Icon, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={label}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex items-center rounded-lg text-xs font-medium transition-colors duration-150 ease-out',
          collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-3 py-0.5',
          isActive
            ? 'bg-sky-50 text-sky-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        )
      }
    >
      {Icon ? (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-3 w-3" />
        </span>
      ) : (
        <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
      )}
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  )
}

function Brand({ collapsed, workspaceName, businessTitle }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} px-2 py-1`}>
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
  const sidebarItems = useMemo(() => {
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
      if (item.to === '/app/team' && staffAccount && !access.hasModulePermission('team', 'view')) {
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
    // Hide Driver Dashboard for Restaurant POS
    if (normalizedType === 'Restaurant POS') {
      const driverIdx = items.findIndex((item) => item.key === 'driverDashboard')
      if (driverIdx !== -1) items.splice(driverIdx, 1)
    }
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
    traceSidebar('module-filter-result', {
      role: role || access.role || '',
      staffAccount,
      workspaceId: workspaceId || '',
      businessType,
      enabledModules: Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : [],
      modules: orderedItems.map((item) => item.key),
      routes: orderedItems.map((item) => item.to),
    })
    return orderedItems
  }, [access, accessPlan, businessType, developerOverride, ownerAdminBypass, role, staffAccount, userDoc?.enabledModules, userDoc?.isStaff, userDoc?.onboardingCompleted, workspaceId])

  const handleSwitchProduct = useCallback(() => {
    onNavigate?.()
    onSwitchProduct?.()
  }, [onNavigate, onSwitchProduct])

  const shouldCollapse = !mobile && collapsed

  const content = useMemo(() => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Brand collapsed={shouldCollapse} workspaceName={workspaceName} businessTitle={businessTitle} />
      <div className={`mt-1 px-2 ${shouldCollapse ? 'hidden' : ''}`}>
        <div className="rounded-[0.85rem] border border-slate-200/70 bg-slate-50/80 px-2.5 py-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{businessTitle}</p>
        </div>
      </div>

      <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pr-1.5 ${shouldCollapse ? 'space-y-1.5' : 'space-y-0.5'}`}>
        {normalizeBusinessType(businessType) === 'Restaurant POS' && !shouldCollapse ? (
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
              className="group absolute -right-3 bottom-7 z-30 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-400 shadow-sm ring-1 ring-black/5 transition-all duration-150 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md hover:shadow-sky-200/50 hover:ring-sky-200 active:scale-95 cursor-pointer"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="transition-transform duration-150 group-hover:scale-110">{collapsed ? '›' : '‹'}</span>
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
