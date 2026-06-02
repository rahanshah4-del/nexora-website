import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
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

export function getEmailVerificationServiceError() {
  if (!db) return 'Verification email sent. Please check inbox/spam.'
  return null
}

export async function sendCustomVerificationEmail(user, options = {}) {
  const to = clean(user?.email)
  const uid = clean(user?.uid)
  console.log('[OTP email] currentUser', { uid, email: to })
  if (!uid || !to) return { ok: false, error: 'Email address is missing.' }
  if (!db) return sendVerificationNoticeOnly(user, options)

  const otp = randomOtp()
  const expiresAt = otpExpiryDate()
  const verificationUrl = `https://nexorasolution.online/verify-email?uid=${encodeURIComponent(uid)}`

  try {
    const userRef = doc(db, 'users', uid)
    const userDocPath = `users/${uid}`
    console.log('[OTP email] Firestore user doc path', userDocPath)
    let alreadyCustomVerified = false
    try {
      console.log('[OTP email] OTP save start', { path: userDocPath })
      const existingSnap = await getDoc(userRef)
      alreadyCustomVerified = existingSnap.exists() && existingSnap.data()?.emailVerifiedCustom === true
      await setDoc(
        userRef,
        {
          uid,
          email: to.toLowerCase(),
          emailVerifiedCustom: alreadyCustomVerified,
          emailVerificationOtpHash: await sha256(otpPayload({ uid, email: to, otp })),
          emailVerificationOtpExpiresAt: Timestamp.fromDate(expiresAt),
          emailVerificationOtpSentAt: serverTimestamp(),
          emailVerificationOtpEmail: to.toLowerCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      console.log('[OTP email] OTP save success', { path: userDocPath, expiresAt: expiresAt.toISOString() })
    } catch (error) {
      console.error('[OTP email] OTP save fail', { path: userDocPath })
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
    const snap = await getDoc(userRef)
    const data = snap.exists() ? snap.data() : null
    const expiresAt = toDate(data?.emailVerificationOtpExpiresAt)
    if (!data?.emailVerificationOtpHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'Verification code expired. Please send a new code.' }
    }

    const nextHash = await sha256(otpPayload({ uid, email, otp: code }))
    if (nextHash !== data.emailVerificationOtpHash) {
      return { ok: false, error: 'Invalid verification code.' }
    }

    await updateDoc(userRef, {
      emailVerifiedCustom: true,
      emailVerified: true,
      emailVerifiedCustomAt: serverTimestamp(),
      emailVerificationOtpHash: null,
      emailVerificationOtpExpiresAt: null,
      emailVerificationOtpEmail: null,
      updatedAt: serverTimestamp(),
    })

    return { ok: true }
  } catch (error) {
    console.error(technicalLogPrefix, 'OTP verification failed.')
    logFullOtpError(error)
    return { ok: false, error: error?.message || 'Could not verify code right now.' }
  }
}

export async function getCustomEmailVerificationStatus(user) {
  if (!db || !user?.uid) return false
  const snap = await getDoc(doc(db, 'users', user.uid))
  return snap.exists() && snap.data()?.emailVerifiedCustom === true
}
