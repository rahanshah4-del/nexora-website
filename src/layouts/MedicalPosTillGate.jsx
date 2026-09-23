import { lazy } from 'react'
import PageLoader from '../crm/components/ui/PageLoader.jsx'
import { useUser } from '../crm/hooks/useUser.js'
import { useWorkspaceAccess } from '../crm/hooks/useWorkspaceAccess.js'
import { isDeveloperOwnerAccount, routeAllowedByBusinessType, routeAllowedByPlan } from '../crm/data/moduleAccess.js'

const MedicalPosPage = lazy(() => import('../crm/pages/MedicalPos.jsx'))

// Standalone, chrome-free Medical Store POS till — rendered OUTSIDE DashboardLayout
// (see the top-level "/pos-till/medical" route in AppRouter.jsx), so it gets none of
// DashboardLayout's routePlanBlocked/routeBusinessBlocked/routePermissionBlocked
// gating for free. This replicates a minimal equivalent using the exact same
// functions/hooks DashboardLayout itself uses (routeAllowedByBusinessType,
// routeAllowedByPlan, isDeveloperOwnerAccount, useWorkspaceAccess().hasModulePermission),
// fed the canonical "/app/medical-pos" path so they resolve to the same
// moduleCatalog('medicalPos') entry DashboardLayout would use for that module.
export default function MedicalPosTillGate() {
  const {
    userDoc,
    loading: userLoading,
    isStaff: userIsStaff,
    isAdmin: userIsAdmin,
    isOwner: userIsOwner,
    businessType,
    allowedBusinessTypes,
    specialModuleAccess,
    allModulesAccess,
    accessPlan,
    firebaseUser,
  } = useUser()
  const workspaceAccess = useWorkspaceAccess()

  if (userLoading || !userDoc) {
    return <PageLoader stage="workspace" />
  }

  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)
  const isOwnerAdmin = Boolean(developerOverride || userIsOwner || userIsAdmin || workspaceAccess.isAdmin)
  const teamOverride = workspaceAccess.isAdmin || workspaceAccess.hasPermission('settingsAccess')
  const accessReady = Boolean(!workspaceAccess.loading && workspaceAccess.accessReady !== false)
  const staffModuleGranted = Boolean(
    !isOwnerAdmin && userIsStaff && accessReady && workspaceAccess.hasModulePermission('medicalPos', 'view'),
  )

  const businessAllowed = routeAllowedByBusinessType('/app/medical-pos', businessType, {
    developerOverride,
    allowedBusinessTypes,
    allModulesAccess: allModulesAccess || (specialModuleAccess && Array.isArray(allowedBusinessTypes) && allowedBusinessTypes.length >= 6),
  })
  const planAllowed = routeAllowedByPlan('/app/medical-pos', accessPlan, { developerOverride, teamOverride, businessType })
  const allowed = isOwnerAdmin || staffModuleGranted || (businessAllowed && planAllowed)

  if (import.meta.env.DEV) {
    console.log('[Medical POS Till Route] standalone access check', {
      path: '/pos-till/medical', module: 'medicalPos', businessType, accessPlan, isOwnerAdmin, staffModuleGranted, businessAllowed, planAllowed, allowed,
    })
  }

  if (!allowed) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-950">PharmaFlow isn't available</p>
          <p className="mt-2 text-sm text-slate-500">
            This billing till is only available for workspaces on the PharmaFlow module and plan. Ask your workspace owner to enable it or upgrade your plan.
          </p>
          <a href="/app/dashboard" className="mt-4 inline-block rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <MedicalPosPage />
}
