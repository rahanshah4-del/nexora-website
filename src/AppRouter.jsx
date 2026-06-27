import { Component, Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import UpgradeBusiness from './pages/UpgradeBusiness.jsx'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import VerifyEmail from './pages/auth/VerifyEmail.jsx'
import WorkspaceSelection from './pages/auth/WorkspaceSelection.jsx'
import CrmRequireAuth from './crm/components/auth/RequireAuth.jsx'
import PageLoader from './crm/components/ui/PageLoader.jsx'
import RootRequireAuth from './layouts/RequireAuth.jsx'
import RequireAdmin from './layouts/RequireAdmin.jsx'
import AnalyticsTracker from './components/AnalyticsTracker.jsx'

const MarketingRoute = lazy(() => import('./pages/public/MarketingRoute.jsx'))
const PricingPage = lazy(() => import('./pages/public/PricingPage.jsx'))
const SolutionPage = lazy(() => import('./pages/public/SolutionPage.jsx'))
const PublicBusinessServicesPage = lazy(() => import('./pages/public/BusinessServicesPage.jsx'))
const DashboardLayout = lazy(() => import('./crm/layouts/DashboardLayout.jsx'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const DashboardHomePage = lazy(() => import('./crm/pages/DashboardHome.jsx'))
const RestaurantPOSPage = lazy(() => import('./crm/pages/RestaurantPOS.jsx'))
const RestaurantOrdersPage = lazy(() => import('./crm/pages/RestaurantOrders.jsx'))
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
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
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
  console.log('[Inventory Route] module access', { path: '/app/inventory' })
  console.log('[Inventory Route] gated result', 'allowed (DashboardLayout guards passed)')
  return (
    <InventoryRouteBoundary>
      <LazyPage>
        <InventoryPage />
      </LazyPage>
    </InventoryRouteBoundary>
  )
}

function RetailPosRoute() {
  console.log('[Retail POS Route] module access', { path: '/app/pos', module: 'pos' })
  console.log('[Retail POS Route] gated result', 'allowed (DashboardLayout guards passed)')
  return (
    <InvoiceRouteBoundary>
      <LazyPage>
        <InvoiceCreatePage />
      </LazyPage>
    </InvoiceRouteBoundary>
  )
}

function UpgradeRouteGuard() {
  const location = useLocation()
  const cameFromUpgrade = Boolean(location.state?.fromUpgradeBusiness)
  return <UpgradeBusiness cameFromUpgrade={cameFromUpgrade} />
}

function AdminControlCentreRoute() {
  return (
    <RequireAdmin>
      <LazyPage>
        <ControlCentrePage />
      </LazyPage>
    </RequireAdmin>
  )
}

function AdminUpgradeRequestsRoute() {
  return (
    <RequireAdmin>
      <LazyPage>
        <AdminLayout />
      </LazyPage>
    </RequireAdmin>
  )
}

export default function AppRouter() {
  return (
    <>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<LazyPage><MarketingRoute /></LazyPage>} />
        <Route path="/features" element={<LazyPage><MarketingRoute sectionId="services" /></LazyPage>} />
        <Route path="/pricing" element={<LazyPage><PricingPage /></LazyPage>} />
        <Route path="/business-services" element={<LazyPage><PublicBusinessServicesPage /></LazyPage>} />
        <Route path="/contact" element={<LazyPage><MarketingRoute sectionId="contact" /></LazyPage>} />
        <Route path="/industries" element={<LazyPage><MarketingRoute sectionId="products" /></LazyPage>} />
        <Route path="/solutions/:solutionSlug" element={<LazyPage><SolutionPage /></LazyPage>} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RootRequireAuth />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/workspace" element={<WorkspaceSelection />} />
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
        <Route path="orders" element={<LazyPage><RestaurantOrdersPage /></LazyPage>} />
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
