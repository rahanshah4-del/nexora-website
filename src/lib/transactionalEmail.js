const EMAIL_API_URL = 'https://nexora-email-api.rahanshah4.workers.dev/send-email'
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY
const firebaseOobEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey || ''}`

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value) {
  return clean(String(value ?? ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function paragraph(value) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">${escapeHtml(value)}</p>`
}

function shell({ title, preview = '', body }) {
  return `
    <div style="margin:0;background:#f8fafc;padding:28px 14px;font-family:Inter,Arial,sans-serif;color:#0f172a">
      <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff">
        <div style="background:#0f172a;padding:26px 28px;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#bae6fd">Nexora Solutions</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1>
          ${preview ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#cbd5e1">${escapeHtml(preview)}</p>` : ''}
        </div>
        <div style="padding:28px">${body}</div>
      </div>
    </div>
  `
}

function button(label, href) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;border-radius:12px;background:#2563eb;padding:13px 18px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none">${escapeHtml(label)}</a>`
}

function money(amount, currency = 'PKR') {
  const value = Number(amount || 0)
  return `${currency} ${Number.isFinite(value) ? value.toLocaleString() : '0'}`
}

export async function sendWorkerEmail({ to, subject, html }) {
  const payload = {
    to: clean(to),
    subject: clean(subject),
    html: clean(html),
  }

  if (!payload.to) return { ok: false, error: 'Recipient email is missing.' }
  if (!payload.subject) return { ok: false, error: 'Email subject is missing.' }
  if (!payload.html) return { ok: false, error: 'Email content is missing.' }

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success !== true) {
      return { ok: false, error: data?.error || `Email failed with status ${response.status}.` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error?.message || 'Email service is unreachable.' }
  }
}

export async function createPasswordResetLink(email) {
  const to = clean(email)
  if (!firebaseApiKey) return { ok: false, error: 'Firebase API key is missing.' }
  if (!to) return { ok: false, error: 'Email address is missing.' }

  try {
    const response = await fetch(firebaseOobEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: to,
        continueUrl: `${window.location.origin}/login`,
        returnOobLink: true,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.oobLink) {
      return { ok: false, error: data?.error?.message || 'Password reset link could not be created.' }
    }
    return { ok: true, link: String(data.oobLink) }
  } catch (error) {
    return { ok: false, error: error?.message || 'Password reset link could not be created.' }
  }
}

export function welcomeEmail({ name = 'there' } = {}) {
  return {
    subject: 'Welcome to Nexora Solutions',
    html: shell({
      title: 'Welcome to Nexora Solutions',
      preview: 'Your workspace trial is ready.',
      body: [
        paragraph(`Hi ${name || 'there'},`),
        paragraph('Welcome to Nexora Solutions. Your 7-day trial workspace is ready, and you can start setting up your business tools now.'),
        paragraph('If you need help, reply to this email and our team will assist you.'),
      ].join(''),
    }),
  }
}

export function passwordResetEmail({ link }) {
  return {
    subject: 'Reset your Nexora password',
    html: shell({
      title: 'Reset your password',
      preview: 'Use this secure link to set a new password.',
      body: [
        paragraph('We received a request to reset your Nexora account password.'),
        `<p style="margin:18px 0">${button('Reset Password', link)}</p>`,
        paragraph('If you did not request this, you can safely ignore this email.'),
      ].join(''),
    }),
  }
}

export function trialExpiryReminderEmail({ name = 'there', workspaceName = 'your workspace', trialEndsAt = '' } = {}) {
  return {
    subject: 'Your Nexora trial is ending soon',
    html: shell({
      title: 'Trial expiry reminder',
      preview: `${workspaceName} trial access is ending soon.`,
      body: [
        paragraph(`Hi ${name || 'there'},`),
        paragraph(`Your trial for ${workspaceName || 'your workspace'}${trialEndsAt ? ` ends on ${trialEndsAt}` : ' is ending soon'}.`),
        paragraph('Please upgrade your plan to keep using your Nexora workspace without interruption.'),
      ].join(''),
    }),
  }
}

export function upgradeRequestReceivedEmail({ name = 'there', plan = 'your selected plan', amount = 0, currency = 'PKR' } = {}) {
  return {
    subject: 'Upgrade request received',
    html: shell({
      title: 'Upgrade request received',
      preview: 'Your payment details were submitted for review.',
      body: [
        paragraph(`Hi ${name || 'there'},`),
        paragraph(`We received your upgrade request for ${plan}. Our team will review your payment details and update your workspace shortly.`),
        paragraph(`Submitted amount: ${money(amount, currency)}.`),
      ].join(''),
    }),
  }
}

export function upgradeApprovedEmail({ name = 'there', plan = 'your plan' } = {}) {
  return {
    subject: 'Your Nexora upgrade was approved',
    html: shell({
      title: 'Upgrade approved',
      preview: 'Your workspace plan is now active.',
      body: [
        paragraph(`Hi ${name || 'there'},`),
        paragraph(`Your upgrade to ${plan} has been approved. Your workspace access has been updated.`),
        paragraph('Thank you for choosing Nexora Solutions.'),
      ].join(''),
    }),
  }
}

export function upgradeRejectedEmail({ name = 'there', reason = '' } = {}) {
  return {
    subject: 'Upgrade request update',
    html: shell({
      title: 'Upgrade request rejected',
      preview: 'Your upgrade request needs attention.',
      body: [
        paragraph(`Hi ${name || 'there'},`),
        paragraph('Your upgrade request was rejected after review.'),
        reason ? paragraph(`Reason: ${reason}`) : '',
        paragraph('Please submit corrected payment details or contact support for help.'),
      ].join(''),
    }),
  }
}

export function supportTicketReplyEmail({ ticketNumber = '', subject = 'Support ticket', message = '' } = {}) {
  return {
    subject: `Support reply: ${subject || ticketNumber || 'Nexora ticket'}`,
    html: shell({
      title: 'Support ticket reply',
      preview: ticketNumber ? `Reply for ticket ${ticketNumber}` : 'A support agent replied to your ticket.',
      body: [
        paragraph(ticketNumber ? `Ticket: ${ticketNumber}` : 'A support agent replied to your ticket.'),
        paragraph(message),
      ].join(''),
    }),
  }
}

export function invoiceDeliveryEmail({ invoice, company = {}, businessType = '' } = {}) {
  const label = businessType === 'School ERP' ? 'Fee Bill' : 'Invoice'
  const number = invoice?.invoiceNumber || invoice?.id || ''
  const total = money(invoice?.total ?? invoice?.totalUsd, invoice?.currency || 'PKR')
  return {
    subject: `${label} ${number} from ${company?.companyName || company?.name || 'Nexora'}`,
    html: shell({
      title: `${label} ${number}`,
      preview: `${label} total: ${total}`,
      body: [
        paragraph(`Hi ${invoice?.customerName || 'there'},`),
        paragraph(`${label} ${number} is ready.`),
        paragraph(`Total amount: ${total}.`),
        invoice?.dueDate ? paragraph(`Due date: ${invoice.dueDate}.`) : '',
        paragraph('Please contact us if you have any questions about this bill.'),
      ].join(''),
    }),
  }
}

