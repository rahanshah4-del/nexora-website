import {
  calculateApprovedExpenses,
  calculateRevenue,
  getInvoiceStatus,
  invoiceBalanceDue,
  invoicePaidValue,
  isOutstandingInvoice,
} from './calculations.js'

function safeRows(rows) {
  return Array.isArray(rows) ? rows : []
}

function statusText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
}

function activeStudent(student = {}) {
  return !['inactive', 'archived', 'deleted', 'rejected', 'left', 'withdrawn'].includes(statusText(student.status || 'active'))
}

function attendanceStatus(record = {}) {
  return statusText(record.attendance || record.status || 'present') || 'present'
}

export function calculateSchoolAttendanceSummary(studentAttendance = [], staffAttendance = []) {
  const studentRows = safeRows(studentAttendance)
  const staffRows = safeRows(staffAttendance)
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
  expenses = [],
  studentAttendance = [],
  staffAttendance = [],
} = {}) {
  const invoiceRows = safeRows(invoices)
  const activeStudents = safeRows(students).filter(activeStudent)
  const paidFeeBills = invoiceRows.filter((invoice) => getInvoiceStatus(invoice) === 'paid')
  const pendingFeeBills = invoiceRows.filter(isOutstandingInvoice)
  const collected = calculateRevenue({ invoices: invoiceRows, payments: safeRows(payments) })
  const pending = pendingFeeBills.reduce((sum, invoice) => sum + invoiceBalanceDue(invoice), 0)
  const billed = invoiceRows.reduce((sum, invoice) => sum + invoicePaidValue(invoice) + invoiceBalanceDue(invoice), 0)
  const approvedExpenses = calculateApprovedExpenses(safeRows(expenses))
  const feeBase = collected + pending
  const collectionRate = feeBase > 0 ? Math.round((collected / feeBase) * 10000) / 100 : 0
  const attendance = calculateSchoolAttendanceSummary(studentAttendance, staffAttendance)

  return {
    activeStudents: activeStudents.length,
    totalFeeBills: invoiceRows.length,
    paidFeeBills: paidFeeBills.length,
    pendingFeeBills: pendingFeeBills.length,
    collected,
    pending,
    billed,
    approvedExpenses,
    netIncome: collected - approvedExpenses,
    collectionRate,
    attendance,
  }
}
