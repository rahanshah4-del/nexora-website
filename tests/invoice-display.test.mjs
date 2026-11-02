import test from 'node:test'
import assert from 'node:assert/strict'
import { displayStatusBadge, whatsappNumber } from '../src/crm/lib/invoiceHelpers.js'

test('whatsappNumber turns local Pakistani numbers into international digits', () => {
  assert.equal(whatsappNumber('0300 1234567'), '923001234567')
  assert.equal(whatsappNumber('+92 300-1234567'), '923001234567')
  assert.equal(whatsappNumber('0092 300 1234567'), '923001234567')
  assert.equal(whatsappNumber('923001234567'), '923001234567')
  assert.equal(whatsappNumber('3001234567'), '923001234567')
  assert.equal(whatsappNumber(''), '')
  assert.equal(whatsappNumber('+1 415 555 0100'), '14155550100')
})

test('displayStatusBadge derives overdue and partial paid', () => {
  const past = '2020-01-01'
  const future = '2999-01-01'
  assert.equal(displayStatusBadge({ status: 'sent', total: 100, amountPaid: 0, dueDate: past }).label, 'Overdue')
  assert.equal(displayStatusBadge({ status: 'sent', total: 100, amountPaid: 40, dueDate: future }).label, 'Partial Paid')
  assert.equal(displayStatusBadge({ status: 'approved', total: 100, amountPaid: 0, dueDate: future }).label, 'Approved')
  assert.equal(displayStatusBadge({ status: 'draft', total: 100, dueDate: past }).label, 'Draft')
  assert.equal(displayStatusBadge({ status: 'pending', total: 100, amountPaid: 100 }).label, 'Paid')
  assert.equal(displayStatusBadge({ status: 'cancelled', total: 100 }).label, 'Cancelled')
})
