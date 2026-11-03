import { auth } from './firebase.js'
import { EMAIL_WORKER_URL } from './transactionalEmail.js'

const INBOX_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/inbox')
const ACTIVITY_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/email-activity')
const USAGE_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/email-usage')

async function inboxRequest(path = '', options = {}) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')

  let response
  try {
    response = await fetch(`${INBOX_WORKER_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    })
  } catch (networkError) {
    throw Object.assign(new Error(networkError?.message || 'Network request failed'), { network: true })
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success !== true) {
    throw Object.assign(new Error(data?.error || `Inbox request failed (${response.status}).`), { status: response.status })
  }
  return data
}

export async function listReceivedEmails() {
  const data = await inboxRequest()
  return { emails: data.emails || [], counts: data.counts || {}, hasMore: Boolean(data.hasMore) }
}

export async function getReceivedEmail(id) {
  if (!id) throw new Error('Email ID is required.')
  const data = await inboxRequest(`/${encodeURIComponent(id)}`)
  return data.email
}

export async function updateReceivedEmailState(id, patch) {
  if (!id) throw new Error('Email ID is required.')
  const data = await inboxRequest(`/${encodeURIComponent(id)}/state`, {
    method: 'POST',
    body: JSON.stringify(patch),
  })
  return data.state
}

export async function replyToReceivedEmail(id, { text, cc = '', bcc = '', attachments = [], from = '' }) {
  if (!id) throw new Error('Email ID is required.')
  return inboxRequest(`/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text, cc, bcc, ...(from ? { from } : {}), ...(attachments.length ? { attachments } : {}) }),
  })
}

export async function listEmailActivity() {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')
  const response = await fetch(ACTIVITY_WORKER_URL, { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success !== true) throw new Error(data?.error || `Activity request failed (${response.status}).`)
  return { emails: data.emails || [], summary: data.summary || {}, hasMore: Boolean(data.hasMore) }
}

/** How many emails each sending service has sent today and this month, and its limits. */
export async function getEmailUsage() {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')
  const response = await fetch(USAGE_WORKER_URL, { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success !== true) throw new Error(data?.error || `Usage request failed (${response.status}).`)
  return { providers: data.providers || [], day: data.day || '', month: data.month || '', note: data.note || '' }
}

/** Change a ticket (status, priority, assignee, internal note). Returns the updated ticket. */
export async function updateTicket(ticketId, patch) {
  if (!ticketId) throw new Error('Ticket ID is required.')
  const data = await inboxRequest(`/ticket/${encodeURIComponent(ticketId)}`, {
    method: 'POST',
    body: JSON.stringify(patch),
  })
  return data.ticket
}

/** Tiny "did anything change?" check, polled every few seconds so the Inbox stays live. */
export async function getInboxPulse() {
  const data = await inboxRequest('/pulse')
  return { version: String(data.version || ''), total: Number(data.total) || 0 }
}

/** One action on many emails: read | unread | archive | inbox | trash | star | unstar (max 50). */
export async function bulkUpdateEmails(ids, action) {
  const data = await inboxRequest('/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) })
  return data.updated || 0
}

/** Write a new email from support@ (not a reply). */
export async function composeEmail({ to, subject, text, cc = '', bcc = '', attachments = [], from = '' }) {
  return inboxRequest('/compose', { method: 'POST', body: JSON.stringify({ to, subject, text, cc, bcc, ...(from ? { from } : {}), ...(attachments.length ? { attachments } : {}) }) })
}

/** Download an attachment that the Inbox itself stored (the endpoint needs the admin sign-in, so it is fetched, then saved). */
export async function downloadInboxAttachment(emailId, index, filename = 'attachment') {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')
  const response = await fetch(`${INBOX_WORKER_URL}/${encodeURIComponent(emailId)}/attachment/${encodeURIComponent(index)}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || `Download failed (${response.status}).`)
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/** The raw bytes of a stored attachment as a Blob (for the in-browser preview). */
export async function fetchInboxAttachmentBlob(emailId, index) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')
  let response
  try {
    response = await fetch(`${INBOX_WORKER_URL}/${encodeURIComponent(emailId)}/attachment/${encodeURIComponent(index)}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch (networkError) {
    throw Object.assign(new Error(networkError?.message || 'Network request failed'), { network: true })
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw Object.assign(new Error(data?.error || `Preview failed (${response.status}).`), { status: response.status })
  }
  return response.blob()
}
