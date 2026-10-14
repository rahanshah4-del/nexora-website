import { TONES } from '../../lib/geolintUi.js'

export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

export function Panel({ title, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

export function Button({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Notice({ tone = 'slate', children }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${TONES[tone]}`}>{children}</div>
}

export function Pill({ tone, children }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-black ${TONES[tone]}`}>{children}</span>
}

export function StatCard({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </Card>
  )
}


