import { useState } from 'react'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { GEOLINT_PATH } from '../../lib/geolintLaunch.js'
import { GEO_HUB, GEO_HUB_PATH, GEO_LAST_UPDATED, GEO_PAGES, GEO_OG_IMAGE_PATH, getGeoPage, geoPageSchemas } from '../../lib/geoPages.js'
import PublicPageShell from './PublicPageShell.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { ContentSection, CtaPanel, FaqSection } from './tools/ToolPageParts.jsx'
import { HeroBackdrop } from './tools/GeoLintVisuals.jsx'
import './tools/geolint.css'

/** One /geo/<slug>/ guide, rendered from its object in src/lib/geoPages.js. */
export default function GeoPage({ slug }) {
  const page = getGeoPage(slug)
  if (!page) return <NotFoundPage />
  return <GeoGuide page={page} />
}

function GeoGuide({ page }) {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => geoPageSchemas(page))
  const updated = new Date(`${GEO_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const related = (page.related || []).map((slug) => GEO_PAGES.find((p) => p.slug === slug)).filter(Boolean)

  return (
    <PublicPageShell backTo={GEO_HUB_PATH} backLabel="Back to GEO guides">
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={page.path}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={seo.ogImage || GEO_OG_IMAGE_PATH}
        ogLocale="en_US"
        ogLocaleAlternates={false}
        twitterCard="summary_large_image"
        defaultSchemas={false}
        structuredData={schemas}
      />
      <section className="gl-hero relative overflow-hidden px-4 pb-14 pt-16 text-white sm:px-6 sm:pt-20">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="sr-only">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link to="/" className="rounded hover:text-white">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link to={GEO_HUB_PATH} className="rounded hover:text-white">{GEO_HUB.breadcrumbName}</Link></li>
              <li aria-hidden="true">›</li>
              <li><span aria-current="page" className="font-medium text-slate-200">{page.breadcrumbName}</span></li>
            </ol>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">{page.eyebrow}</p>
          <h1 className="mt-4 font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem] lg:text-[3.2rem]">{page.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200 sm:text-xl">{page.lead}</p>
          {page.poster ? (
            <figure className="mt-8">
              <img src={page.poster.src} width={page.poster.width} height={page.poster.height} alt={page.poster.alt} decoding="async" fetchPriority="high" className="aspect-video h-auto w-full rounded-2xl border border-white/15 object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)]" />
            </figure>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-slate-300">
            <Link to={GEOLINT_PATH} className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-semibold text-slate-950 transition hover:bg-blue-50">Run the free GEO audit</Link>
            <span>Last updated <time dateTime={GEO_LAST_UPDATED}>{updated}</time></span>
          </div>
        </div>
      </section>
      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      {related.length ? (
        <section aria-labelledby="related-heading" className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-[70ch]">
            <h2 id="related-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Related GEO Guides</h2>
            <ul className="mt-6 space-y-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={item.path} className="font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">{item.h1}</Link>
                </li>
              ))}
              <li><Link to={GEO_HUB_PATH} className="font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">All GEO guides</Link></li>
            </ul>
          </div>
        </section>
      ) : null}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
