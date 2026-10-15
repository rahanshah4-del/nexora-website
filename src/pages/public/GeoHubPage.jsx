import { useState } from 'react'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { GEOLINT_PATH } from '../../lib/geolintLaunch.js'
import { GEO_HUB, GEO_HUB_PATH, GEO_LAST_UPDATED, GEO_OG_IMAGE_PATH, GEO_PAGES, geoHubSchemas } from '../../lib/geoPages.js'
import PublicPageShell from './PublicPageShell.jsx'
import { CtaPanel, FaqSection } from './tools/ToolPageParts.jsx'
import { HeroBackdrop } from './tools/GeoLintVisuals.jsx'
import './tools/geolint.css'

/** /geo/: the hub that lists every GEO guide. */
export default function GeoHubPage() {
  const seo = getSeoForPath(GEO_HUB_PATH)
  const [schemas] = useState(() => geoHubSchemas())
  const updated = new Date(`${GEO_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website">
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={GEO_HUB_PATH}
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
              <li><span aria-current="page" className="font-medium text-slate-200">{GEO_HUB.breadcrumbName}</span></li>
            </ol>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">{GEO_HUB.eyebrow}</p>
          <h1 className="mt-4 font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem] lg:text-[3.2rem]">{GEO_HUB.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200 sm:text-xl">{GEO_HUB.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-slate-300">
            <Link to={GEOLINT_PATH} className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-semibold text-slate-950 transition hover:bg-blue-50">Run the free GEO audit</Link>
            <span>Last updated <time dateTime={GEO_LAST_UPDATED}>{updated}</time></span>
          </div>
        </div>
      </section>
      <section id="guides" aria-labelledby="guides-heading" className="bg-white px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 id="guides-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">All GEO Guides</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {GEO_PAGES.map((page) => (
              <li key={page.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <h3 className="font-display text-lg font-semibold text-slate-950">
                  <Link to={page.path} className="hover:text-blue-700">{page.h1}</Link>
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{page.seo.description}</p>
                <Link to={page.path} className="mt-4 inline-flex text-[14px] font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">Read the guide</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <FaqSection heading={GEO_HUB.faqHeading} faqs={GEO_HUB.faqs} tone="alt" />
      <CtaPanel cta={GEO_HUB.cta} />
    </PublicPageShell>
  )
}
