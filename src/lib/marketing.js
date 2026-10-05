// Email Marketing — backend integration layer (admin/owner only).
//
// Sending happens inside the secure Firebase callable function. API keys stay
// server-side; the frontend only manages admin-gated subscribers and triggers
// the function with campaign content/audience filters.

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db } from './firebase.js'
import { sendWorkerEmail } from './transactionalEmail.js'
import { MODULE_OPTIONS } from './marketingModules.js'
// Same audience rule as the sendMarketingCampaign Cloud Function (pure module).
import {
  AUDIENCE_SOURCES,
  CLIENT_DATA_EXCLUDED_NOTE,
  countAudienceBySource,
  filterAudience,
  mergeAudienceContacts,
} from '../../functions/marketingAudience.js'

const functions = app ? getFunctions(app, 'us-central1') : null
const sendMarketingCampaignCallable = functions ? httpsCallable(functions, 'sendMarketingCampaign') : null

export const SUBSCRIBERS_COLLECTION = 'marketingSubscribers'
export const CAMPAIGNS_COLLECTION = 'marketingCampaigns'
export const EMAIL_LOGS_COLLECTION = 'marketingEmailLogs'

export { AUDIENCE_SOURCES, CLIENT_DATA_EXCLUDED_NOTE, MODULE_OPTIONS }

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All contacts' },
  { value: 'lead', label: 'Leads' },
  { value: 'website', label: 'Website signups' },
  { value: 'trial', label: 'Trial users' },
  { value: 'client', label: 'Clients' },
  { value: 'crm', label: 'CRM clients' },
  { value: 'manual', label: 'Manually added' },
]

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function safeDocs(collectionName, max = 1000) {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, collectionName), fsLimit(max)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

// ---- Subscribers ---------------------------------------------------------

export async function listSubscribers({ module = 'all', max = 1000 } = {}) {
  if (!db) return []
  const base = collection(db, SUBSCRIBERS_COLLECTION)
  const constraints = [orderBy('createdAt', 'desc'), fsLimit(max)]
  if (module && module !== 'all') constraints.unshift(where('moduleInterest', '==', module))
  try {
    const snap = await getDocs(query(base, ...constraints))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    // Fallback without the composite filter/order (e.g. missing index).
    const snap = await getDocs(query(base, fsLimit(max)))
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((row) => module === 'all' || row.moduleInterest === module)
  }
}

// Nexora's own audience only: marketingSubscribers, users, workspace owner
// emails and upgradeRequests. Client customers/leads are never read.
// Unsubscribed contacts are returned (status 'unsubscribed') so the admin can
// see them; filterRecipients() never returns them.
export async function listMarketingContacts({ module = 'all', max = 1000 } = {}) {
  if (!db) return []
  const [subscribers, users, workspaceOwners, upgradeRequests] = await Promise.all([
    listSubscribers({ module: 'all', max }),
    safeDocs('users', max),
    safeDocs('workspaces', max),
    safeDocs('upgradeRequests', max),
  ])

  const contacts = mergeAudienceContacts({ subscribers, users, workspaceOwners, upgradeRequests })
    .filter((contact) => module === 'all' || contact.moduleInterest === module)

  return contacts.sort((a, b) => clean(b.createdAt?.seconds || b.createdAt || '').localeCompare(clean(a.createdAt?.seconds || a.createdAt || '')))
}

export async function addSubscriber({ email, name, phone, source = 'manual', moduleInterest = 'crm' }) {
  if (!db) return { ok: false, error: 'Cloud sync unavailable.' }
  const cleanedEmail = clean(email).toLowerCase()
  if (!cleanedEmail) return { ok: false, error: 'Email is required.' }
  try {
    await addDoc(collection(db, SUBSCRIBERS_COLLECTION), {
      email: cleanedEmail,
      name: clean(name),
      phone: clean(phone),
      source,
      moduleInterest,
      status: 'subscribed',
      createdAt: serverTimestamp(),
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not add subscriber.' }
  }
}

export async function setSubscriberStatus(id, status) {
  if (!db || !id) return { ok: false, error: 'Invalid subscriber.' }
  try {
    await updateDoc(doc(db, SUBSCRIBERS_COLLECTION, id), { status, updatedAt: serverTimestamp() })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not update subscriber.' }
  }
}

export function filterRecipients(contacts, { audienceType = 'all', module = 'all' } = {}) {
  return filterAudience(contacts, { audienceType, module })
    .map((contact) => ({ email: contact.email, name: clean(contact.name), status: 'subscribed' }))
}

/** Recipient count per allowed source for the campaign preview. */
export function recipientCountsBySource(contacts, { audienceType = 'all', module = 'all' } = {}) {
  return countAudienceBySource(filterAudience(contacts, { audienceType, module }))
}

// ---- Campaigns + logs ----------------------------------------------------

export async function createCampaign(payload) {
  if (!db) return { ok: false, error: 'Cloud sync unavailable.' }
  try {
    const ref = await addDoc(collection(db, CAMPAIGNS_COLLECTION), {
      title: clean(payload.title) || clean(payload.subject) || 'Untitled campaign',
      subject: clean(payload.subject),
      bodyHtml: payload.bodyHtml || '',
      bodyText: payload.bodyText || '',
      audienceType: payload.audienceType || 'all',
      moduleInterest: payload.module || 'all',
      totalRecipients: Number(payload.totalRecipients) || 0,
      sentCount: 0,
      failedCount: 0,
      status: 'draft',
      createdAt: serverTimestamp(),
      sentAt: null,
    })
    return { ok: true, id: ref.id }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not create campaign.' }
  }
}

export async function listCampaigns({ max = 50 } = {}) {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, CAMPAIGNS_COLLECTION), orderBy('createdAt', 'desc'), fsLimit(max)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    const snap = await getDocs(query(collection(db, CAMPAIGNS_COLLECTION), fsLimit(max)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
}

async function callSendMarketingCampaign(payload) {
  if (!sendMarketingCampaignCallable) return { ok: false, error: 'Firebase Functions unavailable.' }
  try {
    const result = await sendMarketingCampaignCallable(payload)
    return { ok: true, ...(result.data || {}) }
  } catch (error) {
    const detailsMessage = typeof error?.details === 'string' ? error.details : error?.details?.message
    const message = detailsMessage || error?.message || error?.code || 'Marketing email send failed.'
    return { ok: false, error: message.replace(/^FirebaseError:\s*/i, '') }
  }
}

function shouldUseWorkerFallback(error = '') {
  return /internal|not-found|unavailable|functions unavailable|email provider missing/i.test(error)
}

// Send a test email to a single address (no campaign/logs).
export async function sendTestEmail({ subject, bodyHtml, bodyText, testEmail }) {
  const functionResult = await callSendMarketingCampaign({
    title: 'Test email',
    subject,
    bodyHtml,
    bodyText,
    audienceType: 'all',
    selectedModule: 'all',
    testEmail,
  })

  if (functionResult.ok) return functionResult

  if (!shouldUseWorkerFallback(functionResult.error)) return functionResult

  const workerResult = await sendWorkerEmail({ to: testEmail, subject, html: bodyHtml })
  if (workerResult.ok) {
    return {
      ok: true,
      success: true,
      test: true,
      sentCount: 1,
      failedCount: 0,
      provider: 'worker-fallback',
    }
  }

  return {
    ok: false,
    error: `Firebase Function failed: ${functionResult.error}. Worker fallback failed: ${workerResult.error}`,
  }
}

// Queue a full campaign. The callable resolves the audience and queues one email per
// recipient; processEmailQueue then sends them within the daily limit and the Resend
// webhook records delivered / opened / clicked. There is deliberately NO fallback to
// the email worker here: it would send everything at once and ignore the daily limit.
export async function sendCampaign(payload) {
  return callSendMarketingCampaign({
    title: payload.title,
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    bodyText: payload.bodyText,
    audienceType: payload.audienceType || 'all',
    selectedModule: payload.module || payload.selectedModule || 'all',
  })
}

function callable(name, payload = {}) {
  if (!functions) return Promise.resolve({ ok: false, error: 'Firebase Functions unavailable.' })
  return httpsCallable(functions, name)(payload)
    .then((result) => ({ ok: true, ...(result.data || {}) }))
    .catch((error) => ({ ok: false, error: String(error?.message || error?.code || 'Request failed').replace(/^FirebaseError:\s*/i, '') }))
}

export const getEmailStatus = () => callable('getMarketingEmailStatus')
export const saveEmailSettings = (settings) => callable('setMarketingEmailSettings', settings)
export const cancelCampaign = (campaignId) => callable('cancelMarketingCampaign', { campaignId })

/** Per-recipient delivery report for one campaign (delivered / opened / clicked / bounced). */
export async function listCampaignLogs(campaignId, { max = 500 } = {}) {
  if (!db || !campaignId) return []
  const snap = await getDocs(query(collection(db, EMAIL_LOGS_COLLECTION), where('campaignId', '==', campaignId), fsLimit(max)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
