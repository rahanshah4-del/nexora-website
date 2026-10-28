import { useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import TempMailIcon from '../../../components/brand/TempMailIcon.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { TEMP_MAIL_PATH } from '../../../lib/tempMailLaunch.js'
import { TEMP_MAIL_GUIDES, TEMP_MAIL_GUIDES_UPDATED, TEMP_MAIL_GUIDE_CTA, TEMP_MAIL_GUIDE_OG_IMAGE_PATH, getTempMailGuide, tempMailGuideSchemas } from '../../../lib/tempMailGuides.js'
import PublicPageShell from '../PublicPageShell.jsx'
import NotFoundPage from '../NotFoundPage.jsx'
import ToolIcon from './ToolIcon.jsx'
import { RichText } from './ToolPageParts.jsx'
import './tempmailguide.css'

/** One /tools/temp-mail/<slug>/ guide, rendered from its object in src/lib/tempMailGuides/. Light, Apple-style layout. */
export default function TempMailGuidePage({ slug }) {
  const page = getTempMailGuide(slug)
  if (!page) return <NotFoundPage />
  return <Guide page={page} />
}

const countWords = (t) => String(t).trim().split(/\s+/).filter(Boolean).length

function readingMinutes(page) {
  let n = countWords(page.lead)
  for (const s of page.sections) for (const b of s.blocks) {
    if (b.p) n += countWords(b.p)
    if (b.list) n += b.list.reduce((a, x) => a + countWords(x), 0)
    if (b.steps) n += b.steps.reduce((a, x) => a + countWords(x.text), 0)
  }
  return Math.max(1, Math.round(n / 230))
}

function Blocks({ blocks }) {
  return blocks.map((block, i) => {
    if (block.p) return <p key={i} className="tg-p"><RichText text={block.p} /></p>
    if (block.h3) return <h3 key={i} className="tg-h3">{block.h3}</h3>
    if (block.callout) return <p key={i} className="tg-callout"><ToolIcon name="sparkle" /><span><RichText text={block.callout} /></span></p>
    if (block.steps) {
      return (
        <ol key={i} className="tg-steps">
          {block.steps.map((s) => (
            <li key={s.title}><div><h3>{s.title}</h3><p><RichText text={s.text} /></p></div></li>
          ))}
        </ol>
      )
    }
    if (block.list) return <ul key={i} className="tg-list">{block.list.map((item, j) => <li key={j}><RichText text={item} /></li>)}</ul>
    if (block.code) return <pre key={i} tabIndex={0} className="tg-code"><code>{block.code}</code></pre>
    if (block.table) {
      const [corner, ...headers] = block.table.columns
      return (
        <div key={i} className="tg-tablewrap">
          <table className="tg-table">
            <caption className="sr-only">{block.table.caption}</caption>
            <thead><tr><th scope="col">{corner || <span className="sr-only">Compared</span>}</th>{headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {block.table.rows.map(([head, ...cells]) => (
                <tr key={head}><th scope="row">{head}</th>{cells.map((c, j) => <td key={j} data-label={headers[j]}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return null
  })
}

function Guide({ page }) {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => tempMailGuideSchemas(page))
  const updated = new Date(`${TEMP_MAIL_GUIDES_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const related = (page.related || []).map((s) => TEMP_MAIL_GUIDES.find((g) => g.slug === s)).filter(Boolean)
  const minutes = readingMinutes(page)

  return (
    <PublicPageShell backTo={TEMP_MAIL_PATH} backLabel="Back to Temp Mail">
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={page.path}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={seo.ogImage || TEMP_MAIL_GUIDE_OG_IMAGE_PATH}
        ogLocale="en_US"
        ogLocaleAlternates={false}
        twitterCard="summary_large_image"
        defaultSchemas={false}
        structuredData={schemas}
      />
      <div className="tg">
        <header className="tg-hero">
          <div className="tg-wide">
            <nav aria-label="Breadcrumb" className="sr-only">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/tools">Free tools</Link></li>
                <li><Link to={TEMP_MAIL_PATH}>Temp Mail</Link></li>
                <li><span aria-current="page">{page.breadcrumbName}</span></li>
              </ol>
            </nav>
            <TempMailIcon size={72} animated className="tg-hero-icon" />
            <p className="tg-eyebrow">{page.eyebrow}</p>
            <h1 className="tg-h1">{page.h1}</h1>
            <p className="tg-lead">{page.lead}</p>
            <div className="tg-actions">
              <Link to={TEMP_MAIL_PATH} className="tg-btn">Get a temp email</Link>
              <a href={`#${page.sections[0].id}`} className="tg-textlink">Read the guide ›</a>
            </div>
            <p className="tg-meta">Updated <time dateTime={TEMP_MAIL_GUIDES_UPDATED}>{updated}</time> · {minutes} min read</p>
          </div>
        </header>

        <div className="tg-toc">
          <nav aria-label="On this page">
            <h2>On this page</h2>
            <ol>
              {page.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>)}
              <li><a href="#faq">Common questions</a></li>
            </ol>
          </nav>
        </div>

        {page.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className={`tg-section${section.tone === 'alt' ? ' is-alt' : ''}`}>
            <div className="tg-wrap">
              <h2 id={`${section.id}-heading`} className="tg-h2">{section.heading}</h2>
              <Blocks blocks={section.blocks} />
            </div>
          </section>
        ))}

        {related.length ? (
          <section aria-labelledby="related-heading" className="tg-section is-alt">
            <div className="tg-wrap">
              <h2 id="related-heading" className="tg-h2">Keep reading</h2>
              <div className="tg-related">
                {related.map((item) => <Link key={item.slug} to={item.path}>{item.h1}<span>Read the guide ›</span></Link>)}
                <Link to={TEMP_MAIL_PATH}>Nexora Temp Mail: the free tool<span>Open the tool ›</span></Link>
              </div>
            </div>
          </section>
        ) : null}

        <section id="faq" aria-labelledby="faq-heading" className="tg-section">
          <div className="tg-wrap">
            <h2 id="faq-heading" className="tg-h2">{page.faqHeading}</h2>
            <div className="tg-faq">
              {page.faqs.map((faq) => (
                <details key={faq.question}>
                  <summary><h3>{faq.question}</h3><ToolIcon name="chevron" /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="tg-cta">
          <div className="tg-wrap">
            <div className="tg-cta-card">
              <TempMailIcon size={56} animated className="tg-hero-icon" />
              <h2 id="cta-heading">{TEMP_MAIL_GUIDE_CTA.heading}</h2>
              <p>{TEMP_MAIL_GUIDE_CTA.text}</p>
              <div className="tg-actions">
                {TEMP_MAIL_GUIDE_CTA.links.map((l) => (
                  l.primary
                    ? <Link key={l.to} to={l.to} className="tg-btn">{l.label}</Link>
                    : <Link key={l.to} to={l.to} className="tg-textlink">{l.label} ›</Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
