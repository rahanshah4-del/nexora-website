import { createUserDoc } from './firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function isoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString()
}

function shortDate(offsetDays = 0) {
  return isoDate(offsetDays).slice(0, 10)
}

function invoiceNumber(batchId, index) {
  return `SCH-${batchId.slice(-5).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
}

function feeItem(name, amount) {
  return {
    name,
    description: 'School ERP test fee item',
    quantity: 1,
    qty: 1,
    unit: 'Month',
    price: amount,
    rate: amount,
    discount: 0,
    discountPercent: 0,
    taxRate: 0,
    taxAmount: 0,
    taxableAmount: amount,
    lineSubtotal: amount,
    lineTotal: amount,
  }
}

function totals(items = [], amountPaid = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || item.price || 0), 0)
  const paid = Math.min(Math.max(Number(amountPaid || 0), 0), subtotal)
  return {
    subtotal,
    discount: 0,
    discountTotal: 0,
    taxableAmount: subtotal,
    taxRate: 0,
    taxAmount: 0,
    taxTotal: 0,
    roundOff: 0,
    total: subtotal,
    totalUsd: subtotal,
    subtotalUsd: subtotal,
    taxAmountUsd: 0,
    amountPaid: paid,
    partialPaidAmount: paid,
    balanceDue: Math.max(subtotal - paid, 0),
  }
}

function studentRows(batchId) {
  return [
    {
      name: `Ayaan Shah Test ${batchId.slice(-4)}`,
      studentName: `Ayaan Shah Test ${batchId.slice(-4)}`,
      customerName: `Ayaan Shah Test ${batchId.slice(-4)}`,
      email: `ayaan.${batchId}@parent.test`,
      phone: '+92 300 1110001',
      parentName: 'Farhan Shah',
      guardianName: 'Farhan Shah',
      parentPhone: '+92 300 1110001',
      parentEmail: `farhan.${batchId}@parent.test`,
      className: 'Grade 5',
      class: 'Grade 5',
      section: 'A',
      rollNo: '05-A-11',
      admissionNo: `ADM-${batchId.slice(-4)}-01`,
      company: 'Grade 5 - A',
      customerType: 'Student',
      status: 'Active',
      source: 'school-test-seed',
      notes: 'Test student with parent data for School ERP verification.',
    },
    {
      name: `Hania Khan Test ${batchId.slice(-4)}`,
      studentName: `Hania Khan Test ${batchId.slice(-4)}`,
      customerName: `Hania Khan Test ${batchId.slice(-4)}`,
      email: `hania.${batchId}@parent.test`,
      phone: '+92 300 1110002',
      parentName: 'Sara Khan',
      guardianName: 'Sara Khan',
      parentPhone: '+92 300 1110002',
      parentEmail: `sara.${batchId}@parent.test`,
      className: 'Grade 8',
      class: 'Grade 8',
      section: 'B',
      rollNo: '08-B-07',
      admissionNo: `ADM-${batchId.slice(-4)}-02`,
      company: 'Grade 8 - B',
      customerType: 'Student',
      status: 'Active',
      source: 'school-test-seed',
      notes: 'Test student with pending fee bill.',
    },
    {
      name: `Omar Ali Test ${batchId.slice(-4)}`,
      studentName: `Omar Ali Test ${batchId.slice(-4)}`,
      customerName: `Omar Ali Test ${batchId.slice(-4)}`,
      email: `omar.${batchId}@parent.test`,
      phone: '+92 300 1110003',
      parentName: 'Ali Raza',
      guardianName: 'Ali Raza',
      parentPhone: '+92 300 1110003',
      parentEmail: `ali.${batchId}@parent.test`,
      className: 'Grade 10',
      class: 'Grade 10',
      section: 'C',
      rollNo: '10-C-03',
      admissionNo: `ADM-${batchId.slice(-4)}-03`,
      company: 'Grade 10 - C',
      customerType: 'Student',
      status: 'Active',
      source: 'school-test-seed',
      notes: 'Test student with partial fee collection.',
    },
  ]
}

function teacherRows(batchId) {
  return [
    {
      name: `Maryam Teacher Test ${batchId.slice(-4)}`,
      email: `maryam.teacher.${batchId}@school.test`,
      phone: '+92 300 2220001',
      role: 'teacher',
      department: 'Academics',
      subject: 'Mathematics',
      status: 'active',
      source: 'school-test-seed',
    },
    {
      name: `Ahmed Admin Test ${batchId.slice(-4)}`,
      email: `ahmed.staff.${batchId}@school.test`,
      phone: '+92 300 2220002',
      role: 'staff',
      department: 'Accounts',
      subject: 'Administration',
      status: 'active',
      source: 'school-test-seed',
    },
  ]
}

function expenseRows(batchId, currency) {
  return [
    {
      title: `Test Stationery Purchase ${batchId.slice(-4)}`,
      category: 'Stationery',
      amount: 18500,
      currency,
      paymentMethod: 'Cash',
      paidBy: 'Admin',
      status: 'approved',
      approvalStatus: 'approved',
      requiresApproval: false,
      approvedAt: isoDate(-1),
      receiptReference: `EXP-${batchId.slice(-5)}-01`,
      source: 'school-test-seed',
      notes: 'Approved test expense for reports.',
    },
    {
      title: `Test Staff Refreshment ${batchId.slice(-4)}`,
      category: 'Staff Welfare',
      amount: 7200,
      currency,
      paymentMethod: 'Bank Transfer',
      paidBy: 'Admin',
      status: 'pending',
      approvalStatus: 'pending',
      requiresApproval: true,
      receiptReference: `EXP-${batchId.slice(-5)}-02`,
      source: 'school-test-seed',
      notes: 'Pending test expense for All Records toggle.',
    },
  ]
}

function attendanceRows(students, staff, batchId) {
  return {
    studentAttendance: [
      {
        studentId: students[0].id,
        studentName: students[0].studentName,
        name: students[0].studentName,
        className: students[0].className,
        class: students[0].className,
        section: students[0].section,
        attendance: 'present',
        status: 'present',
        date: shortDate(0),
        punchTime: isoDate(0),
        source: 'school-test-seed',
        deviceName: 'Test Device',
        seedBatchId: batchId,
      },
      {
        studentId: students[1].id,
        studentName: students[1].studentName,
        name: students[1].studentName,
        className: students[1].className,
        class: students[1].className,
        section: students[1].section,
        attendance: 'late',
        status: 'late',
        date: shortDate(0),
        punchTime: isoDate(0),
        source: 'school-test-seed',
        deviceName: 'Test Device',
        seedBatchId: batchId,
      },
      {
        studentId: students[2].id,
        studentName: students[2].studentName,
        name: students[2].studentName,
        className: students[2].className,
        class: students[2].className,
        section: students[2].section,
        attendance: 'absent',
        status: 'absent',
        date: shortDate(0),
        punchTime: isoDate(0),
        source: 'school-test-seed',
        deviceName: 'Manual Test Entry',
        seedBatchId: batchId,
      },
    ],
    staffAttendance: [
      {
        staffId: staff[0].id,
        staffName: staff[0].name,
        name: staff[0].name,
        department: staff[0].department,
        attendance: 'present',
        status: 'present',
        date: shortDate(0),
        punchTime: isoDate(0),
        source: 'school-test-seed',
        deviceName: 'Test Device',
        seedBatchId: batchId,
      },
      {
        staffId: staff[1].id,
        staffName: staff[1].name,
        name: staff[1].name,
        department: staff[1].department,
        attendance: 'late',
        status: 'late',
        date: shortDate(0),
        punchTime: isoDate(0),
        source: 'school-test-seed',
        deviceName: 'Manual Test Entry',
        seedBatchId: batchId,
      },
    ],
  }
}

async function createRows({ workspaceId, collectionName, rows, businessType, userId }) {
  const created = []
  for (const row of rows) {
    const ref = await createUserDoc(
      workspaceId,
      collectionName,
      {
        ...row,
        createdBy: userId,
      },
      { businessType },
    )
    created.push({ id: ref.id, ...row })
  }
  return created
}

export async function seedSchoolTestData({
  workspaceId,
  userId,
  businessType = 'School ERP',
  currency = 'PKR',
} = {}) {
  if (!workspaceId || !userId) {
    return { ok: false, error: 'Login/workspace required before adding School ERP test data.' }
  }

  const normalizedBusinessType = normalizeBusinessType(businessType) || 'School ERP'
  const batchId = `test-${Date.now().toString(36)}`

  const students = await createRows({
    workspaceId,
    collectionName: 'customers',
    rows: studentRows(batchId).map((row) => ({ ...row, seedBatchId: batchId })),
    businessType: normalizedBusinessType,
    userId,
  })

  const staff = await createRows({
    workspaceId,
    collectionName: 'teamMembers',
    rows: teacherRows(batchId).map((row) => ({ ...row, seedBatchId: batchId })),
    businessType: normalizedBusinessType,
    userId,
  })

  const invoiceInputs = [
    { student: students[0], amount: 24500, paid: 24500, status: 'paid', method: 'Cash' },
    { student: students[1], amount: 31200, paid: 0, status: 'pending', method: 'Bank Transfer' },
    { student: students[2], amount: 28500, paid: 12000, status: 'partial_paid', method: 'EasyPaisa' },
  ]

  const invoices = []
  const payments = []
  for (let index = 0; index < invoiceInputs.length; index += 1) {
    const input = invoiceInputs[index]
    const items = [feeItem('Monthly Tuition Fee', input.amount - 3500), feeItem('Activity & Lab Charges', 3500)]
    const invoiceTotals = totals(items, input.paid)
    const invoiceRef = await createUserDoc(
      workspaceId,
      'invoices',
      {
        seedBatchId: batchId,
        source: 'school-test-seed',
        invoiceNumber: invoiceNumber(batchId, index),
        customerId: input.student.id,
        studentId: input.student.id,
        customerName: input.student.studentName,
        studentName: input.student.studentName,
        customerEmail: input.student.email,
        studentEmail: input.student.email,
        customerPhone: input.student.phone,
        studentPhone: input.student.phone,
        parentName: input.student.parentName,
        parentPhone: input.student.parentPhone,
        className: input.student.className,
        section: input.student.section,
        rollNo: input.student.rollNo,
        admissionNo: input.student.admissionNo,
        feeMonth: new Date().toLocaleString('en', { month: 'long', year: 'numeric' }),
        issueDate: shortDate(-2),
        invoiceDate: shortDate(-2),
        dueDate: shortDate(10),
        paymentTerms: 'School fee due within 10 days',
        paymentMethod: input.method,
        items,
        currency,
        status: input.status,
        paymentStatus: input.status,
        approvalStatus: input.status === 'pending' ? 'pending' : 'approved',
        requiresApproval: input.status === 'pending',
        approvedAt: input.status === 'pending' ? null : isoDate(-1),
        paidAt: input.paid > 0 ? isoDate(-1) : null,
        lastPaymentAt: input.paid > 0 ? isoDate(-1) : null,
        lastPaymentDate: input.paid > 0 ? isoDate(-1) : null,
        paymentHistory: input.paid > 0
          ? [{
              amount: input.paid,
              appliedAmount: input.paid,
              paymentMethod: input.method,
              status: input.status,
              recordedBy: userId,
              recordedAt: isoDate(-1),
            }]
          : [],
        notes: 'School ERP test fee bill.',
        terms: 'This is test data for fee collection verification.',
        ...invoiceTotals,
      },
      { businessType: normalizedBusinessType },
    )
    const invoice = { id: invoiceRef.id, ...input, ...invoiceTotals, invoiceNumber: invoiceNumber(batchId, index) }
    invoices.push(invoice)

    if (input.paid > 0) {
      const paymentRef = await createUserDoc(
        workspaceId,
        'payments',
        {
          seedBatchId: batchId,
          source: 'school-test-seed',
          invoiceId: invoiceRef.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: input.student.id,
          customerName: input.student.studentName,
          studentName: input.student.studentName,
          amount: input.paid,
          amountPaid: input.paid,
          amountUsd: input.paid,
          appliedAmount: input.paid,
          currency,
          paymentMethod: input.method,
          paymentStatus: input.status === 'paid' ? 'paid' : 'partial_paid',
          status: input.status === 'paid' ? 'paid' : 'partial_paid',
          approvalStatus: 'approved',
          paidAt: isoDate(-1),
          approvedAt: isoDate(-1),
          approvedBy: userId,
        },
        { businessType: normalizedBusinessType },
      )
      payments.push({ id: paymentRef.id, amount: input.paid })

      await createUserDoc(
        workspaceId,
        'accountTransactions',
        {
          seedBatchId: batchId,
          source: 'school-test-seed',
          transactionId: `${batchId}-fee-${index + 1}`,
          type: 'income',
          amount: input.paid,
          currency,
          method: input.method,
          status: 'approved',
          approvalStatus: 'approved',
          title: `Fee collection - ${invoice.invoiceNumber}`,
          description: `${input.student.studentName} fee payment test entry.`,
          relatedId: invoiceRef.id,
          invoiceId: invoiceRef.id,
          paymentId: paymentRef.id,
          customerName: input.student.studentName,
          approvedAt: isoDate(-1),
          approvedBy: userId,
        },
        { businessType: normalizedBusinessType },
      )
    }
  }

  const expenses = await createRows({
    workspaceId,
    collectionName: 'expenses',
    rows: expenseRows(batchId, currency).map((row) => ({ ...row, seedBatchId: batchId })),
    businessType: normalizedBusinessType,
    userId,
  })

  const attendance = attendanceRows(students, staff, batchId)
  const studentAttendance = await createRows({
    workspaceId,
    collectionName: 'studentAttendance',
    rows: attendance.studentAttendance,
    businessType: normalizedBusinessType,
    userId,
  })
  const staffAttendance = await createRows({
    workspaceId,
    collectionName: 'staffAttendance',
    rows: attendance.staffAttendance,
    businessType: normalizedBusinessType,
    userId,
  })

  return {
    ok: true,
    batchId,
    counts: {
      students: students.length,
      staff: staff.length,
      invoices: invoices.length,
      payments: payments.length,
      expenses: expenses.length,
      studentAttendance: studentAttendance.length,
      staffAttendance: staffAttendance.length,
    },
  }
}
