/**
 * Email Marketing audience rule — the ONE definition of who may receive a
 * Nexora marketing campaign.
 *
 * Used by the sendMarketingCampaign Cloud Function (source of truth for real
 * sends) and imported by the admin page (src/lib/marketing.js) for the
 * preview, so both apply exactly the same rule. Pure: no Firebase imports.
 *
 * Allowed sources are Nexora's own audience only:
 *   marketingSubscribers, users, workspace owner/admin emails stored on
 *   workspaces/{id}, and upgradeRequests contact emails.
 * Client data (workspaces/{id}/leads, customers, students, tenants, patients,
 * …) is never an audience source: buildMarketingAudience() ignores any other
 * key it is given, and the function never reads those sub-collections.
 */
import { moduleFromValue } from './marketingModules.js'

export const MARKETING_SITE_ORIGIN = 'https://nexorasolution.online'
export const CLIENT_DATA_EXCLUDED_NOTE = 'Client customers and leads are never included.'

// Order matters: an explicit subscriber record wins for name/module.
export const AUDIENCE_SOURCES = [
  { key: 'subscribers', label: 'Subscribers', collection: 'marketingSubscribers', emailFields: ['email'] },
  { key: 'users', label: 'Users', collection: 'users', emailFields: ['email'] },
  { key: 'workspaceOwners', label: 'Workspace owners', collection: 'workspaces', emailFields: ['ownerEmail', 'email', 'adminEmail'] },
  { key: 'upgradeRequests', label: 'Upgrade requests', collection: 'upgradeRequests', emailFields: ['email', 'userEmail', 'clientEmail', 'contactEmail'] },
]

const MODULE_FIELDS = ['moduleInterest', 'businessType', 'selectedBusinessType', 'primaryBusinessType', 'currentBusinessType', 'module', 'product', 'planName']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function lower(value) {
  return clean(value).toLowerCase()
}

function firstString(...values) {
  return values.map(clean).find(Boolean) || ''
}

function isTrialRecord(row = {}) {
  return row.isTrialActive === true
    || ['trial', 'free_trial'].includes(lower(row.subscriptionStatus || row.planStatus || row.status))
    || Boolean(row.trialEndsAt || row.trialStartedAt || row.trialStartAt)
}

function audienceTypeFor(sourceKey, row) {
  if (sourceKey === 'subscribers') return lower(row.source) || 'manual'
  if (sourceKey === 'upgradeRequests') return 'client'
  return isTrialRecord(row) ? 'trial' : 'client'
}

function emailsFor(source, row) {
  const emails = source.emailFields.map((field) => lower(row[field])).filter((email) => EMAIL_PATTERN.test(email))
  return Array.from(new Set(emails))
}

/** An email is opted out when any allowed record for it is marked unsubscribed. */
function isOptedOut(row = {}) {
  return lower(row.status) === 'unsubscribed' || row.marketingOptOut === true
}

/**
 * Merge the allowed sources into one contact per lowercased email.
 * Unsubscribed contacts are kept (status 'unsubscribed') so the admin can see
 * and re-subscribe them; filterAudience() never returns them as recipients.
 */
export function mergeAudienceContacts(sources = {}) {
  const contacts = new Map()
  AUDIENCE_SOURCES.forEach((source) => {
    const rows = Array.isArray(sources[source.key]) ? sources[source.key] : []
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return
      const moduleKey = moduleFromValue(firstString(...MODULE_FIELDS.map((field) => row[field])))
      emailsFor(source, row).forEach((email) => {
        const contact = contacts.get(email) || {
          id: email,
          email,
          name: '',
          phone: '',
          moduleInterest: '',
          audienceTypes: [],
          sources: [],
          subscriberId: '',
          optedOut: false,
          createdAt: null,
        }
        contact.name = contact.name || firstString(row.name, row.fullName, row.displayName, row.clientName, row.companyName, row.workspaceName, row.businessName)
        contact.phone = contact.phone || firstString(row.phone, row.phoneNumber, row.mobile, row.whatsapp)
        if (moduleKey && (!contact.moduleInterest || contact.moduleInterest === 'crm')) contact.moduleInterest = moduleKey
        const audienceType = audienceTypeFor(source.key, row)
        if (!contact.audienceTypes.includes(audienceType)) contact.audienceTypes.push(audienceType)
        if (!contact.sources.includes(source.key)) contact.sources.push(source.key)
        if (source.key === 'subscribers' && !contact.subscriberId && row.id) contact.subscriberId = String(row.id)
        contact.optedOut = contact.optedOut || isOptedOut(row)
        contact.createdAt = contact.createdAt || row.createdAt || row.createdOn || row.signupAt || null
        contacts.set(email, contact)
      })
    })
  })
  return Array.from(contacts.values()).map((contact) => ({
    ...contact,
    moduleInterest: contact.moduleInterest || 'crm',
    source: contact.audienceTypes[0] || 'manual',
    origin: contact.sources.join(', '),
    status: contact.optedOut ? 'unsubscribed' : 'subscribed',
  }))
}

function matchesAudienceType(contact, audienceType) {
  if (!audienceType || audienceType === 'all') return true
  const types = contact.audienceTypes || [lower(contact.source)]
  if (audienceType === 'lead') return types.some((type) => ['lead', 'leads', 'website'].includes(type))
  if (audienceType === 'client') return types.some((type) => ['client', 'clients', 'crm'].includes(type))
  if (audienceType === 'trial') return types.some((type) => ['trial', 'trial_user', 'trial users'].includes(type))
  return types.includes(audienceType)
}

/** Sendable recipients: never unsubscribed, matching audience type and module segment. */
export function filterAudience(contacts = [], { audienceType = 'all', module = 'all' } = {}) {
  return contacts
    .filter((contact) => contact && contact.email && contact.status !== 'unsubscribed' && !contact.optedOut)
    .filter((contact) => matchesAudienceType(contact, audienceType))
    .filter((contact) => module === 'all' || contact.moduleInterest === module)
}

/** Recipients per allowed source (a person found in two sources counts in both). */
export function countAudienceBySource(recipients = []) {
  return AUDIENCE_SOURCES.map((source) => ({
    key: source.key,
    label: source.label,
    count: recipients.filter((contact) => (contact.sources || []).includes(source.key)).length,
  }))
}

export function buildMarketingAudience(sources = {}, options = {}) {
  const contacts = mergeAudienceContacts(sources)
  const recipients = filterAudience(contacts, options)
  return {
    contacts,
    recipients,
    countsBySource: countAudienceBySource(recipients),
    unsubscribedCount: contacts.filter((contact) => contact.status === 'unsubscribed').length,
  }
}

/** Opt-out link for a recipient: the site's contact page (an existing public page). */
export function marketingOptOutUrl(email = '', origin = MARKETING_SITE_ORIGIN) {
  const query = email ? `?topic=unsubscribe&email=${encodeURIComponent(lower(email))}` : '?topic=unsubscribe'
  return `${origin}/contact${query}`
}

const OPT_OUT_FOOTER_HTML = '<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">You are receiving this email because you have a Nexora account or contacted Nexora Solution. To stop receiving these emails, <a href="{{unsubscribe}}" style="color:#94a3b8;">unsubscribe here</a> or reply with "unsubscribe".</p>'
const OPT_OUT_FOOTER_TEXT = '\n\nYou are receiving this email because you have a Nexora account or contacted Nexora Solution. To stop receiving these emails, reply with "unsubscribe" or visit: {{unsubscribe}}'

/**
 * Ensure every campaign body carries an opt-out line. Bodies that already use
 * the {{unsubscribe}} placeholder (the built-in templates) are left as they are.
 */
export function withOptOutFooter({ bodyHtml = '', bodyText = '' } = {}) {
  const html = String(bodyHtml || '')
  const text = String(bodyText || '')
  return {
    bodyHtml: html.includes('{{unsubscribe}}') ? html : `${html}${OPT_OUT_FOOTER_HTML}`,
    bodyText: !text || text.includes('{{unsubscribe}}') ? text : `${text}${OPT_OUT_FOOTER_TEXT}`,
  }
}
