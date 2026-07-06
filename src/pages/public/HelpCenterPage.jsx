import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const helpTopics = [
  ['Start with Nexora', 'Create an account, select your module, and open your workspace.', '/signup'],
  ['Pricing and plans', 'Compare Free Forever, Standard, and Enterprise plans.', '/pricing'],
  ['Business services', 'Request setup, support, bookkeeping, marketing, or managed operations.', '/services'],
  ['Contact support', 'Reach Nexora through WhatsApp or email for guidance.', '/contact'],
]

export default function HelpCenterPage() {
  const seo = getSeoForPath('/help-center')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Help Center</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Get help with Nexora Solution.</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Find quick links for starting your workspace, reviewing pricing, requesting business services, and contacting Nexora support.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {helpTopics.map(([title, text, to]) => (
              <Link key={title} to={to} className="rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] hover:border-blue-200">
                <h2 className="text-xl font-black text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
