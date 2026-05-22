import { createContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, firebaseEnabled, getFirebaseEnvHint } from '../lib/firebase.js'

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

  async function login(email, password) {
    setError('')
    if (!firebaseEnabled || !auth) {
      setError(getFirebaseEnvHint() || 'Firebase is not configured.')
      return false
    }
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(e?.message || 'Login failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function signup(email, password) {
    setError('')
    if (!firebaseEnabled || !auth) {
      setError(getFirebaseEnvHint() || 'Firebase is not configured.')
      return false
    }
    setBusy(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(e?.message || 'Signup failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setError('')
    if (!auth) return true
    setBusy(true)
    try {
      await signOut(auth)
      // `onAuthStateChanged` will set `user` to null.
      return true
    } catch (e) {
      setError(e?.message || 'Logout failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const value = useMemo(
    () => ({ user, ready, busy, error, setError, login, signup, logout }),
    [user, ready, busy, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
