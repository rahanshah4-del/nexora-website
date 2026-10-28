// "New sign-in" email. Each browser gets a random id stored locally; the ids a user has signed in
// from are kept in users/{uid}/knownDevices (owner-only by the Firestore rules). The first device of
// an account never triggers an email (that is the sign-up itself), and neither does the first
// sign-in after this feature shipped, so existing users are not flooded.

const DEVICE_KEY = 'nexora-device-id'
const SESSION_KEY = 'nexora-device-checked'

export function describeDevice(userAgent = '') {
  const ua = String(userAgent)
  let os = 'Unknown device'
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone or iPad'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac'
  else if (/CrOS/i.test(ua)) os = 'Chromebook'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge'
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Chrome\/|CriOS\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  return { device: os, browser }
}

function safeStorage(kind) {
  try { return globalThis[kind] || null } catch { return null }
}

function deviceId(local) {
  try {
    const existing = local?.getItem(DEVICE_KEY)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() || `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    local?.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return ''
  }
}

/**
 * @param {{uid: string, email?: string, displayName?: string}} user
 * @param {{ref: Function, listKnown: Function, getKnown: Function, setKnown: Function, sendEmail: Function, now?: Date, userAgent?: string, local?: Storage|null, session?: Storage|null}} deps
 */
export async function checkNewDeviceSignIn(user, deps) {
  const uid = String(user?.uid || '')
  const email = String(user?.email || '').trim().toLowerCase()
  if (!uid || !email) return { checked: false }
  const local = deps.local === undefined ? safeStorage('localStorage') : deps.local
  const session = deps.session === undefined ? safeStorage('sessionStorage') : deps.session
  try {
    if (session?.getItem(`${SESSION_KEY}:${uid}`)) return { checked: false, reason: 'already_checked' }
    session?.setItem(`${SESSION_KEY}:${uid}`, '1')
  } catch { /* storage blocked: continue, the Firestore record still prevents repeats */ }

  const id = deviceId(local)
  if (!id) return { checked: false, reason: 'no_device_id' }
  const known = await deps.getKnown(uid, id)
  const info = describeDevice(deps.userAgent ?? globalThis.navigator?.userAgent ?? '')
  const now = deps.now || new Date()
  if (known) {
    await deps.setKnown(uid, id, { lastSeenAt: now.toISOString() }, true)
    return { checked: true, isNew: false }
  }
  const others = await deps.listKnown(uid)
  await deps.setKnown(uid, id, { ...info, firstSeenAt: now.toISOString(), lastSeenAt: now.toISOString() }, false)
  if (!others.length) return { checked: true, isNew: true, emailed: false }
  const when = now.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' }) + ' (PKT)'
  const result = await deps.sendEmail({
    to: email,
    type: 'new_device_login',
    data: { clientName: String(user.displayName || '').split(/\s+/)[0] || 'there', ...info, when },
  })
  return { checked: true, isNew: true, emailed: Boolean(result?.ok) }
}

/** Real Firebase wiring. Loaded lazily from the auth listener so it never blocks sign-in. */
export async function runNewDeviceCheck(user) {
  const [{ db }, fs, { sendWorkerEmail }] = await Promise.all([
    import('./firebase.js'),
    import('firebase/firestore'),
    import('./transactionalEmail.js'),
  ])
  if (!db) return { checked: false }
  const col = (uid) => fs.collection(db, 'users', uid, 'knownDevices')
  return checkNewDeviceSignIn(user, {
    getKnown: async (uid, id) => (await fs.getDoc(fs.doc(col(uid), id))).exists(),
    listKnown: async (uid) => (await fs.getDocs(fs.query(col(uid), fs.limit(1)))).docs,
    setKnown: (uid, id, data, merge) => fs.setDoc(fs.doc(col(uid), id), data, { merge }),
    sendEmail: sendWorkerEmail,
  })
}
