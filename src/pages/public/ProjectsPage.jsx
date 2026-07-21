import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const stories = [
  { title: 'Restaurant rollout', text: 'A restaurant chain improved order accuracy, inventory control, and online takeaway performance.' },
  { title: 'Retail expansion', text: 'A small retail group replaced spreadsheets with automated sales, stock, and customer tracking.' },
  { title: 'School automation', text: 'A private school digitized fees, attendance, and academic workflows in one system.' },
]

export default function ProjectsPage() {
  const seo = getSeoForPath('/projects')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-cyan-400" />
              Our Work
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">Implementation stories from teams using Nexora products.</h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Discover how local restaurants, retail businesses, schools, transport operators, and sales teams drive efficiency with integrated POS, ERP, CRM and customer communication tools.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {stories.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
