import { useEffect, useRef, useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { normalizeAuditUrl } from '../../../lib/geolint.js'
import { SERVER_CHECK_FAQS, SERVER_CHECK_LAST_UPDATED, SERVER_CHECK_PAGE as page, serverCheckPageSchemas } from '../../../lib/serverCheckPageData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Blocks, Breadcrumbs, CtaPanel } from './ToolPageParts.jsx'
import SiteProbePanel from './SiteProbePanel.jsx'
import './geolint.css'
import './speedtest.css'

/** Runs one check for a URL. Mounted only after the visitor submits, so nothing is requested on page load. */
function CheckRun({ url }) {
  return <div id="speed-result" className="st-run"><SiteProbePanel url={url} /></div>
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
      <label htmlFor="check-url" className="st-form-label">{page.toolLabel}</label>
      <div className="st-form-row">
        <input
          ref={input}
          id="check-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://example.com/page"
          value={value}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'check-url-error' : 'check-url-hint'}
          onChange={(e) => { setValue(e.target.value); if (error) setError('') }}
        />
        <button type="submit">Check server</button>
      </div>
      <p id="check-url-hint" className="st-form-hint">Public pages only. About 5 to 15 seconds. Three requests, measured from a Cloudflare server.</p>
      {error ? <p id="check-url-error" role="alert" className="st-form-error">{error}</p> : null}
    </form>
  )
}

/** Decorative strip of the stages before a page can paint. Labelled as a map, never as a result. */
function Journey() {
  const stages = [['Redirects', 'Extra round trips'], ['DNS', 'Find the address'], ['Connect', 'Secure link set up'], ['Server', 'Builds the page'], ['First byte', 'Browser can start']]
  return (
    <figure className="st-gauge" aria-label="Stages before the first byte arrives">
      <ol className="sc-journey">
        {stages.map(([name, note], i) => (
          <li key={name} style={{ '--sc-i': i }}><b>{name}</b><span>{note}</span></li>
        ))}
      </ol>
      <figcaption>What a visit does before anything paints</figcaption>
      <ul className="st-g-vitals" aria-label="Time to First Byte thresholds from Google">
        <li><b>Good</b> 0.8 s or less</li>
        <li><b>Needs work</b> 0.8 to 1.8 s</li>
        <li><b>Poor</b> over 1.8 s</li>
      </ul>
    </figure>
  )
}

/** /tools/server-response-time-test/: free server response time and delivery check with a guide below it. */
export default function ServerCheckPage() {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => serverCheckPageSchemas())
  const [url, setUrl] = useState('')
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (nonce) document.getElementById('speed-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [nonce])
  const updated = new Date(`${SERVER_CHECK_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

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
              <p className="st-by">Measured from Cloudflare · Built by Nexora Solution · Updated <time dateTime={SERVER_CHECK_LAST_UPDATED}>{updated}</time></p>
            </div>
            <Journey />
          </div>
        </section>

        {url ? (
          <section className="st-result" aria-label="Server check result">
            <div className="st-result-inner"><CheckRun key={nonce} url={url} /></div>
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
              <h2 id="faq-heading">Server Response Time Test FAQ</h2>
              <div className="st-faq-list">
                {SERVER_CHECK_FAQS.map((faq) => (
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
