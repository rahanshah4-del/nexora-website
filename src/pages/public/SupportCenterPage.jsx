import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const supportTopics = [
  {
    title: 'Start with Nexora',
    text: 'Create an account, select your module, and open your workspace.',
    to: '/signup',
  },
  {
    title: 'Documentation',
    text: 'Browse detailed guides and reference material for every module.',
    to: '/documentation',
  },
  {
    title: 'Help Center',
    text: 'Find quick links for setup, pricing, services, and contacting support.',
    to: '/help-center',
  },
  {
    title: 'FAQ',
    text: 'Get answers to the most common questions about Nexora.',
    to: '/faq',
  },
  {
    title: 'Contact via WhatsApp',
    text: 'Reach out directly on WhatsApp for immediate assistance.',
    to: 'https://wa.me/923194329754',
  },
  {
    title: 'Email Support',
    text: 'Send an email and our team will respond promptly.',
    to: 'mailto:rahanshah4@gmail.com',
  },
]

export default function SupportCenterPage() {
  const seo = getSeoForPath('/support-center')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Support Center</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">How can we help you?</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Get started with Nexora, browse documentation, or reach out to the team directly.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {supportTopics.map(({ title, text, to }) => {
              if (to.startsWith('http') || to.startsWith('mailto')) {
                return (
                  <a
                    key={title}
                    href={to}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] hover:border-blue-200"
                  >
                    <h2 className="text-xl font-black text-slate-950">{title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
                  </a>
                )
              }
              return (
                <Link
                  key={title}
                  to={to}
                  className="rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] hover:border-blue-200"
                >
                  <h2 className="text-xl font-black text-slate-950">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
