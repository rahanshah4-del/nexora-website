import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import PageLoader from './components/ui/PageLoader.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import FeatureGate from './components/auth/FeatureGate.jsx'

const LoginPage = lazy(() => import('./pages/Login.jsx'))
const DashboardHomePage = lazy(() => import('./pages/DashboardHome.jsx'))
const RestaurantPOSPage = lazy(() => import('./pages/RestaurantPOS.jsx'))
const RestaurantOrdersPage = lazy(() => import('./pages/RestaurantOrders.jsx'))
const RestaurantMenuManagementPage = lazy(() => import('./pages/RestaurantMenuManagement.jsx'))
const RestaurantTablesPage = lazy(() => import('./pages/RestaurantTables.jsx'))
const RestaurantOrdersKotPage = lazy(() => import('./pages/RestaurantOrdersKot.jsx'))
const RestaurantKitchenDisplayPage = lazy(() => import('./pages/RestaurantKitchenDisplay.jsx'))
const CustomersPage = lazy(() => import('./pages/Customers.jsx'))
const ProductsPage = lazy(() => import('./pages/Products.jsx'))
const InventoryPage = lazy(() => import('./pages/Inventory.jsx'))
const LeadsPage = lazy(() => import('./pages/Leads.jsx'))
const PipelinePage = lazy(() => import('./pages/SalesPipeline.jsx'))
const AnalyticsPage = lazy(() => import('./pages/Analytics.jsx'))
const ReportsPage = lazy(() => import('./pages/Reports.jsx'))
const SchoolReportsCenterPage = lazy(() => import('./pages/SchoolReportsCenter.jsx'))
const AttendancePage = lazy(() => import('./pages/Attendance.jsx'))
const SettingsPage = lazy(() => import('./pages/Settings.jsx'))
const UpgradeBusinessPage = lazy(() => import('./pages/UpgradeBusiness.jsx'))
const TeamPage = lazy(() => import('./pages/Team.jsx'))
const SchoolPayrollPage = lazy(() => import('./pages/SchoolPayroll.jsx'))
const InvoicesPage = lazy(() => import('./pages/Invoices.jsx'))
const InvoiceCreatePage = lazy(() => import('./pages/InvoiceCreate.jsx'))
const ExpensesPage = lazy(() => import('./pages/Expenses.jsx'))
const AccountManagementPage = lazy(() => import('./pages/AccountManagement.jsx'))
const AccountStatementsPage = lazy(() => import('./pages/AccountStatements.jsx'))
const SubscriptionsPage = lazy(() => import('./pages/Subscriptions.jsx'))
const SupportPage = lazy(() => import('./pages/Support.jsx'))
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogs.jsx'))
const LeadScoringPage = lazy(() => import('./pages/LeadScoring.jsx'))
const FollowUpsPage = lazy(() => import('./pages/FollowUps.jsx'))
const HRDashboardPage = lazy(() => import('./pages/HRDashboard.jsx'))
const NotificationsPage = lazy(() => import('./pages/Notifications.jsx'))
const ClientPortalPage = lazy(() => import('./pages/ClientPortal.jsx'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistant.jsx'))
const ApprovalsPage = lazy(() => import('./pages/Approvals.jsx'))
const ModulePlaceholderPage = lazy(() => import('./pages/ModulePlaceholder.jsx'))

function gated(element) {
  return <FeatureGate>{element}</FeatureGate>
}

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
            <Route path="/app/orders" element={<RestaurantOrdersPage />} />
            <Route path="/app/menu-management" element={<RestaurantMenuManagementPage />} />
            <Route path="/app/tables" element={<RestaurantTablesPage />} />
            <Route path="/app/orders-kot" element={<RestaurantOrdersKotPage />} />
            <Route path="/app/kitchen-display" element={<RestaurantKitchenDisplayPage />} />
            <Route path="/app/customers" element={gated(<CustomersPage />)} />
            <Route path="/app/products" element={gated(<ProductsPage />)} />
            <Route path="/app/inventory" element={gated(<InventoryPage />)} />
            <Route path="/app/leads" element={gated(<LeadsPage />)} />
            <Route path="/app/leads/scoring" element={gated(<LeadScoringPage />)} />
            <Route path="/app/pipeline" element={gated(<PipelinePage />)} />
            <Route path="/app/tasks" element={<Navigate to="/app/follow-ups" replace />} />
            <Route path="/app/follow-ups" element={gated(<FollowUpsPage />)} />
            <Route path="/app/hr" element={gated(<HRDashboardPage />)} />
            <Route path="/app/team" element={gated(<TeamPage />)} />
            <Route path="/app/payroll" element={gated(<SchoolPayrollPage />)} />
            <Route path="/app/invoices" element={gated(<InvoicesPage />)} />
            <Route path="/app/invoices/create" element={gated(<InvoiceCreatePage />)} />
            <Route path="/app/expenses" element={gated(<ExpensesPage />)} />
            <Route path="/app/accounts" element={gated(<AccountManagementPage />)} />
            <Route path="/app/accounts/statements" element={gated(<AccountStatementsPage />)} />
            <Route path="/app/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/app/support" element={gated(<SupportPage />)} />
            <Route path="/app/activity" element={<Navigate to="/app/activity-logs" replace />} />
            <Route path="/app/activity-logs" element={gated(<ActivityLogsPage />)} />
            <Route path="/app/analytics" element={gated(<AnalyticsPage />)} />
            <Route path="/app/notifications" element={gated(<NotificationsPage />)} />
            <Route path="/app/approvals" element={gated(<ApprovalsPage />)} />
            <Route path="/app/client-portal" element={gated(<ClientPortalPage />)} />
            <Route path="/app/ai-assistant" element={gated(<AIAssistantPage />)} />
            <Route path="/app/reports" element={gated(<ReportsPage />)} />
            <Route path="/app/school-reports" element={gated(<SchoolReportsCenterPage />)} />
            <Route path="/app/attendance" element={gated(<AttendancePage />)} />
            <Route path="/app/settings" element={<SettingsPage />} />
            <Route path="/app/coming-soon/:module" element={<ModulePlaceholderPage />} />
            <Route path="/app/admin/upgrade-requests" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/admin/upgrade-requests" element={<Navigate to="/login" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
