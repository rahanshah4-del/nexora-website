import DefaultSeo from './components/DefaultSeo.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { Component, Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

const MarketingRoute = lazy(() => import('./pages/public/MarketingRoute.jsx'))
const UpgradeBusiness = lazy(() => import('./pages/UpgradeBusiness.jsx'))
const Login = lazy(() => import('./pages/auth/Login.jsx'))
const Signup = lazy(() => import('./pages/auth/Signup.jsx'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'))
const WorkspaceSelection = lazy(() => import('./pages/auth/WorkspaceSelection.jsx'))
const CrmRequireAuth = lazy(() => import('./crm/components/auth/RequireAuth.jsx'))
const RootRequireAuth = lazy(() => import('./layouts/RequireAuth.jsx'))
const RequireAdmin = lazy(() => import('./layouts/RequireAdmin.jsx'))
const AnalyticsTracker = lazy(() => import('./components/AnalyticsTracker.jsx'))
const PricingPage = lazy(() => import('./pages/public/PricingPage.jsx'))
const AboutPage = lazy(() => import('./pages/public/AboutPage.jsx'))
const ProjectsPage = lazy(() => import('./pages/public/ProjectsPage.jsx'))
const ContactPage = lazy(() => import('./pages/public/ContactPage.jsx'))
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage.jsx'))
const TermsPage = lazy(() => import('./pages/public/TermsPage.jsx'))
const RefundPolicyPage = lazy(() => import('./pages/public/RefundPolicyPage.jsx'))
const HtmlSitemapPage = lazy(() => import('./pages/public/HtmlSitemapPage.jsx'))
const HelpCenterPage = lazy(() => import('./pages/public/HelpCenterPage.jsx'))
const DocumentationPage = lazy(() => import('./pages/public/DocumentationPage.jsx'))
const SolutionPage = lazy(() => import('./pages/public/SolutionPage.jsx'))
const PublicBusinessServicesPage = lazy(() => import('./pages/public/BusinessServicesPage.jsx'))
const BlogIndexPage = lazy(() => import('./pages/public/BlogIndexPage.jsx'))
const BlogArticlePage = lazy(() => import('./pages/public/BlogArticlePage.jsx'))
const FaqPage = lazy(() => import('./pages/public/FaqPage.jsx'))
const SupportCenterPage = lazy(() => import('./pages/public/SupportCenterPage.jsx'))
const DashboardLayout = lazy(() => import('./crm/layouts/DashboardLayout.jsx'))
// Preload DashboardLayout chunk immediately — it's needed on every /app/* route
import('./crm/layouts/DashboardLayout.jsx').catch(() => {})
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const DashboardHomePage = lazy(() => import('./crm/pages/DashboardHome.jsx'))
// Preload DashboardHome chunk — it's the default route after login
import('./crm/pages/DashboardHome.jsx').catch(() => {})
const RestaurantPOSPage = lazy(() => import('./crm/pages/RestaurantPOS.jsx'))
const RestaurantOrdersPage = lazy(() => import('./crm/pages/RestaurantOrders.jsx'))
// Preload RestaurantOrders chunk — POS Till opens in new window
import('./crm/pages/RestaurantOrders.jsx').catch(() => {})
const RestaurantMenuManagementPage = lazy(() => import('./crm/pages/RestaurantMenuManagement.jsx'))
const RestaurantTablesPage = lazy(() => import('./crm/pages/RestaurantTables.jsx'))
const RestaurantOrdersKotPage = lazy(() => import('./crm/pages/RestaurantOrdersKot.jsx'))
const RestaurantKitchenDisplayPage = lazy(() => import('./crm/pages/RestaurantKitchenDisplay.jsx'))
const TransportDashboardPage = lazy(() => import('./crm/pages/TransportDashboard.jsx'))
const TransportVehiclesPage = lazy(() => import('./crm/pages/TransportVehicles.jsx'))
const TransportBookingsPage = lazy(() => import('./crm/pages/TransportBookings.jsx'))
const TransportCustomersPage = lazy(() => import('./crm/pages/TransportCustomers.jsx'))
const TransportPaymentsPage = lazy(() => import('./crm/pages/TransportPayments.jsx'))
const ClientPortalPage = lazy(() => import('./crm/pages/ClientPortal.jsx'))
const CustomersPage = lazy(() => import('./crm/pages/Customers.jsx'))
const ProductsPage = lazy(() => import('./crm/pages/Products.jsx'))
const InventoryPage = lazy(() => import('./crm/pages/Inventory.jsx'))
const RetailPOSPage = lazy(() => import('./crm/pages/RetailPOS.jsx'))
const RetailPOSOrdersPage = lazy(() => import('./crm/pages/RetailPOSOrders.jsx'))
const RetailPOSDiscountsPage = lazy(() => import('./crm/pages/RetailPOSDiscounts.jsx'))
const LeadsPage = lazy(() => import('./crm/pages/Leads.jsx'))
const LeadScoringPage = lazy(() => import('./crm/pages/LeadScoring.jsx'))
const AIAssistantPage = lazy(() => import('./crm/pages/AIAssistant.jsx'))
const PipelinePage = lazy(() => import('./crm/pages/SalesPipeline.jsx'))
const DealsPage = lazy(() => import('./crm/pages/Deals.jsx'))
const SalesTasksPage = lazy(() => import('./crm/pages/SalesTasks.jsx'))
const SalesActivitiesPage = lazy(() => import('./crm/pages/SalesActivities.jsx'))
const QuotationsPage = lazy(() => import('./crm/pages/Quotations.jsx'))
const ProductsServicesPage = lazy(() => import('./crm/pages/ProductsServices.jsx'))
const BusinessServicesPage = lazy(() => import('./crm/pages/BusinessServices.jsx'))
const FollowUpsPage = lazy(() => import('./crm/pages/FollowUps.jsx'))
const TeamPage = lazy(() => import('./crm/pages/Team.jsx'))
const SchoolPayrollPage = lazy(() => import('./crm/pages/SchoolPayroll.jsx'))
const HRDashboardPage = lazy(() => import('./crm/pages/HRDashboard.jsx'))
const InvoicesPage = lazy(() => import('./crm/pages/Invoices.jsx'))
const InvoiceCreatePage = lazy(() => import('./crm/pages/InvoiceCreate.jsx'))
const ExpensesPage = lazy(() => import('./crm/pages/Expenses.jsx'))
const AccountManagementPage = lazy(() => import('./crm/pages/AccountManagement.jsx'))
const AccountStatementsPage = lazy(() => import('./crm/pages/AccountStatements.jsx'))
const SubscriptionsPage = lazy(() => import('./crm/pages/Subscriptions.jsx'))
const SupportPage = lazy(() => import('./crm/pages/Support.jsx'))
const ActivityLogsPage = lazy(() => import('./crm/pages/ActivityLogs.jsx'))
const AnalyticsPage = lazy(() => import('./crm/pages/Analytics.jsx'))
const NotificationsPage = lazy(() => import('./crm/pages/Notifications.jsx'))
const ApprovalsPage = lazy(() => import('./crm/pages/Approvals.jsx'))
const ReportsPage = lazy(() => import('./crm/pages/Reports.jsx'))
const SchoolReportsCenterPage = lazy(() => import('./crm/pages/SchoolReportsCenter.jsx'))
const AttendancePage = lazy(() => import('./crm/pages/Attendance.jsx'))
const SettingsPage = lazy(() => import('./crm/pages/Settings.jsx'))
const MaintenancePage = lazy(() => import('./crm/pages/Maintenance.jsx'))
const ContractsPage = lazy(() => import('./crm/pages/Contracts.jsx'))
const WhatsappInboxPage = lazy(() => import('./crm/pages/WhatsappInbox.jsx'))
const WhatsappLeadsPage = lazy(() => import('./crm/pages/WhatsappLeads.jsx'))
const WhatsappFollowUpsPage = lazy(() => import('./crm/pages/WhatsappFollowUps.jsx'))
const WhatsappTemplatesPage = lazy(() => import('./crm/pages/WhatsappTemplates.jsx'))
const WhatsappConnectPage = lazy(() => import('./crm/pages/WhatsappConnect.jsx'))
const LoyaltyPage = lazy(() => import('./crm/pages/Loyalty.jsx'))
const LoyaltyRewardsPage = lazy(() => import('./crm/pages/LoyaltyRewards.jsx'))
const LoyaltyCouponsPage = lazy(() => import('./crm/pages/LoyaltyCoupons.jsx'))
const LoyaltyCampaignsPage = lazy(() => import('./crm/pages/LoyaltyCampaigns.jsx'))
const LoyaltySettingsPage = lazy(() => import('./crm/pages/LoyaltySettings.jsx'))
const DeliveryDashboardPage = lazy(() => import('./crm/pages/DeliveryDashboard.jsx'))
const DeliveryOrdersPage = lazy(() => import('./crm/pages/DeliveryOrders.jsx'))
const DeliveryDriversPage = lazy(() => import('./crm/pages/DeliveryDrivers.jsx'))
const DeliveryZonesPage = lazy(() => import('./crm/pages/DeliveryZones.jsx'))
const DeliverySettingsPage = lazy(() => import('./crm/pages/DeliverySettings.jsx'))
const DriverDashboardPage = lazy(() => import('./crm/pages/DriverDashboard.jsx'))
const OnlineOrderingPortalPage = lazy(() => import('./crm/pages/OnlineOrderingPortal.jsx'))
const CustomerOrderTrackingPage = lazy(() => import('./crm/pages/CustomerOrderTracking.jsx'))
const RestaurantReservationDashboardPage = lazy(() => import('./crm/pages/RestaurantReservationDashboard.jsx'))
const RestaurantReservationsPage = lazy(() => import('./crm/pages/RestaurantReservations.jsx'))
const RestaurantReservationCalendarPage = lazy(() => import('./crm/pages/RestaurantReservationCalendar.jsx'))
const RestaurantWaitlistPage = lazy(() => import('./crm/pages/RestaurantWaitlist.jsx'))
const RestaurantReservationSettingsPage = lazy(() => import('./crm/pages/RestaurantReservationSettings.jsx'))
const KitchenProductionDashboardPage = lazy(() => import('./crm/pages/KitchenProductionDashboard.jsx'))
const KitchenProductionBatchesPage = lazy(() => import('./crm/pages/KitchenProductionBatches.jsx'))
const KitchenPrepSheetPage = lazy(() => import('./crm/pages/KitchenPrepSheet.jsx'))
const KitchenProductionWastePage = lazy(() => import('./crm/pages/KitchenProductionWaste.jsx'))
const KitchenProductionReportsPage = lazy(() => import('./crm/pages/KitchenProductionReports.jsx'))
const UpgradeRequests = lazy(() => import('./pages/admin/UpgradeRequests.jsx'))
const ControlCentrePage = lazy(() => import('./pages/admin/ControlCentre.jsx'))
const ClientCommandCenterPage = lazy(() => import('./pages/admin/ClientCommandCenter.jsx'))
const AdminBusinessServicesPage = lazy(() => import('./pages/admin/BusinessServices.jsx'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))

class InvoiceRouteBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-[1.35rem] border border-rose-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-black tracking-tight text-slate-950">Invoices could not load</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The invoice module hit a display error. Reload the invoice page or return to the CRM dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
              onClick={() => window.location.reload()}
            >
              Reload Invoices
            </button>
            <a className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href="/app/dashboard">
              Back to Dashboard
            </a>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}

function LazyPage({ children }) {
  // Minimal inline fallback — avoids a full-page loader flash for cached chunks.
  // The premium PageLoader is reserved for auth/workspace init only.
  return <Suspense fallback={<div className="min-h-[60dvh]" />}>{children}</Suspense>
}

class InventoryRouteBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('[Inventory Route] render error', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-[1.35rem] border border-rose-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-black tracking-tight text-slate-950">Inventory could not load</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The inventory module hit a display error. Reload the page or return to the CRM dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
              onClick={() => window.location.reload()}
            >
              Reload Inventory
            </button>
            <a className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" href="/app/dashboard">
              Back to Dashboard
            </a>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}

function InventoryRoute() {
  if (import.meta.env.DEV) {
    console.log('[Inventory Route] module access', { path: '/app/inventory' })
    console.log('[Inventory Route] gated result', 'allowed (DashboardLayout guards passed)')
  }
  return (
    <InventoryRouteBoundary>
      <LazyPage>
        <InventoryPage />
      </LazyPage>
    </InventoryRouteBoundary>
  )
}

function RetailPosRoute() {
  if (import.meta.env.DEV) {
    console.log('[Retail POS Route] module access', { path: '/app/pos', module: 'pos' })
    console.log('[Retail POS Route] gated result', 'allowed (DashboardLayout guards passed)')
  }
  return (
    <InvoiceRouteBoundary>
      <LazyPage>
        <RetailPOSPage />
      </LazyPage>
    </InvoiceRouteBoundary>
  )
}

function UpgradeRouteGuard() {
  const location = useLocation()
  const cameFromUpgrade = Boolean(location.state?.fromUpgradeBusiness)
  return <LazyPage><UpgradeBusiness cameFromUpgrade={cameFromUpgrade} /></LazyPage>
}

function AdminControlCentreRoute() {
  return (
    <LazyPage>
      <RequireAdmin>
        <ControlCentrePage />
      </RequireAdmin>
    </LazyPage>
  )
}

function AdminUpgradeRequestsRoute() {
  return (
    <LazyPage>
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    </LazyPage>
  )
}

function useModalScrollLock() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    let locked = false
    let scrollY = 0
    const original = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    const hasOpenModal = () => Boolean(
      document.querySelector('[aria-modal="true"]')
      || document.body.classList.contains('business-service-modal-open')
      || document.documentElement.classList.contains('business-service-modal-open'),
    )

    const applyLock = () => {
      const shouldLock = hasOpenModal()
      if (shouldLock && !locked) {
        const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
        scrollY = window.scrollY || document.documentElement.scrollTop || 0
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
        if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`
        locked = true
      }
      if (!shouldLock && locked) {
        document.body.style.overflow = original.overflow
        document.body.style.paddingRight = original.paddingRight
        document.body.style.position = original.position
        document.body.style.top = original.top
        document.body.style.width = original.width
        window.scrollTo(0, scrollY)
        locked = false
      }
    }

    applyLock()
    const observer = new MutationObserver(applyLock)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'class'],
    })

    return () => {
      observer.disconnect()
      if (locked) {
        document.body.style.overflow = original.overflow
        document.body.style.paddingRight = original.paddingRight
        document.body.style.position = original.position
        document.body.style.top = original.top
        document.body.style.width = original.width
        window.scrollTo(0, scrollY)
      }
    }
  }, [])
}

export default function AppRouter() {
  useModalScrollLock()
  const location = useLocation()
  const enableCrmAnalytics = location.pathname.startsWith('/app') || location.pathname.startsWith('/admin')

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AppRouterTrace] route-render', { pathname: location.pathname })
    }
  }, [location.pathname])

  return (
    <>
      <Suspense fallback={null}><DefaultSeo /></Suspense>
      {enableCrmAnalytics ? (
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      ) : null}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LazyPage><MarketingRoute /></LazyPage>} />
        <Route path="/features" element={<LazyPage><MarketingRoute sectionId="services" /></LazyPage>} />
        <Route path="/services" element={<LazyPage><PublicBusinessServicesPage /></LazyPage>} />
        <Route path="/pricing" element={<LazyPage><PricingPage /></LazyPage>} />
        <Route path="/business-services" element={<LazyPage><PublicBusinessServicesPage /></LazyPage>} />
        <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
        <Route path="/industries" element={<LazyPage><MarketingRoute sectionId="products" /></LazyPage>} />
        <Route path="/projects" element={<LazyPage><ProjectsPage /></LazyPage>} />
        <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="/privacy-policy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
        <Route path="/terms" element={<LazyPage><TermsPage /></LazyPage>} />
        <Route path="/refund-policy" element={<LazyPage><RefundPolicyPage /></LazyPage>} />
        <Route path="/sitemap" element={<LazyPage><HtmlSitemapPage /></LazyPage>} />
        <Route path="/help-center" element={<LazyPage><HelpCenterPage /></LazyPage>} />
        <Route path="/faq" element={<LazyPage><FaqPage /></LazyPage>} />
        <Route path="/support-center" element={<LazyPage><SupportCenterPage /></LazyPage>} />
        <Route path="/documentation" element={<LazyPage><DocumentationPage /></LazyPage>} />
        <Route path="/blog" element={<LazyPage><BlogIndexPage /></LazyPage>} />
        <Route path="/blog/:slug" element={<LazyPage><BlogArticlePage /></LazyPage>} />
        <Route path="/restaurant-pos" element={<LazyPage><SolutionPage solutionSlug="pos" /></LazyPage>} />
        <Route path="/retail-pos" element={<LazyPage><SolutionPage solutionSlug="retail-pos" /></LazyPage>} />
        <Route path="/school-erp" element={<LazyPage><SolutionPage solutionSlug="school-erp" /></LazyPage>} />
        <Route path="/transport" element={<LazyPage><SolutionPage solutionSlug="transport-rental" /></LazyPage>} />
        <Route path="/whatsapp-crm" element={<LazyPage><SolutionPage solutionSlug="whatsapp-crm" /></LazyPage>} />
        <Route path="/solutions/:solutionSlug" element={<LazyPage><SolutionPage /></LazyPage>} />

      <Route path="/login" element={<LazyPage><Login /></LazyPage>} />
      <Route path="/signup" element={<LazyPage><Signup /></LazyPage>} />
      <Route element={<LazyPage><RootRequireAuth /></LazyPage>}>
        <Route path="/verify-email" element={<LazyPage><VerifyEmail /></LazyPage>} />
        <Route path="/workspace" element={<LazyPage><WorkspaceSelection /></LazyPage>} />
      </Route>
      <Route path="/upgrade-business" element={<UpgradeRouteGuard />} />

      <Route
        path="/app"
        element={
          <LazyPage>
            <CrmRequireAuth>
              <DashboardLayout />
            </CrmRequireAuth>
          </LazyPage>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<LazyPage><DashboardHomePage /></LazyPage>} />
        <Route path="restaurant-pos" element={<LazyPage><RestaurantPOSPage /></LazyPage>} />
        <Route path="orders" element={<InvoiceRouteBoundary><LazyPage><RestaurantOrdersPage /></LazyPage></InvoiceRouteBoundary>} />
        <Route path="menu-management" element={<LazyPage><RestaurantMenuManagementPage /></LazyPage>} />
        <Route path="tables" element={<LazyPage><RestaurantTablesPage /></LazyPage>} />
        <Route path="orders-kot" element={<LazyPage><RestaurantOrdersKotPage /></LazyPage>} />
        <Route path="kitchen-display" element={<LazyPage><RestaurantKitchenDisplayPage /></LazyPage>} />
        <Route path="transport-dashboard" element={<LazyPage><TransportDashboardPage /></LazyPage>} />
        <Route path="transport/vehicles" element={<LazyPage><TransportVehiclesPage /></LazyPage>} />
        <Route path="transport/bookings" element={<LazyPage><TransportBookingsPage /></LazyPage>} />
        <Route path="transport/customers" element={<LazyPage><TransportCustomersPage /></LazyPage>} />
        <Route path="transport/payments" element={<LazyPage><TransportPaymentsPage /></LazyPage>} />
        <Route path="client-portal" element={<LazyPage><ClientPortalPage /></LazyPage>} />
        <Route path="customers" element={<LazyPage><CustomersPage /></LazyPage>} />
        <Route path="products" element={<LazyPage><ProductsPage /></LazyPage>} />
        <Route path="inventory" element={<InventoryRoute />} />
        <Route path="pos" element={<RetailPosRoute />} />
        <Route path="pos-orders" element={<LazyPage><RetailPOSOrdersPage /></LazyPage>} />
        <Route path="pos-discounts" element={<LazyPage><RetailPOSDiscountsPage /></LazyPage>} />
        <Route path="leads" element={<LazyPage><LeadsPage /></LazyPage>} />
        <Route path="leads/scoring" element={<LazyPage><LeadScoringPage /></LazyPage>} />
        <Route path="ai-assistant" element={<LazyPage><AIAssistantPage /></LazyPage>} />
        <Route path="pipeline" element={<LazyPage><PipelinePage /></LazyPage>} />
        <Route path="deals" element={<LazyPage><DealsPage /></LazyPage>} />
        <Route path="tasks" element={<LazyPage><SalesTasksPage /></LazyPage>} />
        <Route path="activities" element={<LazyPage><SalesActivitiesPage /></LazyPage>} />
        <Route path="quotations" element={<LazyPage><QuotationsPage /></LazyPage>} />
        <Route path="products-services" element={<LazyPage><ProductsServicesPage /></LazyPage>} />
        <Route path="business-services" element={<LazyPage><BusinessServicesPage /></LazyPage>} />
        <Route path="follow-ups" element={<LazyPage><FollowUpsPage /></LazyPage>} />
        <Route path="team" element={<LazyPage><TeamPage /></LazyPage>} />
        <Route path="payroll" element={<LazyPage><SchoolPayrollPage /></LazyPage>} />
        <Route path="hr" element={<LazyPage><HRDashboardPage /></LazyPage>} />
        <Route path="invoices" element={<InvoiceRouteBoundary><LazyPage><InvoicesPage /></LazyPage></InvoiceRouteBoundary>} />
        <Route path="invoices/create" element={<InvoiceRouteBoundary><LazyPage><InvoiceCreatePage /></LazyPage></InvoiceRouteBoundary>} />
        <Route path="expenses" element={<LazyPage><ExpensesPage /></LazyPage>} />
        <Route path="accounts" element={<LazyPage><AccountManagementPage /></LazyPage>} />
        <Route path="accounts/statements" element={<LazyPage><AccountStatementsPage /></LazyPage>} />
        <Route path="subscriptions" element={<LazyPage><SubscriptionsPage /></LazyPage>} />
        <Route path="support" element={<LazyPage><SupportPage /></LazyPage>} />
        <Route path="activity-logs" element={<LazyPage><ActivityLogsPage /></LazyPage>} />
        <Route path="analytics" element={<LazyPage><AnalyticsPage /></LazyPage>} />
        <Route path="notifications" element={<LazyPage><NotificationsPage /></LazyPage>} />
        <Route path="approvals" element={<LazyPage><ApprovalsPage /></LazyPage>} />
        <Route path="reports" element={<LazyPage><ReportsPage /></LazyPage>} />
        <Route path="school-reports" element={<LazyPage><SchoolReportsCenterPage /></LazyPage>} />
        <Route path="attendance" element={<LazyPage><AttendancePage /></LazyPage>} />
        <Route path="maintenance" element={<LazyPage><MaintenancePage /></LazyPage>} />
        <Route path="contracts" element={<LazyPage><ContractsPage /></LazyPage>} />
        <Route path="whatsapp-inbox" element={<LazyPage><WhatsappInboxPage /></LazyPage>} />
        <Route path="whatsapp-leads" element={<LazyPage><WhatsappLeadsPage /></LazyPage>} />
        <Route path="whatsapp-followups" element={<LazyPage><WhatsappFollowUpsPage /></LazyPage>} />
        <Route path="whatsapp-templates" element={<LazyPage><WhatsappTemplatesPage /></LazyPage>} />
        <Route path="whatsapp-connect" element={<LazyPage><WhatsappConnectPage /></LazyPage>} />
        <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
        <Route path="loyalty" element={<LazyPage><LoyaltyPage /></LazyPage>} />
        <Route path="loyalty/rewards" element={<LazyPage><LoyaltyRewardsPage /></LazyPage>} />
        <Route path="loyalty/coupons" element={<LazyPage><LoyaltyCouponsPage /></LazyPage>} />
        <Route path="loyalty/campaigns" element={<LazyPage><LoyaltyCampaignsPage /></LazyPage>} />
        <Route path="loyalty/settings" element={<LazyPage><LoyaltySettingsPage /></LazyPage>} />
        <Route path="delivery" element={<LazyPage><DeliveryDashboardPage /></LazyPage>} />
        <Route path="delivery/orders" element={<LazyPage><DeliveryOrdersPage /></LazyPage>} />
        <Route path="delivery/drivers" element={<LazyPage><DeliveryDriversPage /></LazyPage>} />
        <Route path="delivery/zones" element={<LazyPage><DeliveryZonesPage /></LazyPage>} />
        <Route path="delivery/settings" element={<LazyPage><DeliverySettingsPage /></LazyPage>} />
        <Route path="driver" element={<LazyPage><DriverDashboardPage /></LazyPage>} />
        <Route path="menu/:slug" element={<LazyPage><OnlineOrderingPortalPage /></LazyPage>} />
        <Route path="track/:orderNumber" element={<LazyPage><CustomerOrderTrackingPage /></LazyPage>} />
        <Route path="reservations" element={<LazyPage><RestaurantReservationDashboardPage /></LazyPage>} />
        <Route path="reservations/list" element={<LazyPage><RestaurantReservationsPage /></LazyPage>} />
        <Route path="reservations/calendar" element={<LazyPage><RestaurantReservationCalendarPage /></LazyPage>} />
        <Route path="reservations/waitlist" element={<LazyPage><RestaurantWaitlistPage /></LazyPage>} />
        <Route path="reservations/settings" element={<LazyPage><RestaurantReservationSettingsPage /></LazyPage>} />
        <Route path="kitchen-production" element={<LazyPage><KitchenProductionDashboardPage /></LazyPage>} />
        <Route path="kitchen-production/batches" element={<LazyPage><KitchenProductionBatchesPage /></LazyPage>} />
        <Route path="kitchen-production/prep" element={<LazyPage><KitchenPrepSheetPage /></LazyPage>} />
        <Route path="kitchen-production/waste" element={<LazyPage><KitchenProductionWastePage /></LazyPage>} />
        <Route path="kitchen-production/reports" element={<LazyPage><KitchenProductionReportsPage /></LazyPage>} />
        <Route path="coming-soon/:moduleId" element={<LazyPage><DashboardHomePage /></LazyPage>} />
      </Route>

      <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
      <Route path="/admin/control-centre" element={<AdminControlCentreRoute />} />
      <Route path="/admin" element={<AdminUpgradeRequestsRoute />}>
          <Route path="client-command-center" element={<LazyPage><ClientCommandCenterPage /></LazyPage>} />
          <Route path="business-services" element={<LazyPage><AdminBusinessServicesPage /></LazyPage>} />
          <Route path="upgrade-requests" element={<LazyPage><UpgradeRequests /></LazyPage>} />
          <Route index element={<Navigate to="/admin/control-centre" replace />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
