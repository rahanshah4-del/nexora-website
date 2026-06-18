// Ready-made marketing email templates for the Nexora Email Marketing center.
// Each returns { subject, html, text }. {{name}} and {{unsubscribe}} are simple
// placeholders the editor/worker can leave as-is (unsubscribe link placeholder).

const UNSUB = '{{unsubscribe}}'

function wrap(title, bodyHtml, ctaText, ctaUrl = 'https://nexorasolution.online') {
  return `<!doctype html><html><body style="margin:0;background:#0b1020;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:18px;overflow:hidden;border:1px solid #1f2937;">
      <div style="background:linear-gradient(135deg,#6d5bff,#3b82f6);padding:22px 28px;">
        <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.04em;">NEXORA SOLUTION</span>
      </div>
      <div style="padding:28px;color:#e5e7eb;">
        <h1 style="margin:0 0 12px;color:#fff;font-size:22px;">${title}</h1>
        <div style="font-size:15px;line-height:1.7;color:#cbd5e1;">${bodyHtml}</div>
        <a href="${ctaUrl}" style="display:inline-block;margin-top:22px;background:linear-gradient(135deg,#6d5bff,#3b82f6);color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;">${ctaText}</a>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #1f2937;color:#64748b;font-size:12px;">
        <p style="margin:0 0 6px;">Nexora Solution — All rights reserved 2019-2026.</p>
        <p style="margin:0;">Don't want these emails? <a href="${UNSUB}" style="color:#94a3b8;">Unsubscribe</a></p>
      </div>
    </div>
  </div></body></html>`
}

function text(lines) {
  return `${lines.join('\n')}\n\nNexora Solution\nUnsubscribe: ${UNSUB}`
}

export const MARKETING_TEMPLATES = [
  {
    id: 'restaurant_promo',
    name: 'Restaurant POS promotion',
    subject: 'Run your restaurant smarter with Nexora Restaurant POS 🍽️',
    bodyHtml: wrap(
      'Faster orders. Happier guests.',
      'Hi {{name}}, manage dine-in, takeaway, KOT, tables and billing from one screen with <b>Nexora Restaurant POS</b>. Start your free trial today.',
      'Start free trial',
    ),
    bodyText: text(['Hi {{name}},', 'Manage dine-in, takeaway, KOT, tables and billing with Nexora Restaurant POS.', 'Start your free trial: https://nexorasolution.online']),
  },
  {
    id: 'transport_promo',
    name: 'Transport ERP promotion',
    subject: 'Fleet, bookings & payments in one place — Nexora Transport 🚚',
    bodyHtml: wrap(
      'Command your entire fleet.',
      'Hi {{name}}, track vehicles, bookings, drivers and payments with <b>Nexora Transport ERP</b>. Cut paperwork, grow margins.',
      'Explore Transport ERP',
    ),
    bodyText: text(['Hi {{name}},', 'Track vehicles, bookings, drivers and payments with Nexora Transport ERP.']),
  },
  {
    id: 'crm_promo',
    name: 'CRM promotion',
    subject: 'Close more deals with Nexora CRM 📈',
    bodyHtml: wrap(
      'Every lead, deal and follow-up — organized.',
      'Hi {{name}}, capture leads, manage pipelines, send invoices and never miss a follow-up with <b>Nexora CRM</b>.',
      'Try Nexora CRM',
    ),
    bodyText: text(['Hi {{name}},', 'Capture leads, manage pipelines and invoices with Nexora CRM.']),
  },
  {
    id: 'school_promo',
    name: 'School ERP promotion',
    subject: 'Run your school effortlessly with Nexora School ERP 🎓',
    bodyHtml: wrap(
      'Fees, students, staff & reports — handled.',
      'Hi {{name}}, manage admissions, fee collection, attendance and reports in one secure <b>Nexora School ERP</b> workspace.',
      'See School ERP',
    ),
    bodyText: text(['Hi {{name}},', 'Manage admissions, fees, attendance and reports with Nexora School ERP.']),
  },
  {
    id: 'trial_reminder',
    name: 'Trial reminder',
    subject: 'Your Nexora free trial is waiting ⏳',
    bodyHtml: wrap(
      'Pick up where you left off.',
      'Hi {{name}}, your Nexora trial is still active. Finish setting up your workspace and explore every module before it ends.',
      'Resume your trial',
      'https://nexorasolution.online/workspace',
    ),
    bodyText: text(['Hi {{name}},', 'Your Nexora trial is still active. Resume: https://nexorasolution.online/workspace']),
  },
  {
    id: 'payment_reminder',
    name: 'Payment reminder',
    subject: 'Friendly reminder: your Nexora payment is due 💳',
    bodyHtml: wrap(
      'Keep your workspace active.',
      'Hi {{name}}, this is a friendly reminder that a payment is due on your Nexora account. Renew now to avoid any interruption.',
      'Make payment',
      'https://nexorasolution.online/upgrade-business',
    ),
    bodyText: text(['Hi {{name}},', 'A payment is due on your Nexora account. Renew: https://nexorasolution.online/upgrade-business']),
  },
]
