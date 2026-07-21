import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const supportTopics = [
  { title: 'Start with Nexora', text: 'Create an account, select your module, and open your workspace.', to: '/signup' },
  { title: 'Documentation', text: 'Browse detailed guides and reference material for every module.', to: '/documentation' },
  { title: 'Help Center', text: 'Find quick links for setup, pricing, services, and contacting support.', to: '/help-center' },
  { title: 'FAQ', text: 'Get answers to the most common questions about Nexora.', to: '/faq' },
  { title: 'Contact via WhatsApp', text: 'Reach out directly on WhatsApp for immediate assistance.', to: 'https://wa.me/923194329754' },
  { title: 'Email Support', text: 'Send an email and our team will respond promptly.', to: 'mailto:rahanshah4@gmail.com' },
]

export default function SupportCenterPage() {
  const seo = getSeoForPath('/support-center')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Support Center
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-[-0.02em] text-slate-950 sm:text-5xl">How can we help you?</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Get started with Nexora, browse documentation, or reach out to the team directly.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {supportTopics.map(({ title, text, to }) => {
              const isExternal = to.startsWith('http') || to.startsWith('mailto')
              const Component = isExternal ? 'a' : Link
              const extraProps = isExternal ? { href: to, target: '_blank', rel: 'noreferrer' } : { to }
              return (
                <Component
                  key={title}
                  {...extraProps}
                  className="group rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)] active:scale-[0.98]"
                >
                  <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
                  <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{text}</p>
                </Component>
              )
            })}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
