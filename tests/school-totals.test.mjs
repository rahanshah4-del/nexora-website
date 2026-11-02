import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSchoolDashboardStats } from '../src/crm/lib/schoolDashboardCalculations.js'
import { buildSchoolReport } from '../src/crm/lib/schoolReports.js'
import { getInvoiceStatus, isOutstandingInvoice } from '../src/crm/lib/calculations.js'

// 300 issued bills of 5,000: 100 fully paid, 50 half paid, 150 unpaid (some of them approved-but-unpaid like bulk bills).
function makeBills() {
  const bills = []
  for (let i = 0; i < 300; i += 1) {
    const paid = i < 100 ? 5000 : i < 150 ? 2500 : 0
    bills.push({
      id: `b${i}`, invoiceNumber: `FEE-${i}`, customerId: `s${i}`, customerName: `Student ${i}`, className: i % 2 ? 'Grade 5' : 'Grade 6',
      total: 5000, amountPaid: paid, balanceDue: 5000 - paid,
      status: paid === 5000 ? 'paid' : 'pending', paymentStatus: paid === 5000 ? 'paid' : paid ? 'partial_paid' : 'pending',
      approvalStatus: i % 3 === 0 || paid ? 'approved' : 'pending', dueDate: '2999-01-01', issueDate: '2026-11-01',
    })
  }
  return bills
}

test('dashboard totals cover every bill and equal the paid amounts', () => {
  const bills = makeBills()
  const stats = calculateSchoolDashboardStats({ invoices: bills, students: [] })
  assert.equal(stats.collected, 100 * 5000 + 50 * 2500) // 625,000, approved-but-unpaid bills are not "collected"
  assert.equal(stats.pending, 50 * 2500 + 150 * 5000) // 875,000
  assert.equal(stats.billed, 300 * 5000)
  assert.equal(stats.collected + stats.pending, stats.billed)
  assert.equal(stats.totalFeeBills, 300)
})

test('drafts are neither billed nor pending nor overdue', () => {
  const draft = { id: 'd', total: 3000, amountPaid: 0, balanceDue: 3000, status: 'draft', paymentStatus: 'draft', dueDate: '2020-01-01' }
  assert.equal(getInvoiceStatus(draft), 'draft')
  assert.equal(isOutstandingInvoice(draft), false)
  const stats = calculateSchoolDashboardStats({ invoices: [...makeBills(), draft] })
  assert.equal(stats.billed, 300 * 5000)
  assert.equal(stats.pending, 875000)
})

test('pending fee report equals the dashboard pending even for bills waiting for approval', () => {
  const bills = makeBills()
  const stats = calculateSchoolDashboardStats({ invoices: bills })
  const pending = buildSchoolReport('pending_fee', { fees: bills, approvedOnly: true })
  assert.equal(pending.calculatedTotal, stats.pending)
  const collection = buildSchoolReport('fee_collection', { fees: bills, approvedOnly: true })
  assert.equal(collection.calculatedTotal, stats.collected)
  const byClass = buildSchoolReport('class_fee', { fees: bills, approvedOnly: true })
  assert.equal(byClass.rows.reduce((s, r) => s + r.collected, 0), stats.collected)
  assert.equal(byClass.rows.reduce((s, r) => s + r.pending, 0), stats.pending)
})
