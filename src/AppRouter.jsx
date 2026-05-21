import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import App from './App.jsx'
import UpgradeBusiness from './pages/UpgradeBusiness.jsx'

function UpgradeRouteGuard() {
  const location = useLocation()
  const cameFromUpgrade = Boolean(location.state?.fromUpgradeBusiness)
  return <UpgradeBusiness cameFromUpgrade={cameFromUpgrade} />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/upgrade-business" element={<UpgradeRouteGuard />} />
      <Route path="/pricing" element={<Navigate to="/upgrade-business" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

