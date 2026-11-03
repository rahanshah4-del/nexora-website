/**
 * Instant phone/desktop alert for mail that matters. A Worker cannot talk to Firebase Cloud Messaging directly,
 * so it calls the Firebase function pushInboxAlert (functions/pushService.js), which sends the push to the admin's
 * registered devices (the same ones used for payment and lead alerts).
 *
 * Only urgent mail, and new mail for high-priority addresses (billing@, sales@), raises an alert; everything
 * else just appears in the Inbox. Off (does nothing) until both INBOX_ALERT_URL and INBOX_ALERT_SECRET are set.
 */
const clip = (value, max) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function shouldAlert(ticket) {
  if (!ticket) return false
  if (ticket.priority === 'urgent') return true
  return ticket.priority === 'high' && (ticket.isNew || ticket.reopened)
}

export function alertPayload(ticket) {
  const from = String(ticket.from || '').replace(/<[^>]*>/g, '').trim() || 'Someone'
  const urgent = ticket.priority === 'urgent'
  return {
    title: `${urgent ? 'Urgent email' : 'New email'}: ${clip(from, 40)}`,
    body: clip(`${ticket.subject || '(No subject)'}`, 110),
    ticketId: ticket.ticketId,
    priority: ticket.priority,
    address: String(ticket.to || '').toLowerCase(),
  }
}

/** Never throws. Returns { sent, reason }. */
export async function alertAdmin(env, ticket, { fetchFn = fetch } = {}) {
  try {
    const url = String(env?.INBOX_ALERT_URL || '').trim()
    const secret = String(env?.INBOX_ALERT_SECRET || '').trim()
    if (!url || !secret) return { sent: false, reason: 'not-configured' }
    if (!shouldAlert(ticket)) return { sent: false, reason: 'not-urgent' }
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nexora-secret': secret },
      body: JSON.stringify(alertPayload(ticket)),
    })
    return response.ok ? { sent: true, reason: 'sent' } : { sent: false, reason: `HTTP ${response.status}` }
  } catch (error) {
    console.warn('inbox alert failed', String(error?.message || error).slice(0, 160))
    return { sent: false, reason: 'error' }
  }
}
