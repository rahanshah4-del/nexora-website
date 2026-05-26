import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import PageLoader from './components/ui/PageLoader.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'

const LoginPage = lazy(() => import('./pages/Login.jsx'))
const DashboardHomePage = lazy(() => import('./pages/DashboardHome.jsx'))
const RestaurantPOSPage = lazy(() => import('./pages/RestaurantPOS.jsx'))
const CustomersPage = lazy(() => import('./pages/Customers.jsx'))
const ProductsPage = lazy(() => import('./pages/Products.jsx'))
const LeadsPage = lazy(() => import('./pages/Leads.jsx'))
const PipelinePage = lazy(() => import('./pages/SalesPipeline.jsx'))
const AnalyticsPage = lazy(() => import('./pages/Analytics.jsx'))
const ReportsPage = lazy(() => import('./pages/Reports.jsx'))
const SettingsPage = lazy(() => import('./pages/Settings.jsx'))
const UpgradeBusinessPage = lazy(() => import('./pages/UpgradeBusiness.jsx'))
const AdminUpgradeRequestsPage = lazy(() => import('./pages/AdminUpgradeRequests.jsx'))
const TeamPage = lazy(() => import('./pages/Team.jsx'))
const InvoicesPage = lazy(() => import('./pages/Invoices.jsx'))
const SubscriptionsPage = lazy(() => import('./pages/Subscriptions.jsx'))
const SupportPage = lazy(() => import('./pages/Support.jsx'))
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogs.jsx'))
const LeadScoringPage = lazy(() => import('./pages/LeadScoring.jsx'))
const FollowUpsPage = lazy(() => import('./pages/FollowUps.jsx'))
const HRDashboardPage = lazy(() => import('./pages/HRDashboard.jsx'))
const NotificationsPage = lazy(() => import('./pages/Notifications.jsx'))
const ClientPortalPage = lazy(() => import('./pages/ClientPortal.jsx'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistant.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/upgrade-business"
            element={
              <RequireAuth>
                <UpgradeBusinessPage />
              </RequireAuth>
            }
          />

          <Route
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app/dashboard" element={<DashboardHomePage />} />
            <Route path="/app/restaurant-pos" element={<RestaurantPOSPage />} />
            <Route path="/app/customers" element={<CustomersPage />} />
            <Route path="/app/products" element={<ProductsPage />} />
            <Route path="/app/leads" element={<LeadsPage />} />
            <Route path="/app/leads/scoring" element={<LeadScoringPage />} />
            <Route path="/app/pipeline" element={<PipelinePage />} />
            <Route path="/app/tasks" element={<Navigate to="/app/follow-ups" replace />} />
            <Route path="/app/follow-ups" element={<FollowUpsPage />} />
            <Route path="/app/hr" element={<HRDashboardPage />} />
            <Route path="/app/team" element={<TeamPage />} />
            <Route path="/app/invoices" element={<InvoicesPage />} />
            <Route path="/app/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/app/support" element={<SupportPage />} />
            <Route path="/app/activity" element={<Navigate to="/app/activity-logs" replace />} />
            <Route path="/app/activity-logs" element={<ActivityLogsPage />} />
            <Route path="/app/analytics" element={<AnalyticsPage />} />
            <Route path="/app/notifications" element={<NotificationsPage />} />
            <Route path="/app/client-portal" element={<ClientPortalPage />} />
            <Route path="/app/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/app/reports" element={<ReportsPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            <Route path="/app/admin/upgrade-requests" element={<Navigate to="/admin/upgrade-requests" replace />} />
            <Route path="/admin/upgrade-requests" element={<AdminUpgradeRequestsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
