import { useEffect, useRef, useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { normalizeAuditUrl } from '../../../lib/geolint.js'
import { SPEED_TEST_FAQS, SPEED_TEST_LAST_UPDATED, SPEED_TEST_PAGE as page, speedTestPageSchemas } from '../../../lib/speedTestPageData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Blocks, Breadcrumbs, CtaPanel } from './ToolPageParts.jsx'
import SpeedPanel from './GeoLintSpeedPanel.jsx'
import SiteProbePanel from './SiteProbePanel.jsx'
import { useSpeedTest } from './geolintSpeedHooks.js'
import './geolint.css'
import './speedtest.css'

/** Runs one test for a URL. Mounted only after the visitor submits, so nothing is requested on page load. */
function SpeedRun({ url }) {
  const test = useSpeedTest(url)
  return <div id="speed-result" className="st-run"><SpeedPanel test={test} /><SiteProbePanel url={url} guide /></div>
}

function TestForm({ onRun }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
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
    onRun(clean)
  }

  return (
    <form className="st-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="speed-url" className="st-form-label">{page.toolLabel}</label>
      <div className="st-form-row">
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
        />
        <button type="submit">Test speed</button>
      </div>
      <p id="speed-url-hint" className="st-form-hint">Public pages only. About 20 to 40 seconds. Tested on a phone and a desktop with Google PageSpeed Insights, plus a server check Google does not give.</p>
      {error ? <p id="speed-url-error" role="alert" className="st-form-error">{error}</p> : null}
    </form>
  )
}

/** Decorative gauge that sweeps to an example score. Labelled as an example, never a real result. */
function Gauge() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const k = reduce ? 1 : Math.min(1, (now - t0 - 400) / 1800)
      setN(Math.round(96 * (k <= 0 ? 0 : 1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <figure className="st-gauge" aria-label="Example speed score gauge">
      <svg viewBox="0 0 220 130" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="st-g" x1="0" x2="1"><stop offset="0" stopColor="#f43f5e" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#10b981" /></linearGradient>
        </defs>
        <path className="st-g-track" d="M20 110 A90 90 0 0 1 200 110" pathLength="100" />
        <path className="st-g-fill" d="M20 110 A90 90 0 0 1 200 110" pathLength="100" stroke="url(#st-g)" />
      </svg>
      <div className="st-g-num"><strong>{n}</strong><span>/ 100</span></div>
      <figcaption>Example reading, not a real test</figcaption>
      <ul className="st-g-vitals" aria-label="Google Core Web Vitals good thresholds">
        <li><b>LCP</b> 2.5 s or less</li>
        <li><b>INP</b> 200 ms or less</li>
        <li><b>CLS</b> 0.1 or less</li>
      </ul>
    </figure>
  )
}

/** /tools/website-speed-test/: free website speed test (Google PageSpeed) with a ~2000-word guide below it. */
export default function SpeedTestPage() {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => speedTestPageSchemas())
  const [url, setUrl] = useState('')
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (nonce) document.getElementById('speed-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [nonce])
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
      <div className="st">
        <section className="st-hero">
          <div className="st-hero-inner">
            <div className="st-hero-copy">
              <Breadcrumbs path={page.path} name={page.breadcrumbName} />
              <p className="st-eyebrow">{page.eyebrow}</p>
              <h1>{page.h1}</h1>
              <p className="st-lead">{page.lead}</p>
              <ul className="st-badges" aria-label="What you get">
                {page.badges.map((b) => <li key={b}>{b}</li>)}
              </ul>
              <TestForm onRun={(clean) => { setUrl(clean); setNonce((n) => n + 1) }} />
              <p className="st-by">Powered by Google PageSpeed Insights · Built by Nexora Solution · Updated <time dateTime={SPEED_TEST_LAST_UPDATED}>{updated}</time></p>
            </div>
            <Gauge />
          </div>
        </section>

        {url ? (
          <section className="st-result" aria-label="Speed test result">
            <div className="st-result-inner"><SpeedRun key={nonce} url={url} /></div>
          </section>
        ) : null}

        <nav aria-label="On this page" className="st-chips">
          <ul>
            {page.jump.map(([label, id]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </nav>

        <div className="st-layout">
          <aside className="st-toc" aria-label="Contents">
            <p>On this page</p>
            <ol>
              {page.jump.map(([label, id], i) => <li key={id}><a href={`#${id}`}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a></li>)}
            </ol>
          </aside>
          <main className="st-main">
            {page.sections.map((section, i) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="st-card">
                <span className="st-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h2 id={`${section.id}-heading`}>{section.heading}</h2>
                <Blocks blocks={section.blocks} />
              </section>
            ))}
            <section id="faq" aria-labelledby="faq-heading" className="st-card st-faq">
              <span className="st-num" aria-hidden="true">{String(page.sections.length + 1).padStart(2, '0')}</span>
              <h2 id="faq-heading">Website Speed Test FAQ</h2>
              <div className="st-faq-list">
                {SPEED_TEST_FAQS.map((faq) => (
                  <details key={faq.question}>
                    <summary><h3>{faq.question}</h3><span aria-hidden="true" /></summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </main>
        </div>
        <CtaPanel cta={page.cta} />
      </div>
    </PublicPageShell>
  )
}
