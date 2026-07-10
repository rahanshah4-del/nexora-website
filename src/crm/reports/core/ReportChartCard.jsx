function numericValue(value) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.max(0, next) : 0
}

export default function ReportChartCard({
  title,
  description,
  total,
  barData = [],
  children,
  emptyState = 'No chart data available.',
  className = '',
}) {
  const rows = Array.isArray(barData) ? barData : []
  const maxValue = Math.max(0, ...rows.map((row) => numericValue(row.value)))
  const hasBars = rows.length > 0 && maxValue > 0

  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-4 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        {total !== undefined && total !== null ? <p className="shrink-0 text-sm font-bold text-slate-700">{total}</p> : null}
      </div>

      {children || hasBars ? (
        <>
          {children}
          {hasBars ? (
            <div className="grid gap-3" role="list" aria-label={title}>
              {rows.map((row) => {
                const value = numericValue(row.value)
                const width = maxValue ? `${Math.max(3, (value / maxValue) * 100)}%` : '0%'
                return (
                  <div key={row.id || row.label} className="min-w-0" role="listitem" aria-label={`${row.label}: ${row.displayValue ?? value}`}>
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-slate-700">{row.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">{row.displayValue ?? value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-500" style={{ width }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          {emptyState}
        </div>
      )}
    </section>
  )
}
