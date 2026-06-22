import assert from 'node:assert/strict'
import { contactStats, followUpStats, leadStats, normalizePhone, renderTemplate, templateStats, waLink } from '../src/crm/lib/whatsappManual.js'

const contacts = [{ status: 'Active' }, { status: 'Customer' }, { status: 'Blocked' }]
const leads = [{ stage: 'New', value: 10000 }, { stage: 'Won', value: 20000 }, { stage: 'Lost', value: 5000 }]
const followUps = [
  { status: 'Pending', dueDate: '2026-06-21' },
  { status: 'Pending', dueDate: '2026-06-22' },
  { status: 'Pending', dueDate: '2026-06-24' },
  { status: 'Completed', dueDate: '2026-06-20' },
]

const contactSummary = contactStats(contacts)
assert.equal(contactSummary.active, 2, 'active contacts include customers')
assert.equal(contactSummary.blocked, 1, 'blocked contacts')
const leadSummary = leadStats(leads)
assert.equal(leadSummary.pipelineValue, 10000, 'open lead pipeline excludes won and lost')
assert.equal(leadSummary.wonValue, 20000, 'won lead value')
const followUpSummary = followUpStats(followUps, new Date('2026-06-22T12:00:00Z'))
assert.equal(followUpSummary.overdue, 1, 'overdue follow-up')
assert.equal(followUpSummary.dueToday, 1, 'today follow-up')
assert.equal(followUpSummary.dueSoon, 1, 'due soon follow-up')
assert.equal(templateStats([{ category: 'Sales' }, { category: 'Sales' }]).byCategory.Sales, 2, 'template category count')
assert.equal(normalizePhone('+92 300-1234567'), '923001234567', 'phone normalization')
assert.equal(waLink('+92 300-1234567', 'Hello'), 'https://wa.me/923001234567?text=Hello', 'WhatsApp deep link')
assert.equal(renderTemplate('Hi {{name}}', { name: 'Ali' }), 'Hi Ali', 'template rendering')

console.log('WhatsApp CRM calculation audit passed')
console.table({ contacts: contactSummary.total, openLeads: leadSummary.open, pipeline: leadSummary.pipelineValue, pendingFollowUps: followUpSummary.pending })
