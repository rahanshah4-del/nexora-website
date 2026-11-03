/**
 * The addresses Nexora may send from, one per department. Shared by the Worker (the only place that decides)
 * and the Control Centre (the "From" picker). Anything not listed here can never be used as a sender.
 */
export const DOMAIN = 'nexorasolution.us'

export const SENDERS = [
  { id: 'support', name: 'Nexora Support', signature: 'Nexora Support Team', emoji: '🛟' },
  { id: 'billing', name: 'Nexora Billing', signature: 'Nexora Billing Team', emoji: '💳' },
  { id: 'sales', name: 'Nexora Sales', signature: 'Nexora Sales Team', emoji: '💼' },
  { id: 'hello', name: 'Nexora Team', signature: 'Nexora Team', emoji: '👋' },
  { id: 'info', name: 'Nexora Info', signature: 'Nexora Team', emoji: 'ℹ️' },
  { id: 'ai', name: 'Nexora AI', signature: 'Nexora AI Team', emoji: '🤖' },
  // Personal identities: a real person's name in the inbox of the customer.
  { id: 'rahan', name: 'Rahan | Nexora Solution', signature: 'Rahan', emoji: '👤' },
  { id: 'ceo', name: 'Rahan, CEO | Nexora Solution', signature: 'Rahan, CEO', emoji: '👔' },
  { id: 'author', name: 'Nexora Author', signature: 'Nexora Author', emoji: '✍️' },
]

const ALIASES = { rehan: 'rahan', founder: 'ceo', editor: 'author', hallo: 'hello', help: 'support', contact: 'info', enquiries: 'info', inquiries: 'info', accounts: 'billing', invoices: 'billing', payments: 'billing' }

export const senderEmail = (sender) => `${sender.id}@${DOMAIN}`
export const fromHeader = (sender) => `${sender.name} <${senderEmail(sender)}>`

/**
 * 'billing', 'billing@nexorasolution.us', 'Hallo@nexorasolution.online' -> the sender, or null.
 * Works on the part before the @, so mail that arrived on the old .online domain maps to the same department.
 */
export function pickSender(value) {
  const local = String(value || '').trim().toLowerCase().replace(/^.*</, '').replace(/>.*$/, '').split('@')[0].split('+')[0]
  const id = ALIASES[local] || local
  return SENDERS.find((sender) => sender.id === id) || null
}

/** Department for a reply: the one the customer wrote to, else support. */
export function senderForReply(receivedAt) {
  return pickSender(receivedAt) || SENDERS[0]
}
