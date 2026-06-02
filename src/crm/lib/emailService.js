import {
  invoiceDeliveryEmail,
  sendWorkerEmail,
  supportTicketReplyEmail,
} from '../../lib/transactionalEmail.js'

export const emailServiceConfigured = true

export function getEmailServiceError() {
  return emailServiceConfigured ? null : 'Email service is not configured.'
}

export async function sendInvoiceEmail({ invoice, company, businessType }) {
  const to = String(invoice?.customerEmail || '').trim()
  if (!to) return { ok: false, error: businessType === 'School ERP' ? 'Student email is missing.' : 'Customer email is missing.' }
  const email = invoiceDeliveryEmail({ invoice, company, businessType })
  return sendWorkerEmail({ to, ...email })
}

export async function sendSupportReplyEmail({ ticket, message }) {
  const to = String(ticket?.customerEmail || '').trim()
  if (!to) return { ok: false, error: 'Customer email is missing.' }
  const email = supportTicketReplyEmail({
    ticketNumber: ticket?.ticketNumber || ticket?.id || '',
    subject: ticket?.subject || 'Support ticket',
    message,
  })
  return sendWorkerEmail({ to, ...email })
}
