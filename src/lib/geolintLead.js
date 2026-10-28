import { clientFirestore, clientIdToken } from './geolintClient.js'
import { EMAIL_WORKER_URL } from './transactionalEmail.js'
import { hostLabel } from './geolintReport.js'

const toBase64 = (buffer) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/**
 * Emails the signed-in visitor their own report as a PDF (to their own address only, with their own token).
 * Once per report per browser tab. Best effort: never blocks the report.
 */
export async function emailGeolintReport(user, report) {
  if (!user?.email || !user.emailVerified || !report) return false
  const host = hostLabel(report.url || '')
  const guard = `geolint:report-emailed:${host}`
  try {
    if (sessionStorage.getItem(guard)) return false
    // the switch in Control Centre > Email Marketing > Automation (on unless it was turned off)
    const { db, fs } = await clientFirestore()
    const setting = await fs.getDoc(fs.doc(db, 'geolintSettings', 'reportEmail')).catch(() => null)
    if (setting?.exists() && setting.data().enabled === false) return false
    const [{ buildGeoLintPdf }, token] = await Promise.all([import('./geolintPdf.js'), clientIdToken()])
    if (!token) return false
    const doc = await buildGeoLintPdf(report)
    const content = toBase64(doc.output('arraybuffer'))
    const safeHost = host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'site'
    const response = await fetch(EMAIL_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: user.email,
        type: 'geolint_report',
        data: { clientName: String(user.name || '').split(' ')[0] || 'there', host, score: Number.isFinite(report.score?.earned) ? String(Math.round(report.score.earned * 10) / 10) : '' },
        attachments: [{ filename: `geolint-report-${safeHost}.pdf`, content }],
      }),
    })
    const ok = response.ok
    if (ok) {
      sessionStorage.setItem(guard, '1')
      // one row per email sent, for the Control Centre card (best effort)
      await fs.addDoc(fs.collection(db, 'geolintReportEmails'), {
        uid: user.uid, email: user.email.toLowerCase(), host: host.slice(0, 200),
        ...(Number.isFinite(report.score?.earned) ? { score: Math.round(report.score.earned * 10) / 10 } : {}),
        createdAt: fs.serverTimestamp(),
      }).catch(() => {})
    }
    return ok
  } catch {
    return false
  }
}

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
