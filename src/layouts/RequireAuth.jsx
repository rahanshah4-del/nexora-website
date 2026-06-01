import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'

export default function RequireAuth() {
  const location = useLocation()
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader stage="auth" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!user.emailVerified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
