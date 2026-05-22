import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { patchDoc, subscribeCollection } from '../lib/firestore.js'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useUser } from './useUser.js'

function normalizeInvoice(inv) {
  return {
    ...inv,
    items: Array.isArray(inv.items) ? inv.items : [],
    status: inv.status || 'Pending',
    currency: inv.currency || 'USD',
  }
}

export function useInvoices() {
  const { userId } = useUser()
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

    Promise.resolve().then(() => setLoading(true))
    const unsubInv = subscribeCollection(
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
    const unsubPay = subscribeCollection(
      'payments',
      (rows) => setPayments(Array.isArray(rows) ? rows : []),
      () => setPayments([]),
    )
    return () => {
      unsubInv?.()
      unsubPay?.()
    }
  }, [])

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
        if (!userId) return { ok: false, error: 'Please login first' }
        const invNo = String(invoice.invoiceNumber || '').trim()
        const name = String(invoice.customerName || '').trim()
        const email = String(invoice.customerEmail || '').trim()
        if (!invNo) return { ok: false, error: 'Invoice number is required' }
        if (!name) return { ok: false, error: 'Customer name is required' }
        if (!email) return { ok: false, error: 'Customer email is required' }
        if (!db) {
          setInvoices((prev) => [{ id: invNo, ...invoice }, ...prev])
          return { ok: false, error: 'Firestore is not configured' }
        }
        try {
          const docPayload = {
            invoiceNumber: invNo,
            customerName: name,
            customerEmail: email,
            subtotal: invoice.subtotalUsd ?? invoice.subtotal ?? 0,
            taxRate: invoice.taxRate ?? 0,
            total: invoice.totalUsd ?? invoice.total ?? 0,
            currency: invoice.currency || 'USD',
            status: invoice.status || 'Pending',
            dueDate: invoice.dueDate || '—',
            // Keep USD base fields for existing UI calculations.
            subtotalUsd: invoice.subtotalUsd ?? invoice.subtotal ?? 0,
            taxAmountUsd: invoice.taxAmountUsd ?? invoice.taxAmount ?? 0,
            totalUsd: invoice.totalUsd ?? invoice.total ?? 0,
            userId,
            createdAt: serverTimestamp(),
          }
          await addDoc(collection(db, 'invoices'), docPayload)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create invoice' }
        }
      },
      async updateInvoice(id, patch) {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        if (!db || source !== 'firestore') return
        await patchDoc('invoices', id, patch)
      },
    }),
    [invoices, payments, loading, source, error, stats, userId],
  )

  return api
}
