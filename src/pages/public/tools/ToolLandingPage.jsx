import { useCallback, useState } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { toolPageSchemas } from '../../../lib/toolPages.js'
import { TOOL_PAGE_CONTENT } from '../../../lib/toolsPagesData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Breadcrumbs, Byline, ContentSection, CtaPanel, FaqSection, PayStubCard, RelatedTools, ToolCard, TrustChips } from './ToolPageParts.jsx'

const PAPER_OPTIONS = [
  { value: 'Thermal58', label: '58mm' },
  { value: 'Thermal80', label: '80mm' },
]

/** The thermal page's 58/80 mm switch; drives the editor's paper (see Studio.jsx). */
function PaperToggle({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Receipt paper width" className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {PAPER_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] min-w-[84px] rounded-full px-4 font-display text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * One of the four tool landing pages (/tools/<tool>/): hero, the editor with
 * the page's own defaults, then the page's guide, FAQ and related tools. All
 * copy comes from src/lib/toolsPagesData.js.
 */
export default function ToolLandingPage({ path }) {
  const page = TOOL_PAGE_CONTENT[path]
  const seo = getSeoForPath(path)
  const [schemas] = useState(() => toolPageSchemas(path))
  const [paperSize, setPaperSize] = useState(page.preset?.paperSize)
  const onPaperSizeChange = useCallback((size) => setPaperSize(size), [])

  return (
    <PublicPageShell>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={path}
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
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <Breadcrumbs path={path} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.6rem] lg:text-[3rem]">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-slate-800 sm:text-xl">{page.valueProp}</p>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-600">{page.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {page.preset?.paperToggle ? <PaperToggle value={paperSize} onChange={setPaperSize} /> : null}
            <TrustChips />
          </div>
        </div>
      </section>

      <div className="bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_100%)] px-2 pb-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {page.preset?.tool === 'pay-stub'
            ? <PayStubCard label={page.toolLabel} />
            : <ToolCard label={page.toolLabel} preset={page.preset} paperSize={paperSize} onPaperSizeChange={onPaperSizeChange} />}
          <Byline className="mt-5 px-2" />
        </div>
      </div>

      {page.sections.map((section) => <ContentSection key={section.id} section={section} />)}
      <FaqSection heading={page.faqHeading} faqs={page.faqs} tone={page.sections.at(-1)?.tone === 'alt' ? 'white' : 'alt'} />
      <RelatedTools paths={page.related} />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
