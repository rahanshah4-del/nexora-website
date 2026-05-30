import { useEffect, useMemo, useState } from 'react'
import { arrayUnion, doc, getDoc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import {
  collectionRef,
  createUserDoc,
  patchUserDoc,
  removeUserDoc,
  subscribeUserCollection,
  workspaceCollectionPath,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import {
  calculateBalanceDue,
  calculateInvoiceTotals,
  getInvoiceStatus,
  normalizeCurrency,
  paymentValue,
  statusValue,
  toNumber,
} from '../lib/calculations.js'

function canRoleApprovePayments(userDoc) {
  const role = String(userDoc?.role || '').toLowerCase()
  return ['owner', 'admin', 'accountant'].includes(role)
}

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
  const totals = calculateInvoiceTotals(inv)
  const normalized = {
    ...inv,
    ...totals,
    currency: normalizeCurrency(inv.currency),
    paymentStatus: statusValue(inv.paymentStatus || inv.status, 'pending'),
  }
  return {
    ...normalized,
    id: inv.id || inv.invoiceNumber,
    clientId: inv.clientId || inv.customerId || '',
    invoiceNumber: inv.invoiceNumber || inv.id || 'INV-—',
    customerName: inv.customerName || '—',
    customerEmail: inv.customerEmail || '',
    status: getInvoiceStatus(normalized),
    dueDate: inv.dueDate || '—',
    createdAt: inv.createdAt || '—',
    paidAt: inv.paidAt || null,
  }
}

function normalizePayment(p) {
  return {
    id: p.id || p.reference || `PAY-${Date.now()}`,
    invoiceId: p.invoiceId || '—',
    customerName: p.customerName || '—',
    amountUsd: paymentValue(p),
    amount: paymentValue(p),
    currency: normalizeCurrency(p.currency),
    paymentMethod: p.paymentMethod || 'Manual',
    transactionId: p.transactionId || '',
    paymentReference: p.paymentReference || p.reference || '',
    notes: p.notes || '',
    paymentStatus: statusValue(p.paymentStatus || p.status, 'pending'),
    paidAt: p.paidAt || p.createdAt || null,
    reference: p.paymentReference || p.reference || p.transactionId || '—',
  }
}

async function addInventoryAdjustments(batch, workspaceId, invoice, now) {
  if (!db || !workspaceId || invoice.inventoryAdjustedAt || invoice.stockAdjustedAt) return false
  const productItems = (invoice.items || []).filter((item) => item.productId && toNumber(item.quantity ?? item.qty, 0) > 0)
  if (!productItems.length) return false

  await Promise.all(
    productItems.map(async (item) => {
      const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), item.productId)
      const productSnap = await getDoc(productRef)
      if (!productSnap.exists()) return
      const currentStock = toNumber(productSnap.data().stockQuantity ?? productSnap.data().stock, 0)
      const quantity = toNumber(item.quantity ?? item.qty, 0)
      batch.update(productRef, {
        stockQuantity: Math.max(0, currentStock - quantity),
        stockHistory: arrayUnion({
          type: 'client_portal_invoice_paid',
          invoiceId: invoice.id || invoice.invoiceNumber || '',
          invoiceNumber: invoice.invoiceNumber || '',
          previousQuantity: currentStock,
          quantity: Math.max(0, currentStock - quantity),
          delta: -quantity,
          note: 'Client portal payment stock deduction',
          createdAt: new Date().toISOString(),
        }),
        updatedAt: now,
      })
    }),
  )

  return true
}

export function useClientPortal() {
  const { userDoc, userId, workspaceId, firebaseUser } = useUser()
  const canApprovePayments = canRoleApprovePayments(userDoc)
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
        setError('Secure Cloud Sync is not available right now.')
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

    const unsubClients = canApprovePayments
      ? subscribeUserCollection(
          workspaceId,
          'clients',
          (rows) => {
            setClients((Array.isArray(rows) ? rows : []).map(normalizeClient))
            setSource('firestore')
            setLoading(false)
          },
          (err) => {
            setError(clientSafeMessage(err, 'Unable to load clients.'))
            setClients([])
            setSource('firestore')
            setLoading(false)
          },
        )
      : (() => {
          Promise.resolve().then(() => setClients([]))
          return () => {}
        })()

    const invoicesRef = collectionRef(workspaceCollectionPath(workspaceId, 'invoices'))
    const invoiceQuery =
      invoicesRef && (canApprovePayments || userDoc?.email)
        ? canApprovePayments
          ? invoicesRef
          : query(invoicesRef, where('customerEmail', '==', userDoc.email))
        : null
    const unsubInv = invoiceQuery
      ? onSnapshot(
          invoiceQuery,
          (snap) => {
            setInvoices(snap.docs.map((docSnap) => normalizeInvoice({ id: docSnap.id, ...docSnap.data() })))
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
      : (() => {
          Promise.resolve().then(() => {
            setInvoices([])
            setLoading(false)
          })
          return () => {}
        })()

    const paymentsRef = collectionRef(workspaceCollectionPath(workspaceId, 'payments'))
    const paymentQuery =
      paymentsRef && userId
        ? canApprovePayments
          ? paymentsRef
          : query(paymentsRef, where('submittedBy', '==', userId))
        : null
    const unsubPay = paymentQuery
      ? onSnapshot(
          paymentQuery,
          (snap) => {
            setPayments(snap.docs.map((docSnap) => normalizePayment({ id: docSnap.id, ...docSnap.data() })))
          },
          () => setPayments([]),
        )
      : (() => {
          Promise.resolve().then(() => setPayments([]))
          return () => {}
        })()

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
  }, [canApprovePayments, userId, workspaceId, userDoc?.email, userDoc?.plan, userDoc?.planStatus, userDoc?.billingCycle])

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
      canApprovePayments,
      async createClient(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
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
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Client created',
            module: 'Client Portal',
            description: `${name} was added as a client.`,
            targetName: name,
            metadata: { email, businessName, plan, status },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create client.') }
        }
      },
      async updateClient(clientId, payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const client = clients.find((item) => item.id === clientId)
        if (!client) return { ok: false, error: 'Client not found' }
        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim()
        const phone = String(payload.phone || '').trim()
        const businessName = String(payload.businessName || '').trim()
        const plan = String(payload.plan || 'Trial').trim()
        const status = String(payload.status || 'Active').trim()
        if (!name) return { ok: false, error: 'Client name is required' }
        if (!email) return { ok: false, error: 'Client email is required' }
        try {
          await patchUserDoc(workspaceId, 'clients', clientId, {
            name,
            email,
            phone,
            businessName,
            plan: plan || 'Trial',
            status: status || 'Active',
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Client updated',
            module: 'Client Portal',
            description: `${name} client details were updated.`,
            targetId: clientId,
            targetName: name,
            metadata: { previousName: client.name, email, businessName, plan, status },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update client.') }
        }
      },
      async deleteClient(clientId) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const client = clients.find((item) => item.id === clientId)
        if (!client) return { ok: false, error: 'Client not found' }
        try {
          await removeUserDoc(workspaceId, 'clients', clientId)
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Client deleted',
            module: 'Client Portal',
            description: `${client.name || 'Client'} was removed.`,
            targetId: clientId,
            targetName: client.name || clientId,
            metadata: { email: client.email, businessName: client.businessName },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to remove client.') }
        }
      },
      async markInvoicePaid(invoiceId, payload = {}) {
        if (!canRoleApprovePayments(userDoc)) return { ok: false, error: 'Only owner, admin, or accountant can approve payment' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        const amount = toNumber(payload.amount ?? invoice.total, 0)
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount paid' }
        const paymentMethod = String(payload.paymentMethod || 'Manual Approval').trim()
        const transactionId = String(payload.transactionId || '').trim()
        const paymentReference = String(payload.paymentReference || '').trim()
        const notes = String(payload.notes || '').trim()
        const clientId =
          invoice.clientId ||
          clients.find((client) => client.email && client.email === invoice.customerEmail)?.id ||
          ''
        try {
          const currentPaid = toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0)
          const nextPaid = Math.min(invoice.total, currentPaid + amount)
          const fullyPaid = calculateBalanceDue(invoice.total, nextPaid) <= 0
          const now = serverTimestamp()
          const batch = writeBatch(db)
          const stockAdjusted = fullyPaid ? await addInventoryAdjustments(batch, workspaceId, invoice, now) : false
          batch.update(doc(db, workspaceCollectionPath(workspaceId, 'invoices'), invoiceId), {
            status: fullyPaid ? 'paid' : 'partial',
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            approvalStatus: fullyPaid ? 'approved' : invoice.approvalStatus || 'pending',
            requiresApproval: fullyPaid ? false : invoice.requiresApproval ?? true,
            paidAt: fullyPaid ? now : invoice.paidAt || null,
            approvedBy: userId,
            approvedAt: now,
            amountPaid: nextPaid,
            partialPaidAmount: nextPaid,
            balanceDue: calculateBalanceDue(invoice.total, nextPaid),
            ...(stockAdjusted ? { inventoryAdjustedAt: now } : {}),
          })
          batch.set(doc(db, workspaceCollectionPath(workspaceId, 'payments'), `client-invoice-${invoiceId}-${Date.now()}`), {
            invoiceId,
            clientId,
            customerName: invoice.customerName || '',
            amount,
            amountUsd: amount,
            currency: payload.currency || invoice.currency || 'PKR',
            paymentMethod,
            transactionId,
            paymentReference,
            reference: paymentReference || transactionId || invoice.invoiceNumber || invoiceId,
            notes,
            paymentStatus: fullyPaid ? 'paid' : 'partial',
            status: fullyPaid ? 'paid' : 'partial',
            approvedBy: userId,
            approvedAt: now,
            paidAt: now,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          })
          await batch.commit()
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: fullyPaid ? 'Payment approved' : 'Partial payment recorded',
            module: 'Client Portal',
            description: fullyPaid
              ? `${invoice.invoiceNumber || invoiceId} was marked as paid.`
              : `${amount} ${payload.currency || invoice.currency || 'PKR'} was recorded for ${invoice.invoiceNumber || invoiceId}.`,
            targetId: invoiceId,
            targetName: invoice.invoiceNumber || invoiceId,
            metadata: { amount, currency: payload.currency || invoice.currency || 'PKR', paymentMethod, clientId },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to approve payment.') }
        }
      },
      async submitPaymentReference(invoiceId, payload = {}) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const invoice = invoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, error: 'Invoice not found' }
        const amount = Number(payload.amount ?? invoice.total ?? 0)
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount paid' }
        const paymentMethod = String(payload.paymentMethod || 'Bank Transfer').trim()
        const transactionId = String(payload.transactionId || '').trim()
        const paymentReference = String(payload.paymentReference || '').trim()
        const notes = String(payload.notes || '').trim()
        if (!transactionId && !paymentReference) return { ok: false, error: 'Transaction ID or payment reference is required' }
        const clientId =
          invoice.clientId ||
          clients.find((client) => client.email && client.email === invoice.customerEmail)?.id ||
          ''
        try {
          await patchUserDoc(workspaceId, 'invoices', invoiceId, {
            status: statusValue(invoice.status, 'pending') === 'overdue' ? 'overdue' : 'pending',
            paymentStatus: 'pending_verification',
            paymentSubmittedAt: serverTimestamp(),
            paymentSubmittedBy: userId,
            lastPaymentReference: paymentReference || transactionId,
          })
          await createUserDoc(workspaceId, 'payments', {
            invoiceId,
            clientId,
            customerName: invoice.customerName || '',
            amount,
            amountUsd: amount,
            currency: payload.currency || invoice.currency || 'PKR',
            paymentMethod,
            transactionId,
            paymentReference,
            reference: paymentReference || transactionId || invoice.invoiceNumber || invoiceId,
            notes,
            paymentStatus: 'pending_verification',
            submittedBy: userId,
            paidAt: serverTimestamp(),
          })
          await logActivity({
            workspaceId,
            userId,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Payment reference submitted',
            module: 'Client Portal',
            description: `${invoice.invoiceNumber || invoiceId} payment reference is pending verification.`,
            targetId: invoiceId,
            targetName: invoice.invoiceNumber || invoiceId,
            metadata: { amount, currency: payload.currency || invoice.currency || 'PKR', paymentMethod, clientId },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to submit payment reference.') }
        }
      },
    }),
    [loading, source, error, clients, invoices, payments, subscription, activity, canApprovePayments, firebaseUser, userDoc, userId, workspaceId],
  )

  return api
}
