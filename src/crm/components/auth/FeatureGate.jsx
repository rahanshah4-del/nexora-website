import { useLocation } from 'react-router-dom'
import FeatureLockedModal from '../billing/FeatureLockedModal.jsx'
import { moduleByRoute, routeAllowedByPlan } from '../../data/moduleAccess.js'
import { useUser } from '../../hooks/useUser.js'

export default function FeatureGate({ children }) {
  const { pathname } = useLocation()
  const { plan } = useUser()
  const module = moduleByRoute(pathname)

  if (!routeAllowedByPlan(pathname, plan)) {
    return (
      <FeatureLockedModal
        title={module?.label || 'Business Plan Feature'}
        message="This feature is available in Business Plan."
      />
    )
  }

  return children
}
