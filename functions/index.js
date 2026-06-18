import admin from 'firebase-admin'
import crypto from 'node:crypto'
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
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
const FUNCTION_REGION = 'us-central1'

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

function isTrialRecipient(row = {}) {
  return row.isTrialActive === true
    || ['trial', 'free_trial'].includes(lower(row.subscriptionStatus || row.planStatus || row.status))
    || Boolean(row.trialEndsAt || row.trialStartedAt || row.trialStartAt)
}

function normalizeRecipient(row = {}, fallback = {}) {
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
    email,
    name: firstString(row.name, row.fullName, row.displayName, row.clientName, row.customerName, row.companyName, row.workspaceName, row.businessName),
    source,
    moduleInterest,
    status: lower(row.status || fallback.status || 'subscribed'),
  }
}

function mergeRecipients(groups) {
  const unsubscribedEmails = new Set()
  groups.flat().forEach((recipient) => {
    if (recipient?.email && lower(recipient.status) === 'unsubscribed') unsubscribedEmails.add(recipient.email)
  })
  const map = new Map()
  groups.flat().forEach((recipient) => {
    if (!recipient?.email || unsubscribedEmails.has(recipient.email)) return
    const existing = map.get(recipient.email)
    map.set(recipient.email, existing ? { ...existing, ...recipient, name: existing.name || recipient.name } : recipient)
  })
  return Array.from(map.values())
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

function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex')
}

function randomSecret() {
  return `nxatt_${crypto.randomBytes(24).toString('hex')}`
}

function safeDocId(value) {
  const raw = clean(value)
  if (!raw) return crypto.randomBytes(8).toString('hex')
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}

function dateKey(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function deviceEndpointUrl() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'nexora-business-suite'
  return `https://${FUNCTION_REGION}-${projectId}.cloudfunctions.net/ingestAttendanceDevicePunches`
}

async function assertWorkspaceAdmin(auth, workspaceId) {
  if (!auth?.uid || !workspaceId) {
    throw new HttpsError('permission-denied', 'Workspace admin access is required.')
  }
  if (isAdminOrOwner(auth)) return true

  const [workspaceSnap, userSnap] = await Promise.all([
    db.collection('workspaces').doc(workspaceId).get(),
    db.collection('users').doc(auth.uid).get(),
  ])
  const workspace = workspaceSnap.data() || {}
  const user = userSnap.data() || {}
  const role = lower(user.role || auth.token?.role)
  const profileMatches =
    auth.uid === workspaceId ||
    workspace.ownerId === auth.uid ||
    workspace.createdBy === auth.uid ||
    workspace.userId === auth.uid ||
    user.workspaceId === workspaceId ||
    user.ownerId === workspaceId ||
    user.companyId === workspaceId ||
    user.userId === workspaceId ||
    (Array.isArray(user.workspaceIds) && user.workspaceIds.includes(workspaceId)) ||
    (Array.isArray(user.workspaces) && user.workspaces.includes(workspaceId))

  if (profileMatches && ['owner', 'admin'].includes(role)) return true
  throw new HttpsError('permission-denied', 'Only workspace owner/admin can manage attendance devices.')
}

function normalizePunch(row = {}, device = {}) {
  const personType = lower(row.personType || row.type || device.defaultPersonType || 'student') === 'staff' ? 'staff' : 'student'
  const timestamp = row.timestamp || row.time || row.punchTime || row.date || new Date().toISOString()
  const status = lower(row.status || row.attendance || row.state || 'present') || 'present'
  const name = firstString(row.name, row.studentName, row.staffName, row.userName, row.employeeName, row.personName, row.deviceUserName, 'Unknown')
  const cls = firstString(row.className, row.class, row.grade, row.section, row.department, row.dept, personType === 'staff' ? 'Staff' : 'Unassigned')
  return {
    personType,
    timestamp,
    status,
    name,
    cls,
    personId: firstString(row.personId, row.studentId, row.staffId, row.userId),
    deviceUserId: firstString(row.deviceUserId, row.pin, row.uid, row.enrollId, row.userCode, row.cardNo),
    raw: row,
  }
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

  const [subscribersSnap, usersSnap, workspacesSnap, upgradesSnap, leadsSnap, customersSnap] = await Promise.all([
    db.collection('marketingSubscribers').limit(5000).get(),
    db.collection('users').limit(5000).get(),
    db.collection('workspaces').limit(5000).get(),
    db.collection('upgradeRequests').limit(2000).get(),
    db.collectionGroup('leads').limit(5000).get(),
    db.collectionGroup('customers').limit(5000).get(),
  ])

  return mergeRecipients([
    subscribersSnap.docs.map((doc) => normalizeRecipient(doc.data(), { source: doc.data().source || 'manual' })),
    usersSnap.docs.map((doc) => {
      const row = doc.data()
      return normalizeRecipient(row, { source: isTrialRecipient(row) ? 'trial' : 'client' })
    }),
    workspacesSnap.docs.map((doc) => {
      const row = doc.data()
      return normalizeRecipient(row, { source: isTrialRecipient(row) ? 'trial' : 'client' })
    }),
    upgradesSnap.docs.map((doc) => normalizeRecipient(doc.data(), { source: 'client' })),
    leadsSnap.docs.map((doc) => normalizeRecipient(doc.data(), { source: 'lead' })),
    customersSnap.docs.map((doc) => normalizeRecipient(doc.data(), { source: 'client' })),
  ])
    .filter((subscriber) => subscriber.email && subscriber.status !== 'unsubscribed')
    .filter((subscriber) => selectedModule === 'all' || subscriber.moduleInterest === selectedModule)
    .filter((subscriber) => {
      if (audienceType === 'all') return true
      if (audienceType === 'lead') return ['lead', 'leads', 'website'].includes(subscriber.source)
      if (audienceType === 'client') return ['client', 'clients', 'crm'].includes(subscriber.source)
      if (audienceType === 'trial') return ['trial', 'trial_user', 'trial users'].includes(subscriber.source)
      return subscriber.source === audienceType
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

function htmlEscape(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function supportTicketEmailBase({ title, preview, body, ticketNumber, status }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;">${htmlEscape(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;padding:22px 24px;color:#ffffff;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a7f3d0;">Nexora Solution</div>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">${htmlEscape(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="display:inline-block;border-radius:999px;background:#ecfdf5;color:#047857;font-size:13px;font-weight:800;padding:8px 12px;">
                  Complaint No: ${htmlEscape(ticketNumber)}
                </div>
                <div style="display:inline-block;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:800;padding:8px 12px;margin-left:6px;">
                  ${htmlEscape(status)}
                </div>
                <div style="margin-top:18px;font-size:15px;line-height:1.7;color:#334155;">${body}</div>
                <div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;line-height:1.6;color:#64748b;">
                  Please keep this complaint number for reference. Our backend support team can track and resolve it from Nexora Control Centre.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function supportTicketCreatedEmail(ticket = {}) {
  const ticketNumber = firstString(ticket.ticketNumber, ticket.id, 'NEXORA-TICKET')
  const subject = firstString(ticket.subject, ticket.title, 'Support request')
  const name = firstString(ticket.customerName, ticket.clientName, 'Client')
  const html = supportTicketEmailBase({
    title: 'Your complaint has been received',
    preview: `Complaint ${ticketNumber} has been created.`,
    ticketNumber,
    status: 'Received',
    body: `
      <p style="margin:0 0 12px;">Hi ${htmlEscape(name)},</p>
      <p style="margin:0 0 12px;">Your complaint has been created successfully. Nexora support team will review it and respond as soon as possible.</p>
      <p style="margin:0;"><strong>Subject:</strong> ${htmlEscape(subject)}</p>
    `,
  })
  return {
    subject: `Complaint received: ${ticketNumber}`,
    html,
    text: `Hi ${name}, your complaint has been created successfully. Complaint No: ${ticketNumber}. Subject: ${subject}`,
  }
}

function supportTicketResolvedEmail(ticket = {}) {
  const ticketNumber = firstString(ticket.ticketNumber, ticket.id, 'NEXORA-TICKET')
  const subject = firstString(ticket.subject, ticket.title, 'Support request')
  const name = firstString(ticket.customerName, ticket.clientName, 'Client')
  const status = firstString(ticket.status, 'Resolved')
  const html = supportTicketEmailBase({
    title: 'Your complaint has been resolved',
    preview: `Complaint ${ticketNumber} has been resolved.`,
    ticketNumber,
    status,
    body: `
      <p style="margin:0 0 12px;">Hi ${htmlEscape(name)},</p>
      <p style="margin:0 0 12px;">Your complaint has been marked as ${htmlEscape(status)} by Nexora support team.</p>
      <p style="margin:0;"><strong>Subject:</strong> ${htmlEscape(subject)}</p>
    `,
  })
  return {
    subject: `Complaint resolved: ${ticketNumber}`,
    html,
    text: `Hi ${name}, your complaint has been marked as ${status}. Complaint No: ${ticketNumber}. Subject: ${subject}`,
  }
}

async function sendSupportTicketEmail({ ticket, type, ref }) {
  const to = lower(firstString(ticket.customerEmail, ticket.clientEmail, ticket.email))
  if (!to) return
  if (!providerName()) {
    logger.warn('Support ticket email skipped: provider missing', { ticketId: ref.id, type })
    return
  }
  const template = type === 'resolved' ? supportTicketResolvedEmail({ ...ticket, id: ref.id }) : supportTicketCreatedEmail({ ...ticket, id: ref.id })
  await sendEmail({ to, ...template })
  await ref.set({
    [`${type}EmailSentAt`]: FieldValue.serverTimestamp(),
    [`${type}EmailTo`]: to,
    supportEmailLastError: FieldValue.delete(),
  }, { merge: true })
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

export const registerAttendanceDevice = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    try {
      const workspaceId = clean(request.data?.workspaceId)
      await assertWorkspaceAdmin(request.auth, workspaceId)

      const name = clean(request.data?.name) || 'Attendance Device'
      const provider = clean(request.data?.provider) || 'Generic Biometric'
      const deviceSerial = clean(request.data?.deviceSerial || request.data?.serial)
      const deviceType = clean(request.data?.deviceType) || 'biometric'
      const defaultPersonType = lower(request.data?.defaultPersonType || 'student') === 'staff' ? 'staff' : 'student'
      const secret = randomSecret()
      const ref = db.collection('workspaces').doc(workspaceId).collection('attendanceDevices').doc()

      await ref.set({
        name,
        provider,
        deviceSerial,
        deviceType,
        defaultPersonType,
        status: 'connected',
        mode: 'auto',
        endpoint: deviceEndpointUrl(),
        secretHash: hashSecret(secret),
        workspaceId,
        ownerId: workspaceId,
        businessType: 'School ERP',
        createdBy: request.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
        totalPunches: 0,
      })

      return {
        success: true,
        deviceId: ref.id,
        endpoint: deviceEndpointUrl(),
        secret,
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('registerAttendanceDevice failed', { message: error?.message, stack: error?.stack })
      throw new HttpsError('internal', error?.message || 'Unable to register attendance device.')
    }
  },
)

export const ingestAttendanceDevicePunches = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 120,
    memory: '256MiB',
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'POST required.' })
        return
      }

      const body = typeof req.body === 'object' && req.body ? req.body : {}
      const workspaceId = clean(body.workspaceId)
      const deviceId = clean(body.deviceId)
      const secret = clean(req.get('x-nexora-device-secret') || body.secret)
      const records = Array.isArray(body.records) ? body.records : Array.isArray(body.punches) ? body.punches : []

      if (!workspaceId || !deviceId || !secret) {
        res.status(400).json({ success: false, error: 'workspaceId, deviceId, and secret are required.' })
        return
      }
      if (!records.length) {
        res.status(400).json({ success: false, error: 'records array is required.' })
        return
      }

      const deviceRef = db.collection('workspaces').doc(workspaceId).collection('attendanceDevices').doc(deviceId)
      const deviceSnap = await deviceRef.get()
      const device = deviceSnap.data() || {}
      if (!deviceSnap.exists || device.secretHash !== hashSecret(secret)) {
        res.status(403).json({ success: false, error: 'Invalid attendance device credentials.' })
        return
      }
      if (lower(device.status) === 'disabled') {
        res.status(403).json({ success: false, error: 'Attendance device is disabled.' })
        return
      }

      let saved = 0
      const failed = []
      for (const rawRecord of records.slice(0, 200)) {
        try {
          const punch = normalizePunch(rawRecord, device)
          const collectionName = punch.personType === 'staff' ? 'staffAttendance' : 'studentAttendance'
          const eventSeed = [
            deviceId,
            punch.deviceUserId || punch.personId || punch.name,
            punch.timestamp,
            punch.status,
          ].join('|')
          const eventId = safeDocId(crypto.createHash('sha1').update(eventSeed).digest('hex'))
          const attendanceRef = db.collection('workspaces').doc(workspaceId).collection(collectionName).doc(eventId)
          const logRef = db.collection('workspaces').doc(workspaceId).collection('attendanceDeviceLogs').doc(eventId)
          const payload = {
            workspaceId,
            ownerId: workspaceId,
            businessType: device.businessType || 'School ERP',
            createdBy: `device:${deviceId}`,
            source: 'attendance-device',
            deviceId,
            deviceName: device.name || '',
            deviceSerial: device.deviceSerial || '',
            deviceUserId: punch.deviceUserId,
            date: dateKey(punch.timestamp),
            punchTime: punch.timestamp,
            status: punch.status,
            attendance: punch.status,
            name: punch.name,
            className: punch.cls,
            class: punch.cls,
            department: punch.personType === 'staff' ? punch.cls : '',
            raw: punch.raw,
            syncedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(punch.personType === 'staff'
              ? { staffId: punch.personId, staffName: punch.name }
              : { studentId: punch.personId, studentName: punch.name }),
          }
          // eslint-disable-next-line no-await-in-loop
          await attendanceRef.set(payload, { merge: true })
          // eslint-disable-next-line no-await-in-loop
          await logRef.set({
            ...payload,
            collectionName,
            eventId,
            status: 'synced',
          }, { merge: true })
          saved += 1
        } catch (error) {
          failed.push({ error: error?.message || 'Record failed.' })
        }
      }

      await deviceRef.update({
        lastSyncAt: FieldValue.serverTimestamp(),
        totalPunches: FieldValue.increment(saved),
        updatedAt: FieldValue.serverTimestamp(),
      })

      res.json({ success: true, saved, failedCount: failed.length, failed })
    } catch (error) {
      logger.error('ingestAttendanceDevicePunches failed', { message: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: error?.message || 'Attendance ingest failed.' })
    }
  },
)

export const notifySupportTicketEmail = onDocumentWritten(
  {
    region: FUNCTION_REGION,
    document: 'workspaces/{workspaceId}/supportTickets/{ticketId}',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null
    const after = event.data?.after?.exists ? event.data.after.data() : null
    if (!after) return

    const ref = event.data.after.ref
    const previousStatus = lower(before?.status)
    const nextStatus = lower(after.status)
    const isCreate = !before
    const isResolved = ['resolved', 'completed'].includes(nextStatus)
    const becameResolved = isResolved && previousStatus !== nextStatus && !['resolved', 'completed'].includes(previousStatus)

    try {
      if (isCreate && !after.createdEmailSentAt) {
        await sendSupportTicketEmail({ ticket: after, type: 'created', ref })
        return
      }
      if (becameResolved && !after.resolvedEmailSentAt) {
        await sendSupportTicketEmail({ ticket: after, type: 'resolved', ref })
      }
    } catch (error) {
      logger.error('notifySupportTicketEmail failed', {
        workspaceId: event.params.workspaceId,
        ticketId: event.params.ticketId,
        message: error?.message || String(error || ''),
      })
      await ref.set({
        supportEmailLastError: error?.message || 'Support email failed.',
        supportEmailLastErrorAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {})
    }
  },
)
