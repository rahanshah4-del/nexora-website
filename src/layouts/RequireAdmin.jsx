import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'

export default function RequireAdmin() {
  const location = useLocation()
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <PageLoader stage="auth" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
