import { useLocation } from 'react-router-dom'
import FeatureLockedModal from '../billing/FeatureLockedModal.jsx'
import { isDeveloperOwnerAccount, moduleByRoute, routeAllowedByPlan } from '../../data/moduleAccess.js'
import { useUser } from '../../hooks/useUser.js'

export default function FeatureGate({ children }) {
  const { pathname } = useLocation()
  const { accessPlan, firebaseUser, userDoc } = useUser()
  const module = moduleByRoute(pathname)
  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)

  if (!routeAllowedByPlan(pathname, accessPlan, { developerOverride })) {
    return (
      <FeatureLockedModal
        title={module?.label || 'Paid Package Feature'}
        message="This feature is available in Standard, Premium, or Enterprise packages."
      />
    )
  }

  return children
}
