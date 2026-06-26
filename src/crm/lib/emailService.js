import {
  invoiceDeliveryEmail,
  sendWorkerEmail,
  supportTicketReplyEmail,
} from '../../lib/transactionalEmail.js'
import { enqueueBackgroundJob } from './backgroundJobs.js'

export const emailServiceConfigured = true

export function getEmailServiceError() {
  return emailServiceConfigured ? null : 'Email service is not configured.'
}

export async function sendInvoiceEmail({ invoice, company, businessType }) {
  const to = String(invoice?.customerEmail || '').trim()
  if (!to) return { ok: false, error: businessType === 'School ERP' ? 'Student email is missing.' : 'Customer email is missing.' }
  const email = invoiceDeliveryEmail({ invoice, company, businessType })
  if (invoice?.workspaceId && invoice?.createdBy) {
    const queued = await enqueueBackgroundJob({
      workspaceId: invoice.workspaceId,
      userId: invoice.createdBy,
      businessType,
      createdByEmail: invoice.createdByEmail || '',
      type: 'email.send',
      label: `Invoice email ${invoice.invoiceNumber || invoice.id || ''}`.trim(),
      route: '/app/invoices',
      payload: { to, ...email },
      metadata: { total: 1 },
    })
    if (queued.ok) return { ok: true, queued: true, jobId: queued.jobId }
  }
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
  if (ticket?.workspaceId && (ticket?.createdBy || ticket?.assignedToId)) {
    const queued = await enqueueBackgroundJob({
      workspaceId: ticket.workspaceId,
      userId: ticket.createdBy || ticket.assignedToId,
      businessType: ticket.businessType || '',
      createdByEmail: ticket.createdByEmail || '',
      type: 'email.send',
      label: `Support email ${ticket.ticketNumber || ticket.id || ''}`.trim(),
      route: '/app/support',
      payload: { to, ...email },
      metadata: { total: 1 },
    })
    if (queued.ok) return { ok: true, queued: true, jobId: queued.jobId }
  }
  return sendWorkerEmail({ to, ...email })
}
