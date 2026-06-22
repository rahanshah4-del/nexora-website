import assert from 'node:assert/strict'
import { hasOpenInvoicePayment, openPaymentInvoiceIds, pendingInvoicePaymentId } from '../src/crm/lib/approvalQueue.js'
import { calculateApprovedExpenses } from '../src/crm/lib/calculations.js'
import { calculateSchoolDashboardStats } from '../src/crm/lib/schoolDashboardCalculations.js'
import { buildSchoolReport } from '../src/crm/lib/schoolReports.js'
import { calculateInvoiceTotals } from '../src/crm/lib/calculations.js'

function closeTo(actual, expected, label) {
  assert.equal(Math.round(Number(actual) * 100) / 100, expected, label)
}

const students = [
  { id: 's-1', name: 'Ali Khan', className: 'Class 5', section: 'A', status: 'active', admissionDate: '2026-06-01' },
  { id: 's-2', name: 'Sara Ahmed', className: 'Class 5', section: 'A', status: 'active', admissionDate: '2026-06-02' },
  { id: 's-3', name: 'Old Student', className: 'Class 6', section: 'B', status: 'left', admissionDate: '2026-06-03' },
]

const feeBillTotals = calculateInvoiceTotals({
  customerName: 'Ali Khan',
  currency: 'PKR',
  items: [
    { name: 'Tuition Fee', quantity: 1, price: 10000 },
    { name: 'Exam Fee', quantity: 1, price: 2000 },
  ],
  amountPaid: 7000,
})

const fees = [
  {
    id: 'fee-1',
    invoiceNumber: 'FEE-001',
    customerName: 'Ali Khan',
    className: 'Class 5',
    section: 'A',
    total: feeBillTotals.total,
    amountPaid: feeBillTotals.amountPaid,
    balanceDue: feeBillTotals.balanceDue,
    status: 'partial_paid',
    approvalStatus: 'approved',
    createdAt: '2026-06-05T10:00:00.000Z',
  },
  {
    id: 'fee-2',
    invoiceNumber: 'FEE-002',
    customerName: 'Sara Ahmed',
    className: 'Class 5',
    section: 'A',
    total: 8000,
    amountPaid: 8000,
    status: 'paid',
    approvalStatus: 'approved',
    createdAt: '2026-06-06T10:00:00.000Z',
  },
  {
    id: 'fee-3',
    invoiceNumber: 'FEE-003',
    customerName: 'Old Student',
    className: 'Class 6',
    section: 'B',
    total: 5000,
    amountPaid: 0,
    status: 'pending',
    approvalStatus: 'pending',
    createdAt: '2026-06-07T10:00:00.000Z',
  },
]

const payments = [
  { id: 'pay-1', invoiceId: 'fee-1', amount: 7000, status: 'paid', paidAt: '2026-06-05T12:00:00.000Z' },
  { id: 'pay-2', invoiceId: 'fee-2', amount: 8000, status: 'paid', paidAt: '2026-06-06T12:00:00.000Z' },
  { id: 'pay-3', invoiceId: 'fee-3', amount: 1000, status: 'pending', paidAt: '2026-06-07T12:00:00.000Z' },
]

const expenses = [
  { id: 'exp-1', title: 'Stationery', category: 'Admin', amount: 2500, status: 'approved', date: '2026-06-08' },
  { id: 'exp-2', title: 'Repair', category: 'Maintenance', amount: 1000, status: 'pending', date: '2026-06-09' },
]

const staff = [
  { id: 't-1', name: 'Teacher One', role: 'Teacher', salary: 30000 },
  { id: 't-2', name: 'Accountant', role: 'Admin', monthlySalary: 25000 },
]

const studentAttendance = [
  { studentName: 'Ali Khan', className: 'Class 5', section: 'A', status: 'present', date: '2026-06-10' },
  { studentName: 'Sara Ahmed', className: 'Class 5', section: 'A', attendance: 'absent', date: '2026-06-10' },
]

const staffAttendance = [
  { staffName: 'Teacher One', role: 'Teacher', status: 'late', date: '2026-06-10' },
  { staffName: 'Accountant', role: 'Admin', status: 'present', date: '2026-06-10' },
]

const ctx = {
  fees,
  payments,
  expenses,
  students,
  staff,
  studentAttendance,
  staffAttendance,
  approvedOnly: true,
  currency: 'PKR',
}

const dashboard = calculateSchoolDashboardStats({
  students,
  invoices: fees,
  payments,
  expenses,
  studentAttendance,
  staffAttendance,
})
assert.equal(dashboard.activeStudents, 2, 'active students')
assert.equal(dashboard.totalFeeBills, 3, 'total fee bills')
assert.equal(dashboard.paidFeeBills, 1, 'paid fee bills')
assert.equal(dashboard.collectedFeeRecords, 2, 'collected fee records')
assert.equal(dashboard.pendingFeeBills, 2, 'dashboard pending fee bills include all outstanding records')
closeTo(dashboard.collected, 15000, 'collected fees')
closeTo(dashboard.pending, 10000, 'dashboard pending fees include all outstanding records')
closeTo(dashboard.billed, 25000, 'billed total')
closeTo(dashboard.approvedExpenses, 2500, 'approved expenses')
closeTo(dashboard.netIncome, 12500, 'net income')
closeTo(dashboard.collectionRate, 60, 'collection rate')
assert.equal(dashboard.attendance.totalRecords, 4, 'attendance records')
assert.equal(dashboard.attendance.present, 2, 'present attendance')
assert.equal(dashboard.attendance.absent, 1, 'absent attendance')
assert.equal(dashboard.attendance.late, 1, 'late attendance')
closeTo(dashboard.attendance.presentRate, 50, 'present rate')

const rejectedDashboard = calculateSchoolDashboardStats({
  invoices: [{
    id: 'fee-rejected',
    invoiceNumber: 'FEE-REJECTED',
    total: 6000,
    amountPaid: 6000,
    status: 'paid',
    paymentStatus: 'paid',
    approvalStatus: 'rejected',
  }],
  payments: [{
    id: 'payment-rejected',
    invoiceId: 'fee-rejected',
    amount: 6000,
    status: 'paid',
    paymentStatus: 'paid',
    approvalStatus: 'rejected',
  }, {
    id: 'payment-approved-sibling',
    invoiceId: 'fee-rejected',
    amount: 6000,
    status: 'paid',
    paymentStatus: 'paid',
    approvalStatus: 'approved',
  }],
  transactions: [{
    id: 'income-stale',
    invoiceId: 'fee-rejected',
    relatedId: 'fee-rejected',
    type: 'income',
    amount: 6000,
    status: 'approved',
    approvalStatus: 'approved',
  }],
})
closeTo(rejectedDashboard.collected, 0, 'rejected approval excluded from collected revenue')
closeTo(rejectedDashboard.rejected, 6000, 'rejected approval amount')
closeTo(rejectedDashboard.billed, 0, 'rejected approval excluded from active billed total')
closeTo(rejectedDashboard.pending, 0, 'rejected approval excluded from pending fees')
closeTo(rejectedDashboard.netIncome, 0, 'rejected approval excluded from net income')
assert.equal(rejectedDashboard.rejectedFeeBills, 1, 'rejected fee bill count')
assert.equal(rejectedDashboard.collectedFeeRecords, 0, 'rejected fee bill excluded from collected record count')

const pendingPayment = { invoiceId: 'fee-invoice-1', status: 'pending_verification', approvalStatus: 'pending', requiresApproval: true }
assert.equal(hasOpenInvoicePayment('fee-invoice-1', [pendingPayment]), true, 'pending payment should suppress duplicate invoice approval')
assert.equal(openPaymentInvoiceIds([pendingPayment]).size, 1, 'one invoice should map to one canonical pending payment')
assert.equal(pendingInvoicePaymentId('fee-invoice-1', 0), pendingInvoicePaymentId('fee-invoice-1', 0), 'pending payment id must be deterministic for double-click protection')
assert.notEqual(pendingInvoicePaymentId('fee-invoice-1', 0), pendingInvoicePaymentId('fee-invoice-1', 5000), 'next partial-payment cycle must receive a new deterministic id')
closeTo(calculateApprovedExpenses(
  [{ id: 'expense-1', amount: 2500, status: 'approved' }],
  [
    { id: 'expense-pay-1', expenseId: 'expense-1', amount: 2500, type: 'expense', status: 'approved' },
    { id: 'expense-pay-duplicate', relatedId: 'expense-1', amount: 2500, type: 'expense', status: 'approved' },
  ],
), 2500, 'duplicate linked expense transactions must be capped to expense total')

const rejectedReportContext = {
  ...ctx,
  approvedOnly: false,
  fees: [{
    id: 'fee-rejected',
    invoiceNumber: 'FEE-REJECTED',
    customerName: 'Rejected Student',
    total: 76200,
    amountPaid: 76200,
    status: 'paid',
    paymentStatus: 'paid',
    approvalStatus: 'rejected',
    createdAt: '2026-06-08T10:00:00.000Z',
  }],
  payments: [{
    id: 'payment-rejected',
    invoiceId: 'fee-rejected',
    amount: 76200,
    status: 'paid',
    paymentStatus: 'paid',
    approvalStatus: 'rejected',
    paidAt: '2026-06-08T12:00:00.000Z',
  }],
}
const rejectedFeeCollection = buildSchoolReport('fee_collection', rejectedReportContext)
assert.equal(rejectedFeeCollection.sourceCount, 0, 'rejected fee excluded from all-records fee collection')
closeTo(rejectedFeeCollection.calculatedTotal, 0, 'rejected fee excluded from all-records fee total')
const rejectedDailyCollection = buildSchoolReport('daily_collection', rejectedReportContext)
assert.equal(rejectedDailyCollection.sourceCount, 0, 'rejected payment excluded from collection reports')

const feeCollection = buildSchoolReport('fee_collection', ctx)
assert.equal(feeCollection.sourceCount, 2, 'fee collection rows')
closeTo(feeCollection.calculatedTotal, 15000, 'fee collection total')

const pendingFee = buildSchoolReport('pending_fee', ctx)
assert.equal(pendingFee.sourceCount, 1, 'pending fee rows')
closeTo(pendingFee.calculatedTotal, 5000, 'pending fee total')

const classFee = buildSchoolReport('class_fee', ctx)
assert.equal(classFee.sourceCount, 1, 'class fee rows')
closeTo(classFee.calculatedTotal, 15000, 'class fee collected')

const dailyCollection = buildSchoolReport('daily_collection', ctx)
assert.equal(dailyCollection.sourceCount, 2, 'daily collection buckets')
closeTo(dailyCollection.calculatedTotal, 15000, 'daily collection total')

const expenseReport = buildSchoolReport('expense', ctx)
assert.equal(expenseReport.sourceCount, 1, 'approved expense rows')
closeTo(expenseReport.calculatedTotal, 2500, 'expense report total')

const salaryReport = buildSchoolReport('salary', ctx)
assert.equal(salaryReport.sourceCount, 2, 'salary rows')
closeTo(salaryReport.calculatedTotal, 55000, 'salary total')

const profitLoss = buildSchoolReport('profit_loss', ctx)
closeTo(profitLoss.calculatedTotal, 12500, 'profit and loss net')

const admission = buildSchoolReport('admission', ctx)
assert.equal(admission.sourceCount, 3, 'admission report records')

const studentAttendanceReport = buildSchoolReport('student_attendance', ctx)
assert.equal(studentAttendanceReport.sourceCount, 2, 'student attendance records')

const staffAttendanceReport = buildSchoolReport('staff_attendance', ctx)
assert.equal(staffAttendanceReport.sourceCount, 2, 'staff attendance records')

console.log('School ERP calculation audit passed')
console.table({
  students: dashboard.activeStudents,
  feeBills: dashboard.totalFeeBills,
  collected: dashboard.collected,
  pending: dashboard.pending,
  collectionRate: dashboard.collectionRate,
  approvedExpenses: dashboard.approvedExpenses,
  netIncome: dashboard.netIncome,
  attendanceRecords: dashboard.attendance.totalRecords,
})
