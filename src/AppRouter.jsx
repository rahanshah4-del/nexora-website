import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import UpgradeBusiness from './pages/UpgradeBusiness.jsx'
import MarketingRoute from './pages/public/MarketingRoute.jsx'
import Login from './pages/auth/Login.jsx'
import RequireAuth from './layouts/RequireAuth.jsx'
import RequireAdmin from './layouts/RequireAdmin.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Dashboard from './pages/app/Dashboard.jsx'
import Customers from './pages/app/Customers.jsx'
import Leads from './pages/app/Leads.jsx'
import Pipeline from './pages/app/Pipeline.jsx'
import Reports from './pages/app/Reports.jsx'
import Settings from './pages/app/Settings.jsx'
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
      <Route path="/upgrade-business" element={<UpgradeRouteGuard />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="leads" element={<Leads />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route index element={<Navigate to="/app/dashboard" replace />} />
        </Route>
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
