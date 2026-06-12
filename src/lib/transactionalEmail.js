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

export function welcomeEmail({ name = 'there' } = {}) {
  const safeName = escapeHtml(name || 'there')
  const workspaceUrl = 'https://nexorasolution.online/workspace'
  const supportEmail = 'support@nexorasolution.online'
  const website = 'nexorasolution.online'
  const whatsapp = '03194329754'

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
                                <td width="48" height="48" align="center" style="width:48px;height:48px;border-radius:16px;background:#ffffff;color:#4f46e5;font-size:24px;font-weight:900;line-height:48px;">N</td>
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
                      <p style="margin:0;font-size:15px;line-height:25px;color:#475569;">Your Nexora workspace is ready to help you manage customers, invoices, reports, and operations from one secure cloud platform.</p>
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
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding:0 0 10px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:#dbeafe;color:#1d4ed8;text-align:center;line-height:38px;font-size:12px;font-weight:900;">CRM</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">CRM Dashboard Ready</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">Track leads, customers, tasks, and daily business activity.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 10px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:#dcfce7;color:#15803d;text-align:center;line-height:38px;font-size:12px;font-weight:900;">CUS</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">Customer Management Ready</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">Organize customer profiles, follow-ups, and sales records.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 10px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:#fef3c7;color:#b45309;text-align:center;line-height:38px;font-size:12px;font-weight:900;">INV</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">Invoice System Ready</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">Create professional invoices and monitor payment progress.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 10px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:#ede9fe;color:#6d28d9;text-align:center;line-height:38px;font-size:12px;font-weight:900;">BI</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">Reports &amp; Analytics Ready</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">Understand revenue, expenses, invoices, and performance trends.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td width="54" style="padding:14px 0 14px 16px;vertical-align:top;"><div style="width:38px;height:38px;border-radius:13px;background:#e0f2fe;color:#0369a1;text-align:center;line-height:38px;font-size:12px;font-weight:900;">7D</div></td>
                                <td style="padding:14px 16px 14px 10px;">
                                  <div style="font-size:15px;line-height:21px;font-weight:900;color:#0f172a;">7-Day Trial Activated</div>
                                  <div style="font-size:13px;line-height:20px;color:#64748b;">Explore Nexora Business Suite with secure cloud access.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
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
        paragraph('Thank you for choosing Nexora Solution.'),
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
