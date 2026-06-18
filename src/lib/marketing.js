// Email Marketing — backend integration layer (admin/owner only).
//
// Sending happens inside the secure Firebase callable function. API keys stay
// server-side; the frontend only manages admin-gated subscribers and triggers
// the function with campaign content/audience filters.

import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, auth, db } from './firebase.js'
import { EMAIL_WORKER_URL, sendWorkerEmail } from './transactionalEmail.js'

const functions = app ? getFunctions(app, 'us-central1') : null
const sendMarketingCampaignCallable = functions ? httpsCallable(functions, 'sendMarketingCampaign') : null
const MARKETING_WORKER_URL = EMAIL_WORKER_URL.replace('/send-email', '/send-marketing')

export const SUBSCRIBERS_COLLECTION = 'marketingSubscribers'
export const CAMPAIGNS_COLLECTION = 'marketingCampaigns'
export const EMAIL_LOGS_COLLECTION = 'marketingEmailLogs'

export const MODULE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'restaurant', label: 'Restaurant POS' },
  { value: 'crm', label: 'CRM' },
  { value: 'transport', label: 'Transport' },
  { value: 'school', label: 'School ERP' },
  { value: 'property', label: 'Property ERP' },
]

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

function lower(value) {
  return clean(value).toLowerCase()
}

function firstString(...values) {
  return values.map(clean).find(Boolean) || ''
}

function moduleFromValue(value) {
  const text = lower(value)
  if (text.includes('restaurant') || text.includes('pos')) return 'restaurant'
  if (text.includes('transport') || text.includes('fleet')) return 'transport'
  if (text.includes('school') || text.includes('erp')) return 'school'
  if (text.includes('property') || text.includes('real estate')) return 'property'
  if (text.includes('crm') || text.includes('sales')) return 'crm'
  return ''
}

function isTrialContact(row = {}) {
  return row.isTrialActive === true
    || ['trial', 'free_trial'].includes(lower(row.subscriptionStatus || row.planStatus || row.status))
    || Boolean(row.trialEndsAt || row.trialStartedAt || row.trialStartAt)
}

function normalizeContact(row = {}, fallback = {}) {
  const email = lower(firstString(row.email, row.userEmail, row.clientEmail, row.ownerEmail, row.contactEmail, row.customerEmail))
  if (!email) return null
  const source = lower(fallback.source || row.source || row.type || row.leadSource) || 'manual'
  const moduleInterest = moduleFromValue(
    firstString(
      fallback.moduleInterest,
      row.moduleInterest,
      row.businessType,
      row.selectedBusinessType,
      row.primaryBusinessType,
      row.currentBusinessType,
      row.module,
      row.product,
      row.planName,
    ),
  ) || 'crm'
  return {
    id: fallback.id || row.id || email,
    email,
    name: firstString(row.name, row.fullName, row.displayName, row.clientName, row.customerName, row.companyName, row.workspaceName, row.businessName),
    phone: firstString(row.phone, row.phoneNumber, row.mobile, row.whatsapp),
    source,
    moduleInterest,
    status: lower(row.status || fallback.status || 'subscribed'),
    createdAt: row.createdAt || row.createdOn || row.signupAt || null,
    origin: fallback.origin || source,
  }
}

function mergeContacts(groups) {
  const unsubscribedEmails = new Set()
  groups.flat().forEach((contact) => {
    if (contact?.email && lower(contact.status) === 'unsubscribed') unsubscribedEmails.add(contact.email)
  })
  const map = new Map()
  groups.flat().forEach((contact) => {
    if (!contact?.email || unsubscribedEmails.has(contact.email)) return
    const existing = map.get(contact.email)
    if (!existing) {
      map.set(contact.email, contact)
      return
    }
    map.set(contact.email, {
      ...existing,
      ...contact,
      name: existing.name || contact.name,
      phone: existing.phone || contact.phone,
      moduleInterest: existing.moduleInterest !== 'crm' ? existing.moduleInterest : contact.moduleInterest || existing.moduleInterest,
      source: existing.source === 'manual' ? contact.source || existing.source : existing.source,
      origin: [existing.origin, contact.origin].filter(Boolean).join(', '),
    })
  })
  return Array.from(map.values())
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

async function safeGroupDocs(groupName, max = 1000) {
  if (!db) return []
  try {
    const snap = await getDocs(query(collectionGroup(db, groupName), fsLimit(max)))
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

export async function listMarketingContacts({ module = 'all', max = 1000 } = {}) {
  if (!db) return []
  const [subscribers, users, workspaces, upgradeRequests, leads, customers] = await Promise.all([
    listSubscribers({ module: 'all', max }),
    safeDocs('users', max),
    safeDocs('workspaces', max),
    safeDocs('upgradeRequests', max),
    safeGroupDocs('leads', max),
    safeGroupDocs('customers', max),
  ])

  const contacts = mergeContacts([
    subscribers.map((row) => normalizeContact(row, { source: row.source || 'manual', origin: 'marketingSubscribers' })),
    users.map((row) => normalizeContact(row, { source: isTrialContact(row) ? 'trial' : 'client', origin: 'users' })),
    workspaces.map((row) => normalizeContact(row, { source: isTrialContact(row) ? 'trial' : 'client', origin: 'workspaces' })),
    upgradeRequests.map((row) => normalizeContact(row, { source: 'client', origin: 'upgradeRequests' })),
    leads.map((row) => normalizeContact(row, { source: 'lead', origin: 'leads' })),
    customers.map((row) => normalizeContact(row, { source: 'client', origin: 'customers' })),
  ])
    .filter(Boolean)
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

function matchesAudience(subscriber, audienceType) {
  if (!audienceType || audienceType === 'all') return true
  const source = clean(subscriber.source)
  if (audienceType === 'lead') return ['lead', 'leads', 'website'].includes(source)
  if (audienceType === 'client') return ['client', 'clients', 'crm'].includes(source)
  if (audienceType === 'trial') return ['trial', 'trial_user', 'trial users'].includes(source)
  return source === audienceType
}

export function filterRecipients(subscribers, { audienceType = 'all', module = 'all' } = {}) {
  return subscribers
    .filter((s) => clean(s.status || 'subscribed') !== 'unsubscribed')
    .filter((s) => matchesAudience(s, audienceType))
    .filter((s) => module === 'all' || clean(s.moduleInterest) === module)
    .map((s) => ({ email: clean(s.email).toLowerCase(), name: clean(s.name), status: 'subscribed' }))
    .filter((s) => s.email)
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

async function updateCampaign(id, patch) {
  if (!db || !id) return
  try {
    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, id), patch)
  } catch {
    /* non-fatal */
  }
}

async function writeEmailLogs(campaignId, results) {
  if (!db || !campaignId || !results?.length) return
  for (let i = 0; i < results.length; i += 450) {
    const batch = writeBatch(db)
    results.slice(i, i + 450).forEach((result) => {
      const ref = doc(collection(db, EMAIL_LOGS_COLLECTION))
      batch.set(ref, {
        campaignId,
        email: result.email,
        status: result.status,
        error: result.error || '',
        sentAt: serverTimestamp(),
      })
    })
    // eslint-disable-next-line no-await-in-loop
    await batch.commit().catch(() => {})
  }
}

async function callMarketingWorker(payload) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  if (!token) return { ok: false, error: 'Please sign in as an admin.' }
  try {
    const response = await fetch(MARKETING_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success !== true) {
      return { ok: false, error: data?.error || `Worker send failed (${response.status}).` }
    }
    return { ok: true, ...data }
  } catch (error) {
    return { ok: false, error: error?.message || 'Marketing worker is unreachable.' }
  }
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

// Send a full campaign. The callable function resolves recipients, sends in
// batches, writes campaign history, and stores per-email logs server-side.
export async function sendCampaign(payload) {
  const functionPayload = {
    title: payload.title,
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    bodyText: payload.bodyText,
    audienceType: payload.audienceType || 'all',
    selectedModule: payload.module || payload.selectedModule || 'all',
  }
  const functionResult = await callSendMarketingCampaign(functionPayload)
  if (functionResult.ok) return functionResult
  if (!shouldUseWorkerFallback(functionResult.error)) return functionResult

  const contacts = await listMarketingContacts({ module: functionPayload.selectedModule || 'all', max: 5000 })
  const recipients = filterRecipients(contacts, { audienceType: functionPayload.audienceType, module: functionPayload.selectedModule })
  if (!recipients.length) return { ok: false, error: 'No subscribed recipients for this audience.' }

  const created = await createCampaign({ ...payload, totalRecipients: recipients.length })
  if (!created.ok) return created
  await updateCampaign(created.id, { status: 'sending', totalRecipients: recipients.length })

  const workerResult = await callMarketingWorker({
    subject: functionPayload.subject,
    bodyHtml: functionPayload.bodyHtml,
    bodyText: functionPayload.bodyText,
    recipients,
  })
  if (!workerResult.ok) {
    await updateCampaign(created.id, { status: 'failed', error: workerResult.error })
    return { ok: false, error: `Firebase Function failed: ${functionResult.error}. Worker fallback failed: ${workerResult.error}` }
  }

  await writeEmailLogs(created.id, workerResult.results || [])
  await updateCampaign(created.id, {
    status: 'completed',
    sentCount: workerResult.sentCount || 0,
    failedCount: workerResult.failedCount || 0,
    sentAt: serverTimestamp(),
  })
  return { ok: true, ...workerResult, campaignId: created.id, provider: 'worker-fallback' }
}
