import test from 'node:test'
import assert from 'node:assert/strict'
import { billNumber, buildBillPayload, dueDateFor, planBulkFees } from '../src/crm/lib/bulkFees.js'

const structures = [
  { id: 's5', className: 'Grade 5', fees: [
    { head: 'Tuition Fee', amount: 5000, frequency: 'monthly' },
    { head: 'Transport Fee', amount: 1500, frequency: 'monthly' },
    { head: 'Exam Fee', amount: 800, frequency: 'term' },
  ] },
]
const concessions = [
  { id: 'sib', kind: 'sibling', secondPercent: 10, thirdPlusPercent: 20, heads: 'tuition', enabled: true },
  { id: 'sch', kind: 'scholarship', name: 'Merit', type: 'percent', value: 100, heads: 'all' },
]
const students = [
  { id: 'a', studentName: 'Ali', className: 'Grade 5', admissionNo: '1', parentPhone: '0300 1111111', status: 'Active' },
  { id: 'b', studentName: 'Sara', className: 'grade  5', admissionNo: '2', parentPhone: '03001111111', status: 'Active' },
  { id: 'c', studentName: 'Omar', className: 'Grade 9', admissionNo: '3', status: 'Active' },
  { id: 'd', studentName: 'Hina', className: 'Grade 5', admissionNo: '4', status: 'Suspended' },
  { id: 'e', studentName: 'Zed', className: 'Grade 5', admissionNo: '5', status: 'Active', concessionIds: ['sch'] },
  { id: 'f', studentName: 'Bilal', className: 'Grade 5', admissionNo: '6', status: 'Active' },
]

test('plan: statuses, sibling discount, totals', () => {
  const { rows, summary } = planBulkFees({ students, structures, concessions, billedIds: new Set(['f']) })
  const by = Object.fromEntries(rows.map((r) => [r.student.id, r]))
  assert.equal(by.a.status, 'ready'); assert.equal(by.a.total, 6500)
  assert.equal(by.b.status, 'ready'); assert.equal(by.b.total, 6000) // 2nd child: 10% off tuition
  assert.equal(by.c.status, 'no-structure')
  assert.equal(by.d.status, 'inactive')
  assert.equal(by.e.status, 'nothing-due')
  assert.equal(by.f.status, 'exists')
  assert.equal(summary.ready, 2); assert.equal(summary.amount, 12500)
})

test('plan: class filter and term heads', () => {
  const only = planBulkFees({ students, structures, concessions, classes: ['Grade 9'] })
  assert.equal(only.rows.length, 1)
  const withTerm = planBulkFees({ students, structures, concessions, frequencies: ['monthly', 'term'], classes: ['Grade 5'] })
  assert.equal(withTerm.rows.find((r) => r.student.id === 'a').total, 7300)
})

test('bill payload totals match plan and carry fee fields', () => {
  const { rows } = planBulkFees({ students, structures, concessions })
  const row = rows.find((r) => r.student.id === 'b')
  const p = buildBillPayload(row, { month: '2026-11', issueDate: '2026-11-01', dueDate: '2026-11-10', currency: 'PKR', batchId: 'B1', number: 'FEE-202611-2' })
  assert.equal(p.total, 6000); assert.equal(p.balanceDue, 6000); assert.equal(p.discountTotal, 500)
  assert.equal(p.tuitionFee, 5000); assert.equal(p.transportFee, 1500); assert.equal(p.feeMonth, '2026-11')
  assert.equal(p.approvalStatus, 'approved'); assert.equal(p.requiresApproval, false); assert.equal(p.bulkBatchId, 'B1')
  const approval = buildBillPayload(row, { month: '2026-11', issueDate: 'x', dueDate: 'y', currency: 'PKR', batchId: 'B1', number: 'n', needsApproval: true })
  assert.equal(approval.approvalStatus, 'pending'); assert.equal(approval.requiresApproval, true)
})

test('due date and numbers', () => {
  assert.equal(dueDateFor('2026-02', 31), '2026-02-28')
  assert.equal(dueDateFor('2026-11', 10), '2026-11-10')
  const taken = new Set(['FEE-202611-1'])
  assert.equal(billNumber({ month: '2026-11', student: { admissionNo: '1' }, taken }), 'FEE-202611-1-2')
  assert.equal(billNumber({ month: '2026-11', student: { id: 'abc123xyz' }, taken }), 'FEE-202611-ABC123')
})
