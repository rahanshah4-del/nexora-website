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

const functions = app ? getFunctions(app, 'us-central1') : null
const sendMarketingCampaignCallable = functions ? httpsCallable(functions, 'sendMarketingCampaign') : null

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
  { value: 'all', label: 'All subscribers' },
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

  const shouldUseWorkerFallback = /internal|not-found|unavailable|functions unavailable|email provider missing/i.test(functionResult.error || '')
  if (!shouldUseWorkerFallback) return functionResult

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
  return callSendMarketingCampaign({
    title: payload.title,
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    bodyText: payload.bodyText,
    audienceType: payload.audienceType || 'all',
    selectedModule: payload.module || payload.selectedModule || 'all',
  })
}
