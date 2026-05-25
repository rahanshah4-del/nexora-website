import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeInvoice(inv) {
  return {
    id: inv.id || inv.invoiceNumber,
    invoiceNumber: inv.invoiceNumber || inv.id || 'INV-—',
    customerName: inv.customerName || '—',
    customerEmail: inv.customerEmail || '',
    totalUsd: Number(inv.totalUsd ?? inv.total ?? 0),
    currency: inv.currency || 'USD',
    status: inv.status || 'Pending',
    dueDate: inv.dueDate || '—',
    createdAt: inv.createdAt || '—',
  }
}

function normalizePayment(p) {
  return {
    id: p.id || p.reference || `PAY-${Date.now()}`,
    invoiceId: p.invoiceId || '—',
    customerName: p.customerName || '—',
    amountUsd: Number(p.amountUsd ?? p.amount ?? 0),
    currency: p.currency || 'USD',
    paymentMethod: p.paymentMethod || 'Manual',
    paymentStatus: p.paymentStatus || 'Pending',
    paidAt: p.paidAt || '—',
    reference: p.reference || '—',
  }
}

export function useClientPortal() {
  const { userDoc, userId } = useUser()
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [activity, setActivity] = useState([])
  const [subscription, setSubscription] = useState(() => ({
    plan: userDoc?.plan || 'Free',
    planStatus: userDoc?.planStatus || 'inactive',
    billingCycle: userDoc?.billingCycle || 'monthly',
    nextBillingDate: '—',
    seats: 1,
  }))
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setActivity([])
        setSubscription({
          plan: userDoc?.plan || 'Free',
          planStatus: userDoc?.planStatus || 'inactive',
          billingCycle: userDoc?.billingCycle || 'monthly',
          nextBillingDate: '—',
          seats: 1,
        })
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }
    if (!userId) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setActivity([])
        setSubscription({
          plan: userDoc?.plan || 'Free',
          planStatus: userDoc?.planStatus || 'inactive',
          billingCycle: userDoc?.billingCycle || 'monthly',
          nextBillingDate: '—',
          seats: 1,
        })
        setSource('firestore')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    const unsubInv = subscribeUserCollection(
      userId,
      'invoices',
      (rows) => {
        const list = (Array.isArray(rows) ? rows : []).map(normalizeInvoice)
        setInvoices(list)
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
      userId,
      'payments',
      (rows) => {
        setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment))
      },
      () => setPayments([]),
    )

    const unsubSubs = subscribeUserCollection(
      userId,
      'subscriptions',
      (rows) => {
        const sub = rows[0] || null
        setSubscription({
          plan: userDoc?.plan || sub?.plan || 'Free',
          planStatus: userDoc?.planStatus || sub?.planStatus || 'inactive',
          billingCycle: userDoc?.billingCycle || sub?.billingCycle || 'monthly',
          nextBillingDate: sub?.nextBillingDate || '—',
          seats: sub?.seats ?? 1,
        })
      },
      () =>
        setSubscription({
          plan: userDoc?.plan || 'Free',
          planStatus: userDoc?.planStatus || 'inactive',
          billingCycle: userDoc?.billingCycle || 'monthly',
          nextBillingDate: '—',
          seats: 1,
        }),
    )

    const unsubActivity = subscribeUserCollection(
      userId,
      'activityLogs',
      (rows) => {
        const list = (Array.isArray(rows) ? rows : [])
          .slice(0, 12)
          .map((r) => ({
            id: r.id,
            title: r.title || r.action || 'Activity',
            detail: r.detail || r.message || r.description || '',
            badge: r.module || 'System',
            time: r.time || (r.createdAt?.toDate?.()?.toISOString?.().slice(0, 10) || '—'),
          }))
        setActivity(list)
      },
      () => setActivity([]),
    )

    return () => {
      unsubInv?.()
      unsubPay?.()
      unsubSubs?.()
      unsubActivity?.()
    }
  }, [userId, userDoc?.email, userDoc?.plan, userDoc?.planStatus, userDoc?.billingCycle])

  const api = useMemo(
    () => ({
      loading,
      source,
      error,
      project: null,
      invoices,
      payments,
      subscription,
      activity,
    }),
    [loading, source, error, invoices, payments, subscription, activity],
  )

  return api
}
