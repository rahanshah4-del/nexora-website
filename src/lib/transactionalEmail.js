export const EMAIL_WORKER_URL = 'https://nexora-email-api.rahanshah4.workers.dev/send-email'

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
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#bae6fd">Nexora Solution</p>
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

const NEXORA_LOGO_URL = 'https://nexorasolution.online/nexora-brand-logo.png'
const NEXORA_WORKSPACE_URL = 'https://nexorasolution.online/workspace'
const NEXORA_UPGRADE_URL = 'https://nexorasolution.online/upgrade-business'

// Modern branded email wrapper — logo header (gradient), optional status badge,
// title/subtitle, body, a "Need help?" block, and footer. Mirrors the welcome
// email styling so all transactional emails feel consistent.
function modernEmailShell({
  accent = '#2563eb',
  accentGradient = 'linear-gradient(135deg,#1d4ed8 0%,#5b21b6 55%,#7c3aed 100%)',
  badge = '',
  title,
  subtitle = '',
  body,
  topContent = '',
  schema = '',
}) {
  const supportEmail = 'support@nexorasolution.online'
  const whatsapp = '03194329754'
  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          @media only screen and (max-width: 620px) {
            .nexora-email-pad { padding: 12px 6px !important; }
            .nexora-email-shell,
            .nexora-top-card { width: 100% !important; max-width: 100% !important; }
            .nexora-shell-head { padding: 24px 18px 22px !important; }
            .nexora-shell-body { padding: 22px 16px 4px !important; }
            .nexora-shell-help { padding: 4px 16px 22px !important; }
            .nexora-payment-card { border-radius: 22px !important; margin-bottom: 16px !important; }
            .nexora-payment-card-head { padding: 13px 16px !important; }
            .nexora-payment-card-body { padding: 24px 18px 26px !important; }
            .nexora-payment-title { font-size: 22px !important; line-height: 28px !important; margin-bottom: 24px !important; }
            .nexora-payment-amount { font-size: 50px !important; line-height: 56px !important; letter-spacing: -1px !important; }
            .nexora-payment-logo-col { width: 76px !important; }
            .nexora-payment-logo-box { width: 64px !important; height: 64px !important; border-radius: 18px !important; padding: 6px !important; }
            .nexora-payment-logo-img { width: 52px !important; height: 52px !important; border-radius: 14px !important; }
            .nexora-payment-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding-left: 0 !important; padding-right: 0 !important; }
          }
        </style>
        ${schema}
      </head>
      <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f7fb;margin:0;padding:0;">
          <tr>
            <td class="nexora-email-pad" align="center" style="padding:28px 8px;">
              ${topContent ? `<table class="nexora-top-card" role="presentation" width="860" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:860px;margin:0 0 16px;">${topContent}</table>` : ''}
              <table class="nexora-email-shell" role="presentation" width="860" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:860px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
                <tr>
                  <td class="nexora-shell-head" style="background:${accent};background-image:${accentGradient};padding:30px 30px 28px;color:#ffffff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="46" height="46" align="center" style="width:46px;height:46px;border-radius:14px;background:#ffffff;padding:4px;"><img src="${NEXORA_LOGO_URL}" width="38" height="38" alt="Nexora" style="display:block;width:38px;height:38px;border-radius:11px;object-fit:contain;" /></td>
                        <td style="padding-left:13px;">
                          <div style="font-size:19px;line-height:22px;font-weight:900;letter-spacing:1.5px;color:#ffffff;">NEXORA SOLUTION</div>
                          <div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:2px;color:#e0e7ff;text-transform:uppercase;">Business Suite</div>
                        </td>
                      </tr>
                    </table>
                    ${badge ? `<div style="margin:22px 0 0;">${badge}</div>` : ''}
                    <h1 style="margin:${badge ? '12' : '24'}px 0 6px;font-size:27px;line-height:34px;font-weight:900;color:#ffffff;">${escapeHtml(title)}</h1>
                    ${subtitle ? `<p style="margin:0;font-size:15px;line-height:24px;color:#eef2ff;font-weight:600;">${escapeHtml(subtitle)}</p>` : ''}
                  </td>
                </tr>
                <tr>
                  <td class="nexora-shell-body" style="padding:28px 34px 6px;background:#ffffff;">${body}</td>
                </tr>
                <tr>
                  <td class="nexora-shell-help" style="padding:4px 34px 26px;background:#ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
                      <tr>
                        <td style="padding:18px 20px;">
                          <div style="font-size:15px;line-height:22px;font-weight:900;color:#0f172a;margin-bottom:8px;">Need help?</div>
                          <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#475569;">WhatsApp: <a href="https://wa.me/923194329754" style="color:#2563eb;text-decoration:none;font-weight:800;">${whatsapp}</a></p>
                          <p style="margin:0;font-size:13px;line-height:20px;color:#475569;">Email: <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;font-weight:800;">${supportEmail}</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 28px 26px;background:#0b1220;text-align:center;">
                    <div style="font-size:15px;line-height:21px;font-weight:900;color:#ffffff;">Nexora Business Suite</div>
                    <div style="margin-top:7px;font-size:12px;line-height:20px;color:#cbd5e1;">CRM &bull; ERP &bull; POS &bull; Invoicing &bull; Reports</div>
                    <div style="margin-top:10px;font-size:11px;line-height:18px;color:#94a3b8;">Nexora Solution &mdash; All rights reserved 2019-2026.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function statusPill(text, bg = 'rgba(255,255,255,0.2)', color = '#ffffff') {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;padding:7px 13px;border-radius:999px;">${escapeHtml(text)}</span>`
}

// rows: array of [label, value]; falsy rows or empty values are skipped.
function detailsCard(heading, rows) {
  const cleanRows = rows.filter((row) => row && row[1] !== '' && row[1] != null)
  const bodyRows = cleanRows
    .map(([label, value], index) => {
      const border = index < cleanRows.length - 1 ? 'border-bottom:1px solid #e6ebf2;' : ''
      return `
                          <tr>
                            <td style="padding:11px 0;font-size:13px;line-height:19px;color:#64748b;font-weight:600;${border}">${escapeHtml(label)}</td>
                            <td style="padding:11px 0;font-size:14px;line-height:19px;color:#0f172a;font-weight:800;text-align:right;${border}">${escapeHtml(value)}</td>
                          </tr>`
    })
    .join('')
  return `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin:2px 0 18px;">
                      <tr>
                        <td style="padding:8px 20px 12px;">
                          ${heading ? `<div style="font-size:12px;line-height:18px;font-weight:900;color:#1e3a8a;text-transform:uppercase;letter-spacing:1px;margin:12px 0 2px;">${escapeHtml(heading)}</div>` : ''}
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${bodyRows}</table>
                        </td>
                      </tr>
                    </table>`
}

function paymentSummaryHero({
  status = 'Paid',
  title = 'Nexora payment',
  amount = 0,
  currency = 'PKR',
  orderId = '',
  buttonLabel = 'View receipt',
  buttonUrl = NEXORA_WORKSPACE_URL,
  note = '',
} = {}) {
  return `
                  <tr>
                    <td>
                    <table class="nexora-payment-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:24px;background:#ffffff;border:1px solid #dbe4ff;overflow:hidden;margin:0 0 22px;box-shadow:0 18px 42px rgba(15,23,42,0.10);">
                      <tr>
                        <td class="nexora-payment-card-head" style="background:#e3e8ff;padding:13px 22px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="font-size:14px;line-height:20px;font-weight:900;color:#172554;">${escapeHtml(status)}</td>
                              <td align="right" style="font-size:12px;line-height:18px;font-weight:800;color:#475569;">Nexora Receipt</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td class="nexora-payment-card-body" style="padding:28px 30px 30px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align:top;">
                                <div class="nexora-payment-title" style="font-size:25px;line-height:31px;font-weight:900;color:#111827;margin-bottom:30px;">${escapeHtml(title)}</div>
                                <div style="font-size:13px;line-height:18px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.9px;">Amount paid</div>
                                <div class="nexora-payment-amount" style="font-size:58px;line-height:64px;font-weight:900;color:#111827;letter-spacing:-1.4px;margin-top:5px;">${escapeHtml(money(amount, currency))}</div>
                                <div style="margin-top:26px;">
                                  <a class="nexora-payment-button" href="${escapeHtml(buttonUrl)}" style="display:inline-block;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;line-height:19px;font-weight:900;padding:15px 30px;">${escapeHtml(buttonLabel)}</a>
                                </div>
                              </td>
                              <td class="nexora-payment-logo-col" align="right" style="vertical-align:top;width:150px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-left:auto;">
                                  <tr>
                                    <td class="nexora-payment-logo-box" align="center" style="width:92px;height:92px;border-radius:26px;background:#050816;padding:8px;box-shadow:0 12px 25px rgba(15,23,42,0.18);">
                                      <img class="nexora-payment-logo-img" src="${NEXORA_LOGO_URL}" width="76" height="76" alt="Nexora" style="display:block;width:76px;height:76px;border-radius:20px;object-fit:contain;" />
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          ${(orderId || note) ? `
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:24px;border-top:1px solid #e2e8f0;">
                            ${orderId ? `<tr><td style="padding:14px 0 0;font-size:12px;line-height:18px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.8px;">Order / Payment ID</td><td align="right" style="padding:14px 0 0;font-size:13px;line-height:18px;font-weight:900;color:#0f172a;">${escapeHtml(orderId)}</td></tr>` : ''}
                            ${note ? `<tr><td style="padding:10px 0 0;font-size:12px;line-height:18px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.8px;">Status Note</td><td align="right" style="padding:10px 0 0;font-size:13px;line-height:18px;font-weight:900;color:#0f172a;">${escapeHtml(note)}</td></tr>` : ''}
                          </table>` : ''}
                        </td>
                      </tr>
                    </table>
                    </td>
                  </tr>`
}

function emailViewActionSchema({ label = 'View payment', url = NEXORA_WORKSPACE_URL, description = '' } = {}) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'EmailMessage',
    potentialAction: {
      '@type': 'ViewAction',
      target: clean(url),
      url: clean(url),
      name: clean(label),
    },
    description: clean(description || label),
  }
  return `<script type="application/ld+json">${JSON.stringify(payload).replaceAll('<', '\\u003c')}</script>`
}

function calloutBox(label, text, bg = '#fef2f2', border = '#fecaca', labelColor = '#b91c1c') {
  return `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:14px;background:${bg};border:1px solid ${border};margin:2px 0 18px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:12px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:${labelColor};margin-bottom:6px;">${escapeHtml(label)}</div>
                          <div style="font-size:14px;line-height:21px;color:#334155;font-weight:600;">${escapeHtml(text)}</div>
                        </td>
                      </tr>
                    </table>`
}

function ctaButton(label, href) {
  return `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding:6px 0 16px;">
                          <a href="${escapeHtml(href)}" style="display:block;width:100%;max-width:320px;border-radius:14px;background:#2563eb;background-image:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;font-size:16px;line-height:20px;font-weight:900;padding:15px 0;text-align:center;">${escapeHtml(label)}</a>
                        </td>
                      </tr>
                    </table>`
}

function greetingLine(name) {
  return `<p style="margin:0 0 8px;font-size:17px;line-height:25px;font-weight:800;color:#0f172a;">Hi ${escapeHtml(name || 'there')},</p>`
}

function leadParagraph(html) {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#475569;">${html}</p>`
}

function noteParagraph(html) {
  return `<p style="margin:0 0 4px;font-size:13px;line-height:20px;color:#64748b;">${html}</p>`
}

function titleCase(value) {
  const text = clean(value)
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

export async function sendWorkerEmail({ to, subject, html, type, data }) {
  const payload = {
    to: clean(to),
  }
  if (type) payload.type = clean(type)
  if (data) payload.data = data
  if (subject) payload.subject = clean(subject)
  if (html) payload.html = clean(html)

  if (!payload.to) return { ok: false, error: 'Recipient email is missing.' }
  if (!payload.type && !payload.subject) return { ok: false, error: 'Email subject is missing.' }
  if (!payload.type && !payload.html) return { ok: false, error: 'Email content is missing.' }

  try {
    console.log('[Worker email] request', {
      endpoint: EMAIL_WORKER_URL,
      type: payload.type || 'raw',
      to: payload.to,
    })
    const response = await fetch(EMAIL_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const responseBody = await response.json().catch(() => null)
    console.log('[Worker email] response', {
      endpoint: EMAIL_WORKER_URL,
      status: response.status,
      body: responseBody,
    })
    if (!response.ok || responseBody?.success !== true) {
      return {
        ok: false,
        error: responseBody?.error || `Email failed with status ${response.status}.`,
        status: response.status,
        response: responseBody,
      }
    }
    return { ok: true, status: response.status, response: responseBody }
  } catch (error) {
    console.error('[OTP email full error]', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
      response: error?.response,
      raw: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
    return { ok: false, error: error?.message || 'Email service is unreachable.', response: error?.response }
  }
}

export async function createPasswordResetLink(email) {
  const to = clean(email)
  if (!to) return { ok: false, error: 'Email address is missing.' }
  return { ok: true, link: `${window.location.origin}/login?email=${encodeURIComponent(to)}` }
}

// Per-module welcome content. Keyed by a normalized module slug so the email
// matches whatever business type the client selected during onboarding.
const WELCOME_TRIAL_CARD = {
  bg: '#e0f2fe',
  color: '#0369a1',
  icon: '&#127873;',
  title: '7-Day Trial Activated',
  desc: 'Explore Nexora Business Suite with secure cloud access.',
}

const WELCOME_MODULE_CONTENT = {
  general: {
    intro: 'Your Nexora Sales Hub is ready to help you manage leads, customers, invoices, reports, and business growth from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#128202;', title: 'CRM Dashboard Ready', desc: 'Track leads, customers, tasks, and daily business activity.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128101;', title: 'Customer Management Ready', desc: 'Organize customer profiles, follow-ups, and sales records.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#129534;', title: 'Invoice System Ready', desc: 'Create professional invoices and monitor payment progress.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#128200;', title: 'Reports & Analytics Ready', desc: 'Understand revenue, expenses, invoices, and performance trends.' },
    ],
  },
  retail: {
    intro: 'Your Retail / POS workspace is ready to help you run billing, inventory, customers, and store reports from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#127978;', title: 'Retail Dashboard Ready', desc: 'Get a live view of daily sales and store activity.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128230;', title: 'Inventory Management Ready', desc: 'Track stock, products, and low-stock alerts.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#129534;', title: 'POS Billing Ready', desc: 'Fast checkout with professional invoices and receipts.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#128200;', title: 'Sales Reports Ready', desc: 'Understand revenue, expenses, and store performance.' },
    ],
  },
  school: {
    intro: 'Your School ERP workspace is ready to help you manage students, fees, payments, and school reports from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#127891;', title: 'School Dashboard Ready', desc: 'Manage students, staff, and daily school operations.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128101;', title: 'Students & Parents Ready', desc: 'Organize student and parent profiles and records.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#128179;', title: 'Fees & Billing Ready', desc: 'Collect fees and monitor payment progress.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#128200;', title: 'Reports Ready', desc: 'Track fees, expenses, and school performance.' },
    ],
  },
  property: {
    intro: 'Your Property ERP workspace is ready to help you manage tenants, rent, maintenance, and property finance from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#127970;', title: 'Property Dashboard Ready', desc: 'Manage properties, units, and daily operations.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128273;', title: 'Tenants & Owners Ready', desc: 'Organize tenant and owner profiles and records.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#129534;', title: 'Rent & Billing Ready', desc: 'Create rent invoices and monitor payments.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#128295;', title: 'Maintenance & Contracts Ready', desc: 'Track maintenance requests and rental agreements.' },
    ],
  },
  restaurant: {
    intro: 'Your Restaurant POS workspace is ready to help you manage menu, tables, orders, bills, and reports from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#127869;&#65039;', title: 'Restaurant Dashboard Ready', desc: 'Manage orders, tables, and daily operations.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128203;', title: 'Menu Management Ready', desc: 'Add menu items, categories, and pricing.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#129681;', title: 'Tables & Orders Ready', desc: 'Floor view, KOT, and kitchen display.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#129534;', title: 'Bills & Payments Ready', desc: 'Fast billing with professional invoices.' },
    ],
  },
  transport: {
    intro: 'Your Transport / Rental workspace is ready to help you manage your fleet, bookings, customers, and payments from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#128666;', title: 'Fleet Dashboard Ready', desc: 'Manage vehicles and daily fleet operations.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128663;', title: 'Vehicles & Bookings Ready', desc: 'Track fleet and rental bookings.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#128101;', title: 'Rental Customers Ready', desc: 'Organize customer profiles and dues.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#128179;', title: 'Payments Ready', desc: 'Track payments and pending dues.' },
    ],
  },
  whatsapp: {
    intro: 'Your WhatsApp CRM workspace is ready to help you manage chats, leads, follow-ups, and automated messaging from one secure cloud platform.',
    features: [
      { bg: '#dbeafe', color: '#1d4ed8', icon: '&#128172;', title: 'WhatsApp Inbox Ready', desc: 'Manage chats and customer conversations.' },
      { bg: '#dcfce7', color: '#15803d', icon: '&#128101;', title: 'Leads & Customers Ready', desc: 'Organize profiles and follow-ups.' },
      { bg: '#fef3c7', color: '#b45309', icon: '&#128232;', title: 'Templates & Auto-Replies Ready', desc: 'Set up automated messaging and campaigns.' },
      { bg: '#ede9fe', color: '#6d28d9', icon: '&#129534;', title: 'Invoices & Finance Ready', desc: 'Billing, payments, and reports.' },
    ],
  },
}

const WELCOME_MODULE_ALIASES = {
  'general crm': 'general', 'general-crm': 'general', 'nexora sales hub': 'general', general: 'general',
  'retail / pos': 'retail', 'retail/pos': 'retail', 'retail pos': 'retail', 'retail-pos': 'retail', retail: 'retail', pos: 'retail',
  'school erp': 'school', 'school-erp': 'school', school: 'school',
  'property erp': 'property', 'property-erp': 'property', property: 'property',
  'restaurant pos': 'restaurant', 'restaurant-pos': 'restaurant', restaurant: 'restaurant',
  'transport / rental': 'transport', 'transport/rental': 'transport', 'transport rental': 'transport', 'transport-rental': 'transport', transport: 'transport', rental: 'transport',
  'whatsapp crm': 'whatsapp', 'whatsapp-crm': 'whatsapp', whatsapp: 'whatsapp',
}

function welcomeModuleKey(businessType) {
  const value = String(businessType || '').trim().toLowerCase()
  return WELCOME_MODULE_ALIASES[value] || 'general'
}

function welcomeFeatureCardHtml(feature, isLast) {
  return `
                        <tr>
                          <td style="padding:0 0 ${isLast ? '0' : '10px'};">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:${feature.bg};color:${feature.color};text-align:center;line-height:38px;font-size:19px;font-weight:900;">${feature.icon}</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">${escapeHtml(feature.title)}</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">${escapeHtml(feature.desc)}</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>`
}

export function welcomeEmail({ name = 'there', businessType = '' } = {}) {
  const safeName = escapeHtml(name || 'there')
  const workspaceUrl = 'https://nexorasolution.online/workspace'
  const supportEmail = 'support@nexorasolution.online'
  const website = 'nexorasolution.online'
  const whatsapp = '03194329754'
  const moduleContent = WELCOME_MODULE_CONTENT[welcomeModuleKey(businessType)] || WELCOME_MODULE_CONTENT.general
  const introText = escapeHtml(moduleContent.intro)
  const welcomeCards = [...moduleContent.features, WELCOME_TRIAL_CARD]
  const featureCardsHtml = welcomeCards
    .map((feature, index) => welcomeFeatureCardHtml(feature, index === welcomeCards.length - 1))
    .join('')

  return {
    subject: 'Welcome to Nexora Business Suite',
    html: `
      <!doctype html>
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Welcome to Nexora Business Suite</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            Your Digital Business Command Center is Ready.
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f7fb;margin:0;padding:0;">
            <tr>
              <td align="center" style="padding:28px 12px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
                  <tr>
                    <td style="background:#2563eb;background-image:linear-gradient(135deg,#1d4ed8 0%,#5b21b6 55%,#7c3aed 100%);padding:34px 30px 32px;color:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td width="48" height="48" align="center" style="width:48px;height:48px;border-radius:16px;background:#ffffff;padding:4px;"><img src="https://nexorasolution.online/nexora-brand-logo.png" width="40" height="40" alt="Nexora" style="display:block;width:40px;height:40px;border-radius:12px;object-fit:contain;" /></td>
                                <td style="padding-left:14px;">
                                  <div style="font-size:21px;line-height:24px;font-weight:900;letter-spacing:2px;color:#ffffff;">NEXORA SOLUTION</div>
                                  <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:#dbeafe;text-transform:uppercase;">Business Suite</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <h1 style="margin:28px 0 8px;font-size:32px;line-height:40px;font-weight:900;letter-spacing:0;color:#ffffff;">Welcome to Nexora Business Suite</h1>
                      <p style="margin:0;font-size:17px;line-height:27px;color:#eef2ff;font-weight:600;">Your Digital Business Command Center is Ready</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:30px 30px 8px;background:#ffffff;">
                      <p style="margin:0 0 12px;font-size:18px;line-height:28px;font-weight:800;color:#0f172a;">Hi ${safeName},</p>
                      <p style="margin:0;font-size:15px;line-height:25px;color:#475569;">${introText}</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 30px 10px;background:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <div style="font-size:14px;line-height:20px;font-weight:900;color:#1e3a8a;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;">Trial Status</div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="padding:6px 0;font-size:15px;line-height:22px;color:#0f172a;font-weight:700;"><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#22c55e;color:#ffffff;text-align:center;line-height:24px;font-size:13px;margin-right:8px;">&#10003;</span> Workspace Activated</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0;font-size:15px;line-height:22px;color:#0f172a;font-weight:700;"><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#22c55e;color:#ffffff;text-align:center;line-height:24px;font-size:13px;margin-right:8px;">&#10003;</span> 7-Day Trial Started</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0;font-size:15px;line-height:22px;color:#0f172a;font-weight:700;"><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#22c55e;color:#ffffff;text-align:center;line-height:24px;font-size:13px;margin-right:8px;">&#10003;</span> Secure Cloud Access Enabled</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 30px 4px;background:#ffffff;">
                      <h2 style="margin:0 0 14px;font-size:22px;line-height:30px;font-weight:900;color:#0f172a;">Your workspace tools are ready</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${featureCardsHtml}
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 30px 4px;background:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0f172a;border-radius:18px;">
                        <tr>
                          <td style="padding:22px 20px;">
                            <h2 style="margin:0 0 14px;font-size:21px;line-height:29px;font-weight:900;color:#ffffff;">Quick Start Guide</h2>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                              <tr><td style="padding:6px 0;font-size:14px;line-height:22px;color:#e2e8f0;"><span style="display:inline-block;width:25px;height:25px;border-radius:50%;background:#3b82f6;color:#ffffff;text-align:center;line-height:25px;font-size:12px;font-weight:900;margin-right:9px;">1</span> Complete Workspace Setup</td></tr>
                              <tr><td style="padding:6px 0;font-size:14px;line-height:22px;color:#e2e8f0;"><span style="display:inline-block;width:25px;height:25px;border-radius:50%;background:#3b82f6;color:#ffffff;text-align:center;line-height:25px;font-size:12px;font-weight:900;margin-right:9px;">2</span> Add Your First Customer</td></tr>
                              <tr><td style="padding:6px 0;font-size:14px;line-height:22px;color:#e2e8f0;"><span style="display:inline-block;width:25px;height:25px;border-radius:50%;background:#3b82f6;color:#ffffff;text-align:center;line-height:25px;font-size:12px;font-weight:900;margin-right:9px;">3</span> Create Your First Invoice</td></tr>
                              <tr><td style="padding:6px 0;font-size:14px;line-height:22px;color:#e2e8f0;"><span style="display:inline-block;width:25px;height:25px;border-radius:50%;background:#3b82f6;color:#ffffff;text-align:center;line-height:25px;font-size:12px;font-weight:900;margin-right:9px;">4</span> Invite Team Members</td></tr>
                              <tr><td style="padding:6px 0;font-size:14px;line-height:22px;color:#e2e8f0;"><span style="display:inline-block;width:25px;height:25px;border-radius:50%;background:#3b82f6;color:#ffffff;text-align:center;line-height:25px;font-size:12px;font-weight:900;margin-right:9px;">5</span> Track Business Performance</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:24px 30px 18px;background:#ffffff;">
                      <a href="${workspaceUrl}" style="display:block;width:100%;max-width:320px;border-radius:14px;background:#2563eb;background-image:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;font-size:16px;line-height:20px;font-weight:900;padding:16px 0;text-align:center;">Open My Workspace</a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:4px 30px 26px;background:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                        <tr>
                          <td style="padding:20px;">
                            <h2 style="margin:0 0 10px;font-size:20px;line-height:28px;font-weight:900;color:#0f172a;">Need Help?</h2>
                            <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">WhatsApp: <a href="https://wa.me/923194329754" style="color:#2563eb;text-decoration:none;font-weight:800;">${whatsapp}</a></p>
                            <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">Website: <a href="https://${website}" style="color:#2563eb;text-decoration:none;font-weight:800;">${website}</a></p>
                            <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">Support Email: <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;font-weight:800;">${supportEmail}</a></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:24px 28px 30px;background:#0b1220;text-align:center;">
                      <div style="font-size:16px;line-height:22px;font-weight:900;color:#ffffff;">Nexora Business Suite</div>
                      <div style="margin-top:8px;font-size:13px;line-height:22px;color:#cbd5e1;">CRM &bull; ERP &bull; POS &bull; Invoicing &bull; Reports</div>
                      <div style="margin-top:12px;font-size:12px;line-height:20px;color:#94a3b8;">Nexora Solution &mdash; All rights reserved 2019-2026.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
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

export function upgradeRequestReceivedEmail({
  name = 'there',
  plan = 'your selected plan',
  amount = 0,
  currency = 'PKR',
  billingCycle = '',
  paymentMethod = '',
  transactionId = '',
  paymentDate = '',
  workspaceName = '',
} = {}) {
  const paymentCard = paymentSummaryHero({
    status: 'Payment received',
    title: 'Nexora payment',
    amount,
    currency,
    orderId: transactionId,
    buttonLabel: 'View payment',
    buttonUrl: NEXORA_UPGRADE_URL,
    note: 'Under Nexora review',
  })
  const body = [
    greetingLine(name),
    leadParagraph(
      `Thank you! We&rsquo;ve received your payment for the <strong style="color:#0f172a;">${escapeHtml(plan)}</strong> plan. Our team is reviewing your details and your workspace will be upgraded shortly &mdash; usually within a few hours.`,
    ),
    detailsCard('Payment Summary', [
      ['Plan', plan],
      ['Billing Cycle', titleCase(billingCycle)],
      ['Amount Paid', money(amount, currency)],
      ['Payment Method', paymentMethod],
      ['Transaction ID', transactionId],
      ['Payment Date', paymentDate],
      ['Workspace', workspaceName],
    ]),
    noteParagraph(
      'You&rsquo;ll receive another email as soon as your upgrade is approved and active. No further action is needed right now.',
    ),
  ].join('')
  return {
    subject: 'Payment received — your upgrade is under review',
    html: modernEmailShell({
      badge: statusPill('Payment Received'),
      title: 'We received your payment',
      subtitle: 'Your upgrade request is under review.',
      topContent: paymentCard,
      schema: emailViewActionSchema({
        label: 'View payment',
        url: NEXORA_UPGRADE_URL,
        description: `View Nexora payment ${transactionId || ''}`.trim(),
      }),
      body,
    }),
  }
}

export function upgradeApprovedEmail({
  name = 'there',
  plan = 'your plan',
  amount = 0,
  currency = 'PKR',
  billingCycle = '',
  workspaceName = '',
  transactionId = '',
} = {}) {
  const paymentCard = Number(amount) > 0 ? paymentSummaryHero({
    status: 'Paid',
    title: 'Nexora bill',
    amount,
    currency,
    orderId: transactionId,
    buttonLabel: 'View bill',
    buttonUrl: NEXORA_WORKSPACE_URL,
    note: 'Plan activated',
  }) : ''
  const body = [
    greetingLine(name),
    leadParagraph(
      `Great news &mdash; your upgrade to <strong style="color:#0f172a;">${escapeHtml(plan)}</strong> has been approved and your workspace is now active. All premium features for your plan are unlocked.`,
    ),
    detailsCard('Subscription Details', [
      ['Plan', plan],
      ['Billing Cycle', titleCase(billingCycle)],
      Number(amount) > 0 ? ['Amount Paid', money(amount, currency)] : null,
      ['Workspace', workspaceName],
      ['Status', 'Active'],
    ]),
    ctaButton('Open My Workspace', NEXORA_WORKSPACE_URL),
    noteParagraph('Thank you for choosing Nexora Solution. Questions? Just reach out using the details below.'),
  ].join('')
  return {
    subject: 'Your Nexora upgrade is approved',
    html: modernEmailShell({
      accent: '#15803d',
      accentGradient: 'linear-gradient(135deg,#047857 0%,#15803d 55%,#0e7490 100%)',
      badge: statusPill('Approved'),
      title: 'Upgrade approved',
      subtitle: 'Your workspace plan is now active.',
      topContent: paymentCard,
      schema: emailViewActionSchema({
        label: 'View bill',
        url: NEXORA_WORKSPACE_URL,
        description: `View Nexora bill ${transactionId || ''}`.trim(),
      }),
      body,
    }),
  }
}

export function upgradeRejectedEmail({ name = 'there', reason = '', plan = '' } = {}) {
  const body = [
    greetingLine(name),
    leadParagraph(
      `We reviewed your upgrade request${plan ? ` for <strong style="color:#0f172a;">${escapeHtml(plan)}</strong>` : ''}, but we couldn&rsquo;t approve it this time.`,
    ),
    reason ? calloutBox('Reason', reason) : '',
    leadParagraph(
      'Please re-submit your payment details with a clear receipt, or contact our team and we&rsquo;ll help you complete the upgrade.',
    ),
    ctaButton('Re-submit Payment', NEXORA_UPGRADE_URL),
  ].join('')
  return {
    subject: 'Action needed on your upgrade request',
    html: modernEmailShell({
      accent: '#b91c1c',
      accentGradient: 'linear-gradient(135deg,#b91c1c 0%,#9f1239 55%,#7c2d12 100%)',
      badge: statusPill('Action Needed'),
      title: 'Your upgrade needs attention',
      subtitle: 'We could not approve your request yet.',
      body,
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
