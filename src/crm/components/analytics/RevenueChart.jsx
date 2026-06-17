import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import RevenueAreaChart from '../charts/RevenueAreaChart.jsx'
import { usePreferences } from '../../hooks/usePreferences.js'
import { toFiniteNumber } from '../../utils/format.js'
import ChartEmptyState from './ChartEmptyState.jsx'

export default function RevenueChart({ data = [] }) {
  const { currency } = usePreferences()
  const displayCurrency = currency || 'PKR'
  const chartData = (Array.isArray(data) ? data : [])
    .map((d) => ({
      ...d,
      month: d.month || '—',
      // Already in workspace currency — no FX conversion (matches Dashboard).
      revenue: toFiniteNumber(d.revenueUsd),
      _currency: displayCurrency,
    }))
    .filter((d) => d.revenue > 0)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Monthly Revenue</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Comparison and trend</p>
        </div>
        <Badge variant="purple">Revenue</Badge>
      </div>
      <div className="mt-4">
        {chartData.length ? (
          <RevenueAreaChart data={chartData} currency={displayCurrency} />
        ) : (
          <ChartEmptyState />
        )}
      </div>
    </Card>
  )
}
