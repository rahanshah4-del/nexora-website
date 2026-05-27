import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { getDashboardStats, getInvoiceStatus, invoiceValue, isPaidRecord, paymentValue } from '../lib/calculations.js'

function num(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString('en-US', { month: 'short' }) : ''
}

function buildMonthlyRevenue(invoices, payments) {
  const paidPayments = payments.filter(isPaidRecord)
  const sourceRows = paidPayments.length
    ? paidPayments.map((p) => ({
        date: p.paidAt || p.createdAt,
        amountUsd: paymentValue(p),
      }))
    : invoices
        .filter((i) => getInvoiceStatus(i) === 'paid')
        .map((i) => ({
          date: i.paidAt || i.createdAt || i.dueDate,
          amountUsd: invoiceValue(i),
        }))

  const grouped = new Map()
  sourceRows.forEach((row) => {
    const label = monthLabel(row.date)
    if (!label) return
    grouped.set(label, num(grouped.get(label)) + num(row.amountUsd))
  })

  return Array.from(grouped.entries()).map(([month, revenueUsd]) => ({ month, revenueUsd }))
}

function buildSalesGrowth(monthlyRevenue) {
  if (monthlyRevenue.length < 2) return []
  return monthlyRevenue.map((row, index) => {
    if (index === 0) return { month: row.month, growthPct: 0 }
    const previous = num(monthlyRevenue[index - 1]?.revenueUsd)
    const current = num(row.revenueUsd)
    const growthPct = previous > 0 ? ((current - previous) / previous) * 100 : 0
    return { month: row.month, growthPct }
  })
}

function buildLeadSources(leads) {
  const grouped = new Map()
  leads.forEach((lead) => {
    const source = lead.source || lead.leadSource || 'Unknown'
    grouped.set(source, num(grouped.get(source)) + 1)
  })
  return Array.from(grouped.entries()).map(([source, count]) => ({ source, leads: count }))
}

function isConvertedLead(lead) {
  const value = String(lead.status || lead.stage || '').toLowerCase()
  return ['converted', 'customer', 'won', 'paid', 'completed'].some((term) => value.includes(term))
}

export function useAnalytics({ dateRange = '30d' } = {}) {
  const { workspaceId } = useUser()
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [leads, setLeads] = useState([])
  const [team, setTeam] = useState([])

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setLoading(false)
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setInvoices([])
        setPayments([])
        setCustomers([])
        setExpenses([])
        setLeads([])
        setTeam([])
        setLoading(false)
        setSource('firestore')
        setError('')
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsubs = []
    unsubs.push(
      subscribeUserCollection(workspaceId, 'invoices', (d) => setInvoices(d), (e) => setError(clientSafeMessage(e, 'Unable to load invoices.'))),
    )
    unsubs.push(subscribeUserCollection(workspaceId, 'payments', (d) => setPayments(d)))
    unsubs.push(subscribeUserCollection(workspaceId, 'customers', (d) => setCustomers(d)))
    unsubs.push(subscribeUserCollection(workspaceId, 'expenses', (d) => setExpenses(d)))
    unsubs.push(subscribeUserCollection(workspaceId, 'leads', (d) => setLeads(d)))
    unsubs.push(subscribeUserCollection(workspaceId, 'teamMembers', (d) => setTeam(d)))

    // Date-range filtering stays client-side for the current dashboard view.
    Promise.resolve().then(() => {
      setLoading(false)
      setSource('firestore')
    })
    return () => unsubs.forEach((u) => u?.())
  }, [workspaceId])

  const computed = useMemo(() => {
    const pendingInvoices = invoices.filter((i) => getInvoiceStatus(i) === 'pending').length
    const overdueInvoices = invoices.filter((i) => getInvoiceStatus(i) === 'overdue').length
    const monthlyRevenue = buildMonthlyRevenue(invoices, payments)
    const salesGrowth = buildSalesGrowth(monthlyRevenue)
    const leadSources = buildLeadSources(leads)

    const topStaff = [...team]
      .map((m) => ({
        id: m.id,
        name: m.name || 'No data yet',
        role: m.role || '—',
        performanceScore: num(m.performanceScore),
        lastActive: m.lastActive ?? '—',
      }))
      .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
      .slice(0, 6)

    const dashboardStats = getDashboardStats({ invoices, payments, customers, leads, expenses })
    const totalRevenueUsd = dashboardStats.totalRevenue
    const totalCustomers = dashboardStats.totalCustomers
    const activeLeads = dashboardStats.activeLeads
    const monthlySales = dashboardStats.monthlySales
    const convertedLeads = leads.filter(isConvertedLead).length
    const conversionRatePct = activeLeads > 0 ? (convertedLeads / activeLeads) * 100 : 0
    const latestGrowthPct = num(salesGrowth.at(-1)?.growthPct)

    return {
      kpis: {
        monthlyRevenueUsd: totalRevenueUsd,
        salesGrowthPct: latestGrowthPct,
        conversionRatePct,
        pendingInvoices,
        totalRevenue: totalRevenueUsd,
        totalCustomers,
        activeLeads,
        monthlySales,
        overdueInvoices,
      },
      monthlyRevenue,
      salesGrowth,
      conversion: conversionRatePct ? [{ week: 'Now', conversionPct: conversionRatePct }] : [],
      leadSources,
      retention: [],
      topStaff,
      pendingInvoices,
    }
  }, [invoices, payments, customers, expenses, leads, team])

  return { ...computed, loading, source, error, dateRange }
}
