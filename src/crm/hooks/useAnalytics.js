import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeCollection } from '../lib/firestore.js'

function num(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

export function useAnalytics({ dateRange = '30d' } = {}) {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [leads, setLeads] = useState([])
  const [team, setTeam] = useState([])

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setLoading(false)
        setSource('none')
        setError('Firestore is not configured.')
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsubs = []
    unsubs.push(
      subscribeCollection('invoices', (d) => setInvoices(d), (e) => setError(e?.message || 'Failed to load invoices')),
    )
    unsubs.push(subscribeCollection('payments', (d) => setPayments(d)))
    unsubs.push(subscribeCollection('leads', (d) => setLeads(d)))
    unsubs.push(subscribeCollection('teamMembers', (d) => setTeam(d)))

    // Note: this is a UI dashboard; dateRange filtering is a placeholder until full backend constraints are added.
    Promise.resolve().then(() => {
      setLoading(false)
      setSource('firestore')
    })
    return () => unsubs.forEach((u) => u?.())
  }, [])

  const computed = useMemo(() => {
    const pendingInvoices = invoices.filter((i) => (i.status || '') === 'Pending').length
    const overdueInvoices = invoices.filter((i) => (i.status || '') === 'Overdue').length

    const topStaff = [...team]
      .map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        performanceScore: m.performanceScore ?? 0,
        lastActive: m.lastActive ?? '—',
      }))
      .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
      .slice(0, 6)

    const totalRevenueUsd = invoices.filter((i) => (i.status || '') === 'Paid').reduce((s, i) => s + num(i.totalUsd ?? i.total ?? 0), 0)
    const totalCustomers = 0
    const activeLeads = leads.length
    const monthlySales = payments.filter((p) => (p.paymentStatus || '') === 'Paid').length

    return {
      kpis: {
        totalRevenue: totalRevenueUsd,
        totalCustomers,
        activeLeads,
        monthlySales,
        pendingInvoices,
        overdueInvoices,
      },
      monthlyRevenue: [],
      salesGrowth: [],
      conversion: [],
      leadSources: [],
      retention: [],
      topStaff,
      pendingInvoices,
    }
  }, [invoices, payments, leads, team])

  return { ...computed, loading, source, error, dateRange }
}
