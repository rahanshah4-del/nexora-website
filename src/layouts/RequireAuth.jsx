import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import PageLoader from '../crm/components/ui/PageLoader.jsx'
import { getCustomEmailVerificationStatus } from '../lib/emailVerificationService.js'

// Gate for /verify-email and /workspace. It only routes — it never signs the
// user out. A bounded verification check (8s) falls through to "not verified"
// so a slow/offline read bounces the user to /verify-email rather than
// stranding them on a spinner.
export default function RequireAuth() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [customVerified, setCustomVerified] = useState(null)
  const [checkingCustom, setCheckingCustom] = useState(true)
  const userId = user?.uid || ''
  const userEmail = user?.email || ''
  const firebaseEmailVerified = user?.emailVerified === true

  useEffect(() => {
    let cancelled = false
    let timeoutId = null

    if (loading) {
      return () => {
        cancelled = true
      }
    }

    // No user, or already verified via Firebase: resolve synchronously.
    if (!userId) {
      setCustomVerified(false)
      setCheckingCustom(false)
      return () => {
        cancelled = true
      }
    }
    if (firebaseEmailVerified) {
      setCustomVerified(true)
      setCheckingCustom(false)
      return () => {
        cancelled = true
      }
    }

    // Otherwise check the custom verification flag, bounded by a timeout.
    setCheckingCustom(true)
    timeoutId = window.setTimeout(() => {
      if (cancelled) return
      setCustomVerified(false)
      setCheckingCustom(false)
    }, 8000)

    getCustomEmailVerificationStatus({ uid: userId, email: userEmail, emailVerified: false })
      .then((verified) => {
        if (!cancelled) setCustomVerified(verified)
      })
      .catch(() => {
        if (!cancelled) setCustomVerified(false)
      })
      .finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId)
        if (!cancelled) setCheckingCustom(false)
      })

    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [firebaseEmailVerified, loading, userEmail, userId])

  if (loading || (userId && checkingCustom)) {
    return <PageLoader stage="auth" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const verified = firebaseEmailVerified || customVerified === true
  if (!verified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
