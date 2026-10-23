/**
 * Daily-report support. The report itself is built by the Firebase function
 * `dailyReport` (it can read Firestore and make the PDF); the Sentinel adds its
 * own data and delivers the mail through Email Routing, which can only ever
 * reach the verified owner address (the send_email binding pins it).
 *
 * Both endpoints need the shared REPORT_KEY secret.
 */
import { buildMime } from './mail.js'

const enc = new TextEncoder()

/** Constant-time comparison of the presented key with REPORT_KEY. */
export function checkReportKey(request, env) {
  const expected = String(env.REPORT_KEY || '')
  const given = String(request.headers.get('x-report-key') || '')
  if (expected.length < 24 || given.length !== expected.length) return false
  const a = enc.encode(expected)
  const b = enc.encode(given)
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Temp-mail daily counters (UTC days), read from the temp-mail Worker's KV. */
export async function tempMailStats(kv, now = Date.now(), days = 7) {
  if (!kv) return null
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = isoDay(now - i * 86400000)
    let row
    try { row = JSON.parse((await kv.get(`stat:${date}`)) || '{}') || {} } catch { row = {} }
    out.push({ date, ...row })
  }
  return out
}

const wrap76 = (b64) => b64.replace(/(.{76})/g, '$1\r\n')

/** UTF-8 text to base64, in chunks (spreading a big array into fromCharCode can overflow). */
export function utf8ToBase64(text) {
  const bytes = enc.encode(String(text))
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(bin)
}

function header(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim()
}

/** multipart/mixed: an HTML body plus one attachment (base64). */
export function buildReportMime({ from, to, subject, html, attachment, messageId, date = new Date() }) {
  const boundary = `nx-${messageId.replace(/[^a-z0-9]/gi, '').slice(0, 24)}`
  const plain = buildMime({ from, to, subject, text: '', messageId, date })
  const head = plain.split('\r\n\r\n')[0].split('\r\n').filter((l) => !/^Content-(Type|Transfer-Encoding)/i.test(l))
  const safeName = String(attachment.filename).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80)
  return [
    ...head,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(utf8ToBase64(html)),
    `--${boundary}`,
    `Content-Type: ${header(attachment.contentType || 'application/pdf')}; name="${safeName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeName}"`,
    '',
    wrap76(String(attachment.base64).replace(/[^A-Za-z0-9+/=]/g, '')),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}
