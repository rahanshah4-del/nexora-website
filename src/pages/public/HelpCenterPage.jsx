import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const helpTopics = [
  { title: 'Start with Nexora', text: 'Create an account, select your module, and open your workspace.', to: '/signup' },
  { title: 'Pricing and plans', text: 'Compare Free Forever, Standard, and Enterprise plans.', to: '/pricing' },
  { title: 'Business services', text: 'Request setup, support, bookkeeping, marketing, or managed operations.', to: '/business-services' },
  { title: 'Contact support', text: 'Reach Nexora through WhatsApp or email for guidance.', to: '/contact' },
]

export default function HelpCenterPage() {
  const seo = getSeoForPath('/help-center')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Help Center
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Get help with Nexora Solution.</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Find quick links for starting your workspace, reviewing pricing, requesting business services, and contacting Nexora support.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {helpTopics.map(({ title, text, to }) => (
              <Link
                key={title}
                to={to}
                className="group rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)] active:scale-[0.98]"
              >
                <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h2>
                <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
