/**
 * Bulk fee generation (pure, no Firebase): decides which students get a bill for a month, what each bill contains,
 * and builds the document that is saved. The page shows the plan as a preview before anything is written.
 *
 * Skipped students are never silent: every student gets a status and a reason.
 *   ready          bill will be created
 *   exists         already has a live (not cancelled) bill for this month
 *   no-structure   the student's class has no fee structure yet
 *   inactive       student is not Active (e.g. Suspended, Left)
 *   nothing-due    fees after discounts come to 0 (full scholarship, or no heads of the chosen kind)
 */
import { blankInvoiceItem, calculateInvoiceDraft, calculateInvoiceLine } from './invoiceHelpers.js'
import { classKey, computeStudentFees, findStructure, siblingRanks } from './schoolFees.js'

const clean = (value) => String(value ?? '').trim()

export const BULK_STATUS_LABELS = {
  ready: 'Will be created',
  exists: 'Already billed',
  'no-structure': 'Class fee not set',
  inactive: 'Not active',
  'nothing-due': 'Nothing to pay',
}

const UNIT_BY_FREQUENCY = { monthly: 'Month', term: 'Term', annual: 'Year', 'one-time': 'Once' }

export const studentName = (student = {}) => clean(student.studentName || student.name) || 'No name'

/** 'YYYY-MM' of today in local time. */
export function currentFeeMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Due date inside the fee month: day 10 of 2026-11 -> 2026-11-10 (clamped to the month's last day). */
export function dueDateFor(month, day = 10) {
  const match = /^(\d{4})-(\d{2})$/.exec(clean(month))
  if (!match) return ''
  const lastDay = new Date(Number(match[1]), Number(match[2]), 0).getDate()
  const safeDay = Math.min(Math.max(Math.floor(Number(day)) || 10, 1), lastDay)
  return `${match[1]}-${match[2]}-${String(safeDay).padStart(2, '0')}`
}

export function monthLabel(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(clean(month))
  if (!match) return clean(month)
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

const isBillable = (student) => {
  const status = clean(student.status || 'Active').toLowerCase()
  return status === 'active'
}

/**
 * @param students      all students (customers) of the school
 * @param structures    feeStructures
 * @param concessions   feeConcessions (incl. the sibling rule)
 * @param classes       class names to bill, or empty/null for the whole school
 * @param frequencies   which fee heads to include, e.g. ['monthly'] or ['monthly', 'term']
 * @param billedIds     Set of student ids that already have a live bill for the month
 */
export function planBulkFees({ students = [], structures = [], concessions = [], classes = null, frequencies = ['monthly'], billedIds = new Set() } = {}) {
  const wanted = Array.isArray(classes) && classes.length ? new Set(classes.map(classKey)) : null
  const live = concessions.filter((c) => c.kind !== 'sibling' || c.enabled !== false)
  const ranks = siblingRanks(students)

  const rows = students
    .filter((student) => !wanted || wanted.has(classKey(student.className)))
    .map((student) => {
      const base = { student, name: studentName(student), className: clean(student.className) || 'No class', gross: 0, discount: 0, total: 0, calc: null }
      if (!isBillable(student)) return { ...base, status: 'inactive', reason: `Student is ${clean(student.status) || 'not active'}.` }
      if (billedIds.has(student.id)) return { ...base, status: 'exists', reason: 'A bill for this month already exists.' }
      const structure = findStructure(structures, student.className)
      if (!structure) return { ...base, status: 'no-structure', reason: student.className ? `Set the fee for ${student.className} in Fee Structure.` : 'Student has no class.' }
      const calc = computeStudentFees({ student, structure, concessions: live, siblingRank: ranks[student.id] || 1, frequencies })
      if (!calc.lines.length || calc.net <= 0) {
        return { ...base, calc, gross: calc.gross, discount: calc.discount, status: 'nothing-due', reason: calc.gross > 0 ? 'Discounts cover the whole fee.' : 'No fee of the chosen kind for this class.' }
      }
      return { ...base, calc, gross: calc.gross, discount: calc.discount, total: calc.net, status: 'ready', reason: '' }
    })
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.name.localeCompare(b.name))

  const summary = { total: rows.length, ready: 0, exists: 0, 'no-structure': 0, inactive: 0, 'nothing-due': 0, amount: 0, discount: 0, byClass: [] }
  const byClass = new Map()
  for (const row of rows) {
    summary[row.status] += 1
    const entry = byClass.get(row.className) || { className: row.className, students: 0, ready: 0, amount: 0 }
    entry.students += 1
    if (row.status === 'ready') {
      summary.amount += row.total
      summary.discount += row.discount
      entry.ready += 1
      entry.amount += row.total
    }
    byClass.set(row.className, entry)
  }
  summary.byClass = [...byClass.values()]
  return { rows, summary }
}

/** Fee-month invoice number, e.g. FEE-202611-1042. A suffix is added if the number is already taken. */
export function billNumber({ prefix = 'FEE', month, student, taken = new Set() }) {
  const tidy = (v) => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const head = tidy(prefix) || 'FEE'
  const who = tidy(student.admissionNo) || tidy(student.id).slice(0, 6) || 'STU'
  const base = `${head}-${clean(month).replace('-', '')}-${who}`
  let candidate = base
  for (let i = 2; taken.has(candidate); i += 1) candidate = `${base}-${i}`
  taken.add(candidate)
  return candidate
}

const sumHeads = (lines, test) => lines.filter((line) => test(line.head.toLowerCase())).reduce((sum, line) => sum + line.amount, 0)

/**
 * The document saved for one student. `needsApproval` sends it to the Approval Center first; by default the
 * bill is issued straight away (approved) because the person generating it already holds the fee permission.
 */
export function buildBillPayload(row, { month, issueDate, dueDate, currency, batchId, number, needsApproval = false, businessType = 'School ERP' }) {
  const { student, calc } = row
  const items = calc.lines.map((line) => ({
    ...blankInvoiceItem(),
    name: line.head,
    description: `Fee month: ${month}`,
    quantity: 1,
    qty: 1,
    unit: UNIT_BY_FREQUENCY[line.frequency] || 'Month',
    price: line.amount,
    rate: line.amount,
    taxRate: 0,
    discountPercent: 0,
  }))
  const draft = { items, discountTotal: calc.discount, discount: calc.discount, currency }
  const totals = calculateInvoiceDraft(draft)
  const cleanItems = items.map((item) => {
    const line = calculateInvoiceLine(item)
    return { ...item, quantity: line.quantity, qty: line.quantity, price: line.price, rate: line.price, discountPercent: line.discountPercent, discountAmount: line.discountAmount, taxableAmount: line.taxableAmount, taxRate: line.taxRate, taxAmount: line.taxAmount, lineTotal: line.total }
  })
  const name = studentName(student)
  const total = totals.grandTotal
  return {
    businessType,
    invoiceNumber: number,
    customerId: student.id,
    customerName: name,
    customerEmail: clean(student.parentEmail || student.email),
    customerPhone: clean(student.parentPhone || student.phone),
    customerTaxId: '',
    customerAddress: clean(student.address || student.customerAddress),
    customerNotes: '',
    className: clean(student.className),
    section: clean(student.section),
    admissionNo: clean(student.admissionNo),
    rollNo: clean(student.rollNo),
    feeMonth: month,
    tuitionFee: sumHeads(calc.lines, (h) => h.includes('tuition')),
    admissionFee: sumHeads(calc.lines, (h) => h.includes('admission')),
    examFee: sumHeads(calc.lines, (h) => h.includes('exam')),
    transportFee: sumHeads(calc.lines, (h) => h.includes('transport')),
    otherCharges: sumHeads(calc.lines, (h) => !/tuition|transport|exam|admission/.test(h)),
    fineLateFee: 0,
    feeDiscountNote: calc.applied.map((a) => `${a.name}: ${a.amount}`).join(', '),
    issueDate,
    invoiceDate: issueDate,
    dueDate,
    paymentTerms: 'Custom',
    paymentMethod: 'Cash',
    template: 'Professional',
    attachmentName: '',
    signatureName: '',
    terms: '',
    notes: '',
    items: cleanItems,
    subtotal: totals.subtotal,
    discount: totals.discountTotal,
    discountTotal: totals.discountTotal,
    taxableAmount: totals.taxableAmount,
    taxRate: 0,
    taxAmount: 0,
    taxTotal: 0,
    roundOff: totals.roundOff,
    total,
    amountInWords: totals.amountInWords,
    currency,
    status: 'pending',
    paymentStatus: 'pending',
    approvalStatus: needsApproval ? 'pending' : 'approved',
    requiresApproval: Boolean(needsApproval),
    ...(needsApproval
      ? { approvalType: 'fee', approvalLabel: 'Fee Approval', sourceRoute: '/app/invoices', approvalAmount: total, approvalCustomerName: name }
      : {}),
    amountPaid: 0,
    partialPaidAmount: 0,
    balanceDue: total,
    paymentHistory: [],
    lastPaymentDate: null,
    recurring: false,
    recurringCycle: '',
    subtotalUsd: totals.subtotal,
    taxAmountUsd: 0,
    totalUsd: total,
    bulkBatchId: batchId,
    autoGenerated: true,
  }
}
