/** Alert email through Cloudflare Email Routing's send_email binding. */

/** Text that came from the outside world (browser reports) must not carry clickable links into the owner's inbox. */
export function defang(value) {
  return String(value ?? '').replace(/\b(?:https?|ftp):\/\/\S+/gi, '[link removed]').replace(/\bwww\.\S+/gi, '[link removed]')
}
function header(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim()
}

function encodeSubject(subject) {
  const clean = header(subject)
  if (/^[\x20-\x7e]*$/.test(clean)) return clean
  const bytes = new TextEncoder().encode(clean)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return `=?UTF-8?B?${btoa(bin)}?=`
}

export function buildMime({ from, to, subject, text, messageId, date = new Date() }) {
  const body = String(text).replace(/\r\n|\r|\n/g, '\r\n')
  return [
    `From: Nexora Sentinel <${header(from)}>`,
    `To: ${header(to)}`,
    `Subject: ${encodeSubject(subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${messageId}@nexorasolution.us>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
    '',
  ].join('\r\n')
}

/** Returns { ok, error? }. `sender` is injectable for tests. */
export async function sendAlert(env, subject, text, sender) {
  try {
    const from = env.ALERT_FROM || 'alerts@nexorasolution.us'
    const to = env.ALERT_TO || 'rahanshah4@gmail.com'
    const raw = buildMime({ from, to, subject, text, messageId: crypto.randomUUID() })
    if (sender) { await sender({ from, to, raw }); return { ok: true } }
    if (!env.ALERT_MAIL) return { ok: false, error: 'send_email binding ALERT_MAIL is missing' }
    const { EmailMessage } = await import('cloudflare:email')
    await env.ALERT_MAIL.send(new EmailMessage(from, to, raw))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error?.message || error).slice(0, 200) }
  }
}

const when = (t) => new Date(t).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

export function composeIncidentMail(event, fixes = [], panelUrl = 'https://nexorasolution.us/admin') {
  const i = event.incident
  if (event.type === 'resolved') {
    return {
      subject: `✅ Nexora recovered: ${i.label}`,
      text: `${i.label} is working again.\n\nWent down: ${when(i.openedAt)}\nBack up: ${when(i.resolvedAt)}\nLast error: ${i.lastError}\n${i.fixes?.length ? `\nAuto-fix tried:\n${i.fixes.map((f) => `- ${f}`).join('\n')}\n` : ''}\nNo action needed.`,
    }
  }
  const tried = fixes.length ? fixes.map((f) => `- ${f}`).join('\n') : '- No automatic fix is available for this one.'
  const head = event.type === 'reminder' ? 'STILL DOWN' : 'PROBLEM'
  return {
    subject: `🚨 Nexora ${head}: ${i.label}`,
    text: `Rahan, Nexora system mein problem aa rahi hai.\n\nWhat: ${i.label} (${i.group})\nSince: ${when(i.openedAt)}\nError: ${i.lastError}\n\nAuto-fix tried:\n${tried}\n\nThe system could not fix this by itself, so it needs your look.\nControl Centre > System Health: ${panelUrl}\n\nYou will get another email when it recovers (and a reminder every 6 hours if it stays down).`,
  }
}
