import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeClient(client) {
  return {
    id: client.id,
    name: client.name || 'No name',
    email: client.email || '',
    phone: client.phone || '',
    businessName: client.businessName || '',
    plan: client.plan || 'Trial',
    status: client.status || 'Active',
    createdBy: client.createdBy || client.userId || '',
    createdAt: client.createdAt || null,
  }
}

function normalizeInvoice(inv) {
  return {
    id: inv.id || inv.invoiceNumber,
    invoiceNumber: inv.invoiceNumber || inv.id || 'INV-—',
    customerName: inv.customerName || '—',
    customerEmail: inv.customerEmail || '',
    totalUsd: Number(inv.totalUsd ?? inv.total ?? 0) || 0,
    total: Number(inv.total ?? inv.totalUsd ?? 0) || 0,
    currency: inv.currency || 'PKR',
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
    amountUsd: Number(p.amountUsd ?? p.amount ?? 0) || 0,
    amount: Number(p.amount ?? p.amountUsd ?? 0) || 0,
    currency: p.currency || 'PKR',
    paymentMethod: p.paymentMethod || 'Manual',
    paymentStatus: p.paymentStatus || 'Pending',
    paidAt: p.paidAt || '—',
    reference: p.reference || '—',
  }
}

export function useClientPortal() {
  const { userDoc, userId, workspaceId } = useUser()
  const [clients, setClients] = useState([])
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
        setClients([])
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
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setClients([])
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

    const unsubClients = subscribeUserCollection(
      workspaceId,
      'clients',
      (rows) => {
        setClients((Array.isArray(rows) ? rows : []).map(normalizeClient))
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load clients')
        setClients([])
        setSource('firestore')
        setLoading(false)
      },
    )

    const unsubInv = subscribeUserCollection(
      workspaceId,
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
      workspaceId,
      'payments',
      (rows) => {
        setPayments((Array.isArray(rows) ? rows : []).map(normalizePayment))
      },
      () => setPayments([]),
    )

    const unsubSubs = subscribeUserCollection(
      workspaceId,
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
      workspaceId,
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
      unsubClients?.()
      unsubInv?.()
      unsubPay?.()
      unsubSubs?.()
      unsubActivity?.()
    }
  }, [workspaceId, userDoc?.email, userDoc?.plan, userDoc?.planStatus, userDoc?.billingCycle])

  const api = useMemo(
    () => ({
      loading,
      source,
      error,
      project: null,
      clients,
      invoices,
      payments,
      subscription,
      activity,
      async createClient(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim()
        const phone = String(payload.phone || '').trim()
        const businessName = String(payload.businessName || '').trim()
        const plan = String(payload.plan || 'Trial').trim()
        const status = String(payload.status || 'Active').trim()
        if (!name) return { ok: false, error: 'Client name is required' }
        if (!email) return { ok: false, error: 'Client email is required' }
        try {
          await createUserDoc(workspaceId, 'clients', {
            name,
            email,
            phone,
            businessName,
            plan: plan || 'Trial',
            status: status || 'Active',
            createdBy: userId,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create client' }
        }
      },
    }),
    [loading, source, error, clients, invoices, payments, subscription, activity, userId, workspaceId],
  )

  return api
}
