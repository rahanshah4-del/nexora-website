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
    subject: 'Run your restaurant smarter with Nexora Restaurant POS',
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
    subject: 'Fleet, bookings and payments in one place with Nexora Transport',
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
    subject: 'Close more deals with Nexora CRM',
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
    subject: 'Run your school effortlessly with Nexora School ERP',
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
    subject: 'Your Nexora free trial is waiting',
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
    subject: 'Friendly reminder: your Nexora payment is due',
    bodyHtml: wrap(
      'Keep your workspace active.',
      'Hi {{name}}, this is a friendly reminder that a payment is due on your Nexora account. Renew now to avoid any interruption.',
      'Make payment',
      'https://nexorasolution.online/upgrade-business',
    ),
    bodyText: text(['Hi {{name}},', 'A payment is due on your Nexora account. Renew: https://nexorasolution.online/upgrade-business']),
  },
  {
    id: 'lead_nurture',
    name: 'Lead follow-up',
    subject: 'Still exploring business software? Nexora can help',
    bodyHtml: wrap(
      'Turn interest into a working system.',
      'Hi {{name}}, thanks for checking out Nexora. Our team can help you choose the right module, set up your workspace and migrate your daily workflow into one dashboard.',
      'Talk to Nexora',
      'https://nexorasolution.online/contact',
    ),
    bodyText: text(['Hi {{name}},', 'Thanks for checking out Nexora. We can help you choose the right module and set up your workspace.', 'Contact: https://nexorasolution.online/contact']),
  },
  {
    id: 'trial_activation',
    name: 'Trial activation guide',
    subject: 'Your Nexora trial setup checklist',
    bodyHtml: wrap(
      'Get value from your trial today.',
      'Hi {{name}}, complete your profile, add your first customer, create a sample invoice and explore reports. These steps help you see how Nexora fits your business before upgrading.',
      'Open workspace',
      'https://nexorasolution.online/workspace',
    ),
    bodyText: text(['Hi {{name}},', 'Complete your profile, add a customer, create a sample invoice and explore reports.', 'Open workspace: https://nexorasolution.online/workspace']),
  },
  {
    id: 'inactive_trial',
    name: 'Inactive trial winback',
    subject: 'Need help finishing your Nexora setup?',
    bodyHtml: wrap(
      'We can set it up with you.',
      'Hi {{name}}, your trial is still available. If setup felt busy, reply to this email and our team can guide you through module selection, staff access and first invoice/report setup.',
      'Resume setup',
      'https://nexorasolution.online/workspace',
    ),
    bodyText: text(['Hi {{name}},', 'Your trial is still available. Our team can help with module selection, staff access and first setup.', 'Resume: https://nexorasolution.online/workspace']),
  },
  {
    id: 'client_upgrade',
    name: 'Client upgrade offer',
    subject: 'Unlock more Nexora modules for your business',
    bodyHtml: wrap(
      'Scale beyond one workflow.',
      'Hi {{name}}, your Nexora workspace can grow with extra modules, advanced reports, staff controls and priority support. Upgrade when you are ready to centralize more operations.',
      'View upgrade options',
      'https://nexorasolution.online/upgrade-business',
    ),
    bodyText: text(['Hi {{name}},', 'Unlock more Nexora modules, advanced reports, staff controls and priority support.', 'Upgrade: https://nexorasolution.online/upgrade-business']),
  },
  {
    id: 'property_promo',
    name: 'Property ERP promotion',
    subject: 'Manage properties, contracts and payments with Nexora',
    bodyHtml: wrap(
      'Property operations in one place.',
      'Hi {{name}}, Nexora Property ERP helps you organize tenants, contracts, maintenance, invoices and payments without scattered files or spreadsheets.',
      'Explore Property ERP',
      'https://nexorasolution.online/solutions/property',
    ),
    bodyText: text(['Hi {{name}},', 'Organize tenants, contracts, maintenance, invoices and payments with Nexora Property ERP.']),
  },
  {
    id: 'support_checkin',
    name: 'Customer success check-in',
    subject: 'How is your Nexora workspace going?',
    bodyHtml: wrap(
      'A quick check-in from Nexora.',
      'Hi {{name}}, we wanted to check if your workspace is running smoothly. If you need help with reports, staff permissions, invoices or module setup, our team is ready to assist.',
      'Contact support',
      'https://nexorasolution.online/contact',
    ),
    bodyText: text(['Hi {{name}},', 'We wanted to check if your workspace is running smoothly. Contact us for help with reports, permissions, invoices or setup.']),
  },
]
