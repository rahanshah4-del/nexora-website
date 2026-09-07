import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import { comparePages } from '../../lib/comparePagesData.js'
import { HiOutlineArrowRight, HiOutlineCheckCircle } from 'react-icons/hi2'

export default function ComparePage({ slug }) {
  const page = comparePages[slug]
  if (!page) return null

  const path = `/compare/${slug}`
  const canonical = absoluteUrl(path)

  return (
    <PublicPageShell badge={page.badge} badgeIcon={page.icon}>
      <PageSeo
        title={page.seoTitle}
        description={page.seoDescription}
        canonical={canonical}
        path={path}
        keywords={page.keyword}
        ogTitle={page.seoTitle}
        ogDescription={page.seoDescription}
        twitterCard="summary_large_image"
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span>Compare</span>
        <span> / </span>
        <span aria-current="page">{page.title}</span>
      </nav>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-14 pt-16 sm:pb-16 sm:pt-20 lg:pt-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            {page.eyebrow}
          </span>
          <h1 className="mt-6 text-[2.2rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3rem]">
            {page.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">{page.intro}</p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10">
            {page.sections.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">{sec.heading}</h2>
                {sec.paragraphs?.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-4 text-base leading-8 text-slate-500">{p}</p>
                ))}
                {sec.bullets ? (
                  <ul className="mt-4 grid gap-2.5">
                    {sec.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm leading-7 text-slate-500">
                        <HiOutlineCheckCircle className="mt-1 shrink-0 text-base text-slate-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {sec.links ? (
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {sec.links.map((l, i) => (
                      <span key={l.to}>
                        {i > 0 ? ' · ' : null}
                        <Link to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.text}</Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
              See the products behind this comparison
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              {page.relatedLinks.map((l, i) => (
                <span key={l.to}>
                  {i > 0 ? ' · ' : null}
                  <Link to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.text}</Link>
                </span>
              ))}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
