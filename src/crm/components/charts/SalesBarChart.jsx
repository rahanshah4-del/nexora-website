import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Sales: <span className="font-semibold">{value}</span>
      </p>
    </div>
  )
}

export default function SalesBarChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip content={<TooltipContent />} />
          <Bar dataKey="sales" fill="#a855f7" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

