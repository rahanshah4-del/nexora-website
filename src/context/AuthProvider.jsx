import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AuthContext } from './auth-context.js'
import { auth, db } from '../lib/firebase.js'
import { isBackendAdminEmail } from '../lib/roles.js'
import { reportTechnicalError } from '../lib/errorHandler.js'

// AuthProvider is intentionally limited to AUTHENTICATION STATE ONLY.
// It must NOT create workspaces, run account provisioning, read verification
// status, or sign the user out on any downstream error. Workspace provisioning
// is owned by the post-verification flow (VerifyEmail) and the CRM context.
// Presence below is a best-effort write to the user's own doc and never affects
// auth state or navigation.
async function updateClientPresence(user, options = {}) {
  if (!db || !user?.uid || isBackendAdminEmail(user.email)) return
  const userRef = doc(db, 'users', user.uid)
  let existing
  try {
    const snap = await getDoc(userRef)
    existing = snap.exists() ? snap.data() : {}
  } catch {
    existing = {}
  }

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: String(user.email || existing.email || '').toLowerCase(),
      displayName: user.displayName || existing.displayName || existing.fullName || existing.name || '',
      emailVerified: Boolean(user.emailVerified),
      isOnline: options.online !== false,
      lastActiveAt: serverTimestamp(),
      ...(options.login ? { lastLoginAt: serverTimestamp(), loginAt: serverTimestamp() } : {}),
      device: typeof navigator !== 'undefined' ? navigator.platform || '' : '',
      browser: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export default function AuthProvider({ children }) {
  const firebaseEnabled = Boolean(auth)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('user')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(() => firebaseEnabled)

  useEffect(() => {
    if (!auth) return undefined

    let cancelled = false
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (cancelled) return

      setUser(nextUser)

      if (!nextUser) {
        // Signed out: reset derived state only. No redirects, no provisioning.
        setRole('user')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      // Admin detection is synchronous (email-based) — no Firestore needed.
      const backendAdmin = isBackendAdminEmail(nextUser.email)
      setRole(backendAdmin ? 'super_admin' : 'user')
      setIsAdmin(backendAdmin)
      setLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Best-effort presence. Errors here must never bubble to auth state.
  useEffect(() => {
    if (!user || isBackendAdminEmail(user.email)) return undefined

    let lastWrite = 0
    const touch = () => {
      const now = Date.now()
      if (now - lastWrite < 60000) return
      lastWrite = now
      updateClientPresence(user, { online: true }).catch((error) => reportTechnicalError(error, 'Client presence update'))
    }
    const markOffline = () => {
      updateClientPresence(user, { online: false }).catch(() => {})
    }

    touch()
    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'visibilitychange']
    events.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }))
    window.addEventListener('beforeunload', markOffline)

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, touch))
      window.removeEventListener('beforeunload', markOffline)
    }
  }, [user])

  const value = useMemo(
    () => ({ user, role, isAdmin, loading, firebaseEnabled }),
    [user, role, isAdmin, loading, firebaseEnabled],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
