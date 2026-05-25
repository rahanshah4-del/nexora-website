import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toFiniteNumber } from '../../utils/format.js'
import ChartEmptyState from './ChartEmptyState.jsx'

export default function LeadSourceChart({ data = [] }) {
  const chartData = (Array.isArray(data) ? data : [])
    .map((d) => ({
      ...d,
      source: d.source || 'Unknown',
      leads: toFiniteNumber(d.leads),
    }))
    .filter((d) => d.leads > 0)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Lead Sources</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Attribution breakdown</p>
        </div>
        <Badge variant="info">Sources</Badge>
      </div>
      <div className="mt-4 h-64">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="source" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="leads" fill="#6366f1" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState />
        )}
      </div>
    </Card>
  )
}
