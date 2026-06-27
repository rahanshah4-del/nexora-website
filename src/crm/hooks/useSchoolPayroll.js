import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc, removeUserDoc } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { useUser } from './useUser.js'

function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

function salaryOf(member = {}) {
  return money(member.salary ?? member.monthlySalary ?? member.baseSalary ?? member.pay)
}

function paymentDateValue(payment = {}) {
  const value = payment.paymentDate || payment.paidAt || payment.createdAt
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

export function calculateSalaryPayment({ baseSalary = 0, allowance = 0, bonus = 0, deduction = 0 } = {}) {
  const base = money(baseSalary)
  const extra = money(allowance) + money(bonus)
  const cuts = money(deduction)
  return {
    baseSalary: base,
    allowance: money(allowance),
    bonus: money(bonus),
    deduction: cuts,
    grossPay: base + extra,
    netPay: Math.max(0, base + extra - cuts),
  }
}

export function useSchoolPayroll() {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setMembers([])
        setMembersLoading(false)
        setError('')
      })
      return undefined
    }

    setMembersLoading(true)
    return listenToWorkspaceCollection({
      workspaceId,
      businessType,
      collectionName: 'payrollMembers',
      orderByField: null,
      limitCount: 600,
      onData: (rows) => {
        setMembers(rows.sort((a, b) => String(a.name || a.fullName || '').localeCompare(String(b.name || b.fullName || ''))))
        setMembersLoading(false)
        setError('')
      },
      onError: (err) => {
        setMembers([])
        setMembersLoading(false)
        setError(clientSafeMessage(err, 'Unable to load payroll members.'))
      },
    })
  }, [businessType, workspaceId])

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setPayments([])
        setPaymentsLoading(false)
        setError('')
      })
      return undefined
    }

    setPaymentsLoading(true)
    return listenToWorkspaceCollection({
      workspaceId,
      businessType,
      collectionName: 'staffSalaryPayments',
      orderByField: null,
      limitCount: 600,
      onData: (rows) => {
        setPayments([...rows].sort((a, b) => paymentDateValue(b) - paymentDateValue(a)))
        setPaymentsLoading(false)
        setError('')
      },
      onError: (err) => {
        setPayments([])
        setPaymentsLoading(false)
        setError(clientSafeMessage(err, 'Unable to load salary payments.'))
      },
    })
  }, [businessType, workspaceId])

  return useMemo(() => {
    const loading = membersLoading || paymentsLoading
    const currentMonth = monthKey()
    const staffWithSalary = members.filter((member) => salaryOf(member) > 0)
    const monthlyPayroll = staffWithSalary.reduce((sum, member) => sum + salaryOf(member), 0)
    const paidThisMonth = payments
      .filter((payment) => String(payment.salaryMonth || payment.month || '').slice(0, 7) === currentMonth)
      .filter((payment) => ['approved', 'paid'].includes(String(payment.approvalStatus || payment.status || '').toLowerCase()))
      .reduce((sum, payment) => sum + money(payment.netPay ?? payment.amount ?? payment.paidAmount), 0)

    return {
      members,
      payments,
      loading,
      error,
      currentMonth,
      staffWithSalary,
      monthlyPayroll,
      paidThisMonth,
      pendingThisMonth: Math.max(0, monthlyPayroll - paidThisMonth),
      salaryOf,
      async addPayrollMember(payload = {}) {
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        const name = String(payload.name || payload.fullName || '').trim()
        if (!name) return { ok: false, error: 'Enter teacher or staff name.' }
        const salary = money(payload.salary || payload.monthlySalary)
        try {
          const ref = await createUserDoc(
            workspaceId,
            'payrollMembers',
            {
              name,
              fullName: name,
              email: String(payload.email || '').trim(),
              phone: String(payload.phone || '').trim(),
              role: payload.role || payload.designation || 'Staff',
              department: payload.department || '',
              designation: payload.designation || payload.role || 'Staff',
              salary,
              monthlySalary: salary,
              salaryType: payload.salaryType || 'monthly',
              salaryStatus: payload.salaryStatus || 'active',
              status: payload.status || 'active',
              salaryNotes: payload.salaryNotes || '',
              createdBy: userId,
            },
            { businessType },
          )
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Payroll member added',
            module: 'School Payroll',
            description: `${name} was added directly in Salary / Payroll.`,
            targetId: ref.id,
            targetName: name,
            metadata: { salary, role: payload.role || payload.designation || 'Staff' },
          })
          return { ok: true, id: ref.id }
        } catch (err) {
          return { ok: false, error: clientSafeMessage(err, 'Unable to add payroll member.') }
        }
      },
      async saveSalaryProfile(memberId, patch = {}) {
        if (!workspaceId || !userId || !memberId) return { ok: false, error: 'Please login first' }
        const member = members.find((item) => item.id === memberId) || {}
        const salaryPatch = {
          salary: money(patch.salary),
          monthlySalary: money(patch.salary),
          salaryType: patch.salaryType || 'monthly',
          salaryStatus: patch.salaryStatus || 'active',
          department: patch.department || member.department || '',
          designation: patch.designation || member.designation || member.role || '',
          salaryNotes: patch.salaryNotes || '',
          userId: member.userId || member.uid || member.staffId || member.email || memberId,
        }
        try {
          await patchUserDoc(workspaceId, 'payrollMembers', memberId, salaryPatch, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Salary profile updated',
            module: 'School Payroll',
            description: `${member.name || 'Staff member'} salary profile was updated.`,
            targetId: memberId,
            targetName: member.name || member.email || memberId,
            metadata: { salary: salaryPatch.salary, salaryType: salaryPatch.salaryType },
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: clientSafeMessage(err, 'Unable to save salary profile.') }
        }
      },
      async recordSalaryPayment(payload = {}) {
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        const staffId = payload.staffId || ''
        const member = members.find((item) => item.id === staffId) || {}
        if (!staffId) return { ok: false, error: 'Select teacher or staff first.' }
        const calc = calculateSalaryPayment(payload)
        if (calc.netPay <= 0) return { ok: false, error: 'Net salary must be greater than zero.' }
        const staffName = member.name || member.fullName || payload.staffName || 'Staff'
        const salaryMonth = payload.salaryMonth || currentMonth
        try {
          const ref = await createUserDoc(
            workspaceId,
            'staffSalaryPayments',
            {
              staffId,
              staffName,
              role: member.role || member.designation || payload.role || 'Staff',
              department: member.department || payload.department || '',
              salaryMonth,
              paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
              paymentMethod: payload.paymentMethod || 'Cash',
              transactionRef: payload.transactionRef || '',
              remarks: payload.remarks || '',
              status: 'pending',
              approvalStatus: 'pending',
              paymentStatus: 'pending',
              requiresApproval: true,
              ...calc,
              amount: calc.netPay,
              paidAmount: calc.netPay,
              createdBy: userId,
            },
            { businessType },
          )
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Salary payment submitted',
            module: 'School Payroll',
            description: `${staffName} salary payment was submitted for approval for ${salaryMonth}.`,
            targetId: ref.id,
            targetName: staffName,
            metadata: { salaryMonth, netPay: calc.netPay, paymentMethod: payload.paymentMethod || 'Cash' },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'School Payroll',
            priority: 'high',
            title: 'Salary approval needed',
            message: `${staffName} salary payment for ${salaryMonth} needs approval.`,
            relatedId: ref.id,
            route: '/app/approvals',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
            metadata: { salaryMonth, amount: calc.netPay, staffId },
          })
          return { ok: true, id: ref.id }
        } catch (err) {
          return { ok: false, error: clientSafeMessage(err, 'Unable to record salary payment.') }
        }
      },
      async updateSalaryPayment(id, payload = {}) {
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        const row = payments.find((item) => item.id === id)
        if (!row) return { ok: false, error: 'Salary payment not found.' }
        if (['approved', 'paid'].includes(String(row.approvalStatus || row.status || '').toLowerCase())) {
          return { ok: false, error: 'Approved salary payments cannot be edited.' }
        }
        const calc = calculateSalaryPayment(payload)
        if (calc.netPay <= 0) return { ok: false, error: 'Net salary must be greater than zero.' }
        try {
          await patchUserDoc(workspaceId, 'staffSalaryPayments', id, {
            salaryMonth: payload.salaryMonth || row.salaryMonth || currentMonth,
            paymentDate: payload.paymentDate || row.paymentDate || new Date().toISOString().slice(0, 10),
            paymentMethod: payload.paymentMethod || row.paymentMethod || 'Cash',
            transactionRef: payload.transactionRef || '',
            remarks: payload.remarks || '',
            ...calc,
            amount: calc.netPay,
            paidAmount: calc.netPay,
            status: 'pending',
            approvalStatus: 'pending',
            paymentStatus: 'pending',
            requiresApproval: true,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Salary payment updated',
            module: 'School Payroll',
            description: `${row.staffName || 'Staff'} salary payment was updated before approval.`,
            targetId: id,
            targetName: row.staffName || id,
            metadata: { netPay: calc.netPay },
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: clientSafeMessage(err, 'Unable to update salary payment.') }
        }
      },
      async deleteSalaryPayment(row) {
        if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
        if (!row?.id) return { ok: false, error: 'Salary payment not found.' }
        if (['approved', 'paid'].includes(String(row.approvalStatus || row.status || '').toLowerCase())) {
          return { ok: false, error: 'Approved salary payments cannot be deleted.' }
        }
        try {
          await removeUserDoc(workspaceId, 'staffSalaryPayments', row.id, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Salary payment deleted',
            module: 'School Payroll',
            description: `${row.staffName || 'Staff'} salary payment request was deleted.`,
            targetId: row.id,
            targetName: row.staffName || row.id,
            metadata: { amount: row.netPay || row.amount || 0 },
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: clientSafeMessage(err, 'Unable to delete salary payment.') }
        }
      },
    }
  }, [businessType, firebaseUser, members, membersLoading, payments, paymentsLoading, userDoc, userId, workspaceId])
}
