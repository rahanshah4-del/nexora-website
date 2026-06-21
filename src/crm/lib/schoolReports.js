// School ERP Reports Center — READ-ONLY reporting layer.
//
// This module ONLY aggregates already-computed records for display/printing.
// It does NOT change fee calculations, ledger logic, payment posting,
// accounting formulas, or the approval workflow. It imports calculation
// helpers and USES them (never mutates them) so report numbers stay identical
// to the rest of the app.

import {
  expenseValue,
  getInvoiceStatus,
  invoiceBalanceDue,
  invoicePaidValue,
  invoiceValue,
  isApprovedExpense,
  isPaidRecord,
  isRejectedRecord,
  paymentValue,
} from './calculations.js'

const APPROVED_INVOICE_STATES = new Set(['approved', 'paid', 'partial_paid'])

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      return Number.isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function recordDate(record, keys) {
  for (const key of keys) {
    const d = toDate(record?.[key])
    if (d) return d
  }
  return null
}

function inWindow(date, dateWindow) {
  if (!dateWindow) return true
  if (dateWindow.start && (!date || date < dateWindow.start)) return false
  if (dateWindow.end && (!date || date > dateWindow.end)) return false
  return true
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function studentName(record) {
  return firstString(record?.studentName, record?.customerName, record?.name, 'Unknown')
}

function studentClass(record) {
  return firstString(
    record?.class,
    record?.className,
    record?.grade,
    record?.studentClass,
    record?.section,
    'Unassigned',
  )
}

function feeIsApproved(fee) {
  if (isRejectedRecord(fee)) return false
  const approvalStatus = String(fee?.approvalStatus || '').toLowerCase()
  const status = String(fee?.status || getInvoiceStatus(fee) || '').toLowerCase()
  return APPROVED_INVOICE_STATES.has(approvalStatus) || APPROVED_INVOICE_STATES.has(status)
}

function dayKey(date) {
  return date ? date.toISOString().slice(0, 10) : '—'
}
function monthKey(date) {
  return date ? date.toISOString().slice(0, 7) : '—'
}
function yearKey(date) {
  return date ? String(date.getFullYear()) : '—'
}

// Each builder returns a normalized, render-agnostic report descriptor.
// `amountKey` marks the money column the PDF generator independently sums to
// produce `pdfTotal` for the PASS/FAIL validation badge.
function makeReport({ key, title, subtitle, currency, columns, rows, amountKey, calculatedTotal, totalLabel, extraSummary = [], pdfTotalMode = 'sum' }) {
  return {
    key,
    title,
    subtitle: subtitle || '',
    currency: currency || 'PKR',
    columns,
    rows,
    amountKey,
    pdfTotalMode,
    totalLabel: totalLabel || 'Total',
    sourceCount: rows.length,
    calculatedTotal: num(calculatedTotal),
    summary: [
      { label: 'Records', value: String(rows.length) },
      { label: totalLabel || 'Total', value: `${currency || 'PKR'} ${num(calculatedTotal).toLocaleString()}` },
      ...extraSummary,
    ],
  }
}

export const SCHOOL_REPORT_DEFS = [
  { key: 'fee_collection', label: 'Student Fee Collection', group: 'Fees' },
  { key: 'pending_fee', label: 'Pending Fee', group: 'Fees' },
  { key: 'class_fee', label: 'Class-wise Fee', group: 'Fees' },
  { key: 'daily_collection', label: 'Daily Collection', group: 'Collection' },
  { key: 'monthly_collection', label: 'Monthly Collection', group: 'Collection' },
  { key: 'annual_collection', label: 'Annual Collection', group: 'Collection' },
  { key: 'expense', label: 'Expense Report', group: 'Finance' },
  { key: 'salary', label: 'Salary Report', group: 'Finance' },
  { key: 'profit_loss', label: 'Profit & Loss Summary', group: 'Finance' },
  { key: 'admission', label: 'Admission Report', group: 'Students' },
  { key: 'student_attendance', label: 'Student Attendance', group: 'Attendance' },
  { key: 'staff_attendance', label: 'Staff Attendance', group: 'Attendance' },
]

export function buildSchoolReport(reportKey, ctx) {
  const {
    fees = [],
    payments = [],
    expenses = [],
    students = [],
    staff = [],
    studentAttendance = [],
    staffAttendance = [],
    dateWindow = null,
    classFilter = 'All',
    studentFilter = 'All',
    approvedOnly = true,
    currency = 'PKR',
  } = ctx || {}

  const matchClass = (record) => classFilter === 'All' || studentClass(record) === classFilter
  const matchStudent = (record) =>
    studentFilter === 'All' || studentName(record) === studentFilter || record?.customerId === studentFilter || record?.studentId === studentFilter
  const matchApprovedPayment = (payment) => {
    if (isRejectedRecord(payment)) return false
    return approvedOnly ? isPaidRecord(payment) || String(payment?.approvalStatus || '').toLowerCase() === 'approved' : true
  }
  const activeFee = (fee) => !isRejectedRecord(fee)
  const activeExpense = (expense) => !isRejectedRecord(expense)

  switch (reportKey) {
    case 'fee_collection': {
      const rows = fees
        .filter((fee) => inWindow(recordDate(fee, ['issueDate', 'invoiceDate', 'createdAt']), dateWindow))
        .filter(activeFee)
        .filter((fee) => (approvedOnly ? feeIsApproved(fee) : true))
        .filter(matchClass)
        .filter(matchStudent)
        .filter((fee) => invoicePaidValue(fee) > 0)
        .map((fee) => ({
          student: studentName(fee),
          cls: studentClass(fee),
          feeNo: firstString(fee.invoiceNumber, fee.id),
          date: dayKey(recordDate(fee, ['issueDate', 'invoiceDate', 'createdAt'])),
          paid: invoicePaidValue(fee),
        }))
      return makeReport({
        key: reportKey, title: 'Student Fee Collection Report', currency,
        columns: [
          { key: 'student', label: 'Student' },
          { key: 'cls', label: 'Class' },
          { key: 'feeNo', label: 'Fee No' },
          { key: 'date', label: 'Date' },
          { key: 'paid', label: `Collected (${currency})`, numeric: true },
        ],
        rows, amountKey: 'paid', totalLabel: 'Total Collected',
        calculatedTotal: rows.reduce((s, r) => s + num(r.paid), 0),
      })
    }

    case 'pending_fee': {
      const rows = fees
        .filter((fee) => inWindow(recordDate(fee, ['issueDate', 'invoiceDate', 'createdAt']), dateWindow))
        .filter(activeFee)
        .filter((fee) => (approvedOnly ? feeIsApproved(fee) : true))
        .filter(matchClass)
        .filter(matchStudent)
        .filter((fee) => invoiceBalanceDue(fee) > 0 && getInvoiceStatus(fee) !== 'paid')
        .map((fee) => ({
          student: studentName(fee),
          cls: studentClass(fee),
          feeNo: firstString(fee.invoiceNumber, fee.id),
          total: invoiceValue(fee),
          paid: invoicePaidValue(fee),
          balance: invoiceBalanceDue(fee),
        }))
      return makeReport({
        key: reportKey, title: 'Pending Fee Report', currency,
        columns: [
          { key: 'student', label: 'Student' },
          { key: 'cls', label: 'Class' },
          { key: 'feeNo', label: 'Fee No' },
          { key: 'total', label: `Total (${currency})`, numeric: true },
          { key: 'paid', label: `Paid (${currency})`, numeric: true },
          { key: 'balance', label: `Balance (${currency})`, numeric: true },
        ],
        rows, amountKey: 'balance', totalLabel: 'Total Pending',
        calculatedTotal: rows.reduce((s, r) => s + num(r.balance), 0),
      })
    }

    case 'class_fee': {
      const map = new Map()
      fees
        .filter((fee) => inWindow(recordDate(fee, ['issueDate', 'invoiceDate', 'createdAt']), dateWindow))
        .filter(activeFee)
        .filter((fee) => (approvedOnly ? feeIsApproved(fee) : true))
        .filter(matchClass)
        .forEach((fee) => {
          const cls = studentClass(fee)
          const current = map.get(cls) || { cls, students: new Set(), collected: 0, pending: 0 }
          current.students.add(studentName(fee))
          current.collected += invoicePaidValue(fee)
          current.pending += invoiceBalanceDue(fee)
          map.set(cls, current)
        })
      const rows = Array.from(map.values())
        .sort((a, b) => b.collected - a.collected)
        .map((row) => ({ cls: row.cls, students: row.students.size, collected: row.collected, pending: row.pending }))
      return makeReport({
        key: reportKey, title: 'Class-wise Fee Report', currency,
        columns: [
          { key: 'cls', label: 'Class' },
          { key: 'students', label: 'Students' },
          { key: 'collected', label: `Collected (${currency})`, numeric: true },
          { key: 'pending', label: `Pending (${currency})`, numeric: true },
        ],
        rows, amountKey: 'collected', totalLabel: 'Total Collected',
        calculatedTotal: rows.reduce((s, r) => s + num(r.collected), 0),
      })
    }

    case 'daily_collection':
    case 'monthly_collection':
    case 'annual_collection': {
      const keyFn = reportKey === 'daily_collection' ? dayKey : reportKey === 'monthly_collection' ? monthKey : yearKey
      const label = reportKey === 'daily_collection' ? 'Date' : reportKey === 'monthly_collection' ? 'Month' : 'Year'
      const title = reportKey === 'daily_collection' ? 'Daily Collection Report' : reportKey === 'monthly_collection' ? 'Monthly Collection Report' : 'Annual Collection Report'
      const map = new Map()
      payments
        .filter((p) => inWindow(recordDate(p, ['paidAt', 'createdAt', 'date']), dateWindow))
        .filter(matchApprovedPayment)
        .forEach((p) => {
          const k = keyFn(recordDate(p, ['paidAt', 'createdAt', 'date']))
          const current = map.get(k) || { bucket: k, count: 0, amount: 0 }
          current.count += 1
          current.amount += paymentValue(p)
          map.set(k, current)
        })
      const rows = Array.from(map.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)))
      return makeReport({
        key: reportKey, title, currency,
        columns: [
          { key: 'bucket', label },
          { key: 'count', label: 'Payments' },
          { key: 'amount', label: `Collected (${currency})`, numeric: true },
        ],
        rows, amountKey: 'amount', totalLabel: 'Total Collected',
        calculatedTotal: rows.reduce((s, r) => s + num(r.amount), 0),
      })
    }

    case 'expense': {
      const rows = expenses
        .filter((e) => inWindow(recordDate(e, ['date', 'createdAt']), dateWindow))
        .filter(activeExpense)
        .filter((e) => (approvedOnly ? isApprovedExpense(e) : true))
        .map((e) => ({
          date: dayKey(recordDate(e, ['date', 'createdAt'])),
          category: firstString(e.category, 'General'),
          title: firstString(e.title, e.name, e.category, 'Expense'),
          amount: expenseValue(e),
        }))
      return makeReport({
        key: reportKey, title: 'Expense Report', currency,
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'category', label: 'Category' },
          { key: 'title', label: 'Description' },
          { key: 'amount', label: `Amount (${currency})`, numeric: true },
        ],
        rows, amountKey: 'amount', totalLabel: 'Total Expenses',
        calculatedTotal: rows.reduce((s, r) => s + num(r.amount), 0),
      })
    }

    case 'salary': {
      const rows = staff
        .filter(matchStudent)
        .map((member) => ({
          name: firstString(member.name, member.fullName, member.displayName, member.email, 'Staff'),
          role: firstString(member.role, member.designation, 'Staff'),
          salary: num(member.salary ?? member.monthlySalary ?? member.baseSalary ?? member.pay),
        }))
        .filter((row) => row.salary > 0 || true)
      return makeReport({
        key: reportKey, title: 'Salary Report', currency,
        columns: [
          { key: 'name', label: 'Staff Name' },
          { key: 'role', label: 'Role' },
          { key: 'salary', label: `Salary (${currency})`, numeric: true },
        ],
        rows, amountKey: 'salary', totalLabel: 'Total Salary',
        calculatedTotal: rows.reduce((s, r) => s + num(r.salary), 0),
      })
    }

    case 'profit_loss': {
      const collected = payments
        .filter((p) => inWindow(recordDate(p, ['paidAt', 'createdAt', 'date']), dateWindow))
        .filter(matchApprovedPayment)
        .reduce((s, p) => s + paymentValue(p), 0)
      const totalExpenses = expenses
        .filter((e) => inWindow(recordDate(e, ['date', 'createdAt']), dateWindow))
        .filter(activeExpense)
        .filter((e) => (approvedOnly ? isApprovedExpense(e) : true))
        .reduce((s, e) => s + expenseValue(e), 0)
      const net = collected - totalExpenses
      const rows = [
        { line: 'Total Fee Collection', type: 'Income', amount: collected },
        { line: 'Total Expenses', type: 'Expense', amount: -totalExpenses },
        { line: 'Net Profit / Loss', type: net >= 0 ? 'Profit' : 'Loss', amount: net },
      ]
      return makeReport({
        key: reportKey, title: 'Profit & Loss Summary', currency,
        columns: [
          { key: 'line', label: 'Line Item' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: `Amount (${currency})`, numeric: true },
        ],
        rows, amountKey: 'amount', totalLabel: 'Net Profit / Loss',
        calculatedTotal: net,
        pdfTotalMode: 'last-row',
        extraSummary: [
          { label: 'Income', value: `${currency} ${collected.toLocaleString()}` },
          { label: 'Expense', value: `${currency} ${totalExpenses.toLocaleString()}` },
        ],
      })
    }

    case 'admission': {
      const rows = students
        .filter(matchClass)
        .filter((s) => inWindow(recordDate(s, ['admissionDate', 'createdAt']), dateWindow))
        .map((s) => ({
          name: studentName(s),
          cls: studentClass(s),
          roll: firstString(s.rollNo, s.rollNumber, s.admissionNo, '—'),
          date: dayKey(recordDate(s, ['admissionDate', 'createdAt'])),
          status: firstString(s.status, 'active'),
        }))
      return makeReport({
        key: reportKey, title: 'Admission Report', currency,
        columns: [
          { key: 'name', label: 'Student' },
          { key: 'cls', label: 'Class' },
          { key: 'roll', label: 'Roll/Adm No' },
          { key: 'date', label: 'Admission Date' },
          { key: 'status', label: 'Status' },
        ],
        rows, amountKey: null, totalLabel: 'Total Admissions',
        calculatedTotal: rows.length,
      })
    }

    case 'student_attendance':
    case 'staff_attendance': {
      const source = reportKey === 'student_attendance' ? studentAttendance : staffAttendance
      const title = reportKey === 'student_attendance' ? 'Student Attendance Report' : 'Staff Attendance Report'
      const rows = (source || [])
        .filter((a) => inWindow(recordDate(a, ['date', 'createdAt']), dateWindow))
        .filter(matchClass)
        .map((a) => ({
          name: firstString(a.studentName, a.staffName, a.name, 'Unknown'),
          cls: studentClass(a),
          date: dayKey(recordDate(a, ['date', 'createdAt'])),
          status: firstString(a.status, a.attendance, 'present'),
        }))
      return makeReport({
        key: reportKey, title, currency,
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'cls', label: 'Class/Dept' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status' },
        ],
        rows, amountKey: null, totalLabel: 'Total Records',
        calculatedTotal: rows.length,
      })
    }

    default:
      return makeReport({ key: reportKey, title: 'Report', currency, columns: [], rows: [], amountKey: null, calculatedTotal: 0 })
  }
}

// Distinct class list for the filter, derived from students + fees (read-only).
export function deriveClassOptions({ students = [], fees = [] }) {
  const set = new Set()
  ;[...students, ...fees].forEach((record) => {
    const cls = studentClass(record)
    if (cls && cls !== 'Unassigned') set.add(cls)
  })
  return ['All', ...Array.from(set).sort()]
}

export function deriveStudentOptions({ students = [] }) {
  const set = new Set()
  students.forEach((s) => {
    const name = studentName(s)
    if (name && name !== 'Unknown') set.add(name)
  })
  return ['All', ...Array.from(set).sort()]
}
