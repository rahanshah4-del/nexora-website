import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../utils/format.js'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  const currency = payload[0]?.payload?._currency ?? 'USD'
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Revenue: <span className="font-semibold">{formatCurrency(value, currency)}</span>
      </p>
    </div>
  )
}

export default function RevenueAreaChart({ data, currency = 'USD' }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v, currency, { maximumFractionDigits: 0 })}
          />
          <Tooltip content={<TooltipContent />} />
          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
