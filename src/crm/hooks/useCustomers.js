import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, removeUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

function normalizeCustomer(c) {
  return {
    ...c,
    id: c.id,
    name: c.name || c.studentName || 'No name',
    email: c.email || '',
    phone: c.phone || '',
    company: c.company || c.className || '',
    customerType: c.customerType || 'General',
    status: c.status || 'Active',
    walletDue: Number(c.walletDue ?? c.dueAmount ?? c.balanceDue ?? 0) || 0,
    walletCredit: Number(c.walletCredit ?? c.creditBalance ?? 0) || 0,
    lifetimeSpend: Number(c.lifetimeSpend ?? c.totalSpend ?? 0) || 0,
    posOrdersCount: Number(c.posOrdersCount ?? 0) || 0,
    lastPosOrderAt: c.lastPosOrderAt || null,
    notes: c.notes || '',
    createdBy: c.createdBy || c.userId || '',
    createdAt: c.createdAt || null,
  }
}

const DEFAULT_CUSTOMER_LIST_LIMIT = 100
const CUSTOMER_PAGE_LIMIT = 50

function safeCustomerListLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_CUSTOMER_LIST_LIMIT
  return Math.floor(next)
}

function safeCustomerPageLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return CUSTOMER_PAGE_LIMIT
  return Math.min(CUSTOMER_PAGE_LIMIT, Math.floor(next))
}

function mergeCustomerPages(currentRows, nextRows) {
  const seen = new Set((currentRows || []).map((customer) => customer.id))
  return [
    ...(currentRows || []),
    ...(nextRows || []).filter((customer) => !seen.has(customer.id)),
  ]
}

export function useCustomers({ limitCount = DEFAULT_CUSTOMER_LIST_LIMIT, paginated = false, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const customerListLimit = safeCustomerListLimit(limitCount)
  const customerPageLimit = safeCustomerPageLimit(limitCount)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false)
  const [customerPage, setCustomerPage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const customerCursorRef = useRef(null)
  const customerRequestRef = useRef(0)

  const loadCustomerPage = useCallback(async ({ reset = false } = {}) => {
    if (!enabled) {
      setRows([])
      customerCursorRef.current = null
      setHasMoreCustomers(false)
      setCustomerPage(0)
      setSource(db ? 'firestore' : 'none')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }
    if (!db) {
      setRows([])
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: false }
    }
    if (!workspaceId) {
      setRows([])
      customerCursorRef.current = null
      setHasMoreCustomers(false)
      setCustomerPage(0)
      setSource('firestore')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }

    const requestId = ++customerRequestRef.current
    if (reset) {
      customerCursorRef.current = null
      setRows([])
      setHasMoreCustomers(false)
      setCustomerPage(0)
      setLoading(true)
    } else {
      setPaginationLoading(true)
    }

    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId,
        collectionName: 'customers',
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: customerPageLimit,
        startAfterDoc: reset ? null : customerCursorRef.current,
        diagnostics: { currentUserUid: userId, role },
      })
      if (requestId !== customerRequestRef.current) return { ok: false }

      const nextRows = (Array.isArray(page.rows) ? page.rows : []).map(normalizeCustomer)
      setRows((currentRows) => (reset ? nextRows : mergeCustomerPages(currentRows, nextRows)))
      customerCursorRef.current = page.lastDoc
      setHasMoreCustomers(page.hasMore)
      setCustomerPage((currentPage) => (reset ? 1 : currentPage + 1))
      setSource('firestore')
      setError('')
      console.log(reset ? '[Customers] first page loaded' : '[Customers] next page loaded', {
        count: page.size,
        pageSize: customerPageLimit,
        hasMore: page.hasMore,
      })
      console.log('[Customers] pagination cursor', {
        cursorId: page.lastDoc?.id || null,
        hasCursor: Boolean(page.lastDoc),
      })
      return { ok: true }
    } catch (err) {
      if (requestId !== customerRequestRef.current) return { ok: false }
      console.warn('[Sales Hub Firestore Read Failed]', {
        currentUserUid: userId || '',
        role: role || '',
        workspaceId: workspaceId || '',
        collectionPath: workspaceId ? `workspaces/${workspaceId}/customers` : '',
        collectionName: 'customers',
        firestoreErrorCode: err?.code || err?.originalError?.code || 'unknown',
      })
      setError(clientSafeMessage(err, 'Unable to load customers.'))
      if (reset) setRows([])
      setSource('firestore')
      return { ok: false, error: clientSafeMessage(err, 'Unable to load customers.') }
    } finally {
      if (requestId === customerRequestRef.current) {
        if (reset) setLoading(false)
        else setPaginationLoading(false)
      }
    }
  }, [businessType, customerPageLimit, enabled, role, userId, workspaceId])

  const loadMoreCustomers = useCallback(async () => {
    if (loading || paginationLoading || !hasMoreCustomers) return { ok: true }
    return loadCustomerPage({ reset: false })
  }, [hasMoreCustomers, loadCustomerPage, loading, paginationLoading])

  const prependLoadedCustomer = useCallback((customer) => {
    setRows((currentRows) => [normalizeCustomer(customer), ...currentRows])
  }, [])

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setRows([])
        customerCursorRef.current = null
        setHasMoreCustomers(false)
        setCustomerPage(0)
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreCustomers(false)
        setCustomerPage(0)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setRows([])
        customerCursorRef.current = null
        setHasMoreCustomers(false)
        setCustomerPage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }
    if (paginated) {
      loadCustomerPage({ reset: true })
      return () => {
        customerRequestRef.current += 1
      }
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })
    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'customers',
      businessType,
      limitCount: customerListLimit,
      diagnostics: { currentUserUid: userId, role },
      onData(data) {
        setRows((Array.isArray(data) ? data : []).map(normalizeCustomer))
        setLoading(false)
      },
      onError(err) {
        console.warn('[Sales Hub Firestore Read Failed]', {
          currentUserUid: userId || '',
          role: role || '',
          workspaceId: workspaceId || '',
          collectionPath: workspaceId ? `workspaces/${workspaceId}/customers` : '',
          collectionName: 'customers',
          firestoreErrorCode: err?.code || err?.originalError?.code || 'unknown',
        })
        setError(clientSafeMessage(err, 'Unable to load customers.'))
        setRows([])
        setLoading(false)
      },
    })
    return () => unsub?.()
  }, [businessType, customerListLimit, enabled, loadCustomerPage, paginated, role, userId, workspaceId])

  const api = useMemo(
    () => ({
      customers: rows,
      loading,
      paginationLoading,
      hasMoreCustomers,
      customerPage,
      customerPageSize: paginated ? customerPageLimit : customerListLimit,
      loadMoreCustomers,
      source,
      error,
      async createCustomer(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim()
        const phone = String(payload.phone || '').trim()
        const company = String(payload.company || '').trim()
        const customerType = String(payload.customerType || 'General').trim()
        const status = String(payload.status || 'Active').trim()
        const notes = String(payload.notes || '').trim()
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'customers', {
            ...payload,
            name,
            email,
            phone,
            company,
            customerType: customerType || 'General',
            status: status || 'Active',
            notes,
            createdBy: userId,
          }, { businessType, diagnostics: { currentUserUid: userId, role } })
          if (paginated) {
            prependLoadedCustomer({
              id: ref.id,
              ...payload,
              name,
              email,
              phone,
              company,
              customerType: customerType || 'General',
              status: status || 'Active',
              notes,
              createdBy: userId,
              createdAt: new Date().toISOString(),
            })
          }
          // Activity log + notification are supplementary side-effects, not
          // part of the customer record itself (already committed above) —
          // run them concurrently instead of one-after-another, and don't
          // let either one failing turn an already-successful create into a
          // reported failure.
          await Promise.all([
            logActivity({
              workspaceId,
              userId,
              businessType,
              ...userActivityInfo(userDoc, firebaseUser),
              action: 'Customer created',
              module: 'Customers',
              description: `${name} was added as a customer.`,
              targetId: ref.id,
              targetName: name,
              metadata: { email, company, customerType },
            }).catch((err) => console.warn('[Customers] logActivity failed', err?.message || err)),
            createWorkspaceNotification({
              workspaceId,
              userId,
              businessType,
              type: 'Customers',
              priority: 'low',
              title: 'Customer created',
              message: `${name} was added as a customer.`,
              relatedId: ref.id,
              route: '/app/customers',
              createdBy: userId,
              createdByEmail: firebaseUser?.email || userDoc?.email || '',
              metadata: { email, company, customerType },
            }).catch((err) => console.warn('[Customers] createWorkspaceNotification failed', err?.message || err)),
          ])
          return {
            ok: true,
            id: ref.id,
            customer: normalizeCustomer({
              id: ref.id,
              ...payload,
              name,
              email,
              phone,
              company,
              customerType: customerType || 'General',
              status: status || 'Active',
              notes,
              createdBy: userId,
              createdAt: new Date().toISOString(),
            }),
          }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create customer.') }
        }
      },
      async updateCustomer(id, payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!id) return { ok: false, error: 'Customer not found' }
        const name = String(payload.name || payload.studentName || '').trim()
        const email = String(payload.email || payload.parentEmail || '').trim()
        const phone = String(payload.phone || payload.parentPhone || '').trim()
        const company = String(payload.company || [payload.className, payload.section].filter(Boolean).join(' - ')).trim()
        const customerType = String(payload.customerType || 'General').trim()
        const status = String(payload.status || 'Active').trim()
        const notes = String(payload.notes || '').trim()
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
        try {
          const patch = {
            ...payload,
            name,
            email,
            phone,
            company,
            customerType: customerType || 'General',
            status: status || 'Active',
            notes,
          }
          await patchUserDoc(workspaceId, 'customers', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
          setRows((currentRows) => currentRows.map((customer) => (customer.id === id ? normalizeCustomer({ ...customer, ...patch }) : customer)))
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Customer updated',
            module: 'Customers',
            description: `${name} was updated.`,
            targetId: id,
            targetName: name,
            metadata: { email, company, customerType },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Customers',
            priority: 'low',
            title: 'Customer updated',
            message: `${name} was updated.`,
            relatedId: id,
            route: '/app/customers',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update customer.') }
        }
      },
      async settleCustomerDue(customer, payload = {}) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!customer?.id) return { ok: false, error: 'Customer not found' }
        const currentDue = Math.max(0, Number(customer.walletDue || 0))
        const amount = Number(payload.amount || 0)
        const paymentMethod = String(payload.paymentMethod || 'Cash').trim() || 'Cash'
        const note = String(payload.note || '').trim()
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid payment amount.' }
        if (amount > currentDue) return { ok: false, error: 'Payment amount cannot be more than customer due.' }
        try {
          const nextDue = Math.max(0, currentDue - amount)
          const batch = writeBatch(db)
          const customerRef = doc(db, workspaceCollectionPath(workspaceId, 'customers'), customer.id)
          const paymentRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'posWalletPayments')))
          batch.update(customerRef, {
            walletDue: nextDue,
            lastWalletPaymentAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: userId,
          })
          batch.set(paymentRef, {
            customerId: customer.id,
            customerName: customer.name || customer.studentName || 'Customer',
            customerEmail: customer.email || '',
            customerPhone: customer.phone || '',
            amount,
            paymentMethod,
            note,
            type: 'wallet_settlement',
            source: 'customer_wallet',
            status: 'paid',
            workspaceId,
            ownerId: workspaceId,
            businessType,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          await batch.commit()
          setRows((currentRows) => currentRows.map((row) => (row.id === customer.id ? normalizeCustomer({ ...row, walletDue: nextDue, lastWalletPaymentAt: new Date().toISOString() }) : row)))
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Customer due settled',
            module: 'Customers',
            description: `${customer.name || 'Customer'} paid ${amount.toLocaleString()} via ${paymentMethod}.`,
            targetId: customer.id,
            targetName: customer.name || customer.id,
            metadata: { amount, paymentMethod, previousDue: currentDue, remainingDue: nextDue },
          })
          return { ok: true, id: paymentRef.id, remainingDue: nextDue }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to settle customer due.') }
        }
      },
      async deleteCustomer(customer) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        if (!customer?.id) return { ok: false, error: 'Customer not found' }
        try {
          await removeUserDoc(workspaceId, 'customers', customer.id, { diagnostics: { currentUserUid: userId, role } })
          setRows((currentRows) => currentRows.filter((row) => row.id !== customer.id))
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Customer deleted',
            module: 'Customers',
            description: `${customer.name || customer.studentName || 'Customer'} was removed.`,
            targetId: customer.id,
            targetName: customer.name || customer.studentName || customer.id,
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Customers',
            priority: 'low',
            title: 'Customer deleted',
            message: `${customer.name || customer.studentName || 'Customer'} was removed.`,
            relatedId: customer.id,
            route: '/app/customers',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete customer.') }
        }
      },
    }),
    [rows, loading, paginationLoading, hasMoreCustomers, customerPage, customerPageLimit, customerListLimit, loadMoreCustomers, source, error, businessType, firebaseUser, role, userDoc, userId, workspaceId, paginated, prependLoadedCustomer],
  )

  return api
}
