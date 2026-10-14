import Link from '../../components/AppLink.jsx'
import { GEOLINT_PATH } from '../../lib/geolintLaunch.js'
import { GEO_HUB_PATH, GEO_MARKETS } from '../../lib/geoPages.js'

/**
 * "Can AI search tools read your website?" block for the market landing pages
 * (USA, UK, UAE, Australia, India, Pakistan). Copy per market lives in
 * GEO_MARKETS (src/lib/geoPages.js). Renders nothing for any other slug, so it
 * can be dropped into a shared page component with the page's own slug.
 */
export default function GeoLintMarketSection({ market }) {
  const content = GEO_MARKETS[market]
  if (!content) return null
  return (
    <section aria-labelledby={`geolint-${market}-heading`} className="bg-white px-5 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-7 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Free GEO audit · GeoLint</p>
        <h2 id={`geolint-${market}-heading`} className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{content.heading}</h2>
        <p className="mt-4 text-[16px] leading-8 text-slate-600">{content.text}</p>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">{content.note}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link to={GEOLINT_PATH} className="inline-flex min-h-[48px] items-center rounded-full bg-slate-950 px-6 text-[15px] font-semibold text-white transition hover:bg-slate-800">Run the free GEO audit</Link>
          <Link to="/geo/what-is-geo" className="text-[15px] font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">What is GEO?</Link>
          <Link to="/geo/fix-my-website" className="text-[15px] font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">Get it fixed for you</Link>
          <Link to={GEO_HUB_PATH} className="text-[15px] font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 hover:text-blue-800">All GEO guides</Link>
        </div>
      </div>
    </section>
  )
}
