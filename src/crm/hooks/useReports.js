import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeCollection } from '../lib/firestore.js'

const COLLECTIONS = [
  'leads',
  'pipelines',
  'customers',
  'invoices',
  'payments',
  'tasks',
  'teamMembers',
  'supportTickets',
  'subscriptions',
  'notifications',
  'activityLogs',
  'upgradeRequests',
]

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

function invoiceTotalUsd(inv) {
  return num(inv.totalUsd ?? inv.total ?? 0)
}

function dealValueUsd(d) {
  return num(d.dealValueUsd ?? d.dealValue ?? 0)
}

function isActiveSub(s) {
  return (s.planStatus || s.status || '').toLowerCase() === 'active'
}

export function useReports() {
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
        setError('Firestore is not configured.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })

    const loaded = new Set()
    const unsubs = COLLECTIONS.map((path) =>
      subscribeCollection(
        path,
        (rows) => {
          setData((prev) => ({ ...prev, [path]: Array.isArray(rows) ? rows : [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
        (err) => {
          setError(err?.message || 'Failed to load reports data')
          setData((prev) => ({ ...prev, [path]: [] }))
          loaded.add(path)
          if (loaded.size === COLLECTIONS.length) setLoading(false)
        },
      ),
    )

    return () => {
      unsubs.forEach((u) => u?.())
    }
  }, [])

  const computed = useMemo(() => {
    const leads = data.leads
    const deals = data.pipelines
    const customers = data.customers
    const invoices = data.invoices
    const payments = data.payments
    const tasks = data.tasks
    const teamMembers = data.teamMembers
    const tickets = data.supportTickets
    const subscriptions = data.subscriptions
    const notifications = data.notifications
    const activityLogs = data.activityLogs
    const upgradeRequests = data.upgradeRequests

    const totalRevenueUsd = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + invoiceTotalUsd(i), 0)
    const pendingInvoices = invoices.filter((i) => i.status === 'Pending').length
    const openTickets = tickets.filter((t) => t.status === 'Open').length
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length
    const activeSubs = subscriptions.filter(isActiveSub).length
    const teamCount = teamMembers.length
    const upgradeCount = upgradeRequests.length

    const paidPaymentsUsd = payments.filter((p) => (p.paymentStatus || '') === 'Paid').reduce((sum, p) => sum + num(p.amountUsd ?? p.amount ?? 0), 0)
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
        ...tasks,
        ...teamMembers,
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
      },
      aggregates: {
        pipelineDeals: deals.length,
        pipelineValueUsd,
        hotLeads,
        overdueTasks,
        paidPaymentsUsd,
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

