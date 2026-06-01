import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeOwnedCollection, subscribeUserCollection } from '../lib/firestore.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculateApprovedExpenses, calculateProfit, calculateRevenue, getInvoiceStatus, isPaidRecord, paymentValue } from '../lib/calculations.js'

const WORKSPACE_COLLECTIONS = [
  'leads',
  'pipelines',
  'customers',
  'clients',
  'products',
  'invoices',
  'payments',
  'expenses',
  'accountTransactions',
  'tasks',
  'teamMembers',
  'branches',
  'reports',
  'supportTickets',
  'subscriptions',
  'activityLogs',
  'staff',
]

const OWNED_COLLECTIONS = [
  { path: 'notifications', field: 'userId' },
  { path: 'upgradeRequests', field: 'workspaceId' },
]
const COLLECTIONS = [...WORKSPACE_COLLECTIONS, ...OWNED_COLLECTIONS.map((item) => item.path)]

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function latestAt(list) {
  let best = null
  for (const it of list) {
    const d = toDateValue(it.updatedAt) || toDateValue(it.createdAt)
    if (!d) continue
    if (!best || d.getTime() > best.getTime()) best = d
  }
  return best
}

function fmtDate(d) {
  if (!d) return '—'
  return d.toISOString().slice(0, 10)
}

function num(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

function dealValueUsd(d) {
  return num(d.dealValueUsd ?? d.dealValue ?? 0)
}

function isActiveSub(s) {
  return (s.planStatus || s.status || '').toLowerCase() === 'active'
}

export function useReports() {
  const access = useWorkspaceAccess()
  const { userId, workspaceId, businessType } = access
  const canReadReports = access.isAdmin || access.hasPermission('reports')
  const [data, setData] = useState(() =>
    Object.fromEntries(COLLECTIONS.map((k) => [k, []])),
  )
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setData(Object.fromEntries(COLLECTIONS.map((k) => [k, []])))
        setLoading(false)
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
      })
      return
    }
    if (!userId || !workspaceId) {
      Promise.resolve().then(() => {
        setData(Object.fromEntries(COLLECTIONS.map((k) => [k, []])))
        setLoading(false)
        setSource('firestore')
        setError('')
      })
      return
    }

    if (access.loading) {
      Promise.resolve().then(() => {
        setLoading(true)
        setSource('firestore')
        setError('')
      })
      return
    }

    if (!canReadReports) {
      Promise.resolve().then(() => {
        setData(Object.fromEntries(COLLECTIONS.map((k) => [k, []])))
        setLoading(false)
        setSource('firestore')
        setError('Reports permission is not enabled for this staff account.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })

    const loaded = new Set()
    const workspaceUnsubs = WORKSPACE_COLLECTIONS.map((path) =>
      subscribeUserCollection(
        workspaceId,
        path,
        (rows) => {
          setData((prev) => ({ ...prev, [path]: Array.isArray(rows) ? rows : [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
        (err) => {
          setError(clientSafeMessage(err, 'Unable to load reports data.'))
          setData((prev) => ({ ...prev, [path]: [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
        { businessType },
      ),
    )
    const ownedUnsubs = OWNED_COLLECTIONS.map(({ path, field }) =>
      subscribeOwnedCollection(
        path,
        field === 'workspaceId' ? workspaceId : userId,
        (rows) => {
          setData((prev) => ({ ...prev, [path]: Array.isArray(rows) ? rows : [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
        (err) => {
          setError(clientSafeMessage(err, 'Unable to load reports data.'))
          setData((prev) => ({ ...prev, [path]: [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
        field,
      ),
    )
    const unsubs = [...workspaceUnsubs, ...ownedUnsubs]

    return () => {
      unsubs.forEach((u) => u?.())
    }
  }, [access.loading, businessType, canReadReports, userId, workspaceId])

  const computed = useMemo(() => {
    const leads = data.leads
    const deals = data.pipelines
    const customers = data.customers
    const invoices = data.invoices
    const payments = data.payments
    const expenses = data.expenses
    const tasks = data.tasks
    const teamMembers = data.teamMembers
    const staff = data.staff
    const tickets = data.supportTickets
    const subscriptions = data.subscriptions
    const notifications = data.notifications
    const activityLogs = data.activityLogs
    const upgradeRequests = data.upgradeRequests

    const totalRevenueUsd = calculateRevenue({ invoices, payments })
    const pendingInvoices = invoices.filter((i) => getInvoiceStatus(i) === 'pending').length
    const openTickets = tickets.filter((t) => t.status === 'Open').length
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length
    const activeSubs = subscriptions.filter(isActiveSub).length
    const teamCount = teamMembers.length || staff.length
    const upgradeCount = upgradeRequests.length

    const paidPaymentsUsd = payments.filter(isPaidRecord).reduce((sum, p) => sum + paymentValue(p), 0)
    const expensesUsd = calculateApprovedExpenses(expenses)
    const profitUsd = calculateProfit({ revenue: totalRevenueUsd, expenses: expensesUsd })
    const pipelineValueUsd = deals.reduce((sum, d) => sum + dealValueUsd(d), 0)
    const overdueTasks = tasks.filter((t) => t.status === 'Overdue').length
    const hotLeads = leads.filter((l) => (l.scoreType || '').includes('Hot') || num(l.score) >= 80).length

    const lastUpdated =
      latestAt([
        ...leads,
        ...deals,
        ...customers,
        ...invoices,
        ...payments,
        ...expenses,
        ...tasks,
        ...teamMembers,
        ...staff,
        ...tickets,
        ...subscriptions,
        ...notifications,
        ...activityLogs,
        ...upgradeRequests,
      ]) || null

    return {
      kpis: {
        totalRevenueUsd,
        totalLeads: leads.length,
        pendingInvoices,
        openTickets,
        activeSubs,
        completedTasks,
        upgradeCount,
        teamCount,
        expensesUsd,
        profitUsd,
      },
      aggregates: {
        pipelineDeals: deals.length,
        pipelineValueUsd,
        hotLeads,
        overdueTasks,
        paidPaymentsUsd,
        expensesUsd,
        profitUsd,
        customersCount: customers.length,
        notificationsCount: notifications.length,
        activityCount: activityLogs.length,
      },
      lastUpdatedLabel: fmtDate(lastUpdated),
    }
  }, [data])

  return useMemo(
    () => ({
      data,
      ...computed,
      loading,
      source,
      error,
    }),
    [data, computed, loading, source, error],
  )
}
