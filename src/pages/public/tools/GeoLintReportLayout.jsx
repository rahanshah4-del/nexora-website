import Link from '../../../components/AppLink.jsx'
import { moduleLabel } from '../../../lib/geolint.js'
import { PRIORITY_LABELS, summarizeReport, verdictInfo } from '../../../lib/geolintReport.js'
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">GeoLint report</p>
        <h1 className="mt-1 break-words font-display text-[17px] font-bold leading-6 tracking-tight text-slate-950">{host}</h1>
        {when ? <p className="mt-0.5 text-[12.5px] text-slate-500">Audited {when}</p> : null}
        <nav aria-label="Report sections" className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:mt-4 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
          {groups.map((g) => (
            <div key={g.label} className="flex shrink-0 gap-1 lg:mt-5 lg:block lg:first:mt-0">
              <p className="mb-1.5 hidden rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-white lg:block">{g.label}</p>
              {g.items.map((item) => {
                const on = item.id === view
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => onSelect(item.id)}
                    className={`flex min-h-[40px] shrink-0 lg:min-h-[36px] items-center justify-between gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:w-full lg:rounded-xl lg:px-3 lg:text-left ${on ? 'bg-indigo-100 font-bold text-indigo-900 ring-1 ring-indigo-200' : 'bg-slate-100 font-medium text-slate-700 hover:bg-slate-200 lg:bg-transparent lg:hover:bg-slate-100'}`}
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
  // three quick facts from the report's own numbers, so the card says more than the score
  const facts = []
  const issues = Array.isArray(report.remediation) ? report.remediation.length : null
  if (issues !== null) facts.push({ label: 'Issues to fix', value: issues, tone: issues ? 'text-amber-600' : 'text-emerald-600' })
  const bots = (report.modules?.botAccess?.bots || []).filter((b) => b.scored)
  if (bots.length) {
    const ok = bots.filter((b) => verdictInfo(b.http?.verdict).label === 'Reachable').length
    facts.push({ label: 'Search bots in', value: `${ok} of ${bots.length}`, tone: ok === bots.length ? 'text-emerald-600' : 'text-rose-600' })
  }
  const sum = report.modules?.bluf?.summary
  if (sum?.headings) facts.push({ label: 'Headings with answers', value: `${sum.passed} of ${sum.headings}`, tone: sum.passed === sum.headings ? 'text-emerald-600' : 'text-slate-950' })
  return (
    <div className="flex min-w-0 flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
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
      {facts.length ? (
        <dl className="grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[12px] font-semibold text-slate-500">{f.label}</dt>
              <dd className={`mt-0.5 font-display text-[18px] font-extrabold tabular-nums ${f.tone}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
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

/** Summary highlight: audit every page of the site, not just this one. Opens the "Whole-website audit" section. */
export function SiteAuditCard({ host, onOpen }) {
  return (
    <section aria-labelledby="site-audit-title" className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#312e81_0%,#4f46e5_55%,#7c3aed_100%)] p-5 text-white shadow-[0_24px_60px_-30px_rgba(79,70,229,0.8)] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-white/40">
          <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
            <defs>
              <linearGradient id="sac-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
            </defs>
            <circle cx="28" cy="28" r="17" fill="none" stroke="url(#sac-g)" strokeWidth="6" />
            <path d="M40.5 40.5L53 53" stroke="url(#sac-g)" strokeWidth="6" strokeLinecap="round" />
            <path d="M20 22h16M20 28h16M20 34h10" stroke="url(#sac-g)" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-indigo-100">One page was audited</p>
          <h2 id="site-audit-title" className="mt-0.5 font-display text-[19px] font-bold leading-6">Audit the whole website</h2>
          <p className="mt-1 text-[14px] leading-6 text-indigo-100">Want every page of {host} checked, not just this one? We read your sitemap and links, score each page and group the problems into fixes that repeat.</p>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex min-h-[46px] shrink-0 items-center rounded-full bg-white px-6 text-[14.5px] font-bold text-indigo-900 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700">Audit whole website</button>
      </div>
    </section>
  )
}
