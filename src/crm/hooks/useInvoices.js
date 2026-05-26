import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeInvoice(inv) {
  const subtotal = Number(inv.subtotal ?? inv.subtotalUsd ?? 0) || 0
  const discount = Number(inv.discount ?? 0) || 0
  const taxableAmount = Number(inv.taxableAmount ?? Math.max(subtotal - discount, 0)) || 0
  const taxAmount = Number(inv.taxAmount ?? inv.taxAmountUsd ?? 0) || 0
  const total = Number(inv.total ?? inv.totalUsd ?? 0) || 0
  return {
    ...inv,
    items: Array.isArray(inv.items) ? inv.items : [],
    status: inv.status || 'Pending',
    currency: inv.currency || 'PKR',
    subtotal,
    discount,
    taxableAmount,
    taxAmount,
    total,
    subtotalUsd: subtotal,
    taxAmountUsd: taxAmount,
    totalUsd: total,
  }
}

export function useInvoices() {
  const { userId, workspaceId } = useUser()
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
        setError('Firestore is not configured.')
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
        setError(err?.message || 'Failed to load invoices')
        setInvoices([])
        setSource('firestore')
        setLoading(false)
      },
    )
    const unsubPay = subscribeUserCollection(
      workspaceId,
      'payments',
      (rows) => setPayments(Array.isArray(rows) ? rows : []),
      () => setPayments([]),
    )
    return () => {
      unsubInv?.()
      unsubPay?.()
    }
  }, [workspaceId])

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'Paid').length
    const pending = invoices.filter((i) => i.status === 'Pending').length
    const overdue = invoices.filter((i) => i.status === 'Overdue').length
    const cancelled = invoices.filter((i) => i.status === 'Cancelled').length
    return { paid, pending, overdue, cancelled, total: invoices.length }
  }, [invoices])

  const api = useMemo(
    () => ({
      invoices,
      payments,
      loading,
      source,
      error,
      stats,
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
        if (!db) return { ok: false, error: 'Firestore is not configured' }
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
            status: invoice.status || 'Pending',
            dueDate: invoice.dueDate || '—',
            recurring: Boolean(invoice.recurring),
            notes: invoice.notes || '',
            createdBy: userId,
            subtotalUsd: invoice.subtotal,
            taxAmountUsd: invoice.taxAmount,
            totalUsd: invoice.total,
          }
          await createUserDoc(workspaceId, 'invoices', docPayload)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create invoice' }
        }
      },
      async updateInvoice(id, patch) {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        if (!db || !workspaceId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'invoices', id, patch)
      },
    }),
    [invoices, payments, loading, source, error, stats, userId, workspaceId],
  )

  return api
}
