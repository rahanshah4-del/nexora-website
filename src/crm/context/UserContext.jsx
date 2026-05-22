import { createContext, useEffect, useMemo, useState } from 'react'
import { doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'

const UserContext = createContext(null)

const defaultUserDoc = {
  name: 'Demo User',
  email: 'demo@nexora.solutions',
  plan: 'Free',
  role: 'user', // user | admin
  planStatus: 'Free Plan',
  upgradedAt: null,
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

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setDoc(
            ref,
            {
              ...defaultUserDoc,
              name: profile.ownerName || defaultUserDoc.name,
              email: profile.email || defaultUserDoc.email,
              plan: 'Free',
              planStatus: 'Free Plan',
              createdAt: serverTimestamp(),
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
  const role = userDoc?.role ?? 'user'

  const value = useMemo(
    () => ({
      userId: user?.uid ?? null,
      firebaseUser: user ?? null,
      userDoc,
      loading,
      plan: effectivePlan,
      role,
      isAdmin: role === 'admin',
    }),
    [user, userDoc, loading, effectivePlan, role],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserContext
