import Link from '../../../components/AppLink.jsx'
import { GEOLINT_WORDPRESS_PATH } from '../../../lib/geolintLaunch.js'
import { GEOLINT_WORDPRESS_FEATURES as F } from '../../../lib/geolintPageData.js'
import { WpMark } from './GeoLintWordPress.jsx'

function Tick() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
}

/** Landing page band that introduces the WordPress plugin and the report's Fix with WordPress flow. */
export default function GeoLintWhatsNew() {
  return (
    <section id="whats-new" aria-labelledby="whats-new-heading" className="scroll-mt-20 bg-white px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{F.eyebrow}
          </p>
          <h2 id="whats-new-heading" className="mt-4 flex flex-wrap items-center justify-center gap-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            <WpMark tone="dark" className="h-9 w-9 sm:h-11 sm:w-11" />
            {F.heading}
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">{F.lead}</p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {F.items.map((item) => (
            <li key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,.4)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><Tick /></span>
              <h3 className="mt-4 font-display text-[17px] font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-[14.5px] leading-7 text-slate-600">{item.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/nexora-ai-search-audit-tools.zip"
              download
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-slate-900 px-6 text-[15px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <WpMark tone="white" className="h-6 w-6" />
              Download for WordPress
            </a>
            <Link
              to={GEOLINT_WORDPRESS_PATH}
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <WpMark tone="dark" className="h-6 w-6" />
              See the install guide
            </Link>
          </div>
          <p className="max-w-xl text-center text-[13px] leading-6 text-slate-500">{F.note}</p>
        </div>
      </div>
    </section>
  )
}
