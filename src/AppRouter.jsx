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
const DashboardLayout = lazy(() => import('./crm/layouts/DashboardLayout.jsx'))
const CRMProviders = lazy(() => import('./crm/CRMProviders.jsx'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const DashboardHomePage = lazy(() => import('./crm/pages/DashboardHome.jsx'))
const RestaurantPOSPage = lazy(() => import('./crm/pages/RestaurantPOS.jsx'))
const ClientPortalPage = lazy(() => import('./crm/pages/ClientPortal.jsx'))
const CustomersPage = lazy(() => import('./crm/pages/Customers.jsx'))
const ProductsPage = lazy(() => import('./crm/pages/Products.jsx'))
const LeadsPage = lazy(() => import('./crm/pages/Leads.jsx'))
const LeadScoringPage = lazy(() => import('./crm/pages/LeadScoring.jsx'))
const AIAssistantPage = lazy(() => import('./crm/pages/AIAssistant.jsx'))
const PipelinePage = lazy(() => import('./crm/pages/SalesPipeline.jsx'))
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
const SettingsPage = lazy(() => import('./crm/pages/Settings.jsx'))
const UpgradeRequests = lazy(() => import('./pages/admin/UpgradeRequests.jsx'))
const ControlCentrePage = lazy(() => import('./pages/admin/ControlCentre.jsx'))
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
            <CRMProviders>
              <CrmRequireAuth>
                <DashboardLayout />
              </CrmRequireAuth>
            </CRMProviders>
          </LazyPage>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<LazyPage><DashboardHomePage /></LazyPage>} />
        <Route path="restaurant-pos" element={<LazyPage><RestaurantPOSPage /></LazyPage>} />
        <Route path="client-portal" element={<LazyPage><ClientPortalPage /></LazyPage>} />
        <Route path="customers" element={<LazyPage><CustomersPage /></LazyPage>} />
        <Route path="products" element={<LazyPage><ProductsPage /></LazyPage>} />
        <Route path="leads" element={<LazyPage><LeadsPage /></LazyPage>} />
        <Route path="leads/scoring" element={<LazyPage><LeadScoringPage /></LazyPage>} />
        <Route path="ai-assistant" element={<LazyPage><AIAssistantPage /></LazyPage>} />
        <Route path="pipeline" element={<LazyPage><PipelinePage /></LazyPage>} />
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
        <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
        <Route path="coming-soon/:moduleId" element={<LazyPage><DashboardHomePage /></LazyPage>} />
      </Route>

      <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
      <Route path="/admin/control-centre" element={<AdminControlCentreRoute />} />
      <Route path="/admin" element={<AdminUpgradeRequestsRoute />}>
          <Route path="upgrade-requests" element={<LazyPage><UpgradeRequests /></LazyPage>} />
          <Route index element={<Navigate to="/admin/control-centre" replace />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
