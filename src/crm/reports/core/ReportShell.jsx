import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import Select from '../../components/ui/Select.jsx'

const capabilityTone = {
  ready: 'success',
  partial: 'warning',
  blocked: 'danger',
}

function capabilityLabel(value = '') {
  if (value === 'ready') return 'Ready'
  if (value === 'partial') return 'Partial'
  if (value === 'blocked') return 'Blocked'
  return 'Unknown'
}

function reportGroups(groups = [], reports = []) {
  if (groups.length) return groups
  return Array.from(new Set(reports.map((report) => report.group))).map((id) => ({ id, title: id }))
}

export default function ReportShell({
  title,
  description,
  groups = [],
  reports = [],
  activeReportId,
  onReportChange,
  actions = null,
  children,
  className = '',
}) {
  const activeReport = reports.find((report) => report.id === activeReportId) || reports[0]
  const grouped = reportGroups(groups, reports)

  return (
    <section className={`min-w-0 ${className}`}>
      <div className="mb-5 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <div className="mb-4 lg:hidden">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report</label>
        <Select className="mt-1" value={activeReport?.id || ''} onChange={(event) => onReportChange?.(event.target.value)}>
          {grouped.map((group) => (
            <optgroup key={group.id} label={group.title}>
              {reports.filter((report) => report.group === group.id).map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title} ({capabilityLabel(report.capability)})
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="hidden border border-slate-200 bg-white p-3 shadow-sm lg:block">
          <nav className="max-h-[calc(100vh-12rem)] min-w-0 overflow-y-auto pr-1">
            {grouped.map((group) => {
              const groupReports = reports.filter((report) => report.group === group.id)
              if (!groupReports.length) return null
              return (
                <div key={group.id} className="mb-4 last:mb-0">
                  <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{group.title}</p>
                  <div className="grid gap-1">
                    {groupReports.map((report) => {
                      const active = report.id === activeReport?.id
                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => onReportChange?.(report.id)}
                          className={`min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                            active
                              ? 'border-sky-200 bg-sky-50 text-slate-950 shadow-sm'
                              : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                          }`}
                        >
                          <span className="flex min-w-0 items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{report.title}</span>
                              <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-500">{report.description}</span>
                            </span>
                            <Badge variant={capabilityTone[report.capability] || 'default'} className="shrink-0">
                              {capabilityLabel(report.capability)}
                            </Badge>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </Card>

        <main className="min-w-0">
          {activeReport ? (
            <Card className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{activeReport.title}</h2>
                    <Badge variant={capabilityTone[activeReport.capability] || 'default'}>{capabilityLabel(activeReport.capability)}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{activeReport.description}</p>
                  {activeReport.capability === 'blocked' || activeReport.limitationMessage ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      {activeReport.limitationMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}
          {children}
        </main>
      </div>
    </section>
  )
}
