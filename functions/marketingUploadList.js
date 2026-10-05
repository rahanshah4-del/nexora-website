/**
 * Recipients that come from an uploaded file (PDF / Word / text). The browser
 * pulls the email addresses out of the file; the server re-checks every one so
 * a bad or hostile list can never skip the rules: valid address, no duplicates,
 * never an unsubscribed person, and a hard size cap.
 */
export const MAX_UPLOAD_EMAILS = 2000
const EMAIL_PATTERN = /^[^\s@,;<>()[\]\\"]+@[^\s@,;<>()[\]\\"]+\.[a-z]{2,}$/i
const NEVER_EMAIL = new Set(['admin@nexora.com'])

/** @returns {{emails: string[], invalid: number, duplicates: number, optedOut: number, tooMany: boolean}} */
export function cleanUploadedEmails(raw, unsubscribed = new Set()) {
  const list = Array.isArray(raw) ? raw : []
  const seen = new Set()
  const emails = []
  let invalid = 0
  let duplicates = 0
  let optedOut = 0
  for (const item of list) {
    const email = typeof item === 'string' ? item.trim().toLowerCase() : ''
    if (!EMAIL_PATTERN.test(email) || email.length > 254 || NEVER_EMAIL.has(email)) { invalid += 1; continue }
    if (seen.has(email)) { duplicates += 1; continue }
    seen.add(email)
    if (unsubscribed.has(email)) { optedOut += 1; continue }
    emails.push(email)
  }
  const tooMany = emails.length > MAX_UPLOAD_EMAILS
  return { emails: tooMany ? emails.slice(0, MAX_UPLOAD_EMAILS) : emails, invalid, duplicates, optedOut, tooMany }
}
