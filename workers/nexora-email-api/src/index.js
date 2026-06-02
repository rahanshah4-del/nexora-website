const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const SENDER = 'Nexora Solutions <support@nexorasolution.online>'
const SITE_URL = 'https://nexorasolution.online'
const DEFAULT_LOGIN_URL = `${SITE_URL}/login`
const RESEND_TIMEOUT_MS = 10000
const ALLOWED_ORIGINS = new Set([
  'https://nexorasolution.online',
  'http://localhost:5173',
])

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://nexorasolution.online'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
  })
}

function getString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function dataString(data, key, fallback = '') {
  return getString(data?.[key]) || fallback
}

function brandedEmailLayout({ eyebrow = 'Nexora Solutions', title, intro = '', body = '', ctaLabel = 'Open Nexora', ctaUrl = DEFAULT_LOGIN_URL }) {
  const safeCtaUrl = escapeHtml(ctaUrl || DEFAULT_LOGIN_URL)
  const safeCtaLabel = escapeHtml(ctaLabel || 'Open Nexora')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .nx-shell { padding: 18px 10px !important; }
        .nx-card { border-radius: 18px !important; }
        .nx-header, .nx-body { padding: 22px !important; }
        .nx-title { font-size: 24px !important; }
        .nx-button { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
    <div class="nx-shell" style="padding:32px 16px;background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 48%,#eff6ff 100%)">
      <div class="nx-card" style="max-width:660px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 24px 80px rgba(15,23,42,.12)">
        <div style="height:7px;background:linear-gradient(90deg,#7c3aed 0%,#2563eb 50%,#06b6d4 100%)"></div>
        <div class="nx-header" style="padding:30px 32px 24px;background:#ffffff">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#ffffff;font-weight:900;font-size:22px;line-height:46px;text-align:center">N</div>
            <div>
              <div style="font-size:18px;font-weight:900;letter-spacing:.08em;color:#0f172a">NEXORA</div>
              <div style="margin-top:2px;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#64748b">Solutions</div>
            </div>
          </div>
          <p style="margin:24px 0 8px;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#2563eb">${escapeHtml(eyebrow)}</p>
          <h1 class="nx-title" style="margin:0;font-size:30px;line-height:1.2;letter-spacing:-.02em;color:#0f172a">${escapeHtml(title)}</h1>
          ${intro ? `<p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#475569">${escapeHtml(intro)}</p>` : ''}
        </div>
        <div class="nx-body" style="padding:0 32px 30px">
          <div style="border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;padding:22px">
            ${body}
          </div>
          <div style="margin-top:24px">
            <a class="nx-button" href="${safeCtaUrl}" style="display:inline-block;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#2563eb);padding:14px 20px;color:#ffffff;font-size:14px;font-weight:900;text-decoration:none;box-shadow:0 12px 30px rgba(37,99,235,.24)">${safeCtaLabel}</a>
          </div>
        </div>
        <div style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#ffffff">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b">Nexora Solutions email notifications are sent from <strong style="color:#334155">support@nexorasolution.online</strong>.</p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b"><a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;font-weight:800">nexorasolution.online</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`
}

function p(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">${escapeHtml(text)}</p>`
}

function detailRow(label, value) {
  if (!value) return ''
  return `<tr>
    <td style="padding:9px 0;font-size:13px;font-weight:800;color:#64748b">${escapeHtml(label)}</td>
    <td style="padding:9px 0;font-size:13px;font-weight:900;color:#0f172a;text-align:right">${escapeHtml(value)}</td>
  </tr>`
}

function detailTable(rows) {
  const body = rows.filter(Boolean).join('')
  if (!body) return ''
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-top:1px solid #e2e8f0">${body}</table>`
}

function welcomeEmailTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const workspaceName = dataString(data, 'workspaceName', 'your Nexora workspace')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: `Welcome to Nexora Solutions, ${clientName}`,
    html: brandedEmailLayout({
      title: 'Welcome to Nexora Solutions',
      intro: 'Your business workspace is ready.',
      ctaLabel: 'Open Workspace',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p(`Welcome to Nexora Solutions. ${workspaceName} is ready, and you can now start managing your customers, invoices, support, and business operations.`),
        detailTable([
          detailRow('Workspace', workspaceName),
          detailRow('Plan', dataString(data, 'planName')),
        ]),
      ].join(''),
    }),
  }
}

function upgradeRequestReceivedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const planName = dataString(data, 'planName', 'your selected plan')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Upgrade request received',
    html: brandedEmailLayout({
      title: 'Upgrade Request Received',
      intro: 'Your payment details were submitted for review.',
      ctaLabel: 'View Workspace',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p(`We received your upgrade request for ${planName}. Our team will review your payment information and update your workspace as soon as it is approved.`),
        detailTable([
          detailRow('Workspace', dataString(data, 'workspaceName')),
          detailRow('Plan', planName),
          detailRow('Amount', dataString(data, 'amount')),
          detailRow('Transaction ID', dataString(data, 'transactionId')),
        ]),
      ].join(''),
    }),
  }
}

function upgradeApprovedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const planName = dataString(data, 'planName', 'your plan')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Your Nexora upgrade was approved',
    html: brandedEmailLayout({
      title: 'Upgrade Approved',
      intro: 'Your workspace plan is now active.',
      ctaLabel: 'Login to Nexora',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p(`Your upgrade to ${planName} has been approved. Your Nexora workspace access has been updated.`),
        detailTable([
          detailRow('Workspace', dataString(data, 'workspaceName')),
          detailRow('Plan', planName),
          detailRow('Amount', dataString(data, 'amount')),
        ]),
      ].join(''),
    }),
  }
}

function upgradeRejectedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const reason = dataString(data, 'reason', 'Payment details could not be verified.')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Upgrade request update',
    html: brandedEmailLayout({
      title: 'Upgrade Request Rejected',
      intro: 'Your upgrade request needs attention.',
      ctaLabel: 'Review Upgrade',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p('Your upgrade request was rejected after review. Please submit corrected payment details or contact support for assistance.'),
        detailTable([
          detailRow('Workspace', dataString(data, 'workspaceName')),
          detailRow('Plan', dataString(data, 'planName')),
          detailRow('Reason', reason),
        ]),
      ].join(''),
    }),
  }
}

function supportTicketReplyTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const ticketNumber = dataString(data, 'ticketNumber')
  const message = dataString(data, 'message', 'A support agent replied to your ticket.')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: `Support reply${ticketNumber ? `: ${ticketNumber}` : ''}`,
    html: brandedEmailLayout({
      title: 'Support Ticket Reply',
      intro: 'Our support team replied to your request.',
      ctaLabel: 'View Ticket',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p(message),
        detailTable([
          detailRow('Ticket', ticketNumber),
          detailRow('Subject', dataString(data, 'subject')),
          detailRow('Workspace', dataString(data, 'workspaceName')),
        ]),
      ].join(''),
    }),
  }
}

function trialExpiryReminderTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const workspaceName = dataString(data, 'workspaceName', 'your workspace')
  const trialEndsAt = dataString(data, 'trialEndsAt', 'soon')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Your Nexora trial is ending soon',
    html: brandedEmailLayout({
      title: 'Trial Expiry Reminder',
      intro: 'Keep your workspace active by upgrading your plan.',
      ctaLabel: 'Upgrade Plan',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p(`Your trial for ${workspaceName} ends ${trialEndsAt}. Upgrade your package to keep using Nexora without interruption.`),
        detailTable([
          detailRow('Workspace', workspaceName),
          detailRow('Trial Ends', trialEndsAt),
          detailRow('Recommended Plan', dataString(data, 'planName')),
        ]),
      ].join(''),
    }),
  }
}

function invoiceEmailTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const invoiceNumber = dataString(data, 'invoiceNumber')
  const amount = dataString(data, 'amount')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: `Invoice${invoiceNumber ? ` ${invoiceNumber}` : ''} from Nexora Solutions`,
    html: brandedEmailLayout({
      title: invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice Ready',
      intro: 'Your invoice details are ready.',
      ctaLabel: 'View Invoice',
      ctaUrl: loginUrl,
      body: [
        p(`Hi ${clientName},`),
        p('Your invoice has been prepared. Please review the details below and contact us if you have any questions.'),
        detailTable([
          detailRow('Workspace', dataString(data, 'workspaceName')),
          detailRow('Invoice', invoiceNumber),
          detailRow('Amount', amount),
          detailRow('Due Date', dataString(data, 'dueDate')),
        ]),
      ].join(''),
    }),
  }
}

function passwordResetTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const resetUrl = dataString(data, 'resetUrl') || dataString(data, 'link') || DEFAULT_LOGIN_URL

  return {
    subject: 'Reset your Nexora password',
    html: brandedEmailLayout({
      title: 'Reset Your Password',
      intro: 'Use the secure button below to set a new password.',
      ctaLabel: 'Reset Password',
      ctaUrl: resetUrl,
      body: [
        p(`Hi ${clientName},`),
        p('We received a request to reset your Nexora account password. If you did not request this, you can safely ignore this email.'),
      ].join(''),
    }),
  }
}

function emailVerificationTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const verificationUrl = dataString(data, 'verificationUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Verify your Nexora email',
    html: brandedEmailLayout({
      title: 'Verify Your Email',
      intro: 'Confirm your email address to activate your Nexora workspace.',
      ctaLabel: 'Verify Email',
      ctaUrl: verificationUrl,
      body: [
        p(`Hi ${clientName},`),
        p('Please verify your email address to continue using Nexora Solutions.'),
        detailTable([
          detailRow('Email', dataString(data, 'email')),
          detailRow('Workspace', dataString(data, 'workspaceName')),
        ]),
      ].join(''),
    }),
  }
}

function otpVerificationTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const otp = dataString(data, 'otp')
  const verificationUrl = dataString(data, 'verificationUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Your Nexora verification code',
    html: brandedEmailLayout({
      title: 'Your Verification Code',
      intro: 'Enter this code on the Nexora verification page.',
      ctaLabel: 'Open Verification Page',
      ctaUrl: verificationUrl,
      body: [
        p(`Hi ${clientName},`),
        p('Use the verification code below to confirm your email address. This code expires in 10 minutes.'),
        `<div style="margin:18px 0;border-radius:16px;background:#ffffff;border:1px solid #dbeafe;padding:18px;text-align:center;font-size:32px;font-weight:900;letter-spacing:.32em;color:#1d4ed8">${escapeHtml(otp)}</div>`,
        detailTable([
          detailRow('Email', dataString(data, 'email')),
          detailRow('Workspace', dataString(data, 'workspaceName')),
        ]),
      ].join(''),
    }),
  }
}

const TEMPLATES = {
  welcome: welcomeEmailTemplate,
  welcome_email: welcomeEmailTemplate,
  email_verification: emailVerificationTemplate,
  verify_email: emailVerificationTemplate,
  otp_verification: otpVerificationTemplate,
  verification_otp: otpVerificationTemplate,
  upgrade_request_received: upgradeRequestReceivedTemplate,
  upgrade_received: upgradeRequestReceivedTemplate,
  upgrade_approved: upgradeApprovedTemplate,
  upgrade_rejected: upgradeRejectedTemplate,
  support_ticket_reply: supportTicketReplyTemplate,
  support_reply: supportTicketReplyTemplate,
  trial_expiry_reminder: trialExpiryReminderTemplate,
  trial_reminder: trialExpiryReminderTemplate,
  invoice_email: invoiceEmailTemplate,
  invoice_delivery: invoiceEmailTemplate,
  password_reset: passwordResetTemplate,
}

function buildEmailPayload(body) {
  const type = getString(body?.type)
  const template = TEMPLATES[type]

  if (template) {
    return template(body?.data || {})
  }

  return {
    subject: getString(body?.subject),
    html: getString(body?.html),
  }
}

function getErrorMessage(data) {
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.error?.message === 'string') return data.error.message
  return 'Email could not be sent.'
}

async function fetchResendWithTimeout(payload, apiKey) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort('Resend timeout'), RESEND_TIMEOUT_MS)

  try {
    return await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (request.method === 'OPTIONS' && url.pathname === '/send-email') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        })
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse(request, {
          success: true,
          status: 'ok',
          service: 'nexora-email-api',
        })
      }

      if (request.method === 'GET' && url.pathname === '/debug') {
        return jsonResponse(request, {
          success: true,
          hasResendKey: Boolean(env.RESEND_API_KEY),
          from: SENDER,
          allowedOrigins: [...ALLOWED_ORIGINS],
        })
      }

      if (url.pathname !== '/send-email') {
        return jsonResponse(request, { success: false, error: 'Not found' }, 404)
      }

      if (request.method !== 'POST') {
        return jsonResponse(request, { success: false, error: 'Method not allowed' }, 405)
      }

      if (!ALLOWED_ORIGINS.has(request.headers.get('Origin') || '')) {
        return jsonResponse(request, { success: false, error: 'Origin not allowed' }, 403)
      }

      if (!env.RESEND_API_KEY) {
        return jsonResponse(request, { success: false, error: 'RESEND_API_KEY missing' }, 500)
      }

      let body
      try {
        body = await request.json()
      } catch {
        return jsonResponse(request, { success: false, error: 'Invalid JSON body.' }, 400)
      }

      const to = getString(body?.to)
      const { subject, html } = buildEmailPayload(body)

      if (!to || !subject || !html) {
        return jsonResponse(request, { success: false, error: 'Missing required fields: to and either a valid type/data or raw subject/html.' }, 400)
      }

      try {
        const resendResponse = await fetchResendWithTimeout({
          from: SENDER,
          to,
          subject,
          html,
        }, env.RESEND_API_KEY)

        const data = await resendResponse.json().catch(() => null)
        if (!resendResponse.ok) {
          return jsonResponse(request, { success: false, error: `Resend error: ${getErrorMessage(data)}` }, resendResponse.status)
        }

        return jsonResponse(request, { success: true })
      } catch (error) {
        const timedOut = error?.name === 'AbortError' || String(error?.message || error || '').toLowerCase().includes('timeout')
        return jsonResponse(request, {
          success: false,
          error: timedOut ? 'Resend error: request timed out after 10 seconds' : `Resend error: ${error?.message || 'Email could not be sent.'}`,
        }, timedOut ? 504 : 502)
      }
    } catch (error) {
      return jsonResponse(request, { success: false, error: error?.message || 'Worker error: email request failed.' }, 500)
    }
  },
}
