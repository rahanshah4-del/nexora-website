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
import { HelpSearch, MobileNav } from './help/HelpShared.jsx'

export default function HelpCenterPage() {
  return (
    <PublicPageShell>
      <PageSeo {...getSeoForPath('/help-center')} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-teal-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-14 pt-28 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Nexora Help Center</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">How can we help you?</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Guides and answers for every Nexora module and free tool, written from what the product actually does.
          </p>
          <div className="mt-8 text-left"><HelpSearch large /></div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {['restaurant-pos', 'retail-pos', 'crm', 'pricing-and-trial', 'free-tools'].map((s) => (
              <Link key={s} to={HELP_ARTICLE_BY_SLUG[s].path} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-teal-400 hover:text-teal-700">{HELP_ARTICLE_BY_SLUG[s].title}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MobileNav />
        <div className="space-y-14 lg:mt-0">
          {HELP_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`g-${group.id}`}>
              <h2 id={`g-${group.id}`} className="text-2xl font-bold tracking-tight text-slate-900">{group.title}</h2>
              <p className="mt-1 text-slate-600">{group.text}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articlesInGroup(group.id).map((a) => (
                  <Link key={a.slug} to={a.path} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg">
                    <p className="font-semibold text-slate-900 group-hover:text-teal-700">{a.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{a.summary}</p>
                    <p className="mt-3 text-xs font-semibold text-teal-700">{a.faqs.length} questions answered →</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Popular questions</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {HELP_POPULAR.map((p) => (
              <li key={p.q}>
                <Link to={`${HELP_ARTICLE_BY_SLUG[p.slug].path}#faq`} className="block rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 hover:border-teal-400">{p.q}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 rounded-3xl bg-slate-900 p-8 text-white sm:p-10">
          <h2 className="text-2xl font-bold">Can’t find your answer?</h2>
          <p className="mt-2 max-w-xl text-slate-300">{HELP_ARTICLES.length} articles and every answer here come from the live product. If something is missing, ask us directly.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="https://wa.me/923194329754" className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold hover:bg-teal-400">WhatsApp +92 319 432 9754</Link>
            <Link to="mailto:support@nexorasolution.online" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Email support</Link>
            <Link to="/contact" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Contact page</Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
