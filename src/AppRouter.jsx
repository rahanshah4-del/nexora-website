import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import UpgradeBusiness from './pages/UpgradeBusiness.jsx'
import MarketingRoute from './pages/public/MarketingRoute.jsx'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import RequireAuth from './crm/components/auth/RequireAuth.jsx'
import RequireAdmin from './layouts/RequireAdmin.jsx'
import DashboardLayout from './crm/layouts/DashboardLayout.jsx'
import CRMProviders from './crm/CRMProviders.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import DashboardHomePage from './crm/pages/DashboardHome.jsx'
import RestaurantPOSPage from './crm/pages/RestaurantPOS.jsx'
import ClientPortalPage from './crm/pages/ClientPortal.jsx'
import CustomersPage from './crm/pages/Customers.jsx'
import ProductsPage from './crm/pages/Products.jsx'
import LeadsPage from './crm/pages/Leads.jsx'
import LeadScoringPage from './crm/pages/LeadScoring.jsx'
import AIAssistantPage from './crm/pages/AIAssistant.jsx'
import PipelinePage from './crm/pages/SalesPipeline.jsx'
import FollowUpsPage from './crm/pages/FollowUps.jsx'
import TeamPage from './crm/pages/Team.jsx'
import HRDashboardPage from './crm/pages/HRDashboard.jsx'
import InvoicesPage from './crm/pages/Invoices.jsx'
import ExpensesPage from './crm/pages/Expenses.jsx'
import AccountManagementPage from './crm/pages/AccountManagement.jsx'
import AccountStatementsPage from './crm/pages/AccountStatements.jsx'
import SubscriptionsPage from './crm/pages/Subscriptions.jsx'
import SupportPage from './crm/pages/Support.jsx'
import ActivityLogsPage from './crm/pages/ActivityLogs.jsx'
import AnalyticsPage from './crm/pages/Analytics.jsx'
import NotificationsPage from './crm/pages/Notifications.jsx'
import ApprovalsPage from './crm/pages/Approvals.jsx'
import ReportsPage from './crm/pages/Reports.jsx'
import SettingsPage from './crm/pages/Settings.jsx'
import UpgradeRequests from './pages/admin/UpgradeRequests.jsx'

function UpgradeRouteGuard() {
  const location = useLocation()
  const cameFromUpgrade = Boolean(location.state?.fromUpgradeBusiness)
  return <UpgradeBusiness cameFromUpgrade={cameFromUpgrade} />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MarketingRoute />} />
      <Route path="/features" element={<MarketingRoute sectionId="services" />} />
      <Route path="/pricing" element={<MarketingRoute sectionId="pricing" />} />
      <Route path="/contact" element={<MarketingRoute sectionId="contact" />} />
      <Route path="/industries" element={<MarketingRoute sectionId="products" />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/upgrade-business" element={<UpgradeRouteGuard />} />

      <Route
        path="/app"
        element={
          <CRMProviders>
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          </CRMProviders>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHomePage />} />
        <Route path="restaurant-pos" element={<RestaurantPOSPage />} />
        <Route path="client-portal" element={<ClientPortalPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/scoring" element={<LeadScoringPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="follow-ups" element={<FollowUpsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="hr" element={<HRDashboardPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="accounts" element={<AccountManagementPage />} />
        <Route path="accounts/statements" element={<AccountStatementsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="upgrade-requests" element={<UpgradeRequests />} />
          <Route index element={<Navigate to="/admin/upgrade-requests" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
