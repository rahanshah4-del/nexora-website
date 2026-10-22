import { useState, useSyncExternalStore } from 'react'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import { GEOLINT_LAST_UPDATED } from '../../../lib/geolintPageData.js'
import { GEOLINT_HOW_FAQS, GEOLINT_HOW_PAGE, GEOLINT_SCENES, geolintHowPageSchemas } from '../../../lib/geolintHowData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ContentSection, CtaPanel, FaqSection, ToolManualLink } from './ToolPageParts.jsx'
import { HeroBackdrop } from './GeoLintVisuals.jsx'
import GeoLintExplainer from './GeoLintExplainer.jsx'
import './geolint.css'

const subscribeNone = () => () => {}

/** /tools/geo-audit/how-it-works/: the animated walkthrough, then the same steps as text. */
export default function GeoLintHowItWorksPage() {
  const page = GEOLINT_HOW_PAGE
  const seo = getSeoForPath(page.path)
  const [schemas] = useState(() => geolintHowPageSchemas())
  // ?capture=1 renders only the stage, for scripts/render-geolint-video.mjs.
  const capture = useSyncExternalStore(subscribeNone, () => new URLSearchParams(window.location.search).has('capture'), () => false)
  const updated = new Date(`${GEOLINT_LAST_UPDATED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  if (capture) return <div style={{ background: '#050914' }}><GeoLintExplainer capture /></div>

  return (
    <PublicPageShell backTo={GEOLINT_PATH} backLabel="Back to GeoLint">
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
      <section className="gl-hero relative overflow-hidden px-4 pb-14 pt-24 text-white sm:px-6 sm:pt-28">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-5xl">
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />{page.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem] lg:text-[3.2rem]">
            How <span className="gl-text-grad">GeoLint</span> Works: From URL to Verified GEO Score
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200 sm:text-xl">{page.valueProp}</p>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-300">{page.lead}</p>
          <div className="mt-8"><GeoLintExplainer /></div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-slate-300">
            <Link to={GEOLINT_PATH} className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 font-semibold text-slate-950 transition hover:bg-blue-50">Run the free audit</Link>
            <ToolManualLink path={page.path} tone="dark" />
            <Link to="/tools" className="underline decoration-white/30 underline-offset-4 hover:text-white">More free tools</Link>
            <span>Last updated <time dateTime={GEOLINT_LAST_UPDATED}>{updated}</time></span>
          </div>
        </div>
      </section>
      <section id="transcript" aria-labelledby="transcript-heading" className="bg-white px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[70ch]">
          <h2 id="transcript-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">The Walkthrough in Text</h2>
          <p className="mt-5 text-[16px] leading-8 text-slate-600">The video has seven chapters. This is what each one shows, so you can read it instead of watching.</p>
          <ol className="mt-5 space-y-4">
            {GEOLINT_SCENES.map((scene, i) => (
              <li key={scene.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-display text-[16px] font-semibold text-slate-900">{i + 1}. {scene.title}{scene.points ? <span className="ml-2 text-sm font-medium text-violet-700">{scene.points} points</span> : null}</p>
                <p className="mt-1 text-[15px] leading-7 text-slate-600">{scene.caption}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {page.sections.map((section, i) => <ContentSection key={section.id} section={{ ...section, tone: i % 2 === 0 ? 'alt' : 'white' }} />)}
      <FaqSection heading={page.faqHeading} faqs={GEOLINT_HOW_FAQS} tone={page.sections.length % 2 === 0 ? 'alt' : 'white'} />
      <CtaPanel cta={page.cta} />
    </PublicPageShell>
  )
}
