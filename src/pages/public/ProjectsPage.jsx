import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

export default function ProjectsPage() {
  const seo = getSeoForPath('/projects')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan-300">Our Work</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">Implementation stories from teams using Nexora products.</h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Discover how local restaurants, retail businesses, schools, transport operators, and sales teams drive efficiency with integrated POS, ERP, CRM and customer communication tools.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {[
              ['Restaurant rollout', 'A restaurant chain improved order accuracy, inventory control, and online takeaway performance.'],
              ['Retail expansion', 'A small retail group replaced spreadsheets with automated sales, stock, and customer tracking.'],
              ['School automation', 'A private school digitized fees, attendance, and academic workflows in one system.'],
            ].map(([title, text]) => (
              <article key={title} className="rounded-[1.75rem] border border-cyan-600/20 bg-slate-900/90 p-8 shadow-lg">
                <h2 className="text-lg font-black text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
