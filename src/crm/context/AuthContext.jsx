import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, getFirebaseEnvHint } from '../lib/firebase.js'
import { db } from '../lib/firebase.js'
import { createSignupUserProfile, ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { sendCustomVerificationEmail } from '../../lib/emailVerificationService.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'

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
    if (!auth) {
      setError(getFirebaseEnvHint() || 'Secure Cloud Sync is not available right now.')
      return false
    }
    setBusy(true)
    try {
      const credentials = await signInWithEmailAndPassword(auth, email, password)
      ensureUserWorkspace(credentials.user, { email, provider: 'password' })
        .then((workspaceResult) => {
          console.log('[Auth Flow] workspace ensure success', {
            source: 'crm-login',
            uid: credentials.user?.uid || '',
            workspaceId: workspaceResult?.workspaceId || '',
          })
        })
        .catch((workspaceError) => {
          console.warn('[Auth Flow] workspace ensure failed', {
            source: 'crm-login',
            code: workspaceError?.code || '',
            message: workspaceError?.message || String(workspaceError || ''),
          })
        })
      return true
    } catch (e) {
      setError(clientSafeMessage(e, 'Login failed. Please check your email and password.'))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const signup = useCallback(async (email, password, options = {}) => {
    setError('')
    if (!auth) {
      setError(getFirebaseEnvHint() || 'Secure Cloud Sync is not available right now.')
      return false
    }
    const fullName = String(options.fullName || '').trim()
    if (!fullName) {
      setError('Enter your full name before you continue.')
      return false
    }
    setBusy(true)
    try {
      console.log('[Auth Flow] signup start', { email })
      const credentials = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credentials.user, { displayName: fullName }).catch((profileError) => {
        console.warn('[User Profile] displayName update failed', { code: profileError?.code || '', message: profileError?.message || '' })
      })
      console.log('[User Profile] fullName', fullName)
      console.log('[User Profile] displayName', fullName)
      console.log('[User Profile] profile source', 'signup.fullName')
      try {
        await createSignupUserProfile(credentials.user, { fullName, email, provider: 'password' })
        console.log('[Auth Flow] profile created', { uid: credentials.user.uid, email })
      } catch {
        setError('Account profile could not be created. Please try again.')
        return false
      }
      if (!credentials.user.emailVerified) {
        const emailResult = await sendCustomVerificationEmail(credentials.user)
        if (!emailResult.ok) {
          setError(emailResult.error || 'Could not send verification email right now.')
          return false
        }
      }
      return true
    } catch (e) {
      setError(clientSafeMessage(e, 'Signup failed. Please try again.'))
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
      setError(clientSafeMessage(e, 'Logout failed. Please try again.'))
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
