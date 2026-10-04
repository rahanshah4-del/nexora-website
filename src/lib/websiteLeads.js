/**
 * Website contact form → Firestore `websiteLeads/{id}`.
 *
 * Anyone (signed in or not) may CREATE a lead; only the platform admin can
 * read, update or delete them (firestore.rules → validWebsiteLead()). The field
 * list and every size limit below MUST stay identical to that rule, otherwise
 * real submissions are rejected. tests/website-leads.test.mjs and
 * tests/rules/firestore-rules.test.mjs cover both sides.
 */

export const WEBSITE_LEADS_COLLECTION = 'websiteLeads'
export const WEBSITE_LEAD_SOURCE = 'contact-page'
export const WEBSITE_LEAD_STATUSES = ['new', 'contacted', 'closed']

export const WEBSITE_LEAD_LIMITS = {
  name: 100,
  phone: 30,
  email: 254,
  businessName: 120,
  module: 60,
  businessSize: 40,
  message: 2000,
  page: 200,
}

export const WEBSITE_LEAD_MODULES = [
  'Restaurant POS',
  'Retail POS',
  'Pharmacy POS',
  'School ERP',
  'CRM',
  'WhatsApp CRM',
  'Fleet & Rental',
  'Custom software',
  'Not sure yet',
]

export const WEBSITE_LEAD_SIZES = ['Just me', '2-10 staff', '11-50 staff', '51+ staff', 'Multiple branches']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s()-]{4,29}$/

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Validates raw form input. Returns { errors, fields } where `fields` holds only
 * the cleaned, non-empty values allowed by the rule (no timestamps / status).
 */
export function validateWebsiteLead(input = {}) {
  const fields = {
    name: clean(input.name, WEBSITE_LEAD_LIMITS.name),
    phone: clean(input.phone, WEBSITE_LEAD_LIMITS.phone),
    email: clean(input.email, WEBSITE_LEAD_LIMITS.email).toLowerCase(),
    businessName: clean(input.businessName, WEBSITE_LEAD_LIMITS.businessName),
    module: clean(input.module, WEBSITE_LEAD_LIMITS.module),
    businessSize: clean(input.businessSize, WEBSITE_LEAD_LIMITS.businessSize),
    // Messages keep their line breaks.
    message: String(input.message ?? '').trim().slice(0, WEBSITE_LEAD_LIMITS.message),
    page: clean(input.page, WEBSITE_LEAD_LIMITS.page),
  }

  const errors = {}
  if (!fields.name) errors.name = 'Please enter your name.'
  if (!fields.phone) errors.phone = 'Please enter your WhatsApp or phone number.'
  else if (!PHONE_PATTERN.test(fields.phone)) errors.phone = 'Please enter a valid phone number.'
  if (fields.email && !EMAIL_PATTERN.test(fields.email)) errors.email = 'Please enter a valid email address.'
  if (!fields.message) errors.message = 'Please tell us what you need.'

  for (const key of Object.keys(fields)) {
    if (!fields[key]) delete fields[key]
  }
  return { errors, fields }
}

/**
 * Saves a lead. Firebase is imported on submit only, so public pages do not
 * download the Firestore SDK just to show the form.
 * `honeypot` is a hidden field bots fill in; such submissions are dropped
 * silently (reported as success so the bot learns nothing).
 */
export async function submitWebsiteLead(input = {}, { honeypot = '' } = {}) {
  const { errors, fields } = validateWebsiteLead(input)
  if (Object.keys(errors).length) return { ok: false, errors }
  if (String(honeypot).trim()) return { ok: true, dropped: true }

  const [{ db }, { addDoc, collection, serverTimestamp }] = await Promise.all([
    import('./firebase.js'),
    import('firebase/firestore'),
  ])
  if (!db) throw new Error('Database is not available right now.')

  await addDoc(collection(db, WEBSITE_LEADS_COLLECTION), {
    ...fields,
    source: WEBSITE_LEAD_SOURCE,
    status: 'new',
    createdAt: serverTimestamp(),
  })
  return { ok: true }
}
