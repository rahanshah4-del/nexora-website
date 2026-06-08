import { deleteDoc, doc, getDoc, getDocFromServer, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { EMAIL_WORKER_URL, sendWorkerEmail } from './transactionalEmail.js'

const OTP_TTL_MINUTES = 10
const technicalLogPrefix = '[Nexora email verification]'

function logFullOtpError(error) {
  console.error('[OTP email full error]', {
    message: error?.message,
    code: error?.code,
    name: error?.name,
    stack: error?.stack,
    response: error?.response,
    raw: JSON.stringify(error, Object.getOwnPropertyNames(error)),
  })
}

function logVerifyOperationFailure(operation, error, path, payload = null) {
  console.error('[OTP verify] operation failed', {
    operation,
    path,
    code: error?.code || null,
    message: error?.message || String(error || ''),
    payload,
  })
}

function isPermissionDenied(error) {
  return error?.code === 'permission-denied' || /permission/i.test(String(error?.message || ''))
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function otpPayload({ uid, email, otp }) {
  return `${uid}:${String(email || '').toLowerCase()}:${otp}`
}

function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)
}

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function withTimeout(promise, ms, label) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      const error = new Error(`Timed out loading ${label}`)
      error.code = 'server-read-timeout'
      reject(error)
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) globalThis.clearTimeout(timeoutId)
  })
}

export function getEmailVerificationServiceError() {
  if (!db) return 'Verification email sent. Please check inbox/spam.'
  return null
}

export async function sendCustomVerificationEmail(user, options = {}) {
  const to = clean(user?.email)
  const uid = clean(user?.uid)
  console.log('[Auth Flow] otp send start', { uid, email: to })
  console.log('[OTP email] currentUser', { uid, email: to })
  if (!uid || !to) return { ok: false, error: 'Email address is missing.' }
  if (!db) return sendVerificationNoticeOnly(user, options)

  const otp = randomOtp()
  const expiresAt = otpExpiryDate()
  const verificationUrl = `https://nexorasolution.online/verify-email?uid=${encodeURIComponent(uid)}`

  try {
    const userRef = doc(db, 'users', uid)
    const otpRef = doc(db, 'users', uid, 'verification', 'otp')
    const otpDocPath = `users/${uid}/verification/otp`
    console.log('[OTP email] Firestore OTP doc path', otpDocPath)
    try {
      console.log('[OTP email] OTP save start', { path: otpDocPath })
      const existingSnap = await getDoc(userRef)
      if (existingSnap.exists() && existingSnap.data()?.emailVerifiedCustom === true) {
        return { ok: true, provider: 'already_verified', otp: false, message: 'Email is already verified.' }
      }
      await setDoc(
        otpRef,
        {
          otpHash: await sha256(otpPayload({ uid, email: to, otp })),
          otpExpiresAt: Timestamp.fromDate(expiresAt),
          otpSentAt: serverTimestamp(),
          otpEmail: to.toLowerCase(),
          attempts: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      console.log('[OTP email] OTP save success', { path: otpDocPath, expiresAt: expiresAt.toISOString() })
    } catch (error) {
      console.error('[OTP email] OTP save fail', { path: otpDocPath })
      logFullOtpError(error)
      if (isPermissionDenied(error)) return { ok: false, error: 'Firestore permission denied while saving OTP.' }
      return { ok: false, error: error?.message || 'Could not save verification code.' }
    }

    console.log('[OTP email] endpoint', EMAIL_WORKER_URL)
    const result = await sendWorkerEmail({
      type: 'otp_verification',
      to,
      data: {
        clientName: clean(options.clientName) || clean(user.displayName) || 'there',
        email: to,
        otp,
        verificationUrl,
      },
    })
    console.log('[OTP email] Worker response status', result.status || null)
    console.log('[OTP email] Worker response body', result.response || null)

    if (!result.ok) return { ok: false, error: `Email worker failed: ${result.error || 'Could not send verification email right now.'}` }
    console.log('[Auth Flow] otp send success', { uid, email: to })
    return { ok: true, provider: 'worker', otp: true, message: 'Verification email sent. Please check inbox/spam.' }
  } catch (error) {
    console.error(technicalLogPrefix, 'OTP verification email failed.')
    logFullOtpError(error)
    return { ok: false, error: error?.message || 'Could not send verification email right now.' }
  }
}

async function sendVerificationNoticeOnly(user, options = {}) {
  const to = clean(user?.email)
  const uid = clean(user?.uid)
  console.log('[OTP email] endpoint', EMAIL_WORKER_URL)
  const result = await sendWorkerEmail({
    type: 'email_verification',
    to,
    data: {
      clientName: clean(options.clientName) || clean(user?.displayName) || 'there',
      email: to,
      verificationUrl: `https://nexorasolution.online/verify-email?uid=${encodeURIComponent(uid)}`,
    },
  })
  console.log('[OTP email] Worker response status', result.status || null)
  console.log('[OTP email] Worker response body', result.response || null)
  if (!result.ok) return { ok: false, error: `Email worker failed: ${result.error || 'Could not send verification email right now.'}` }
  return { ok: true, provider: 'worker', message: 'Verification email sent. Please check inbox/spam.' }
}

export async function verifyCustomEmailOtp(user, otp) {
  const uid = clean(user?.uid)
  const email = clean(user?.email)
  const code = clean(otp)
  if (!db) return { ok: false, error: 'Verification is temporarily unavailable. Please try again.' }
  if (!uid || !email) return { ok: false, error: 'Please sign in again before verifying.' }
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6 digit verification code.' }

  try {
    const userRef = doc(db, 'users', uid)
    const otpRef = doc(db, 'users', uid, 'verification', 'otp')
    const userDocPath = `users/${uid}`
    const otpDocPath = `users/${uid}/verification/otp`
    const parentSnap = await getDoc(userRef)
    if (!parentSnap.exists()) {
      throw new Error('User profile missing. Please sign up again.')
    }
    console.log('[Verify] parent profile exists')
    console.log('[OTP verify] read otp start', { path: otpDocPath })
    let snap
    try {
      snap = await getDoc(otpRef)
      console.log('[OTP verify] read otp success', { path: otpDocPath, exists: snap.exists() })
    } catch (error) {
      logVerifyOperationFailure('read_otp', error, otpDocPath)
      throw error
    }

    const data = snap.exists() ? snap.data() : null
    const expiresAt = toDate(data?.otpExpiresAt)
    if (!data?.otpHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'Verification code expired. Please send a new code.' }
    }

    const nextHash = await sha256(otpPayload({ uid, email, otp: code }))
    if (nextHash !== data.otpHash) {
      return { ok: false, error: 'Invalid verification code.' }
    }

    const parentPayload = {
      emailVerifiedCustom: true,
      emailVerifiedCustomAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    console.log('[OTP verify] update parent start', { path: userDocPath, payloadFields: Object.keys(parentPayload) })
    try {
      await setDoc(userRef, parentPayload, { merge: true })
      console.log('[Verify] verification flags updated')
    } catch (error) {
      logVerifyOperationFailure('update_parent', error, userDocPath, Object.keys(parentPayload))
      throw error
    }

    console.log('[OTP verify] delete otp start', { path: otpDocPath })
    try {
      await deleteDoc(otpRef)
      console.log('[OTP verify] delete otp success', { path: otpDocPath })
    } catch (error) {
      logVerifyOperationFailure('delete_otp', error, otpDocPath)
    }

    return { ok: true }
  } catch (error) {
    console.error(technicalLogPrefix, 'OTP verification failed.')
    logFullOtpError(error)
    return { ok: false, error: error?.message || 'Could not verify code right now.' }
  }
}

export async function getCustomEmailVerificationStatus(user) {
  if (!db || !user?.uid) return false
  const ref = doc(db, 'users', user.uid)
  try {
    const snap = await withTimeout(getDocFromServer(ref), 6000, `users/${user.uid}`)
    console.log('[VerifyEmail] server verification status', {
      uid: user.uid,
      exists: snap.exists(),
      emailVerifiedCustom: snap.exists() && snap.data()?.emailVerifiedCustom === true,
    })
    return snap.exists() && snap.data()?.emailVerifiedCustom === true
  } catch (error) {
    console.warn('[VerifyEmail] server verification status fallback', {
      uid: user.uid,
      code: error?.code || '',
      message: error?.message || String(error || ''),
    })
    // The cache fallback MUST stay bounded. An unbounded getDoc here hangs
    // forever when the device is offline with no cached user doc, which strands
    // the login spinner ("Signing In..." never completes). Time-box it and
    // default to "not verified" — RequireAuth owns the not-verified bounce.
    try {
      const snap = await withTimeout(getDoc(ref), 4000, `users/${user.uid} cache`)
      return snap.exists() && snap.data()?.emailVerifiedCustom === true
    } catch (fallbackError) {
      console.warn('[VerifyEmail] verification status unavailable', {
        uid: user.uid,
        code: fallbackError?.code || '',
        message: fallbackError?.message || String(fallbackError || ''),
      })
      return false
    }
  }
}
