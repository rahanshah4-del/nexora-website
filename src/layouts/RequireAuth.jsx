import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'
import { getCustomEmailVerificationStatus } from '../lib/emailVerificationService.js'
import { isUserCustomVerified } from '../lib/authRouteState.js'

export default function RequireAuth() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [customVerified, setCustomVerified] = useState(false)
  const [checkingCustom, setCheckingCustom] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user?.uid || user.emailVerified) {
      setCustomVerified(false)
      setCheckingCustom(false)
      return undefined
    }
    setCheckingCustom(true)
    getCustomEmailVerificationStatus(user)
      .then((verified) => {
        if (!cancelled) setCustomVerified(verified)
      })
      .finally(() => {
        if (!cancelled) setCheckingCustom(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading || checkingCustom) {
    return <PageLoader stage="auth" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const verified = isUserCustomVerified({ ...user, emailVerifiedCustom: customVerified })
  console.log('[RequireAuth Gate]', {
    path: location.pathname,
    firebaseEmailVerified: user.emailVerified,
    customVerified,
    verified,
  })

  if (!verified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
