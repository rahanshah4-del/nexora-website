import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toFiniteNumber } from '../../utils/format.js'
import ChartEmptyState from './ChartEmptyState.jsx'

export default function SalesGrowthChart({ data = [] }) {
  const chartData = (Array.isArray(data) ? data : [])
    .map((d) => ({
      ...d,
      month: d.month || '—',
      growthPct: toFiniteNumber(d.growthPct),
    }))
    .filter((d) => d.growthPct !== 0)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Sales Growth</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Growth percentage trend</p>
        </div>
        <Badge variant="info">Growth</Badge>
      </div>
      <div className="mt-4 h-64">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${toFiniteNumber(v)}%`} />
              <Tooltip />
              <Area type="monotone" dataKey="growthPct" stroke="#22c55e" strokeWidth={2} fill="url(#growthFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState />
        )}
      </div>
    </Card>
  )
}
