import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import RevenueAreaChart from '../charts/RevenueAreaChart.jsx'
import { usePreferences } from '../../hooks/usePreferences.js'
import { convertFromUsd } from '../../utils/currency.js'

export default function RevenueChart({ data }) {
  const { currency } = usePreferences()
  const chartData = data.map((d) => ({
    ...d,
    revenue: convertFromUsd(d.revenueUsd, currency),
    _currency: currency,
  }))

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
        <RevenueAreaChart data={chartData} currency={currency} />
      </div>
    </Card>
  )
}

