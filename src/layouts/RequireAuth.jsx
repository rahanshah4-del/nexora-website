import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'
import { getCustomEmailVerificationStatus } from '../lib/emailVerificationService.js'

export default function RequireAuth() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [customVerified, setCustomVerified] = useState(null)
  const [checkingCustom, setCheckingCustom] = useState(true)

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
      .catch(() => {
        if (!cancelled) setCustomVerified(false)
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

  const verified = user.emailVerified === true || customVerified === true
  const nextRedirect = !verified && location.pathname !== '/verify-email' ? '/verify-email' : null
  console.log('[RequireAuth Gate]', {
    path: location.pathname,
    firebaseEmailVerified: user?.emailVerified,
    customVerified,
    nextRedirect,
  })

  if (nextRedirect) {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
