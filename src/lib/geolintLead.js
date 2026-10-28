import { clientFirestore } from './geolintClient.js'

/**
 * Keeps one record per signed-in GeoLint visitor (geolintLeads/{uid}) so the GeoLint emails in the Control
 * Centre can reach them. Only email, name, the audited host and score, and the opt-in choice are stored.
 * Best effort: a failure here never blocks the report.
 */
export async function saveGeolintLead(user, { host = '', score = null, optIn = true } = {}) {
  if (!user?.uid || !user.email || !user.emailVerified) return false
  try {
    const { db, fs } = await clientFirestore()
    const ref = fs.doc(db, 'geolintLeads', user.uid)
    const snap = await fs.getDoc(ref)
    const details = {
      host: String(host || '').slice(0, 200),
      ...(Number.isFinite(score) ? { score: Math.round(score * 10) / 10 } : {}),
      updatedAt: fs.serverTimestamp(),
    }
    if (snap.exists()) {
      await fs.updateDoc(ref, details)
    } else {
      await fs.setDoc(ref, {
        email: user.email.toLowerCase(), name: String(user.name || '').slice(0, 120), optIn: Boolean(optIn),
        source: 'geolint_report', createdAt: fs.serverTimestamp(), ...details,
      })
    }
    return true
  } catch {
    return false
  }
}
