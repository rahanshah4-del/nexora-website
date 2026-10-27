import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import { comparePages } from '../../lib/comparePagesData.js'
import { HiOutlineArrowRight, HiOutlineCheckCircle } from 'react-icons/hi2'

const sectionId = (heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-16 text-white sm:pb-20 sm:pt-20 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_15%_0%,rgba(59,130,246,0.35)_0%,transparent_60%),radial-gradient(50%_50%_at_90%_20%,rgba(139,92,246,0.28)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-200 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {page.eyebrow}
            </span>
            <h1 className="mt-6 text-[2.3rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.4rem]">
              <span className="bg-gradient-to-r from-white via-blue-100 to-violet-200 bg-clip-text text-transparent">{page.title}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{page.intro}</p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link to="/signup" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-slate-900 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.97]">
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <Link to="/pricing" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-[15px] font-medium text-white backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.97]">
                View Pricing
              </Link>
            </div>
          </div>
          </div>
          <dl className="mt-12 grid max-w-3xl grid-cols-3 gap-3">
            {[
              [String(page.faqs?.length || page.relatedLinks.length), page.faqs?.length ? 'Questions answered' : 'Related products'],
              [String(page.sections.length), 'Topics covered'],
              ['1 month', 'Free trial'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Guide: contents + sections ── */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-14 lg:px-8">
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">On this page</p>
              <ol className="mt-3 grid gap-0.5">
                {page.sections.map((sec, i) => (
                  <li key={sec.heading}>
                    <a href={`#${sectionId(sec.heading)}`} className="flex gap-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900">
                      <span className="tabular-nums text-slate-300">{String(i + 1).padStart(2, '0')}</span>
                      <span>{sec.heading}</span>
                    </a>
                  </li>
                ))}
                {page.faqs?.length ? (
                  <li>
                    <a href="#feature-faq-title" className="flex gap-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900">
                      <span className="text-slate-300">?</span>
                      <span>FAQ</span>
                    </a>
                  </li>
                ) : null}
              </ol>
            </nav>
          </aside>

          <div className="grid gap-12">
            {page.sections.map((sec, i) => (
              <div key={sec.heading} id={sectionId(sec.heading)} className="scroll-mt-24">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 px-2 text-xs font-semibold tabular-nums text-white">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.9rem]">{sec.heading}</h2>
                {sec.paragraphs?.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-4 text-[1.0625rem] leading-8 text-slate-600">{p}</p>
                ))}
                {sec.bullets ? (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {sec.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-4 text-sm leading-7 text-slate-600 shadow-[0_4px_18px_-10px_rgba(15,23,42,0.1)]">
                        <HiOutlineCheckCircle className="mt-1 shrink-0 text-lg text-emerald-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {sec.table ? (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/70 shadow-[0_4px_18px_-10px_rgba(15,23,42,0.1)]">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-950 text-white">
                          {sec.table.headers.map((h, hi) => (
                            <th key={hi} scope="col" className="px-4 py-3 text-[13px] font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.table.rows.map((row) => (
                          <tr key={row[0]} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60">
                            <th scope="row" className="px-4 py-3 font-medium text-slate-900">{row[0]}</th>
                            {row.slice(1).map((cell) => (
                              <td key={cell} className="px-4 py-3 text-slate-600">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {sec.links ? (
                  <p className="mt-5 flex flex-wrap gap-2 text-sm">
                    {sec.links.map((l) => (
                      <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 font-medium text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900">
                        {l.text}
                        <HiOutlineArrowRight className="text-sm" />
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {page.faqs?.length ? (
        <section className="bg-white py-14 sm:py-16 lg:py-20" aria-labelledby="feature-faq-title">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <h2 id="feature-faq-title" className="scroll-mt-24 text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-8 grid gap-3">
              {page.faqs.map(([question, answer]) => (
                <details key={question} className="group rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.12)] open:border-blue-200 open:bg-blue-50/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-base font-medium">{question}</h3>
                    <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-lg leading-none text-slate-500 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-[2rem] bg-slate-950 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(59,130,246,0.35)_0%,transparent_60%),radial-gradient(50%_80%_at_100%_100%,rgba(139,92,246,0.3)_0%,transparent_60%)] p-6 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.5)] sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              See the products behind this comparison
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              {page.relatedLinks.map((l, i) => (
                <span key={l.to}>
                  {i > 0 ? ' · ' : null}
                  <Link to={l.to} className="font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">{l.text}</Link>
                </span>
              ))}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 text-sm font-medium tracking-[-0.01em] text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.97]">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
