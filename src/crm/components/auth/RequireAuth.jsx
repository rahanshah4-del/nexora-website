import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from '../ui/PageLoader.jsx'
import { useAuth } from '../../hooks/useAuth.js'

export default function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <PageLoader stage="auth" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
