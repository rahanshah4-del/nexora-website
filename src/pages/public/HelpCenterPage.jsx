import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import {
  HELP_ARTICLES,
  HELP_ARTICLE_BY_SLUG,
  HELP_GROUPS,
  HELP_POPULAR,
  articlesInGroup,
} from '../../lib/helpCenterData.js'
import { APPLE_FONT, Chevron, GroupTile, HelpSearch, MobileNav } from './help/HelpShared.jsx'

const START_HERE = ['getting-started', 'free-tools', 'pricing-and-trial']
const QUICK = ['restaurant-pos', 'retail-pos', 'crm', 'invoice-generator']

export default function HelpCenterPage() {
  return (
    <PublicPageShell>
      <PageSeo {...getSeoForPath('/help-center')} />
      <div style={{ fontFamily: APPLE_FONT }} className="bg-white text-[#1d1d1f]">
        <section className="bg-[#f5f5f7]">
          <div className="mx-auto max-w-4xl px-5 pb-16 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-32">
            <p className="text-sm font-semibold text-[#0066cc]">Nexora Help Center</p>
            <h1 className="mt-3 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">How can we help?</h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Guides and answers for every Nexora module and free tool, written from what the product actually does.
            </p>
            <div className="mx-auto mt-9 max-w-2xl"><HelpSearch large /></div>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px]">
              <span className="text-slate-500">Popular:</span>
              {QUICK.map((s) => (
                <Link key={s} to={HELP_ARTICLE_BY_SLUG[s].path} className="text-[#0066cc] hover:underline">{HELP_ARTICLE_BY_SLUG[s].title}</Link>
              ))}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="pt-8"><MobileNav /></div>

          <section aria-labelledby="start-here" className="pt-14 sm:pt-20">
            <h2 id="start-here" className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Start here</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {START_HERE.map((slug) => {
                const a = HELP_ARTICLE_BY_SLUG[slug]
                return (
                  <Link key={slug} to={a.path} className="group flex flex-col rounded-[28px] bg-[#f5f5f7] p-7 transition duration-300 hover:-translate-y-1 hover:bg-[#ececf0] hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,.3)] active:scale-[.985]">
                    <GroupTile id={a.group} size="lg" />
                    <p className="mt-6 text-xl font-semibold tracking-tight">{a.title}</p>
                    <p className="mt-2 flex-1 text-[15px] leading-6 text-slate-600">{a.summary}</p>
                    <p className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc]">Read guide <Chevron className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></p>
                  </Link>
                )
              })}
            </div>
          </section>

          <div className="space-y-16 pt-16 sm:space-y-20 sm:pt-24">
            {HELP_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`g-${group.id}`}>
                <div className="flex items-center gap-4">
                  <GroupTile id={group.id} />
                  <div>
                    <h2 id={`g-${group.id}`} className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{group.title}</h2>
                    <p className="mt-0.5 text-[15px] text-slate-600">{group.text}</p>
                  </div>
                </div>
                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {articlesInGroup(group.id).map((a) => (
                    <Link key={a.slug} to={a.path} className="group flex flex-col rounded-3xl bg-[#f5f5f7] p-6 transition duration-300 hover:-translate-y-0.5 hover:bg-[#ececf0] active:scale-[.985]">
                      <p className="text-[17px] font-semibold tracking-tight">{a.title}</p>
                      <p className="mt-1.5 flex-1 text-[15px] leading-6 text-slate-600">{a.summary}</p>
                      <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0066cc]">{a.faqs.length} questions answered <Chevron className="h-3 w-3 transition group-hover:translate-x-0.5" /></p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="pt-16 sm:pt-24">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Popular questions</h2>
            <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {HELP_POPULAR.map((p) => (
                <li key={p.q}>
                  <Link to={`${HELP_ARTICLE_BY_SLUG[p.slug].path}#faq`} className="group flex items-center justify-between gap-4 py-4 text-[17px] transition hover:text-[#0066cc]">
                    {p.q}
                    <Chevron className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0066cc]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="my-16 rounded-[32px] bg-[#f5f5f7] px-6 py-12 text-center sm:my-24 sm:px-12 sm:py-16">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Can’t find your answer?</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">{HELP_ARTICLES.length} articles, and every answer comes from the live product. If something is missing, ask us directly.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="https://wa.me/923194329754" className="rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:scale-[.97]">WhatsApp +92 319 432 9754</Link>
              <Link to="mailto:support@nexorasolution.us" className="rounded-full bg-white px-6 py-3 text-[15px] font-medium text-[#0066cc] ring-1 ring-slate-300 transition hover:bg-slate-50 active:scale-[.97]">Email support</Link>
              <Link to="/contact" className="rounded-full bg-white px-6 py-3 text-[15px] font-medium text-[#0066cc] ring-1 ring-slate-300 transition hover:bg-slate-50 active:scale-[.97]">Contact page</Link>
            </div>
          </section>
        </div>
      </div>
    </PublicPageShell>
  )
}
