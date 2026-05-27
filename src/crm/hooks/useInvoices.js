import { useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function statusValue(value, fallback = 'pending') {
  return String(value || fallback).trim().toLowerCase()
}

function normalizeInvoice(inv) {
  const subtotal = Number(inv.subtotal ?? inv.subtotalUsd ?? 0) || 0
  const discount = Number(inv.discount ?? 0) || 0
  const taxableAmount = Number(inv.taxableAmount ?? Math.max(subtotal - discount, 0)) || 0
  const taxAmount = Number(inv.taxAmount ?? inv.taxAmountUsd ?? 0) || 0
  const total = Number(inv.total ?? inv.totalUsd ?? 0) || 0
  const amountPaid = Number(inv.amountPaid ?? inv.partialPaidAmount ?? 0) || 0
  return {
    ...inv,
    items: Array.isArray(inv.items) ? inv.items : [],
    status: statusValue(inv.status, 'pending'),
    paymentStatus: statusValue(inv.paymentStatus || inv.status, 'pending'),
    currency: inv.currency || 'PKR',
    subtotal,
    discount,
    taxableAmount,
    taxAmount,
    total,
    subtotalUsd: subtotal,
    taxAmountUsd: taxAmount,
    totalUsd: total,
    amountPaid,
    partialPaidAmount: amountPaid,
    balanceDue: Math.max(total - amountPaid, 0),
  }
}

function normalizePayment(payment) {
  return {
    ...payment,
    id: payment.id,
    invoiceId: payment.invoiceId || payment.invoiceNumber || '—',
    customerName: payment.customerName || '—',
    amount: Number(payment.amount ?? payment.amountUsd ?? 0) || 0,
    amountUsd: Number(payment.amountUsd ?? payment.amount ?? 0) || 0,
    currency: payment.currency || 'PKR',
    paymentMethod: payment.paymentMethod || 'Manual Approval',
    paymentStatus: statusValue(payment.paymentStatus || payment.status, 'pending'),
    paidAt: payment.paidAt || payment.createdAt || null,
    reference: payment.reference || payment.invoiceNumber || '—',
  }
}

function canRoleApprovePayments(role, userDoc) {
  const rawRole = String(userDoc?.role ?? role ?? '').toLowerCase()
  return ['owner', 'admin', 'accountant'].includes(rawRole)
}

export function useInvoices() {
  const { userId, workspaceId, role, userDoc, firebaseUser } = useUser()
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsubInv = subscribeUserCollection(
      workspaceId,
      'invoices',
      (rows) => {
        setInvoices((Array.isArray(rows) ? rows : []).map(normalizeInvoice))
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load invoices.'))
        setInvoices([])
        setSource('firestore')
        setLoading(false)
      },
    )
    const unsubPay = subscribeUserCollection(
      workspaceId,
      'payments',
      (rows) => setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment)),
      () => setPayments([]),
    )
    return () => {
      unsubInv?.()
      unsubPay?.()
    }
  }, [workspaceId])

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.paymentStatus === 'paid' || i.status === 'paid').length
    const pending = invoices.filter((i) => i.paymentStatus === 'pending' || i.status === 'pending').length
    const overdue = invoices.filter((i) => i.status === 'overdue').length
    const cancelled = invoices.filter((i) => i.status === 'cancelled' || i.paymentStatus === 'rejected').length
    return { paid, pending, overdue, cancelled, total: invoices.length }
  }, [invoices])

  const canApprovePayments = canRoleApprovePayments(role, userDoc)

  const api = useMemo(
    () => ({
      invoices,
      payments,
      loading,
      source,
      error,
      stats,
      canApprovePayments,
      async createInvoice(payload) {
        const invoice = normalizeInvoice(payload)
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const invNo = String(invoice.invoiceNumber || '').trim()
        const name = String(invoice.customerName || '').trim()
        const email = String(invoice.customerEmail || '').trim()
        if (!invNo) return { ok: false, error: 'Invoice number is required' }
        if (!name) return { ok: false, error: 'Customer name is required' }
        if (!email) return { ok: false, error: 'Customer email is required' }
        if (!invoice.items.length) return { ok: false, error: 'Add at least one invoice item' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          const docPayload = {
            invoiceNumber: invNo,
            customerName: name,
            customerEmail: email,
            customerPhone: invoice.customerPhone || '',
            items: invoice.items,
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            taxableAmount: invoice.taxableAmount,
            taxRate: invoice.taxRate ?? 0,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            currency: invoice.currency || 'PKR',
            status: 'pending',
            paymentStatus: 'pending',
            dueDate: invoice.dueDate || '—',
            recurring: Boolean(invoice.recurring),
            notes: invoice.notes || '',
            createdBy: userId,
            subtotalUsd: invoice.subtotal,
            taxAmountUsd: invoice.taxAmount,
            totalUsd: invoice.total,
          }
          const ref = await createUserDoc(workspaceId, 'invoices', docPayload)
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice created',
            module: 'Invoices',
            description: `${invNo} was created for ${name}.`,
            targetId: ref.id,
            targetName: invNo,
            metadata: { customerName: name, total: invoice.total, currency: invoice.currency },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create invoice.') }
        }
      },
      async markInvoicePaid(id, options = {}) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can approve payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          const paymentMethod = options.paymentMethod || 'Manual Approval'
          await patchUserDoc(workspaceId, 'invoices', id, {
            paymentStatus: 'paid',
            status: 'paid',
            paidAt: serverTimestamp(),
            approvedBy: userId,
            approvedAt: serverTimestamp(),
            amountPaid: invoice.total,
            partialPaidAmount: invoice.total,
            balanceDue: 0,
          })
          await createUserDoc(workspaceId, 'payments', {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount: invoice.total,
            amountUsd: invoice.total,
            currency: invoice.currency || 'PKR',
            paymentMethod,
            paymentStatus: 'paid',
            approvedBy: userId,
            approvedAt: serverTimestamp(),
            paidAt: serverTimestamp(),
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Invoice paid',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} was marked as paid.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: { amount: invoice.total, currency: invoice.currency, paymentMethod },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to mark invoice as paid.') }
        }
      },
      async rejectInvoicePayment(id) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can reject payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        try {
          await patchUserDoc(workspaceId, 'invoices', id, {
            paymentStatus: 'rejected',
            status: 'rejected',
            rejectedAt: serverTimestamp(),
            rejectedBy: userId,
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Payment rejected',
            module: 'Invoices',
            description: `${invoice.invoiceNumber || id} payment was rejected/cancelled.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: { customerName: invoice.customerName },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to reject payment.') }
        }
      },
      async recordPartialPayment(id, options = {}) {
        if (!canApprovePayments) return { ok: false, error: 'Only owner, admin, or accountant can record payments' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === id)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        const amount = Number(options.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid partial payment amount' }
        try {
          const currentPaid = Number(invoice.amountPaid ?? invoice.partialPaidAmount ?? 0) || 0
          const nextPaid = Math.min(invoice.total, currentPaid + amount)
          const fullyPaid = nextPaid >= invoice.total
          const paymentMethod = options.paymentMethod || 'Manual Approval'
          await patchUserDoc(workspaceId, 'invoices', id, {
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            status: fullyPaid ? 'paid' : 'partial',
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: Math.max(invoice.total - nextPaid, 0),
            paidAt: fullyPaid ? serverTimestamp() : invoice.paidAt || null,
            approvedBy: fullyPaid ? userId : invoice.approvedBy || null,
            approvedAt: fullyPaid ? serverTimestamp() : invoice.approvedAt || null,
            lastPaymentAt: serverTimestamp(),
            lastPaymentBy: userId,
          })
          await createUserDoc(workspaceId, 'payments', {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber || id,
            customerName: invoice.customerName || '',
            amount,
            amountUsd: amount,
            currency: invoice.currency || 'PKR',
            paymentMethod,
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            approvedBy: userId,
            approvedAt: serverTimestamp(),
            paidAt: serverTimestamp(),
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: fullyPaid ? 'Invoice paid' : 'Partial payment recorded',
            module: 'Invoices',
            description: `${amount} ${invoice.currency || 'PKR'} was recorded for ${invoice.invoiceNumber || id}.`,
            targetId: id,
            targetName: invoice.invoiceNumber || id,
            metadata: { amount, currency: invoice.currency, paymentMethod, fullyPaid },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to record partial payment.') }
        }
      },
      async updateInvoice(id, patch) {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        if (!db || !workspaceId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'invoices', id, patch)
      },
    }),
    [invoices, payments, loading, source, error, stats, canApprovePayments, firebaseUser, userDoc, userId, workspaceId],
  )

  return api
}
