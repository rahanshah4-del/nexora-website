import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firebaseEnabled, getFirebaseEnvHint } from '../lib/firebase.js'
import { db } from '../lib/firebase.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      Promise.resolve().then(() => setReady(true))
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null)
      setReady(true)
    })
    return () => unsub()
  }, [])

  const login = useCallback(async (email, password) => {
    setError('')
    if (!firebaseEnabled || !auth) {
      setError(getFirebaseEnvHint() || 'Firebase is not configured.')
      return false
    }
    setBusy(true)
    try {
      const credentials = await signInWithEmailAndPassword(auth, email, password)
      await ensureUserWorkspace(credentials.user, { email, provider: 'password' })
      return true
    } catch (e) {
      setError(e?.message || 'Login failed.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const signup = useCallback(async (email, password) => {
    setError('')
    if (!firebaseEnabled || !auth) {
      setError(getFirebaseEnvHint() || 'Firebase is not configured.')
      return false
    }
    setBusy(true)
    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, password)
      await ensureUserWorkspace(credentials.user, { email, provider: 'password' })
      return true
    } catch (e) {
      setError(e?.message || 'Signup failed.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setError('')
    if (!auth) return true
    setBusy(true)
    try {
      if (user?.uid && db) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid))
          const userDoc = snap.exists() ? snap.data() : null
          const workspaceId = userDoc?.workspaceId || user.uid
          const { userName, userEmail } = userActivityInfo(userDoc, user)
          await logActivity({
            workspaceId,
            userId: user.uid,
            userName,
            userEmail,
            action: 'Logout',
            module: 'Auth',
            description: `${userEmail || userName} logged out.`,
            targetId: user.uid,
            targetName: userName,
            metadata: { role: userDoc?.role || 'user' },
          })
        } catch {
          // Logout should never be blocked by audit logging.
        }
      }
      await signOut(auth)
      // `onAuthStateChanged` will set `user` to null.
      return true
    } catch (e) {
      setError(e?.message || 'Logout failed.')
      return false
    } finally {
      setBusy(false)
    }
  }, [user])

  const value = useMemo(
    () => ({ user, ready, busy, error, setError, login, signup, logout }),
    [user, ready, busy, error, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
