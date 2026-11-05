import { useRef, useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { normalizeAuditUrl } from '../../../lib/geolint.js'
import { SPEED_TEST_FAQS, SPEED_TEST_LAST_UPDATED, SPEED_TEST_PAGE as page, speedTestPageSchemas } from '../../../lib/speedTestPageData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Breadcrumbs, ContentSection, CtaPanel, FaqSection } from './ToolPageParts.jsx'
import SpeedPanel from './GeoLintSpeedPanel.jsx'
import { useSpeedTest } from './geolintSpeedHooks.js'
import './geolint.css'

/** Runs one test for a URL. Mounted only after the visitor submits, so nothing is requested on page load. */
function SpeedRun({ url }) {
  const test = useSpeedTest(url)
  return <div className="mt-6" id="speed-result"><SpeedPanel test={test} /></div>
}

function TestForm() {
  const [value, setValue] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)
  const input = useRef(null)

  const onSubmit = (event) => {
    event.preventDefault()
    const clean = normalizeAuditUrl(value)
    if (!clean) {
      setError('Enter a full page address, for example https://example.com/page')
      input.current?.focus()
      return
    }
    setError('')
    setUrl(clean)
    setNonce((n) => n + 1)
  }

  return (
    <div>
      <div className="glp-card p-5 sm:p-7">
        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="speed-url" className="font-display text-[15px] font-semibold text-slate-900">{page.toolLabel}</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              ref={input}
              id="speed-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://example.com/page"
              value={value}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'speed-url-error' : 'speed-url-hint'}
              onChange={(e) => { setValue(e.target.value); if (error) setError('') }}
              className="glp-input min-h-[52px] flex-1 rounded-xl px-4 text-[16px]"
            />
            <button
              type="submit"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-7 text-[15px] font-semibold text-white shadow-[0_12px_40px_-12px_rgba(99,102,241,.9)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Test speed
            </button>
          </div>
          <p id="speed-url-hint" className="mt-3 text-[13px] text-slate-500">Public pages only. Takes about 20 to 40 seconds. Tested on a phone and a desktop with Google PageSpeed.</p>
          {error ? <p id="speed-url-error" role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] text-rose-700">{error}</p> : null}
        </form>
      </div>
      {url ? <SpeedRun key={nonce} url={url} /> : null}
    </div>
  )
}

/** /tools/website-speed-test/: free website speed test (Google PageSpeed) with a ~2000-word guide below it. */
export default function SpeedTestPage() {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => speedTestPageSchemas())
  const updated = new Date(`${SPEED_TEST_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

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
      <section className="glp-hero px-4 pb-14 pt-14 text-slate-900 sm:px-6 sm:pt-20">
        <div className="relative mx-auto max-w-6xl">
          <Breadcrumbs path={page.path} name={page.breadcrumbName} />
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-indigo-700 sm:text-xs sm:tracking-[0.14em]">{page.eyebrow}</p>
          <h1 className="mt-4 break-words font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.8rem]">{page.h1}</h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-8 text-slate-700 sm:text-[17px]">{page.lead}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="What you get">
            {page.badges.map((b) => <li key={b} className="inline-flex min-h-[36px] items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700">{b}</li>)}
          </ul>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)] xl:mx-auto"><TestForm /></div>
          <p className="mt-5 text-[13px] text-slate-500">Built by Nexora Solution · Last updated <time dateTime={SPEED_TEST_LAST_UPDATED}>{updated}</time></p>
        </div>
      </section>

      <nav aria-label="On this page" className="border-y border-slate-200 bg-white px-4 py-4 sm:px-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-1 text-[14px]">
          {page.jump.map(([label, id]) => <li key={id}><a href={`#${id}`} className="inline-flex min-h-[32px] items-center font-semibold text-blue-700 underline-offset-4 hover:underline">{label}</a></li>)}
        </ul>
      </nav>

      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      <FaqSection heading="Website Speed Test FAQ" faqs={SPEED_TEST_FAQS} tone="alt" />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
