import { createContext, useEffect, useMemo, useState } from 'react'
import { doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'

const UserContext = createContext(null)

const defaultUserDoc = {
  name: 'Demo User',
  email: 'demo@nexora.solutions',
  plan: 'Free',
  role: 'owner', // owner | admin | staff
  planStatus: 'trial',
  upgradedAt: null,
}

function normalizeRole(role) {
  const value = String(role || '').toLowerCase()
  if (value === 'staff') return 'staff'
  if (value === 'admin') return 'admin'
  return 'owner'
}

export function UserProvider({ children }) {
  const { user, ready } = useAuth()
  const { profile, plan: localPlan } = usePreferences()
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    if (!db) {
      Promise.resolve().then(() => {
        setUserDoc(null)
        setLoading(false)
      })
      return
    }
    if (!user) {
      Promise.resolve().then(() => {
        setUserDoc(null)
        setLoading(false)
      })
      return
    }

    const ref = doc(db, 'users', user.uid)
    ensureUserWorkspace(user, {
      fullName: profile.ownerName,
      email: profile.email || user.email || '',
      provider: user.providerData?.[0]?.providerId || 'password',
    }).catch(() => {})

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setDoc(
            ref,
            {
              ...defaultUserDoc,
              uid: user.uid,
              ownerId: user.uid,
              userId: user.uid,
              workspaceId: user.uid,
              name: profile.ownerName || user.displayName || user.email?.split('@')?.[0] || defaultUserDoc.name,
              fullName: profile.ownerName || user.displayName || '',
              email: profile.email || user.email || defaultUserDoc.email,
              provider: user.providerData?.[0]?.providerId || 'password',
              role: 'owner',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch(() => {})
          setUserDoc(null)
        } else {
          setUserDoc(snap.data())
        }
        setLoading(false)
      },
      () => {
        setUserDoc(null)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [ready, user, profile.ownerName, profile.email])

  const effectivePlan = userDoc?.plan ?? (db ? 'Free' : localPlan ?? 'Free')
  const role = normalizeRole(userDoc?.role)
  const workspaceId = userDoc?.workspaceId || user?.uid || null
  const staffId = userDoc?.staffId || user?.uid || null

  const value = useMemo(
    () => ({
      userId: user?.uid ?? null,
      workspaceId,
      staffId,
      firebaseUser: user ?? null,
      userDoc,
      loading,
      plan: effectivePlan,
      role,
      isOwner: role === 'owner',
      isStaff: role === 'staff',
      isAdmin: role === 'admin' || role === 'owner',
    }),
    [user, workspaceId, staffId, userDoc, loading, effectivePlan, role],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserContext
