function isUnavailable(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'number' && Number.isNaN(value)) return true
  return false
}

function formatValue(value, type = 'number', options = {}) {
  if (options.unavailable || isUnavailable(value)) return 'Unavailable'
  if (type === 'currency') {
    const amount = Number(value)
    if (!Number.isFinite(amount)) return 'Unavailable'
    const formatted = amount.toLocaleString(options.locale || 'en-PK', { maximumFractionDigits: 2 })
    return options.currency ? `${options.currency} ${formatted}` : formatted
  }
  if (type === 'percentage') {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${amount.toLocaleString(options.locale || 'en-PK', { maximumFractionDigits: 2 })}%` : 'Unavailable'
  }
  if (type === 'duration') return String(value)
  if (type === 'text') return String(value)
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toLocaleString(options.locale || 'en-PK') : String(value)
}

export default function ReportKpiGrid({
  kpis = [],
  values = {},
  currency = '',
  locale = 'en-PK',
  className = '',
}) {
  return (
    <div className={`grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {kpis.map((kpi) => {
        const raw = Object.prototype.hasOwnProperty.call(kpi, 'value') ? kpi.value : values[kpi.key]
        const unavailable = kpi.unavailable || isUnavailable(raw)
        return (
          <div key={kpi.key || kpi.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-400">{kpi.label}</p>
            <p className={`mt-2 break-words text-2xl font-semibold ${unavailable ? 'text-slate-400' : Number(raw) < 0 ? 'text-rose-600' : 'text-slate-950'}`}>
              {formatValue(raw, kpi.type, { currency: kpi.currency || currency, locale, unavailable })}
            </p>
            {kpi.helper || kpi.limitationMessage ? (
              <p className="mt-2 text-sm leading-5 text-slate-500">{kpi.helper || kpi.limitationMessage}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
