import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'

/**
 * 404 catch-all page for unknown/stale paths (e.g. bare /bn, /hi).
 * Replaces the old <Navigate to="/"> so those URLs return a real 404
 * (noindex) instead of silently redirecting to the homepage — which
 * Google was flagging as "Page with redirect".
 */
export default function NotFoundPage() {
  return (
    <PublicPageShell>
      <PageSeo
        title="Page Not Found | Nexora Solution"
        description="The page you requested could not be found. Visit the Nexora Solution homepage, pricing or contact pages."
        robots="noindex,nofollow"
      />
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Error 404</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Page not found</h1>
          <p className="mt-4 text-base leading-7 text-slate-500">
            The page you requested doesn&rsquo;t exist or may have moved. Try one of the links below.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800">
              Go to Homepage <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to="/pricing" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              View Pricing
            </Link>
            <Link to="/contact" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
