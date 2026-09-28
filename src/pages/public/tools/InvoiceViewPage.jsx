import { lazy, Suspense, useSyncExternalStore } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { toolWebApplicationSchema } from '../../../lib/toolPages.js'
import PublicPageShell from '../PublicPageShell.jsx'

// The viewer (engine, templates, PDF on demand; no storage) is one lazy chunk,
// mounted only in the browser: the shared document is in the URL fragment,
// which never reaches the server or the prerendered HTML.
const ShareView = lazy(() => import('../../../tools/docs-studio/components/ShareView.jsx'))

const PATH = '/tools/invoice/view'
const seo = getSeoForPath(PATH)
const webApplication = toolWebApplicationSchema(PATH)

const subscribeNever = () => () => {}
function useIsClient() {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}

function ViewerPlaceholder() {
  return (
    <div className="bg-slate-50 px-4 pb-10 pt-5" aria-busy="true" aria-label="Loading the shared document">
      <div className="mx-auto max-w-5xl">
        <div className="h-16 animate-pulse rounded-2xl bg-white motion-reduce:animate-none" />
        <div className="mx-auto mt-5 aspect-[210/297] w-full max-w-[794px] animate-pulse rounded-sm bg-white shadow-lift motion-reduce:animate-none" />
      </div>
    </div>
  )
}

export default function InvoiceViewPage() {
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
        structuredData={[webApplication]}
      />
      <div className="pt-16 sm:pt-20">
        <h1 className="sr-only">Shared document</h1>
        {isClient ? (
          <Suspense fallback={<ViewerPlaceholder />}>
            <ShareView fallback={<ViewerPlaceholder />} />
          </Suspense>
        ) : <ViewerPlaceholder />}
      </div>
    </PublicPageShell>
  )
}
