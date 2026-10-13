import { useCallback, useRef, useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { collectFindings, moduleLabel, runGeoAudit, scoreLabel, scoreTone } from '../../../lib/geolint.js'
import { GEOLINT_LAST_UPDATED, GEOLINT_PAGE, geolintPageSchemas } from '../../../lib/geolintPageData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Breadcrumbs, ContentSection, CtaPanel, FaqSection, TrustChips } from './ToolPageParts.jsx'

const TONE_CLASSES = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
  slate: 'bg-slate-50 text-slate-700 ring-slate-200',
}
const SEVERITY_LABEL = { error: 'Fix', warning: 'Improve' }
const MODULE_KEYS = ['botAccess', 'jsDifferential', 'bluf', 'facts']

function ScoreBadge({ earned, max, className = '' }) {
  const percent = max > 0 ? (earned / max) * 100 : NaN
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${TONE_CLASSES[scoreTone(percent)]} ${className}`}>
      {scoreLabel(earned, max)}
    </span>
  )
}

function BotTable({ bots }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr><th className="px-3 py-2">Bot</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">robots.txt</th><th className="px-3 py-2">Live request</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bots.map((bot) => (
            <tr key={bot.bot}>
              <td className="px-3 py-2 font-medium text-slate-900">{bot.bot}</td>
              <td className="px-3 py-2 text-slate-600">{bot.scored ? 'Search (scored)' : 'Training (not scored)'}</td>
              <td className="px-3 py-2">{bot.robots?.allowed ? 'Allowed' : 'Blocked'}</td>
              <td className="px-3 py-2">{bot.http?.verdict === 'ok' ? `OK (${bot.http.status})` : `${bot.http?.verdict || 'unknown'}${bot.http?.status ? ` (${bot.http.status})` : ''}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The audit report: overall score, per-check scores, fix-first list, bot table. */
export function AuditReport({ report }) {
  const findings = collectFindings(report)
  const modules = report.modules || {}
  return (
    <div className="mt-6 space-y-6" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-slate-950">Your GeoLint score</h2>
        <ScoreBadge earned={report.score?.earned} max={report.score?.evaluatedMax} />
        {report.partial ? <span className="text-[13px] text-slate-500">Some checks could not run and are left out of the score.</span> : null}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {MODULE_KEYS.map((key) => {
          const mod = modules[key]
          if (!mod) return null
          const unavailable = mod.status === 'unavailable'
          return (
            <li key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[15px] font-semibold text-slate-900">{moduleLabel(key)}</span>
                {unavailable ? <span className="text-[13px] text-slate-500">Could not run</span> : <ScoreBadge earned={mod.score} max={mod.maxScore} />}
              </div>
              {mod.note ? <p className="mt-2 text-[13px] leading-6 text-slate-500">{mod.note}</p> : null}
            </li>
          )
        })}
      </ul>
      <div>
        <h3 className="font-display text-lg font-semibold text-slate-900">Fix these first</h3>
        {findings.length ? (
          <ul className="mt-3 space-y-2">
            {findings.map((f) => (
              <li key={`${f.module}:${f.message}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 text-[14px] leading-6 text-slate-700">
                <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${f.severity === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{SEVERITY_LABEL[f.severity] || 'Note'}</span>
                <span><span className="font-medium text-slate-900">{moduleLabel(f.module)}:</span> {f.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-slate-600">No problems found on this page.</p>
        )}
      </div>
      {modules.botAccess?.bots?.length ? (
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900">Bot-by-bot result</h3>
          <BotTable bots={modules.botAccess.bots} />
        </div>
      ) : null}
      <p className="text-[13px] leading-6 text-slate-500">One page only. Scores show crawlability, not whether AI tools will cite you. The BLUF check is a heuristic.</p>
    </div>
  )
}

/** URL form + result. Client-only behaviour; the server render shows the idle form. */
function AuditTool() {
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const controller = useRef(null)

  const onSubmit = useCallback(async (event) => {
    event.preventDefault()
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setPhase('running')
    setError('')
    setReport(null)
    try {
      const result = await runGeoAudit(url, { signal: ctl.signal })
      setReport(result)
      setPhase('done')
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'The audit could not finish.')
      setPhase('error')
    }
  }, [url])

  const running = phase === 'running'
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] sm:p-8">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="geolint-url" className="font-display text-[15px] font-semibold text-slate-900">Page URL to audit</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="geolint-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-300 px-4 text-[16px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            disabled={running || !url.trim()}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-950 px-6 text-[15px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Auditing…' : 'Run free audit'}
          </button>
        </div>
        <p className="mt-2 text-[13px] text-slate-500">Public pages only. Takes about 20 seconds. No signup.</p>
      </form>
      {phase === 'error' ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] text-rose-800">{error}</p> : null}
      {phase === 'done' && report ? <AuditReport report={report} /> : null}
    </div>
  )
}

/** Public GeoLint page (/tools/geo-audit/): audit form, then the guide, FAQ and CTA. */
export default function GeoAuditPage() {
  const page = GEOLINT_PAGE
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => geolintPageSchemas())
  const updated = new Date(`${GEOLINT_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <PublicPageShell>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={page.path}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={seo.ogImage}
        ogLocale="en_US"
        ogLocaleAlternates={false}
        twitterCard="summary_large_image"
        defaultSchemas={false}
        structuredData={schemas}
      />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-4 pb-8 pt-20 sm:px-6 sm:pt-24">
        <div className="relative mx-auto max-w-6xl">
          <Breadcrumbs path={page.path} name={page.breadcrumbName} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.6rem] lg:text-[3rem]">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-slate-800 sm:text-xl">{page.valueProp}</p>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-600">{page.lead}</p>
          <div className="mt-6"><TrustChips /></div>
        </div>
      </section>
      <div className="bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_100%)] px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <AuditTool />
          <p className="mt-5 text-[13px] text-slate-500">Built by Nexora Solution · Last updated <time dateTime={GEOLINT_LAST_UPDATED}>{updated}</time></p>
        </div>
      </div>
      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} tone={page.sections.at(-1)?.tone === 'alt' ? 'white' : 'alt'} />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
