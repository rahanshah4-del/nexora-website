import admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

admin.initializeApp()

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

const FROM_EMAIL = process.env.FROM_EMAIL || 'support@nexorasolution.com'
const FROM_NAME = process.env.FROM_NAME || 'Nexora Solution'
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'admin@nexora.com,rahanshah2@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

const AUDIENCE_TYPES = new Set(['all', 'website', 'trial', 'crm', 'manual', 'client', 'clients', 'lead', 'leads'])
const MODULES = new Set(['all', 'restaurant', 'crm', 'transport', 'school', 'property'])
const BATCH_SIZE = 25
const BATCH_DELAY_MS = 350

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function sender() {
  return `${FROM_NAME} <${FROM_EMAIL}>`
}

function providerName() {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  return ''
}

function isAdminOrOwner(auth) {
  const token = auth?.token || {}
  const email = clean(token.email).toLowerCase()
  const role = clean(token.role || token.userRole).toLowerCase()
  return Boolean(
    auth?.uid &&
      token.email_verified !== false &&
      (ADMIN_EMAILS.has(email) || token.admin === true || token.owner === true || role === 'admin' || role === 'owner'),
  )
}

function validateRequest(data) {
  const title = clean(data?.title) || clean(data?.campaignTitle) || clean(data?.subject) || 'Untitled campaign'
  const subject = clean(data?.subject)
  const bodyHtml = clean(data?.bodyHtml) || clean(data?.html)
  const bodyText = clean(data?.bodyText) || clean(data?.text)
  const rawAudienceType = clean(data?.audienceType || 'all').toLowerCase()
  const audienceType = rawAudienceType === 'clients' ? 'client' : rawAudienceType === 'leads' ? 'lead' : rawAudienceType
  const selectedModule = clean(data?.selectedModule || data?.module || 'all').toLowerCase()
  const testEmail = clean(data?.testEmail).toLowerCase()

  if (!subject) throw new HttpsError('invalid-argument', 'Subject is required.')
  if (!bodyHtml) throw new HttpsError('invalid-argument', 'Email body HTML is required.')
  if (!AUDIENCE_TYPES.has(audienceType)) throw new HttpsError('invalid-argument', 'Invalid audience type.')
  if (!MODULES.has(selectedModule)) throw new HttpsError('invalid-argument', 'Invalid selected module.')
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    throw new HttpsError('invalid-argument', 'Invalid test email address.')
  }

  return { title, subject, bodyHtml, bodyText, audienceType, selectedModule, testEmail }
}

function applyPersonalization(value, recipient, campaignId) {
  const unsubscribe = `https://nexorasolution.com/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${encodeURIComponent(campaignId)}`
  return String(value || '')
    .replaceAll('{{name}}', clean(recipient.name) || 'there')
    .replaceAll('{{unsubscribe}}', unsubscribe)
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchRecipients({ audienceType, selectedModule, testEmail }) {
  if (testEmail) {
    return [{ email: testEmail, name: 'Test recipient', source: 'test', moduleInterest: selectedModule, status: 'subscribed' }]
  }

  const snap = await db.collection('marketingSubscribers').where('status', '==', 'subscribed').get()
  const seen = new Set()
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .map((subscriber) => ({
      email: clean(subscriber.email).toLowerCase(),
      name: clean(subscriber.name),
      source: clean(subscriber.source),
      moduleInterest: clean(subscriber.moduleInterest),
      status: clean(subscriber.status || 'subscribed'),
    }))
    .filter((subscriber) => subscriber.email && subscriber.status !== 'unsubscribed')
    .filter((subscriber) => selectedModule === 'all' || subscriber.moduleInterest === selectedModule)
    .filter((subscriber) => {
      if (audienceType === 'all') return true
      if (audienceType === 'lead') return ['lead', 'leads', 'website'].includes(subscriber.source)
      if (audienceType === 'client') return ['client', 'clients', 'crm'].includes(subscriber.source)
      return subscriber.source === audienceType
    })
    .filter((subscriber) => {
      if (seen.has(subscriber.email)) return false
      seen.add(subscriber.email)
      return true
    })
}

async function sendWithResend({ to, subject, html, text }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender(),
      to,
      subject,
      html,
      text: text || undefined,
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message || data?.error || data?.errors?.[0]?.message || 'Resend rejected the email.')
  }
}

async function sendWithSendGrid({ to, subject, html, text }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        { type: 'text/html', value: html },
      ],
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.errors?.[0]?.message || 'SendGrid rejected the email.')
  }
}

async function sendEmail(payload) {
  if (providerName() === 'resend') return sendWithResend(payload)
  if (providerName() === 'sendgrid') return sendWithSendGrid(payload)
  throw new HttpsError('failed-precondition', 'RESEND_API_KEY or SENDGRID_API_KEY is required.')
}

async function writeLogs(campaignId, results) {
  for (let i = 0; i < results.length; i += 450) {
    const batch = db.batch()
    results.slice(i, i + 450).forEach((result) => {
      const ref = db.collection('marketingEmailLogs').doc()
      batch.set(ref, {
        campaignId,
        email: result.email,
        status: result.status,
        error: result.error || '',
        sentAt: FieldValue.serverTimestamp(),
      })
    })
    // eslint-disable-next-line no-await-in-loop
    await batch.commit()
  }
}

export const sendMarketingCampaign = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    try {
      if (!isAdminOrOwner(request.auth)) {
        throw new HttpsError('permission-denied', 'Only admin/owner accounts can send marketing campaigns.')
      }

      if (!providerName()) {
        throw new HttpsError('failed-precondition', 'Email provider missing. Set RESEND_API_KEY or SENDGRID_API_KEY in Firebase Functions environment.')
      }

      const input = validateRequest(request.data)
      const recipients = await fetchRecipients(input)
      if (!recipients.length) {
        throw new HttpsError('failed-precondition', 'No subscribed recipients match this audience.')
      }

      const campaignRef = db.collection('marketingCampaigns').doc()
      const campaignId = campaignRef.id
      const createdByEmail = clean(request.auth.token.email).toLowerCase()
      await campaignRef.set({
        title: input.title,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        audienceType: input.audienceType,
        selectedModule: input.selectedModule,
        moduleInterest: input.selectedModule,
        testEmail: input.testEmail || '',
        totalRecipients: recipients.length,
        sentCount: 0,
        failedCount: 0,
        status: 'sending',
        provider: providerName(),
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME,
        createdBy: request.auth.uid,
        createdByEmail,
        createdAt: FieldValue.serverTimestamp(),
        sentAt: null,
      })

      const results = []
      for (let index = 0; index < recipients.length; index += BATCH_SIZE) {
        const group = recipients.slice(index, index + BATCH_SIZE)
        // eslint-disable-next-line no-await-in-loop
        const settled = await Promise.all(
          group.map(async (recipient) => {
            try {
              await sendEmail({
                to: recipient.email,
                subject: applyPersonalization(input.subject, recipient, campaignId),
                html: applyPersonalization(input.bodyHtml, recipient, campaignId),
                text: applyPersonalization(input.bodyText, recipient, campaignId),
              })
              return { email: recipient.email, status: 'sent', error: '' }
            } catch (error) {
              logger.warn('Marketing email failed', { campaignId, email: recipient.email, error: error?.message })
              return { email: recipient.email, status: 'failed', error: error?.message || 'Email send failed.' }
            }
          }),
        )
        results.push(...settled)
        if (index + BATCH_SIZE < recipients.length) {
          // eslint-disable-next-line no-await-in-loop
          await delay(BATCH_DELAY_MS)
        }
      }

      const sentCount = results.filter((result) => result.status === 'sent').length
      const failedCount = results.length - sentCount
      const firstError = results.find((result) => result.status === 'failed')?.error || ''
      await writeLogs(campaignId, results)
      await campaignRef.update({
        sentCount,
        failedCount,
        status: failedCount === recipients.length ? 'failed' : 'completed',
        error: failedCount === recipients.length ? firstError : '',
        sentAt: FieldValue.serverTimestamp(),
      })

      if (input.testEmail && failedCount > 0) {
        throw new HttpsError('failed-precondition', firstError || 'Test email failed.')
      }

      return {
        success: true,
        campaignId,
        test: Boolean(input.testEmail),
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
        firstError,
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('sendMarketingCampaign crashed', {
        message: error?.message,
        stack: error?.stack,
      })
      throw new HttpsError('internal', error?.message || 'Marketing email function failed.')
    }
  },
)
