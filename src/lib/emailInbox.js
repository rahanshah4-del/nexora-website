import { auth } from './firebase.js'
import { EMAIL_WORKER_URL } from './transactionalEmail.js'

const INBOX_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/inbox')
const ACTIVITY_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/email-activity')

async function inboxRequest(path = '', options = {}) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) throw new Error('Please sign in as an admin.')

  const response = await fetch(`${INBOX_WORKER_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success !== true) {
    throw new Error(data?.error || `Inbox request failed (${response.status}).`)
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

export async function replyToReceivedEmail(id, { text, cc = '', bcc = '' }) {
  if (!id) throw new Error('Email ID is required.')
  return inboxRequest(`/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text, cc, bcc }),
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
