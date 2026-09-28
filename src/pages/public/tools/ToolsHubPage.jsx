import { useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { toolPageSchemas } from '../../../lib/toolPages.js'
import { TOOLS_HUB_CONTENT as page } from '../../../lib/toolsPagesData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Breadcrumbs, Byline, ContentSection, CtaPanel, FaqSection, ToolCardGrid, TrustChips } from './ToolPageParts.jsx'

/** /tools/ — the hub: every free tool, how they protect your data, and which to use. */
export default function ToolsHubPage() {
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => toolPageSchemas(page.path))

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

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-4 pb-10 pt-20 sm:px-6 sm:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <Breadcrumbs path={page.path} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{page.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.6rem] lg:text-[3.2rem]">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-slate-800 sm:text-xl">{page.valueProp}</p>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-600">{page.lead}</p>
          <TrustChips className="mt-6" />
        </div>
      </section>

      <section aria-labelledby="tools-heading" className="bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_100%)] px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 id="tools-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{page.cardsHeading}</h2>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-600">{page.cardsIntro}</p>
          <div className="mt-8"><ToolCardGrid /></div>
          <Byline className="mt-8" />
        </div>
      </section>

      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} tone="alt" />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
