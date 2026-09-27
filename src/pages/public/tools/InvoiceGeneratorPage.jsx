import { lazy, Suspense, useSyncExternalStore } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { toolWebApplicationSchema } from '../../../lib/toolPages.js'
import PublicPageShell from '../PublicPageShell.jsx'

// The whole editor (engine, Dexie, UI) is one lazy chunk that only this page
// can load, and only in the browser: see useIsClient below.
const Studio = lazy(() => import('../../../tools/docs-studio/components/Studio.jsx'))

const PATH = '/tools/invoice-generator'
const seo = getSeoForPath(PATH)
const webApplication = toolWebApplicationSchema(PATH)

const subscribeNever = () => () => {}

/**
 * false on the server and during hydration, true right after. The React-
 * endorsed equivalent of a `useEffect(() => setMounted(true))` mount check,
 * without the extra effect-driven render.
 */
function useIsClient() {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}

/** Same footprint as the studio, so swapping it in does not shift the page. */
function StudioPlaceholder() {
  return (
    <div className="min-h-[900px] bg-slate-50" aria-busy="true" aria-label="Loading the invoice editor">
      <div className="sticky top-14 z-30 h-16 border-b border-slate-200/80 bg-white/90" />
      <div className="mx-auto grid max-w-[1600px] gap-6 px-3 pt-4 sm:px-4 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:px-6">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none" />)}
        </div>
        <div className="hidden h-[760px] animate-pulse rounded-2xl bg-slate-200/70 motion-reduce:animate-none lg:block" />
      </div>
    </div>
  )
}

export default function InvoiceGeneratorPage() {
  const isClient = useIsClient()
  return (
    <PublicPageShell>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={PATH}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogLocale="en_US"
        twitterCard="summary_large_image"
        structuredData={[webApplication]}
      />
      <section className="border-b border-slate-200/70 bg-white pb-5 pt-20 sm:pt-24">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Free · No sign-up · Stays in your browser</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Free Invoice Generator</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Create a professional invoice in minutes: add your logo, items, taxes and discounts in any currency, then print it or save it as a PDF.
            Everything you type is stored only in this browser — nothing is uploaded.
          </p>
        </div>
      </section>
      {isClient ? (
        <Suspense fallback={<StudioPlaceholder />}>
          <Studio fallback={<StudioPlaceholder />} />
        </Suspense>
      ) : <StudioPlaceholder />}
    </PublicPageShell>
  )
}
