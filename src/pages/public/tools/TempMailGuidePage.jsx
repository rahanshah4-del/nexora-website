import { useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { TEMP_MAIL_PATH } from '../../../lib/tempMailLaunch.js'
import { TEMP_MAIL_GUIDES, TEMP_MAIL_GUIDES_UPDATED, TEMP_MAIL_GUIDE_CTA, TEMP_MAIL_GUIDE_OG_IMAGE_PATH, getTempMailGuide, tempMailGuideSchemas } from '../../../lib/tempMailGuides.js'
import PublicPageShell from '../PublicPageShell.jsx'
import NotFoundPage from '../NotFoundPage.jsx'
import { ContentSection, CtaPanel, FaqSection } from './ToolPageParts.jsx'
import { HeroBackdrop } from './GeoLintVisuals.jsx'
import './geolint.css'

/** One /tools/temp-mail/<slug>/ guide, rendered from its object in src/lib/tempMailGuides/. */
export default function TempMailGuidePage({ slug }) {
  const page = getTempMailGuide(slug)
  if (!page) return <NotFoundPage />
  return <Guide page={page} />
}

const LINK = 'font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800'

function Guide({ page }) {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => tempMailGuideSchemas(page))
  const updated = new Date(`${TEMP_MAIL_GUIDES_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const related = (page.related || []).map((s) => TEMP_MAIL_GUIDES.find((g) => g.slug === s)).filter(Boolean)

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
      <section className="gl-hero relative overflow-hidden px-4 pb-14 pt-16 text-white sm:px-6 sm:pt-20">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="sr-only">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link to="/" className="rounded hover:text-white">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link to="/tools" className="rounded hover:text-white">Free tools</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link to={TEMP_MAIL_PATH} className="rounded hover:text-white">Temp Mail</Link></li>
              <li aria-hidden="true">›</li>
              <li><span aria-current="page" className="font-medium text-slate-200">{page.breadcrumbName}</span></li>
            </ol>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">{page.eyebrow}</p>
          <h1 className="mt-4 font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem] lg:text-[3.2rem]">{page.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200 sm:text-xl">{page.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-slate-300">
            <Link to={TEMP_MAIL_PATH} className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-semibold text-slate-950 transition hover:bg-blue-50">Get a temp email</Link>
            <span>Last updated <time dateTime={TEMP_MAIL_GUIDES_UPDATED}>{updated}</time></span>
          </div>
        </div>
      </section>
      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      {related.length ? (
        <section aria-labelledby="related-heading" className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-[70ch]">
            <h2 id="related-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Related Temp Mail Guides</h2>
            <ul className="mt-6 space-y-3">
              {related.map((item) => <li key={item.slug}><Link to={item.path} className={LINK}>{item.h1}</Link></li>)}
              <li><Link to={TEMP_MAIL_PATH} className={LINK}>Nexora Temp Mail: the free tool</Link></li>
            </ul>
          </div>
        </section>
      ) : null}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} />
      <CtaPanel cta={TEMP_MAIL_GUIDE_CTA} />
    </PublicPageShell>
  )
}
