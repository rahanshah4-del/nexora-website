export const VERIFY_EMAIL_ROUTE = '/verify-email'
export const WORKSPACE_ROUTE = '/workspace'
export const CRM_DASHBOARD_ROUTE = '/app/dashboard'

export function isUserCustomVerified(user) {
  return Boolean(user?.emailVerified || user?.emailVerifiedCustom === true)
}

export function shouldShowWorkspaceSelection(profile, workspace) {
  return profile?.onboardingCompleted !== true && workspace?.onboardingCompleted !== true
}

export function getAuthRouteState(user) {
  const verified = isUserCustomVerified(user)
  const onboardingCompleted = user?.onboardingCompleted === true
  const route = !verified
    ? VERIFY_EMAIL_ROUTE
    : onboardingCompleted
      ? CRM_DASHBOARD_ROUTE
      : WORKSPACE_ROUTE

  const state = {
    verified,
    onboardingCompleted,
    route,
  }

  console.log('[Auth Route State]', state)
  return state
}

export function getPostLoginRoute(user) {
  const route = getAuthRouteState(user).route
  console.log('[Post Login Route]', { route })
  return route
}

export function getPostVerificationRoute(user) {
  const route = isUserCustomVerified(user) ? WORKSPACE_ROUTE : VERIFY_EMAIL_ROUTE
  console.log('[Post Verification Route]', { route })
  return route
}
