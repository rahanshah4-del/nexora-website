import {
  calculateApprovedExpenses,
  calculateRejectedRevenueBreakdown,
  calculateRevenue,
  getInvoiceStatus,
  invoiceBalanceDue,
  invoicePaidValue,
  isOutstandingInvoice,
  isRejectedRecord,
} from './calculations.js'

function safeRows(rows) {
  return Array.isArray(rows) ? rows : []
}

function statusText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
}

export function activeStudent(student = {}) {
  return !['inactive', 'archived', 'deleted', 'rejected', 'left', 'withdrawn'].includes(statusText(student.status || 'active'))
}

function attendanceStatus(record = {}) {
  return statusText(record.attendance || record.status || 'present') || 'present'
}

// Attendance records used to be created without an upsert check, so the
// same person + date could exist more than once (double-click, retry after
// a slow save). Keep only the latest record per person + date so those
// pre-existing duplicates don't double-count Present/Absent/Late totals.
function dedupeAttendanceRows(rows, personKey) {
  const latestByKey = new Map()
  for (const row of rows) {
    const person = row?.[personKey]
    const date = row?.date
    if (!person || !date) {
      latestByKey.set(row?.id || Math.random(), row)
      continue
    }
    const key = `${person}__${date}`
    const existing = latestByKey.get(key)
    const rowTime = new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0
    const existingTime = existing ? new Date(existing?.updatedAt || existing?.createdAt || 0).getTime() || 0 : -1
    if (!existing || rowTime >= existingTime) latestByKey.set(key, row)
  }
  return Array.from(latestByKey.values())
}

export function calculateSchoolAttendanceSummary(studentAttendance = [], staffAttendance = []) {
  const studentRows = dedupeAttendanceRows(safeRows(studentAttendance), 'studentId')
  const staffRows = dedupeAttendanceRows(safeRows(staffAttendance), 'staffId')
  const allRows = [...studentRows, ...staffRows]
  const byStatus = allRows.reduce(
    (acc, row) => {
      const status = attendanceStatus(row)
      if (status.includes('absent')) acc.absent += 1
      else if (status.includes('late')) acc.late += 1
      else acc.present += 1
      return acc
    },
    { present: 0, absent: 0, late: 0 },
  )
  const totalRecords = allRows.length
  return {
    studentRecords: studentRows.length,
    staffRecords: staffRows.length,
    totalRecords,
    present: byStatus.present,
    absent: byStatus.absent,
    late: byStatus.late,
    presentRate: totalRecords ? Math.round((byStatus.present / totalRecords) * 10000) / 100 : 0,
  }
}

export function calculateSchoolDashboardStats({
  students = [],
  invoices = [],
  payments = [],
  transactions = [],
  expenses = [],
  studentAttendance = [],
  staffAttendance = [],
} = {}) {
  const invoiceRows = safeRows(invoices)
  const activeFeeBills = invoiceRows.filter((invoice) => !isRejectedRecord(invoice))
  const activeStudents = safeRows(students).filter(activeStudent)
  const paidFeeBills = activeFeeBills.filter((invoice) => getInvoiceStatus(invoice) === 'paid')
  const collectedFeeRecords = activeFeeBills.filter((invoice) => invoicePaidValue(invoice) > 0)
  const pendingFeeBills = invoiceRows.filter(isOutstandingInvoice)
  const collected = calculateRevenue({ invoices: invoiceRows, payments: safeRows(payments), transactions: safeRows(transactions) })
  const rejected = calculateRejectedRevenueBreakdown({
    invoices: invoiceRows,
    payments: safeRows(payments),
    transactions: safeRows(transactions),
  }).totalRejected
  const pending = pendingFeeBills.reduce((sum, invoice) => sum + invoiceBalanceDue(invoice), 0)
  const billed = activeFeeBills.reduce((sum, invoice) => sum + invoicePaidValue(invoice) + invoiceBalanceDue(invoice), 0)
  const approvedExpenses = calculateApprovedExpenses(safeRows(expenses))
  const feeBase = collected + pending
  const collectionRate = feeBase > 0 ? Math.round((collected / feeBase) * 10000) / 100 : 0
  const attendance = calculateSchoolAttendanceSummary(studentAttendance, staffAttendance)

  return {
    activeStudents: activeStudents.length,
    totalFeeBills: invoiceRows.length,
    paidFeeBills: paidFeeBills.length,
    collectedFeeRecords: collectedFeeRecords.length,
    pendingFeeBills: pendingFeeBills.length,
    rejectedFeeBills: invoiceRows.length - activeFeeBills.length,
    collected,
    rejected,
    pending,
    billed,
    approvedExpenses,
    netIncome: collected - approvedExpenses,
    collectionRate,
    attendance,
  }
}
