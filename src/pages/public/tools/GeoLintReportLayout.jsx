import { useCallback, useEffect, useRef, useState } from 'react'
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

/** The official GeoLint logo (public/geolint-logo.png, 256px; the 96px copy is used for small sizes). */
export function GeoLintMark({ className = 'h-9 w-9', size = 36 }) {
  return <img src={size > 48 ? '/geolint-logo.png' : '/geolint-logo-96.png'} width={size} height={size} alt="GeoLint" className={`${className} rounded-[22%]`} decoding="async" />
}

/** Section menu. groups: [{ label, items: [{ id, label, badge? }] }]. */
export function ReportSidebar({ host, when, groups, view, onSelect, fixHref }) {
  const nav = useRef(null)
  const [more, setMore] = useState(false)

  // show a soft fade at the bottom while the menu still has items below the fold
  const measure = useCallback(() => {
    const el = nav.current
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 6 && el.scrollHeight > el.clientHeight)
  }, [])

  // keep the open section visible inside the menu without moving the page
  useEffect(() => {
    const el = nav.current
    const on = el?.querySelector('[aria-current="page"]')
    if (el && on) {
      const box = el.getBoundingClientRect()
      const r = on.getBoundingClientRect()
      if (r.bottom > box.bottom - 8) el.scrollTop += r.bottom - box.bottom + 16
      else if (r.top < box.top + 8) el.scrollTop -= box.top - r.top + 16
      if (r.right > box.right) el.scrollLeft += r.right - box.right + 16
      else if (r.left < box.left) el.scrollLeft -= box.left - r.left + 16
    }
    measure()
  }, [view, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return (
    <aside className="contents lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:gap-3 lg:self-start">
      {/* below lg the card and the aside are "contents", so the section bar can stick to the page header while the report scrolls */}
      <div className="contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
        <div className="shrink-0 pb-3 lg:border-b lg:border-slate-100 lg:px-5 lg:py-4">
          <div className="flex items-center gap-3 lg:block">
            <div className="flex shrink-0 items-center gap-2.5">
              <GeoLintMark className="h-10 w-10 shrink-0 lg:h-9 lg:w-9" size={40} />
              <div className="hidden min-w-0 leading-tight lg:block">
                <p className="font-display text-[17px] font-extrabold tracking-tight text-slate-950">GeoLint</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">AI visibility report</p>
              </div>
            </div>
            <div className="min-w-0 lg:mt-3">
              <h1 className="truncate font-display text-[17px] font-bold leading-6 tracking-tight text-slate-950 lg:whitespace-normal lg:break-words lg:text-[16px]">{host}</h1>
              {when ? <p className="text-[12.5px] text-slate-500"><span className="lg:hidden">GeoLint report · </span>Audited {when}</p> : null}
            </div>
          </div>
        </div>
        <div className="sticky top-14 z-30 -mx-4 border-y border-slate-200/80 bg-slate-50/90 backdrop-blur-md sm:-mx-6 lg:static lg:relative lg:mx-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
          <nav
            ref={nav}
            onScroll={measure}
            aria-label="Report sections"
            className="gl-scroll flex items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain lg:px-3 lg:py-3"
          >
            {groups.map((g) => (
              <div key={g.label} className="flex shrink-0 items-center gap-1 lg:mt-4 lg:block lg:first:mt-0">
                <p className="mr-0.5 ml-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white lg:m-0 lg:mb-1.5 lg:rounded-lg lg:px-2.5 lg:py-1.5 lg:text-[11.5px] lg:tracking-[0.12em]">{g.label}</p>
                {g.items.map((item) => {
                  const on = item.id === view
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={on ? 'page' : undefined}
                      onClick={() => onSelect(item.id)}
                      className={`flex min-h-[40px] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:min-h-[36px] lg:w-full lg:rounded-xl lg:px-3 lg:text-left ${on ? 'bg-indigo-100 font-bold text-indigo-900 ring-1 ring-indigo-200' : 'bg-white font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 lg:bg-transparent lg:ring-0'}`}
                    >
                      <span>{item.label}</span>
                      {item.badge ? <span className="rounded-full bg-amber-100 px-2 text-[12px] font-extrabold text-amber-800">{item.badge}</span> : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 to-transparent lg:hidden`} />
          <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 bg-gradient-to-t from-white to-transparent transition-opacity lg:block ${more ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>
      <div className="mt-4 hidden shrink-0 rounded-2xl bg-[#0f1b33] p-4 text-white lg:mt-0 [@media(min-height:960px)]:lg:block">
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
    <div className="flex min-w-0 flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
      <div className="relative h-[104px] w-[104px] shrink-0 sm:h-[132px] sm:w-[132px]" role="img" aria-label={`Score ${earned} out of ${max}`}>
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="66" cy="66" r="56" fill="none" stroke="#e5e9f2" strokeWidth="12" />
          <circle cx="66" cy="66" r="56" fill="none" stroke={RING[tone]} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[26px] font-extrabold leading-8 tabular-nums text-slate-950 sm:text-[34px] sm:leading-9">{Number(earned).toFixed(1)}</span>
          <span className="text-[11px] text-slate-500 sm:text-[12px]">out of {max}</span>
        </div>
      </div>
      <div className="min-w-0">
        <span className={`inline-flex rounded-full px-3 py-0.5 text-[12.5px] font-extrabold ${CHIP[tone]}`}>{grade.letter} · {grade.label}</span>
        <p className="mt-2 text-[14.5px] font-semibold leading-[1.4] text-slate-950 sm:mt-2.5 sm:text-[16px] sm:leading-6">{summarizeReport(report)}</p>
        {report.partial ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-900">Some checks could not run, so the score covers {max} of {report.score.totalMax} points.</p> : null}
        <p className="mt-1.5 hidden text-[13px] leading-5 text-slate-500 sm:block">This shows whether AI crawlers can reach and read this one page. It does not predict whether AI tools will cite you.</p>
      </div>
      </div>
      {facts.length ? (
        <dl className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:gap-2.5 sm:pt-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-2xl bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-2.5">
              <dt className="text-[11.5px] font-semibold leading-4 text-slate-500 sm:text-[12px]">{f.label}</dt>
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
        <GeoLintMark size={64} className="h-16 w-16 shrink-0 shadow-lg ring-2 ring-white/80" />
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
