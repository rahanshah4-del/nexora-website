import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { listenToWorkspaceCollection } from '../lib/firestore.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculateApprovedExpenses, calculateProfit, calculateRevenue, getInvoiceStatus, isPaidRecord, paymentValue } from '../lib/calculations.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import {
  reportById,
  reportsByCategory,
  reportsForModule,
  defaultReportForCategory,
  categoriesForModule,
  collectionsForReports,
  REPORT_CATEGORIES,
  REPORT_CATALOG,
} from '../lib/reportCatalog.js'

const SUPPORT_TICKET_COLLECTION = 'supportTickets'

export const REPORT_SECTION_OPTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'finance', label: 'Finance' },
  { value: 'sales', label: 'Sales & customers' },
  { value: 'activity', label: 'Activity & team' },
  { value: 'support', label: 'Support' },
]

const REPORT_SECTION_COLLECTIONS = {
  overview: ['invoices', 'payments', 'expenses', 'accountTransactions', 'customers', 'leads'],
  finance: ['invoices', 'payments', 'expenses', 'accountTransactions', 'purchases', 'suppliers'],
  sales: ['leads', 'pipelines', 'customers'],
  activity: ['activityLogs', 'tasks', 'teamMembers', 'staff'],
  support: [SUPPORT_TICKET_COLLECTION],
}

const COLLECTIONS = Array.from(
  new Set(Object.values(REPORT_SECTION_COLLECTIONS).flat()),
)

const DEFAULT_DETAIL_LIMIT = 100
const MAX_DETAIL_LIMIT = 250
const EMPTY_META = [
  'clients',
  'products',
  'accountTransactions',
  'branches',
  'reports',
  'subscriptions',
  'notifications',
]

// TODO: Replace recent-row listeners with reportSummaries/{businessType}/months/{yyyyMM}.
function emptyReportData() {
  return Object.fromEntries([...COLLECTIONS, ...EMPTY_META].map((k) => [k, []]))
}

function safeSection(section) {
  return REPORT_SECTION_COLLECTIONS[section] ? section : 'overview'
}

function safeLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_DETAIL_LIMIT
  return Math.min(Math.floor(next), MAX_DETAIL_LIMIT)
}

function validDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function dateWhereFilters(dateWindow) {
  const filters = []
  if (validDate(dateWindow?.start)) filters.push(['createdAt', '>=', dateWindow.start])
  if (validDate(dateWindow?.end)) filters.push(['createdAt', '<=', dateWindow.end])
  return filters
}

function dateWindowLabel(dateWindow) {
  return {
    start: validDate(dateWindow?.start) ? dateWindow.start.toISOString() : null,
    end: validDate(dateWindow?.end) ? dateWindow.end.toISOString() : null,
  }
}

function collectionsForSection(section, canReadSupportTickets) {
  const selectedSection = safeSection(section)
  if (selectedSection === 'support' && !canReadSupportTickets) return []
  if (selectedSection !== 'support') {
    return REPORT_SECTION_COLLECTIONS[selectedSection].filter((item) => item !== SUPPORT_TICKET_COLLECTION)
  }
  return REPORT_SECTION_COLLECTIONS[selectedSection]
}

function markLoadedOnce({ loaded, expectedLoads, path, setLoading, section, collections, reported }) {
  loaded.add(path)
  if (loaded.size !== expectedLoads || reported.current) return
  reported.current = true
  setLoading(false)
  console.log('[Reports] collections loaded', { section, collections })
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

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
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

export function useReports({ section = 'overview', limitCount = DEFAULT_DETAIL_LIMIT, dateWindow = null } = {}) {
  const access = useWorkspaceAccess()
  const { workspaceId, businessType } = access
  const normalizedBusinessType = normalizeBusinessType(businessType || '')
  const canReadReports = access.isAdmin || access.hasPermission('reports')
  const canReadSupportTickets = access.hasModulePermission('support', 'view')
  const selectedSection = safeSection(section)
  const detailLimit = safeLimit(limitCount)
  const collectionPlan = useMemo(
    () => collectionsForSection(selectedSection, canReadSupportTickets),
    [canReadSupportTickets, selectedSection],
  )
  const dateFilters = useMemo(
    () => dateWhereFilters(dateWindow),
    [dateWindow?.end, dateWindow?.start],
  )
  const [data, setData] = useState(emptyReportData)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        console.log('[Reports] idle', { reason: 'no-db', section: selectedSection })
        setData(emptyReportData())
        setLoading(false)
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        console.log('[Reports] idle', { reason: 'no-workspace', section: selectedSection })
        setData(emptyReportData())
        setLoading(false)
        setSource('firestore')
        setError('')
      })
      return
    }

    if (access.loading) {
      Promise.resolve().then(() => {
        console.log('[Reports] idle', { reason: 'access-loading', section: selectedSection })
        setLoading(true)
        setSource('firestore')
        setError('')
      })
      return
    }

    if (!canReadReports) {
      Promise.resolve().then(() => {
        console.log('[Reports] idle', { reason: 'missing-reports-permission', section: selectedSection })
        setData(emptyReportData())
        setLoading(false)
        setSource('firestore')
        setError('Reports permission is not enabled for this staff account.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError(selectedSection === 'support' && !canReadSupportTickets ? 'Support report permission is not enabled for this staff account.' : '')
      setData(emptyReportData())
      console.log('[Reports] loading section', {
        section: selectedSection,
        collections: collectionPlan,
        limitCount: detailLimit,
        dateWindow: dateWindowLabel(dateWindow),
      })
    })

    const loaded = new Set()
    const reported = { current: false }
    const expectedLoads = collectionPlan.length
    if (!expectedLoads) {
      Promise.resolve().then(() => {
        setLoading(false)
        console.log('[Reports] collections loaded', { section: selectedSection, collections: [] })
      })
      return () => {}
    }

    const unsubs = collectionPlan.map((path) => {
      console.log('[Reports] limited query', {
        section: selectedSection,
        collection: path,
        orderBy: 'createdAt',
        direction: 'desc',
        limitCount: detailLimit,
        whereFilters: dateFilters.map(([field, op]) => `${field} ${op}`),
      })
      return listenToWorkspaceCollection({
        workspaceId,
        collectionName: path,
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: detailLimit,
        whereFilters: dateFilters,
        onData(rows) {
          setData((prev) => ({ ...prev, [path]: Array.isArray(rows) ? rows : [] }))
          markLoadedOnce({ loaded, expectedLoads, path, setLoading, section: selectedSection, collections: collectionPlan, reported })
        },
        onError(err) {
          setError(clientSafeMessage(err, 'Unable to load reports data.'))
          setData((prev) => ({ ...prev, [path]: [] }))
          markLoadedOnce({ loaded, expectedLoads, path, setLoading, section: selectedSection, collections: collectionPlan, reported })
        },
      })
    })

    return () => {
      unsubs.forEach((u) => u?.())
    }
  }, [access.loading, businessType, canReadReports, canReadSupportTickets, collectionPlan, dateFilters, dateWindow, detailLimit, selectedSection, workspaceId])

  const computed = useMemo(() => {
    const leads = data.leads
    const deals = data.pipelines
    const customers = data.customers
    const invoices = data.invoices
    const payments = data.payments
    const expenses = data.expenses
    const transactions = data.accountTransactions
    const tasks = data.tasks
    const teamMembers = data.teamMembers
    const staff = data.staff
    const tickets = data.supportTickets
    const subscriptions = data.subscriptions
    const notifications = data.notifications
    const activityLogs = data.activityLogs

    const totalRevenueUsd = calculateRevenue({ invoices, payments, transactions })
    const pendingInvoices = invoices.filter((i) => getInvoiceStatus(i) === 'pending').length
    const openTickets = tickets.filter((t) => t.status === 'Open').length
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length
    const activeSubs = subscriptions.filter(isActiveSub).length
    const teamCount = teamMembers.length || staff.length
    const upgradeCount = 0

    const paidPaymentsUsd = payments.filter(isPaidRecord).reduce((sum, p) => sum + paymentValue(p), 0)
    const expensesUsd = calculateApprovedExpenses(expenses, transactions)
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
      section: selectedSection,
      loadedCollections: collectionPlan,
      limitCount: detailLimit,
      canReadSupportTickets,
      // ── Enterprise Report Catalogue (filtered by businessType) ──
      catalog: reportsForModule(normalizedBusinessType),
      categories: Object.fromEntries(
        reportsForModule(normalizedBusinessType)
          .reduce((acc, r) => {
            if (!acc.has(r.category)) acc.set(r.category, REPORT_CATEGORIES[r.category])
            return acc
          }, new Map())
          .entries()
      ),
      reportById,
      reportsByCategory,
      reportsForModule: (module) => reportsForModule(module),
      defaultReportForCategory: (cat) => defaultReportForCategory(cat),
      categoriesForModule: (module) => categoriesForModule(module),
      collectionsForReports: (ids) => collectionsForReports(ids),
    }),
    [canReadSupportTickets, collectionPlan, data, computed, detailLimit, error, loading, normalizedBusinessType, selectedSection, source],
  )
}
