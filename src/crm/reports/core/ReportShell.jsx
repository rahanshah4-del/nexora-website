import { memo } from 'react'
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

/* ── Modern scrollbar style injected once ── */
const scrollbarStyle = (
  <style>{`
    .thin-scrollbar::-webkit-scrollbar { width: 6px; }
    .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .thin-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .thin-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
    .dark .thin-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
    .dark .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
    .dark .thin-scrollbar { scrollbar-color: #475569 transparent; }
  `}</style>
)

/* ── ReportNavIcon — compact icon button with tooltip ── */
const ReportNavIcon = memo(function ReportNavIcon({
  report,
  active,
  icon: IconComponent,
  index,
  onReportChange,
}) {
  return (
    <button
      key={report.id}
      type="button"
      onClick={() => onReportChange?.(report.id)}
      title={report.title}
      aria-label={`${report.title} report${report.capability !== 'ready' ? ` (${capabilityLabel(report.capability)})` : ''}`}
      aria-current={active ? 'true' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${
        active
          ? 'bg-sky-50 text-sky-800 shadow-sm dark:bg-sky-900/30 dark:text-sky-200'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
      }`}
    >
      {/* Left accent bar for active state */}
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sky-500" />
      ) : null}

      {/* Icon */}
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm transition-colors ${
          active
            ? 'bg-white text-sky-600 shadow-sm dark:bg-sky-800 dark:text-sky-300'
            : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700'
        }`}
      >
        {IconComponent ? (
          <IconComponent className="h-4 w-4" />
        ) : (
          <span className="text-xs font-bold">{report.title.charAt(0)}</span>
        )}
      </span>

      {/* Label + sub */}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${active ? 'text-sky-800 dark:text-sky-200' : ''}`}>
          {report.title}
        </span>
        <span className="mt-px block truncate text-[11px] leading-4 text-slate-400 dark:text-slate-500">
          {report.description?.split('.')[0]}
        </span>
      </span>

      {/* Badge */}
      {report.capability !== 'ready' ? (
        <Badge variant={capabilityTone[report.capability] || 'default'} className="shrink-0 text-[9px]">
          {capabilityLabel(report.capability)}
        </Badge>
      ) : null}
    </button>
  )
})

/* ── Sidebar navigation (desktop) ── */
function ReportSidebar({ groups, reports, activeReportId, onReportChange, reportIcons = {} }) {
  return (
    <nav className="thin-scrollbar sticky top-4 max-h-[calc(100vh-10rem)] min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {groups.map((group) => {
        const groupReports = reports.filter((report) => report.group === group.id)
        if (!groupReports.length) return null
        return (
          <div key={group.id} className="mb-1 last:mb-0">
            <p className="px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {group.title}
            </p>
            <div className="grid gap-0.5">
              {groupReports.map((report, idx) => (
                <ReportNavIcon
                  key={report.id}
                  report={report}
                  active={report.id === activeReportId}
                  icon={reportIcons[report.id]}
                  index={idx}
                  onReportChange={onReportChange}
                />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/* ── Mobile select dropdown ── */
function MobileSelect({ groups, reports, activeReport, onReportChange }) {
  return (
    <div className="mb-4 lg:hidden">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report</label>
      <Select className="mt-1" value={activeReport?.id || ''} onChange={(event) => onReportChange?.(event.target.value)}>
        {groups.map((group) => (
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
  )
}

/* ── Main export ── */
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
  reportIcons = {},
  rangeLabel = '',
}) {
  const activeReport = reports.find((report) => report.id === activeReportId) || reports[0]
  const grouped = reportGroups(groups, reports)

  return (
    <section className={`min-w-0 ${className}`}>
      {scrollbarStyle}

      {/* ── Header ── */}
      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
            {rangeLabel ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {rangeLabel}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {/* ── Mobile selector ── */}
      <MobileSelect groups={grouped} reports={reports} activeReport={activeReport} onReportChange={onReportChange} />

      {/* ── Grid: sidebar + content ── */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[172px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <ReportSidebar
            groups={grouped}
            reports={reports}
            activeReportId={activeReportId}
            onReportChange={onReportChange}
            reportIcons={reportIcons}
          />
        </div>

        {/* Content */}
        <main className="min-w-0">
          {activeReport ? (
            <Card className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{activeReport.title}</h2>
                    <Badge variant={capabilityTone[activeReport.capability] || 'default'}>
                      {capabilityLabel(activeReport.capability)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{activeReport.description}</p>
                  {activeReport.capability === 'blocked' || activeReport.limitationMessage ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
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
