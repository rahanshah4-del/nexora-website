import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { hostLabel, saveReport, activeStepIndex, scanProgress, SCAN_STEPS } from '../../../lib/geolintReport.js'
import { runGeoAudit } from '../../../lib/geolint.js'
import { GEOLINT_HOW_PATH, GEOLINT_ORDERS_PATH, GEOLINT_REPORT_PATH, GEOLINT_WORDPRESS_PATH } from '../../../lib/geolintLaunch.js'
import { GEOLINT_LAST_UPDATED, GEOLINT_PAGE, geolintPageSchemas } from '../../../lib/geolintPageData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ContentSection, CtaPanel, FaqSection } from './ToolPageParts.jsx'
import AiEngineLogos from './AiEngineLogos.jsx'
import { HeroBackdrop, RadarArt } from './GeoLintVisuals.jsx'
import { useElapsed } from './geolintHooks.js'
import { useFixClient } from './geolintFixHooks.js'
import GeoLintWhatsNew from './GeoLintWhatsNew.jsx'
import { WpMark } from './GeoLintWordPress.jsx'
import './geolint.css'

function Check({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-300/30 border-t-sky-300 motion-reduce:animate-none" aria-hidden="true" />
}

/** A direct way to the dashboard. Signed-in visitors see their email; everyone else is sent to sign in first. */
function DashboardShortcut() {
  const { user } = useFixClient()
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4" data-testid="geolint-dashboard-shortcut">
      <p className="min-w-0 max-w-full break-all text-[13px] text-slate-300">
        {user ? <>Signed in as <span className="font-semibold text-white">{user.email}</span></> : 'Already ordered a fix? Open your orders and reports.'}
      </p>
      <Link to={GEOLINT_ORDERS_PATH} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white px-5 text-[14.5px] font-semibold text-slate-950 transition hover:bg-slate-100 sm:w-auto">Open my dashboard</Link>
    </div>
  )
}

/** The "system running" panel shown while the engine audits the page. */
function ScanConsole({ target, finished, onCancel }) {
  const elapsed = useElapsed(true)
  const active = finished ? SCAN_STEPS.length : activeStepIndex(elapsed)
  const progress = finished ? 100 : scanProgress(elapsed)
  const statusLine = finished ? 'Report ready. Opening it now.' : SCAN_STEPS[Math.min(active, SCAN_STEPS.length - 1)].label

  return (
    <div className="gl-glass relative overflow-hidden rounded-3xl p-5 sm:p-7" aria-busy={!finished}>
      <div className="gl-scanline" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <p className="truncate font-mono text-xs text-slate-300">geolint scan · {hostLabel(target)}</p>
        {finished ? null : <button type="button" onClick={onCancel} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Cancel</button>}
      </div>
      <div className="relative mt-5">
        <div className="flex items-end justify-between">
          <p role="status" aria-live="polite" className="gl-cursor font-mono text-[13px] text-emerald-300">{statusLine}</p>
          <span className="font-display text-2xl font-bold tabular-nums text-white">{Math.round(progress)}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Audit progress">
          <div className="gl-progress-bar h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ol className="relative mt-5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {SCAN_STEPS.map((step, i) => {
          const done = i < active
          const current = i === active && !finished
          return (
            <li key={step.id} className={`flex items-start gap-2.5 text-[13px] leading-5 ${done ? 'text-slate-300' : current ? 'gl-step-active text-white' : 'text-slate-500'}`}>
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? <Check className="h-4 w-4 text-emerald-400" /> : current ? <Spinner /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />}
              </span>
              <span>{step.label}</span>
            </li>
          )
        })}
      </ol>
      <p className="relative mt-4 text-[12px] text-slate-400">These are the checks every audit runs; the engine performs several in parallel, so the order here is a guide. Most audits take 15 to 30 seconds.</p>
    </div>
  )
}

/** URL form, or the scan console while an audit runs. Opens the report page when done. */
function AuditTool() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const controller = useRef(null)
  const timer = useRef(null)

  useEffect(() => () => {
    controller.current?.abort()
    clearTimeout(timer.current)
  }, [])

  const cancel = useCallback(() => {
    controller.current?.abort()
    setPhase('idle')
  }, [])

  const onSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!url.trim()) {
      setError('Enter the page URL you want to audit, for example https://example.com/page')
      setPhase('error')
      document.getElementById('geolint-url')?.focus()
      return
    }
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setError('')
    setPhase('running')
    try {
      const report = await runGeoAudit(url, { signal: ctl.signal })
      saveReport(report)
      setPhase('done')
      timer.current = setTimeout(() => navigate(GEOLINT_REPORT_PATH, { state: { report } }), 900)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'The audit could not finish.')
      setPhase('error')
    }
  }, [url, navigate])

  if (phase === 'running' || phase === 'done') return <ScanConsole target={url} finished={phase === 'done'} onCancel={cancel} />

  return (
    <div className="gl-glass rounded-3xl p-5 sm:p-7">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="geolint-url" className="font-display text-[15px] font-semibold text-white">Page URL to audit</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="geolint-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (phase === 'error') setPhase('idle') }}
            className="min-h-[52px] flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-4 text-[16px] text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          />
          <button
            type="submit"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-7 text-[15px] font-semibold text-white shadow-[0_12px_40px_-12px_rgba(99,102,241,.9)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Run free audit
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <p className="mt-3 text-[13px] text-slate-400">Public pages only. About 20 seconds. Your full report opens on the next page, with a PDF download.</p>
      </form>
      {phase === 'error' ? <p role="alert" className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-[14px] text-rose-200">{error}</p> : null}
    </div>
  )
}

/** Public GeoLint page (/tools/geo-audit/): animated hero + audit, then the guide, FAQ and CTA. */
/** Plain <a>: a router link would treat the .zip as a page and show the 404 screen. */
function WordPressPluginDownload() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <a
        href="/geolint-ai-visibility.zip"
        download
        className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <WpMark tone="white" className="h-5 w-5" />
        Download the WordPress plugin (zip, 12 KB)
      </a>
      <Link to={GEOLINT_WORDPRESS_PATH} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-blue-700 underline-offset-4 hover:underline">Install guide with pictures</Link>
      <span className="text-[13px] leading-6 text-slate-500">GeoLint AI Visibility 1.0.0 · free · needs WordPress 5.8+ and PHP 7.4+</span>
    </div>
  )
}

export default function GeoAuditPage() {
  const page = GEOLINT_PAGE
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => geolintPageSchemas())
  const updated = new Date(`${GEOLINT_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <PublicPageShell backTo="/tools" backLabel="Back to Free Tools">
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
      <section className="gl-hero relative overflow-hidden px-4 pb-16 pt-16 text-white sm:px-6 sm:pt-20">
        <HeroBackdrop />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0">
            <DashboardShortcut />
            <p className="inline-flex max-w-full items-start gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-sky-300 sm:items-center sm:rounded-full sm:text-xs sm:tracking-[0.14em]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 animate-pulse sm:mt-0 rounded-full bg-emerald-400 motion-reduce:animate-none" />{page.eyebrow}
            </p>
            <h1 className="mt-4 break-words font-display text-[1.85rem] sm:text-[2.8rem] font-bold leading-[1.1] tracking-tight lg:text-[3.2rem]">
              Free GEO Audit Tool: Can <span className="gl-text-grad">AI Crawlers</span> Read Your Website?
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-200 sm:text-xl">{page.valueProp}</p>
            <p className="mt-3 max-w-2xl text-[16px] leading-7 text-slate-300">{page.lead}</p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="What you get">
              {page.trustChips.map((chip) => (
                <li key={chip} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 text-[13px] font-semibold text-emerald-300"><Check className="h-4 w-4" />{chip}</li>
              ))}
            </ul>
          </div>
          <RadarArt />
        </div>
        <div className="relative mx-auto mt-10 max-w-3xl">
          <AuditTool />
          <p className="mt-4 text-center text-[14px]"><a href="#whats-new" className="mb-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 font-semibold text-emerald-300 transition hover:bg-emerald-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><WpMark tone="white" className="h-5 w-5" />New: GeoLint for WordPress</a><br /><Link to={GEOLINT_HOW_PATH} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-5 font-semibold text-sky-200 transition hover:bg-white/10"><svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"><path d="M6 4l11 6-11 6z" fill="currentColor" /></svg>Watch how GeoLint works · 52 s</Link></p>
          <p className="mt-2 text-center text-[13px] text-slate-400">Built by Nexora Solution · Last updated <time dateTime={GEOLINT_LAST_UPDATED}>{updated}</time></p>
        </div>
        <div className="relative mx-auto max-w-6xl"><AiEngineLogos /></div>
      </section>
      <GeoLintWhatsNew />
      {page.sections.map((section) => (
        <ContentSection key={section.id} section={section}>
          {section.id === 'wordpress-plugin' ? <WordPressPluginDownload /> : null}
        </ContentSection>
      ))}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} tone={page.sections.at(-1)?.tone === 'alt' ? 'white' : 'alt'} />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
