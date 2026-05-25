import { motion } from 'framer-motion'
import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import DateRangeFilter from '../components/analytics/DateRangeFilter.jsx'
import KPICards from '../components/analytics/KPICards.jsx'
import RevenueChart from '../components/analytics/RevenueChart.jsx'
import SalesGrowthChart from '../components/analytics/SalesGrowthChart.jsx'
import ConversionChart from '../components/analytics/ConversionChart.jsx'
import LeadSourceChart from '../components/analytics/LeadSourceChart.jsx'
import TopStaffTable from '../components/analytics/TopStaffTable.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useAnalytics } from '../hooks/useAnalytics.js'

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d')
  const analytics = useAnalytics({ dateRange: range })

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Enterprise Analytics"
        subtitle="Real-time style dashboards with interactive charts and date filtering (demo)."
        right={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="subtle" className="whitespace-nowrap rounded-2xl">
              Export Reports
            </Button>
          </div>
        }
      />

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <Badge variant={analytics.source === 'firestore' ? 'success' : 'default'}>
          {analytics.loading ? 'Loading…' : analytics.source === 'firestore' ? 'Live' : 'Demo'}
        </Badge>
        {analytics.error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <KPICards kpis={analytics.kpis} />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <RevenueChart data={analytics.monthlyRevenue} />
        <SalesGrowthChart data={analytics.salesGrowth} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <ConversionChart data={analytics.conversion} />
        <LeadSourceChart data={analytics.leadSources} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)]">
        <TopStaffTable staff={analytics.topStaff.length ? analytics.topStaff : [{ id: 'demo', name: '—', role: '—', performanceScore: 0, lastActive: '—' }]} />
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Business Overview</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Goal tracking + revenue comparison (placeholder)</p>
            </div>
            <Badge variant="purple">Overview</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Profit & Loss</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">12.6%</p>
            </div>
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Retention</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">92%</p>
            </div>
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Subscription Revenue</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">$18.2k</p>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
