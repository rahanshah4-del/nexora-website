import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { AuthContext } from './auth-context.js'
import { auth, db } from '../lib/firebase.js'

async function fetchUserRole(userId) {
  if (!db || !userId) return { role: 'user', isAdmin: false }
  const snap = await getDoc(doc(db, 'users', userId))
  const data = snap.exists() ? snap.data() : null
  const role = typeof data?.role === 'string' ? data.role : 'user'
  const isAdmin = role === 'admin' || data?.isAdmin === true
  return { role, isAdmin }
}

export default function AuthProvider({ children }) {
  const firebaseEnabled = Boolean(auth)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('user')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(() => firebaseEnabled)

  useEffect(() => {
    if (!auth) return undefined

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setRole('user')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const nextRole = await fetchUserRole(nextUser.uid)
        setRole(nextRole.role)
        setIsAdmin(nextRole.isAdmin)
      } catch {
        setRole('user')
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({ user, role, isAdmin, loading, firebaseEnabled }),
    [user, role, isAdmin, loading, firebaseEnabled],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

