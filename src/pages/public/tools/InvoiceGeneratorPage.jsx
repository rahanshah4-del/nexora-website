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

/** Same footprint as the wizard's first screen, so swapping it in does not shift the page. */
function StudioPlaceholder() {
  return (
    <div className="bg-slate-50 px-4 pb-10 pt-6 sm:pt-8" aria-busy="true" aria-label="Loading the invoice generator">
      <div className="mx-auto max-w-3xl">
        <div className="flex h-11 items-center gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-slate-200/70 motion-reduce:animate-none" />)}
        </div>
        <div className="mt-5 h-[640px] animate-pulse rounded-3xl border border-slate-200/80 bg-white motion-reduce:animate-none sm:mt-6" />
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
            Create a professional invoice in three short steps: your business, your client and items, then a design. Use your logo or your own letterhead, any currency, and print it or save it as a PDF.
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
