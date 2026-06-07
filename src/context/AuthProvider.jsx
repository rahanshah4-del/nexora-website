import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AuthContext } from './auth-context.js'
import { auth, db } from '../lib/firebase.js'
import { ensureUserWorkspace } from '../lib/accountProvisioning.js'
import { getCustomEmailVerificationStatus } from '../lib/emailVerificationService.js'
import { isBackendAdminEmail, isPlatformAdminDoc } from '../lib/roles.js'
import { reportTechnicalError } from '../lib/errorHandler.js'

async function fetchUserRole(user) {
  if (!db || !user?.uid) return { role: 'user', isAdmin: false }
  const snap = await getDoc(doc(db, 'users', user.uid))
  const data = snap.exists() ? snap.data() : null
  const role = typeof data?.role === 'string' ? data.role : 'user'
  const isAdmin = isPlatformAdminDoc({ email: user.email || '' })
  return { role, isAdmin }
}

async function updateClientPresence(user, options = {}) {
  if (!db || !user?.uid || isBackendAdminEmail(user.email)) return
  const userRef = doc(db, 'users', user.uid)
  let existing = {}
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
      currentWorkspaceId: existing.currentWorkspaceId || existing.workspaceId || existing.ownerId || user.uid,
      currentBusinessType: existing.currentBusinessType || existing.selectedBusinessType || existing.businessType || '',
      selectedBusinessType: existing.selectedBusinessType || existing.currentBusinessType || existing.businessType || '',
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
      console.log('[Auth Isolation] auth state changed', {
        uid: nextUser?.uid || 'none',
        email: nextUser?.email || '',
        emailVerified: nextUser?.emailVerified === true,
      })
      if (nextUser) {
        console.log('[Auth Isolation] login uid', nextUser.uid)
      }
      setUser(nextUser)
      if (!nextUser) {
        setRole('user')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      if (isBackendAdminEmail(nextUser.email)) {
        setRole('super_admin')
        setIsAdmin(true)
        setLoading(false)
        return
      }

      setRole('user')
      setIsAdmin(false)
      setLoading(false)

      Promise.resolve()
        .then(async () => {
          const customVerified = nextUser.emailVerified === true ? true : await getCustomEmailVerificationStatus(nextUser)
          if (!customVerified) return
          const workspaceResult = await ensureUserWorkspace(nextUser)
          console.log('[Auth Flow] workspace ensure success', {
            source: 'auth-provider',
            uid: nextUser.uid,
            workspaceId: workspaceResult?.workspaceId || '',
          })
          const nextRole = await fetchUserRole(nextUser)
          if (!cancelled) {
            setRole(nextRole.role)
            setIsAdmin(nextRole.isAdmin)
          }
          await updateClientPresence(nextUser, { login: true, online: true })
        })
        .catch((error) => {
          reportTechnicalError(error, 'Auth workspace bootstrap')
          if (!cancelled) {
            setRole('user')
            setIsAdmin(isBackendAdminEmail(nextUser.email))
          }
        })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

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
