const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const SENDER = 'Nexora Solutions <support@nexorasolution.online>'
const SITE_URL = 'https://nexorasolution.online'
const DEFAULT_LOGIN_URL = `${SITE_URL}/login`
const RESEND_TIMEOUT_MS = 10000
const ALLOWED_ORIGINS = new Set([
  'https://nexorasolution.online',
  'https://www.nexorasolution.online',
  'https://nexora-business-suite.web.app',
  'https://nexora-business-suite.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5174',
])

const BRAND = {
  background: '#070B18',
  card: '#111827',
  cardSoft: '#1F2937',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primary: '#6D5BFF',
  secondary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://nexorasolution.online'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
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

function safeUrl(value, fallback = DEFAULT_LOGIN_URL) {
  const raw = getString(value) || fallback
  if (/^https?:\/\//i.test(raw)) return raw
  return fallback
}

function themeColor(theme = 'primary') {
  if (theme === 'success') return BRAND.success
  if (theme === 'warning') return BRAND.warning
  if (theme === 'danger') return BRAND.danger
  if (theme === 'secondary') return BRAND.secondary
  return BRAND.primary
}

function paragraph(text) {
  if (!text) return ''
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(text)}</p>`
}

function strongText(text) {
  return `<span style="color:${BRAND.text};font-weight:700;">${escapeHtml(text)}</span>`
}

function infoTable(infoRows = []) {
  const rows = infoRows
    .filter((row) => row?.label && row?.value)
    .map((row) => `<tr>
      <td style="padding:11px 0;border-bottom:1px solid rgba(148,163,184,.16);font-size:13px;line-height:18px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(row.label)}</td>
      <td align="right" style="padding:11px 0;border-bottom:1px solid rgba(148,163,184,.16);font-size:13px;line-height:18px;color:${BRAND.text};font-weight:700;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(row.value)}</td>
    </tr>`)
    .join('')

  if (!rows) return ''
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0 0;border-collapse:collapse;">${rows}</table>`
}

function ctaButton(cta, accent, secondary = false) {
  if (!cta?.label || !cta?.url) return ''
  const bg = secondary ? BRAND.cardSoft : accent
  const border = secondary ? `1px solid rgba(148,163,184,.24)` : `1px solid ${accent}`
  return `<a href="${escapeHtml(safeUrl(cta.url))}" style="display:inline-block;margin:0 8px 10px 0;padding:14px 18px;border-radius:12px;background:${bg};border:${border};color:${BRAND.text};font-size:14px;line-height:18px;font-weight:800;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(cta.label)}</a>`
}

function createNexoraEmailLayout({
  preheader = '',
  badge = 'Nexora Notification',
  title = 'Nexora Solutions',
  subtitle = '',
  bodyHtml = '',
  primaryCta = null,
  secondaryCta = null,
  infoRows = [],
  highlightBox = '',
  footerNote = '',
  theme = 'primary',
} = {}) {
  const accent = themeColor(theme)
  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle)
  const safeBadge = escapeHtml(badge)
  const safePreheader = escapeHtml(preheader)
  const safeFooterNote = escapeHtml(footerNote)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.background};border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:collapse;">
            <tr>
              <td style="padding:0;border-radius:24px;overflow:hidden;background:${BRAND.card};border:1px solid rgba(148,163,184,.18);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:28px 28px 18px 28px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td width="54" valign="top">
                            <div style="width:46px;height:46px;border-radius:14px;background:${BRAND.primary};color:#ffffff;font-size:24px;line-height:46px;text-align:center;font-weight:900;font-family:Arial,Helvetica,sans-serif;">N</div>
                          </td>
                          <td valign="top">
                            <div style="font-size:15px;line-height:20px;font-weight:900;letter-spacing:1.8px;color:${BRAND.text};font-family:Arial,Helvetica,sans-serif;">NEXORA SOLUTIONS</div>
                            <div style="margin-top:3px;font-size:12px;line-height:18px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">Software &amp; Systems Studio</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:3px;background:${BRAND.primary};background-image:linear-gradient(90deg,${BRAND.primary},${BRAND.secondary},${BRAND.success});font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <div style="display:inline-block;margin:0 0 14px 0;padding:7px 10px;border-radius:999px;background:${BRAND.cardSoft};border:1px solid rgba(148,163,184,.18);color:${accent};font-size:12px;line-height:14px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${safeBadge}</div>
                      <h1 style="margin:0;color:${BRAND.text};font-size:30px;line-height:38px;font-weight:900;letter-spacing:-.4px;font-family:Arial,Helvetica,sans-serif;">${safeTitle}</h1>
                      ${safeSubtitle ? `<p style="margin:12px 0 0 0;color:${BRAND.muted};font-size:16px;line-height:25px;font-family:Arial,Helvetica,sans-serif;">${safeSubtitle}</p>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 28px 28px;">
                      <div style="padding:22px;border-radius:18px;background:${BRAND.cardSoft};border:1px solid rgba(148,163,184,.16);">
                        ${bodyHtml}
                        ${highlightBox ? `<div style="margin:20px 0 0 0;padding:18px;border-radius:16px;background:${BRAND.background};border:1px solid rgba(148,163,184,.18);">${highlightBox}</div>` : ''}
                        ${infoTable(infoRows)}
                      </div>
                      ${(primaryCta || secondaryCta) ? `<div style="margin:24px 0 0 0;">${ctaButton(primaryCta, accent)}${ctaButton(secondaryCta, accent, true)}</div>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:22px 28px 28px 28px;border-top:1px solid rgba(148,163,184,.14);background:#0B1020;">
                      ${safeFooterNote ? `<p style="margin:0 0 12px 0;font-size:12px;line-height:19px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">${safeFooterNote}</p>` : ''}
                      <p style="margin:0;font-size:12px;line-height:20px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">You received this email because you use Nexora Business Suite.</p>
                      <p style="margin:8px 0 0 0;font-size:12px;line-height:20px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;"><a href="${SITE_URL}" style="color:${BRAND.text};font-weight:800;text-decoration:none;">nexorasolution.online</a> &nbsp;|&nbsp; <a href="mailto:support@nexorasolution.online" style="color:${BRAND.text};font-weight:800;text-decoration:none;">support@nexorasolution.online</a></p>
                      <p style="margin:10px 0 0 0;font-size:11px;line-height:18px;color:${BRAND.muted};letter-spacing:.6px;font-family:Arial,Helvetica,sans-serif;">CRM &middot; ERP &middot; POS &middot; Fleet &middot; Dashboards</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function otpVerificationTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const otp = dataString(data, 'otp')
  const email = dataString(data, 'email')
  const verificationUrl = dataString(data, 'verificationUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Your Nexora verification code',
    html: createNexoraEmailLayout({
      preheader: 'Use this 6 digit code to verify your Nexora account. It expires in 10 minutes.',
      badge: 'Security Verification',
      title: 'Secure Account Verification',
      subtitle: `Hi ${clientName}, enter this code on the Nexora verification page.`,
      theme: 'primary',
      bodyHtml: [
        paragraph('Use this verification code to confirm your email address and continue setting up your Nexora workspace.'),
      ].join(''),
      highlightBox: `<div style="text-align:center;">
        <div style="font-size:12px;line-height:16px;color:${BRAND.muted};font-weight:800;text-transform:uppercase;letter-spacing:1.8px;font-family:Arial,Helvetica,sans-serif;">Verification Code</div>
        <div style="margin-top:10px;font-size:38px;line-height:44px;color:${BRAND.text};font-weight:900;letter-spacing:8px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(otp)}</div>
        <div style="margin-top:12px;font-size:13px;line-height:20px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">Expires in 10 minutes.</div>
      </div>`,
      primaryCta: { label: 'Open Verification Page', url: verificationUrl },
      infoRows: [
        { label: 'Email', value: email },
        { label: 'Expiry', value: '10 minutes' },
      ],
      footerNote: 'Security note: Nexora will never ask for your password or payment details by email.',
    }),
  }
}

function welcomeEmailTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const workspaceName = dataString(data, 'workspaceName')
  const trialDays = dataString(data, 'trialDays')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Welcome to Nexora Business Suite',
    html: createNexoraEmailLayout({
      preheader: 'Your Nexora workspace is ready.',
      badge: 'Workspace Ready',
      title: 'Welcome to Nexora Business Suite',
      subtitle: `Hi ${clientName}, your operating system for growth is ready.`,
      theme: 'success',
      bodyHtml: [
        paragraph('Nexora brings your CRM, invoicing, operations, dashboards, and business workflows into one connected workspace.'),
        workspaceName ? paragraph(`${workspaceName} is now ready to use.`) : '',
      ].join(''),
      primaryCta: { label: 'Open Workspace', url: loginUrl },
      infoRows: [
        { label: 'Workspace', value: workspaceName },
        { label: 'Trial', value: trialDays ? `${trialDays} days` : '' },
        { label: 'Account email', value: dataString(data, 'email') },
      ],
    }),
  }
}

function passwordResetTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const resetUrl = dataString(data, 'resetUrl') || dataString(data, 'link') || DEFAULT_LOGIN_URL

  return {
    subject: 'Reset your Nexora password',
    html: createNexoraEmailLayout({
      preheader: 'Use the secure link to reset your Nexora password.',
      badge: 'Account Security',
      title: 'Reset your password',
      subtitle: `Hi ${clientName}, use the secure button below to create a new password.`,
      theme: 'warning',
      bodyHtml: paragraph('If you requested this reset, continue using the button below. This link may expire soon for your protection.'),
      primaryCta: { label: 'Reset Password', url: resetUrl },
      highlightBox: `<p style="margin:0;font-size:14px;line-height:22px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">If you did not request a password reset, ignore this email and keep your current password. Your account remains protected.</p>`,
    }),
  }
}

function upgradeRequestReceivedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const planName = dataString(data, 'planName', 'selected plan')
  const loginUrl = dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Upgrade request received',
    html: createNexoraEmailLayout({
      preheader: 'Your Nexora upgrade request is pending review.',
      badge: 'Billing Review',
      title: 'Upgrade request received',
      subtitle: `Hi ${clientName}, your payment details were received and are pending review.`,
      theme: 'warning',
      bodyHtml: paragraph('Our billing team will verify the payment information and activate your subscription after approval.'),
      primaryCta: { label: 'Open Workspace', url: loginUrl },
      infoRows: [
        { label: 'Requested plan', value: planName },
        { label: 'Amount', value: dataString(data, 'amount') },
        { label: 'Transaction ID', value: dataString(data, 'transactionId') },
        { label: 'Payment method', value: dataString(data, 'paymentMethod') },
        { label: 'Status', value: 'Pending review' },
      ],
    }),
  }
}

function upgradeApprovedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const dashboardUrl = dataString(data, 'dashboardUrl') || dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Subscription activated',
    html: createNexoraEmailLayout({
      preheader: 'Your Nexora subscription is now active.',
      badge: 'Subscription Active',
      title: 'Subscription Activated',
      subtitle: `Hi ${clientName}, your Nexora workspace access has been upgraded.`,
      theme: 'success',
      bodyHtml: paragraph('Your approved plan is now active. You can open the dashboard and continue using your upgraded workspace.'),
      primaryCta: { label: 'Open Dashboard', url: dashboardUrl },
      infoRows: [
        { label: 'Plan', value: dataString(data, 'planName') },
        { label: 'Workspace', value: dataString(data, 'workspaceName') },
        { label: 'Amount', value: dataString(data, 'amount') },
      ],
    }),
  }
}

function upgradeRejectedTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const reason = dataString(data, 'reason') || dataString(data, 'rejectionReason')
  const supportUrl = dataString(data, 'supportUrl') || dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Upgrade request needs attention',
    html: createNexoraEmailLayout({
      preheader: 'Your Nexora upgrade request needs attention.',
      badge: 'Billing Action Needed',
      title: 'Upgrade request needs attention',
      subtitle: `Hi ${clientName}, we could not approve the submitted upgrade request yet.`,
      theme: 'danger',
      bodyHtml: paragraph('Please review the details and contact support or resubmit corrected payment information.'),
      primaryCta: { label: 'Contact Support or Resubmit', url: supportUrl },
      infoRows: [
        { label: 'Plan', value: dataString(data, 'planName') },
        { label: 'Workspace', value: dataString(data, 'workspaceName') },
        { label: 'Reason', value: reason },
      ],
    }),
  }
}

function trialExpiryReminderTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const daysLeft = dataString(data, 'daysLeft')
  const planUrl = dataString(data, 'planUrl') || dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Your Nexora trial is ending soon',
    html: createNexoraEmailLayout({
      preheader: 'Choose a plan to keep your Nexora workspace active.',
      badge: 'Trial Reminder',
      title: 'Trial ending soon',
      subtitle: `Hi ${clientName}, keep your workspace active by choosing a plan.`,
      theme: 'warning',
      bodyHtml: paragraph('Your trial access is nearing its end. Upgrade before expiry to avoid interruption to your business workspace.'),
      primaryCta: { label: 'Choose Plan', url: planUrl },
      infoRows: [
        { label: 'Days left', value: daysLeft },
        { label: 'Workspace', value: dataString(data, 'workspaceName') },
        { label: 'Recommended plan', value: dataString(data, 'planName') },
      ],
    }),
  }
}

function supportTicketReplyTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const ticketSubject = dataString(data, 'ticketSubject') || dataString(data, 'subject')
  const message = dataString(data, 'message', 'A support agent replied to your ticket.')
  const ticketUrl = dataString(data, 'ticketUrl') || dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: ticketSubject ? `Support reply: ${ticketSubject}` : 'Support ticket reply',
    html: createNexoraEmailLayout({
      preheader: 'A Nexora support agent replied to your ticket.',
      badge: 'Support Update',
      title: 'Support ticket reply',
      subtitle: `Hi ${clientName}, our support team replied to your request.`,
      theme: 'secondary',
      bodyHtml: paragraph('Open the ticket to review the full response and continue the conversation.'),
      highlightBox: `<p style="margin:0;font-size:14px;line-height:22px;color:${BRAND.text};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(message)}</p>`,
      primaryCta: { label: 'Open Support Ticket', url: ticketUrl },
      infoRows: [
        { label: 'Ticket subject', value: ticketSubject },
        { label: 'Ticket status', value: dataString(data, 'status') },
        { label: 'Ticket number', value: dataString(data, 'ticketNumber') },
      ],
    }),
  }
}

function invoiceEmailTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const invoiceNumber = dataString(data, 'invoiceNumber')
  const invoiceUrl = dataString(data, 'invoiceUrl') || dataString(data, 'loginUrl', DEFAULT_LOGIN_URL)

  return {
    subject: invoiceNumber ? `Invoice ${invoiceNumber} from Nexora Solutions` : 'Invoice from Nexora Solutions',
    html: createNexoraEmailLayout({
      preheader: 'Your Nexora invoice is ready to view.',
      badge: 'Invoice',
      title: invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice ready',
      subtitle: `Hi ${clientName}, your invoice details are available below.`,
      theme: 'primary',
      bodyHtml: paragraph('Please review the invoice details and open the invoice for the full breakdown.'),
      primaryCta: { label: 'View Invoice', url: invoiceUrl },
      infoRows: [
        { label: 'Invoice number', value: invoiceNumber },
        { label: 'Amount', value: dataString(data, 'amount') },
        { label: 'Due date', value: dataString(data, 'dueDate') },
        { label: 'Workspace', value: dataString(data, 'workspaceName') || dataString(data, 'businessName') },
      ],
    }),
  }
}

function emailVerificationTemplate(data = {}) {
  const clientName = dataString(data, 'clientName', 'there')
  const verificationUrl = dataString(data, 'verificationUrl', DEFAULT_LOGIN_URL)

  return {
    subject: 'Verify your Nexora email',
    html: createNexoraEmailLayout({
      preheader: 'Verify your email address to continue using Nexora.',
      badge: 'Email Verification',
      title: 'Verify your email',
      subtitle: `Hi ${clientName}, confirm this email address to continue.`,
      theme: 'primary',
      bodyHtml: paragraph('Use the secure button below to verify your email address.'),
      primaryCta: { label: 'Verify Email', url: verificationUrl },
      infoRows: [
        { label: 'Email', value: dataString(data, 'email') },
        { label: 'Workspace', value: dataString(data, 'workspaceName') },
      ],
    }),
  }
}

const TEMPLATES = {
  otp_verification: otpVerificationTemplate,
  verification_otp: otpVerificationTemplate,
  welcome: welcomeEmailTemplate,
  welcome_email: welcomeEmailTemplate,
  password_reset: passwordResetTemplate,
  email_verification: emailVerificationTemplate,
  verify_email: emailVerificationTemplate,
  upgrade_request_received: upgradeRequestReceivedTemplate,
  upgrade_received: upgradeRequestReceivedTemplate,
  upgrade_approved: upgradeApprovedTemplate,
  upgrade_rejected: upgradeRejectedTemplate,
  trial_expiry: trialExpiryReminderTemplate,
  trial_expiry_reminder: trialExpiryReminderTemplate,
  trial_reminder: trialExpiryReminderTemplate,
  support_ticket_reply: supportTicketReplyTemplate,
  support_reply: supportTicketReplyTemplate,
  invoice: invoiceEmailTemplate,
  invoice_email: invoiceEmailTemplate,
  invoice_delivery: invoiceEmailTemplate,
}

const PREVIEW_TYPES = {
  otp_verification: otpVerificationTemplate,
  welcome: welcomeEmailTemplate,
  password_reset: passwordResetTemplate,
  upgrade_request_received: upgradeRequestReceivedTemplate,
  upgrade_approved: upgradeApprovedTemplate,
  upgrade_rejected: upgradeRejectedTemplate,
  trial_expiry: trialExpiryReminderTemplate,
  support_ticket_reply: supportTicketReplyTemplate,
  invoice: invoiceEmailTemplate,
}

const PREVIEW_DATA = {
  otp_verification: {
    clientName: 'Ayesha Khan',
    email: 'client@example.com',
    otp: '482913',
    verificationUrl: `${SITE_URL}/verify-email`,
  },
  welcome: {
    clientName: 'Ayesha Khan',
    workspaceName: 'Nexora Demo Workspace',
    trialDays: '7',
    email: 'client@example.com',
    loginUrl: DEFAULT_LOGIN_URL,
  },
  password_reset: {
    clientName: 'Ayesha Khan',
    resetUrl: `${SITE_URL}/reset-password`,
  },
  upgrade_request_received: {
    clientName: 'Ayesha Khan',
    planName: 'Business Pro',
    amount: 'PKR 12,000',
    transactionId: 'TXN-948201',
    paymentMethod: 'Bank Transfer',
  },
  upgrade_approved: {
    clientName: 'Ayesha Khan',
    planName: 'Business Pro',
    workspaceName: 'Nexora Demo Workspace',
    amount: 'PKR 12,000',
    dashboardUrl: `${SITE_URL}/dashboard`,
  },
  upgrade_rejected: {
    clientName: 'Ayesha Khan',
    planName: 'Business Pro',
    workspaceName: 'Nexora Demo Workspace',
    rejectionReason: 'Transaction reference could not be verified.',
    supportUrl: `${SITE_URL}/support`,
  },
  trial_expiry: {
    clientName: 'Ayesha Khan',
    workspaceName: 'Nexora Demo Workspace',
    daysLeft: '2',
    planName: 'Business Pro',
    planUrl: `${SITE_URL}/upgrade`,
  },
  support_ticket_reply: {
    clientName: 'Ayesha Khan',
    ticketSubject: 'Invoice export issue',
    message: 'We reviewed your workspace and restored invoice export access. Please try again from the invoices module.',
    status: 'Open',
    ticketNumber: 'NX-2048',
    ticketUrl: `${SITE_URL}/support`,
  },
  invoice: {
    clientName: 'Ayesha Khan',
    invoiceNumber: 'INV-1042',
    amount: 'PKR 18,500',
    dueDate: '2026-06-10',
    workspaceName: 'Nexora Demo Workspace',
    invoiceUrl: `${SITE_URL}/invoice/INV-1042`,
  },
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

// ----------------------------------------------------------------------------
// Marketing campaign sending (admin-gated, batched). Keys stay server-side.
// ----------------------------------------------------------------------------

const DEFAULT_PROJECT_ID = 'nexora-business-suite'
const DEFAULT_ADMIN_EMAILS = ['admin@nexora.com', 'rahanshah2@gmail.com']
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 ? '='.repeat(4 - (padded.length % 4)) : ''
  return atob(padded + pad)
}

function base64UrlToBytes(input) {
  const binary = base64UrlDecode(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Verify a Firebase ID token (RS256) and return its payload, or throw.
async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = String(idToken || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [headerB64, payloadB64, sigB64] = parts
  const header = JSON.parse(base64UrlDecode(headerB64))
  const payload = JSON.parse(base64UrlDecode(payloadB64))

  if (payload.aud !== projectId) throw new Error('Invalid audience')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer')
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (!payload.sub) throw new Error('Invalid subject')

  const jwks = await (await fetch(FIREBASE_JWKS_URL)).json()
  const jwk = (jwks.keys || []).find((key) => key.kid === header.kid)
  if (!jwk) throw new Error('Signing key not found')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  )
  if (!valid) throw new Error('Invalid signature')
  return payload
}

function marketingFrom(env) {
  const name = getString(env.FROM_NAME) || 'Nexora Solution'
  const email = getString(env.FROM_EMAIL) || 'support@nexorasolution.online'
  return `${name} <${email}>`
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

// Send a marketing campaign in batches; returns per-recipient results.
async function sendMarketingCampaign(request, env) {
  const projectId = getString(env.FIREBASE_PROJECT_ID) || DEFAULT_PROJECT_ID
  const adminEmails = new Set(
    (getString(env.ADMIN_EMAILS) ? env.ADMIN_EMAILS.split(',') : DEFAULT_ADMIN_EMAILS).map((value) =>
      String(value).trim().toLowerCase(),
    ),
  )

  if (!ALLOWED_ORIGINS.has(request.headers.get('Origin') || '')) {
    return jsonResponse(request, { success: false, error: 'Origin not allowed' }, 403)
  }
  if (!env.RESEND_API_KEY) {
    return jsonResponse(request, { success: false, error: 'RESEND_API_KEY missing' }, 500)
  }

  // Admin gate: verify the caller's Firebase ID token + email allowlist.
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  let claims
  try {
    claims = await verifyFirebaseIdToken(token, projectId)
  } catch (error) {
    return jsonResponse(request, { success: false, error: `Unauthorized: ${error?.message || 'invalid token'}` }, 401)
  }
  const email = String(claims.email || '').toLowerCase()
  if (!claims.email_verified || !adminEmails.has(email)) {
    return jsonResponse(request, { success: false, error: 'Forbidden: admin access required' }, 403)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse(request, { success: false, error: 'Invalid JSON body.' }, 400)
  }

  const subject = getString(body?.subject)
  const html = getString(body?.bodyHtml) || getString(body?.html)
  const text = getString(body?.bodyText) || getString(body?.text)
  if (!subject || !html) {
    return jsonResponse(request, { success: false, error: 'subject and bodyHtml are required.' }, 400)
  }

  // Test mode: single recipient, no batching.
  const testEmail = getString(body?.testEmail)
  const recipients = testEmail
    ? [{ email: testEmail }]
    : (Array.isArray(body?.recipients) ? body.recipients : [])
        .map((item) => (typeof item === 'string' ? { email: item } : item))
        .filter((item) => getString(item?.email) && getString(item?.status || 'subscribed') !== 'unsubscribed')

  if (!recipients.length) {
    return jsonResponse(request, { success: false, error: 'No valid recipients.' }, 400)
  }

  const from = marketingFrom(env)
  const batchSize = Math.min(Math.max(Number(body?.batchSize) || 20, 1), 50)
  const results = []
  for (const group of chunk(recipients, batchSize)) {
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.all(
      group.map(async (recipient) => {
        const to = getString(recipient.email)
        try {
          const response = await fetchResendWithTimeout({ from, to, subject, html, text: text || undefined }, env.RESEND_API_KEY)
          if (!response.ok) {
            const data = await response.json().catch(() => null)
            return { email: to, status: 'failed', error: getErrorMessage(data) }
          }
          return { email: to, status: 'sent', error: '' }
        } catch (error) {
          return { email: to, status: 'failed', error: error?.message || 'send failed' }
        }
      }),
    )
    results.push(...settled)
  }

  const sentCount = results.filter((r) => r.status === 'sent').length
  const failedCount = results.length - sentCount
  return jsonResponse(request, { success: true, test: Boolean(testEmail), sentCount, failedCount, results })
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (request.method === 'OPTIONS' && (url.pathname === '/send-email' || url.pathname === '/send-marketing')) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        })
      }

      if (request.method === 'POST' && url.pathname === '/send-marketing') {
        return sendMarketingCampaign(request, env)
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

      if (request.method === 'GET' && url.pathname === '/preview') {
        const type = getString(url.searchParams.get('type')) || 'otp_verification'
        const template = PREVIEW_TYPES[type]
        if (!template) {
          return jsonResponse(request, {
            success: false,
            error: 'Unsupported preview type.',
            supportedTypes: Object.keys(PREVIEW_TYPES),
          }, 400)
        }

        const { html } = template(PREVIEW_DATA[type] || {})
        return htmlResponse(html)
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
