import Link from '../../../components/AppLink.jsx'
import { moduleLabel } from '../../../lib/geolint.js'
import { PRIORITY_LABELS, summarizeReport } from '../../../lib/geolintReport.js'
import { Pill } from './GeoLintVisuals.jsx'

/**
 * Layout pieces of the report page (GeoAuditReportPage.jsx): a section menu on the left (a scrolling row of pills on a
 * phone), a light summary card and a short "fix these first" preview. One section is shown at a time, so the report is
 * a few short screens instead of one 11,000 px list.
 */

const RING = { emerald: '#16a34a', amber: '#d97706', orange: '#ea580c', rose: '#e11d48', slate: '#64748b' }
const CHIP = {
  emerald: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-800',
  rose: 'bg-rose-100 text-rose-800',
  slate: 'bg-slate-100 text-slate-700',
}

/** Section menu. groups: [{ label, items: [{ id, label, badge? }] }]. */
export function ReportSidebar({ host, when, groups, view, onSelect, fixHref }) {
  return (
    <aside className="lg:sticky lg:top-24 lg:w-64 lg:shrink-0 lg:self-start">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">GeoLint report</p>
        <h1 className="mt-1 break-words font-display text-[17px] font-bold leading-6 tracking-tight text-slate-950">{host}</h1>
        {when ? <p className="mt-0.5 text-[12.5px] text-slate-500">Audited {when}</p> : null}
        <nav aria-label="Report sections" className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:mt-4 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
          {groups.map((g) => (
            <div key={g.label} className="flex shrink-0 gap-1 lg:mt-4 lg:block lg:first:mt-0">
              <p className="hidden px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 lg:block">{g.label}</p>
              {g.items.map((item) => {
                const on = item.id === view
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => onSelect(item.id)}
                    className={`flex min-h-[40px] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:w-full lg:rounded-xl lg:px-3 lg:text-left ${on ? 'bg-indigo-50 font-bold text-indigo-800' : 'bg-slate-100 font-medium text-slate-700 hover:bg-slate-200 lg:bg-transparent lg:hover:bg-slate-100'}`}
                  >
                    <span>{item.label}</span>
                    {item.badge ? <span className="rounded-full bg-amber-100 px-2 text-[12px] font-extrabold text-amber-800">{item.badge}</span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-4 hidden rounded-2xl bg-[#0f1b33] p-4 text-white lg:block">
        <p className="text-[14px] font-bold">Want it fixed for you?</p>
        <p className="mt-1 text-[12.5px] leading-5 text-blue-100">From $50 per website. We show your score before and after.</p>
        <Link to={fixHref} className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-white px-4 text-[13px] font-bold text-slate-950 hover:bg-blue-50">Get it fixed</Link>
      </div>
    </aside>
  )
}

/** The light score card: ring, grade and the one-sentence result. */
export function SummaryScore({ report, grade }) {
  const { earned, evaluatedMax: max } = report.score
  const ratio = max > 0 ? Math.max(0, Math.min(1, earned / max)) : 0
  const c = 2 * Math.PI * 56
  const tone = RING[grade.tone] ? grade.tone : 'slate'
  return (
    <div className="flex min-w-0 flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
      <div className="relative h-[132px] w-[132px] shrink-0" role="img" aria-label={`Score ${earned} out of ${max}`}>
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="66" cy="66" r="56" fill="none" stroke="#e5e9f2" strokeWidth="12" />
          <circle cx="66" cy="66" r="56" fill="none" stroke={RING[tone]} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[34px] font-extrabold leading-9 tabular-nums text-slate-950">{Number(earned).toFixed(1)}</span>
          <span className="text-[12px] text-slate-500">out of {max}</span>
        </div>
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <span className={`inline-flex rounded-full px-3 py-0.5 text-[12.5px] font-extrabold ${CHIP[tone]}`}>{grade.letter} · {grade.label}</span>
        <p className="mt-2.5 text-[16px] font-semibold leading-6 text-slate-950">{summarizeReport(report)}</p>
        {report.partial ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-900">Some checks could not run, so the score covers {max} of {report.score.totalMax} points.</p> : null}
        <p className="mt-1.5 text-[13px] leading-5 text-slate-500">This shows whether AI crawlers can reach and read this one page. It does not predict whether AI tools will cite you.</p>
      </div>
    </div>
  )
}

/** Top fixes with a button to the full list. */
export function FixPreview({ items, onOpen }) {
  if (!items.length) return null
  const total = items.reduce((sum, i) => sum + (Number(i.upTo) || 0), 0)
  return (
    <section aria-labelledby="fix-preview-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="fix-preview-title" className="font-display text-[17px] font-bold text-slate-950">Fix these first</h2>
        {total > 0 ? <span className="text-[13px] font-bold text-emerald-700">Up to +{Math.round(total * 10) / 10} points</span> : null}
      </div>
      <ol className="mt-4 space-y-2.5">
        {items.map((item) => {
          const p = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.medium
          return (
            <li key={item.id}>
              <button type="button" onClick={() => onOpen(item.id)} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3.5 text-left transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                <Pill tone={p.tone}>{p.label}</Pill>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold leading-5 text-slate-950">{item.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-slate-500">{moduleLabel(item.module)}</span>
                </span>
                {item.upTo > 0 ? <span className="shrink-0 text-[13px] font-bold tabular-nums text-emerald-700">+{item.upTo}</span> : null}
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={() => onOpen('')} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#0f1b33] px-5 text-[14px] font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Open all fixes and the AI prompt</button>
    </section>
  )
}
