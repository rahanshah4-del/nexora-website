import { useEffect, useMemo, useState } from 'react'
import { aiFollowUpSuggestion } from '../lib/aiClient.js'

function safeNum(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

function scoreVal(l) {
  return safeNum(l.score ?? l.aiScore ?? 0)
}

export function useAIInsights({ leads = [], deals = [], invoices = [], tasks = [], customers = [] }) {
  const insights = useMemo(() => {
    const bestLeadSource = (() => {
      const map = new Map()
      leads.forEach((l) => {
        const src = l.source || 'Unknown'
        map.set(src, (map.get(src) || 0) + 1)
      })
      let best = { source: '—', count: 0 }
      for (const [source, count] of map.entries()) {
        if (count > best.count) best = { source, count }
      }
      return best
    })()

    const topOpportunity = (() => {
      const sorted = [...deals].sort((a, b) => safeNum(b.dealValueUsd ?? b.dealValue) - safeNum(a.dealValueUsd ?? a.dealValue))
      const d = sorted[0]
      if (!d) return null
      return {
        title: d.title || 'Top Opportunity',
        customerName: d.customerName || '—',
        valueUsd: safeNum(d.dealValueUsd ?? d.dealValue),
        winProbability: safeNum(d.winProbability ?? 0),
      }
    })()

    const riskyDeals = deals
      .filter((d) => safeNum(d.winProbability ?? 100) < 40)
      .sort((a, b) => safeNum(a.winProbability) - safeNum(b.winProbability))
      .slice(0, 3)

    const expectedRevenueUsd = deals.reduce((sum, d) => {
      const value = safeNum(d.dealValueUsd ?? d.dealValue)
      const wp = safeNum(d.winProbability ?? 0) / 100
      return sum + value * wp
    }, 0)

    const lowActivityLeads = [...leads]
      .filter((l) => safeNum(l.activityFrequency ?? 0) < 40)
      .sort((a, b) => scoreVal(a) - scoreVal(b))
      .slice(0, 5)

    const overdueTasks = tasks.filter((t) => t.status === 'Overdue').slice(0, 5)
    const pendingInvoices = invoices.filter((i) => i.status === 'Pending').slice(0, 5)

    return {
      bestLeadSource,
      topOpportunity,
      riskyDeals,
      expectedRevenueUsd,
      lowActivityLeads,
      overdueTasks,
      pendingInvoices,
      customersCount: customers.length,
      leadsCount: leads.length,
    }
  }, [leads, deals, invoices, tasks, customers])

  const [followUp, setFollowUp] = useState(null)
  const [followUpLoading, setFollowUpLoading] = useState(false)

  useEffect(() => {
    const task = insights.overdueTasks[0]
    if (!task) {
      Promise.resolve().then(() => setFollowUp(null))
      return
    }
    Promise.resolve().then(() => setFollowUpLoading(true))
    aiFollowUpSuggestion(task)
      .then((s) => setFollowUp({ task, ...s }))
      .catch(() => setFollowUp(null))
      .finally(() => setFollowUpLoading(false))
  }, [insights.overdueTasks])

  return { insights, followUp, followUpLoading }
}

