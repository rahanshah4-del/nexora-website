import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { sendWorkerEmail, welcomeEmail } from './transactionalEmail.js'

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function emailPrefix(email) {
  return clean(email).split('@')[0] || 'there'
}

function resolveWelcomeName({ user, data, options, email }) {
  const prefix = emailPrefix(email)
  const candidates = [
    clean(data?.displayName),
    clean(user?.displayName),
    clean(data?.fullName),
    clean(options?.displayName),
    clean(options?.fullName),
    clean(options?.name),
    clean(data?.name),
  ]
  return candidates.find((candidate) => candidate && candidate.toLowerCase() !== prefix.toLowerCase()) || prefix
}

// Sends the one-time welcome email. The duplicate guard (welcomeEmailSent /
// welcomeEmailQueuedAt) ensures it only ever goes out once per account, even if
// the client later switches modules. The email body is tailored to the business
// type the client selected during onboarding.
export async function queueWelcomeEmailForModule(user, options = {}) {
  const uid = clean(user?.uid)
  const to = clean(user?.email || options.email).toLowerCase()
  if (!db || !uid || !to) return { ok: false, error: 'Welcome email cannot be queued without a verified user.' }

  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const data = snap.exists() ? snap.data() : {}
  if (data?.welcomeEmailSent === true || data?.welcomeEmailQueuedAt) {
    console.log('[Welcome Email] skipped already sent', {
      uid,
      to,
      reason: data?.welcomeEmailSent === true ? 'already_sent' : 'already_queued',
    })
    return { ok: true, skipped: true, reason: 'already_queued_or_sent' }
  }

  const source = clean(options.source) || 'module_selection'
  const businessType =
    clean(options.businessType) ||
    clean(data?.businessType) ||
    clean(data?.selectedBusinessType) ||
    clean(data?.currentBusinessType)
  await setDoc(
    userRef,
    {
      welcomeEmailQueuedAt: serverTimestamp(),
      welcomeEmailQueuedSource: source,
      welcomeEmailBusinessType: businessType,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  console.log('[Welcome Email] queued', { uid, to, source, businessType })

  const template = welcomeEmail({
    name: resolveWelcomeName({ user, data, options, email: to }),
    businessType,
  })
  const result = await sendWorkerEmail({ to, ...template })
  if (result.ok === true) {
    console.log('[Welcome Email] sent', { uid, to })
  }
  await setDoc(
    userRef,
    {
      welcomeEmailSent: result.ok === true,
      welcomeEmailSentAt: result.ok === true ? serverTimestamp() : null,
      welcomeEmailLastError: result.ok === true ? '' : result.error || 'Welcome email failed.',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return result
}
